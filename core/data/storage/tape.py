"""Archiving the option trade tape.

A cursor on the last stored print's timestamp, re-fetched inclusively so same-millisecond
prints are never skipped - the primary key deduplicates the overlap. Best-effort like the
snapshot recorder: an unreachable exchange or database logs and waits for the next poll.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from analytics.conventions import EXPIRY_DATE_FORMAT, SETTLEMENT_HOUR_UTC
from config import settings
from data.clients import deribit
from data.storage import db, schema

logger = logging.getLogger(__name__)

# a run that keeps returning full pages should yield eventually; at 500 prints per page
# this bounds one poll to ~50k rows, far above any real minute of Deribit option flow
MAX_PAGES_PER_POLL = 100


def parse_instrument(name: str) -> tuple[datetime, float, str] | None:
    """``(expiry, strike, option_type)`` from ``<CCY>-<DDMMMYY>-<STRIKE>-<C|P>``.

    The scalar twin of the chain's vectorised parser. ``None`` for anything unparseable -
    a print that cannot identify its contract is dropped.
    """
    parts = name.split("-")
    if len(parts) != 4 or parts[3] not in ("C", "P"):
        return None
    try:
        expiry = datetime.strptime(parts[1], EXPIRY_DATE_FORMAT).replace(tzinfo=UTC) + timedelta(
            hours=SETTLEMENT_HOUR_UTC
        )
        strike = float(parts[2])
    except ValueError:
        return None
    if strike <= 0:
        return None
    return expiry, strike, parts[3]


def trade_rows(trades: list[dict], currency: str) -> list[dict]:
    """Archive rows for one page of prints; unparseable or incomplete prints are dropped."""
    rows = []
    for t in trades:
        parsed = parse_instrument(str(t.get("instrument_name", "")))
        if parsed is None:
            continue
        expiry, strike, option_type = parsed
        try:
            row = {
                "trade_id": str(t["trade_id"]),
                "currency": currency,
                "ts": datetime.fromtimestamp(t["timestamp"] / 1000.0, tz=UTC),
                "instrument_name": t["instrument_name"],
                "expiry": expiry,
                "strike": strike,
                "option_type": option_type,
                "price": float(t["price"]),
                "amount": float(t["amount"]),
                "direction": t["direction"],
            }
        except (KeyError, TypeError, ValueError):
            continue
        if row["direction"] not in ("buy", "sell"):
            continue
        # Deribit quotes trade IV in percent; stored as a fraction like contract.mark_iv
        iv = t.get("iv")
        row["iv"] = float(iv) / 100.0 if iv is not None else None
        index_price = t.get("index_price")
        row["index_price"] = float(index_price) if index_price is not None else None
        row["block_trade_id"] = t.get("block_trade_id")
        row["liquidation"] = t.get("liquidation")
        rows.append(row)
    return rows


def latest_ts(currency: str) -> datetime | None:
    """The most recent print stored for ``currency``, or ``None`` on an empty tape."""
    c = schema.trade.c
    stmt = select(func.max(c.ts).label("ts")).where(c.currency == currency)
    return db.rows(stmt, "tape cursor")[0]["ts"]


def _insert(rows: list[dict]) -> int:
    """Insert prints, ignoring ones already archived; returns rows actually written."""
    if not rows:
        return 0
    with db.connection() as conn:
        result = conn.execute(
            pg_insert(schema.trade).values(rows).on_conflict_do_nothing(index_elements=["trade_id"])
        )
        return int(result.rowcount)


def record_trades(currency: str) -> int:
    """Fetch and archive everything printed since the cursor; returns rows written."""
    cursor = latest_ts(currency)
    if cursor is None:
        cursor = datetime.now(UTC) - timedelta(days=settings.tape_bootstrap_days)
        logger.info("empty tape for %s, bootstrapping from %s", currency, cursor.isoformat())

    start_ms = int(cursor.timestamp() * 1000)
    end_ms = int(datetime.now(UTC).timestamp() * 1000)
    written = 0

    for _ in range(MAX_PAGES_PER_POLL):
        page = deribit.fetch_option_trades(currency, start_ms, end_ms)
        trades = page.get("trades", [])
        written += _insert(trade_rows(trades, currency))
        if not page.get("has_more") or not trades:
            break
        last_ms = int(trades[-1]["timestamp"])
        # a page of same-millisecond prints cannot advance the cursor; step past it
        # rather than loop (dedup already stored that millisecond's prints)
        start_ms = last_ms if last_ms > start_ms else start_ms + 1
    else:
        logger.warning("tape poll for %s hit the page cap, resuming next poll", currency)

    if written:
        logger.info("archived %d prints for %s", written, currency)
    return written


async def run() -> None:
    """Poll the tape every ``tape_poll_seconds`` for every configured currency."""
    while True:
        for currency in settings.supported_currency_list:
            try:
                await asyncio.to_thread(record_trades, currency)
            except Exception:
                logger.exception("tape poll failed for %s", currency)
        await asyncio.sleep(settings.tape_poll_seconds)
