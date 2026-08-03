"""Reading flow aggregates and the tape back from the trade archive.

Net taker flow = buys - sells, in contracts and in USD premium
(``price * index_price * amount``). Prints missing an index price contribute to the
contract sums but not the premium sums.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Select, case, func, select

from config import settings
from data.market.cache import TTLCache
from data.storage import db, schema

_OPTION_SIDES = {"C": "call", "P": "put"}

# new prints land once per tape poll, so a fresher read buys nothing; failures are
# cached for the TTL too, so a down archive is probed once per interval, not per request
_cache = TTLCache(settings.tape_poll_seconds)


def _signed_sums(currency: str, start: datetime, now: datetime, group) -> Select:
    c = schema.trade.c
    signed = case((c.direction == "buy", c.amount), else_=-c.amount)
    premium = c.price * c.index_price * c.amount
    signed_premium = case((c.direction == "buy", premium), else_=-premium)
    return (
        select(
            group,
            c.option_type,
            func.sum(signed).label("contracts"),
            func.sum(signed_premium).label("premium"),
        )
        # settled expiries are excluded so flow lines up with the live chain's strikes
        .where(c.currency == currency, c.ts >= start, c.expiry > now)
        .group_by(group, c.option_type)
    )


def _pivot(rows: list[dict], key: str) -> list[dict]:
    """(group, option_type) sums -> one row per group with call/put columns."""
    out: dict = {}
    for row in rows:
        entry = out.setdefault(
            row[key],
            {
                key: row[key],
                "call_contracts": 0.0,
                "put_contracts": 0.0,
                "call_premium": 0.0,
                "put_premium": 0.0,
            },
        )
        side = _OPTION_SIDES.get(row["option_type"])
        if side is None:
            continue
        entry[f"{side}_contracts"] = float(row["contracts"] or 0.0)
        entry[f"{side}_premium"] = float(row["premium"] or 0.0)
    return sorted(out.values(), key=lambda entry: entry[key])


def net_flow_by_strike(currency: str, start: datetime, now: datetime) -> list[dict]:
    """Net taker flow per strike over the window, ascending by strike."""
    stmt = _signed_sums(currency, start, now, schema.trade.c.strike)
    return _pivot(db.rows(stmt, "tape"), "strike")


def net_flow_by_expiry(currency: str, start: datetime, now: datetime) -> list[dict]:
    """Net taker flow per expiry over the window, near-dated first."""
    stmt = _signed_sums(currency, start, now, schema.trade.c.expiry)
    return _pivot(db.rows(stmt, "expiry flow"), "expiry")


def _dealer_inputs(currency: str) -> dict:
    c = schema.trade.c
    signed = case((c.direction == "buy", c.amount), else_=-c.amount)
    stmt = (
        select(c.expiry, c.strike, c.option_type, func.sum(signed).label("net_taker"))
        # no lower ts bound: dealer inventory accumulates over the whole tape
        .where(c.currency == currency, c.expiry > datetime.now(UTC))
        .group_by(c.expiry, c.strike, c.option_type)
    )
    return {"rows": db.rows(stmt, "dealer flow"), "tape_start": _earliest_ts(currency)}


def _earliest_ts(currency: str) -> datetime | None:
    c = schema.trade.c
    stmt = select(func.min(c.ts).label("ts")).where(c.currency == currency)
    return db.rows(stmt, "tape start")[0]["ts"]


def dealer_flow(currency: str) -> dict:
    """Cumulative net taker flow per (expiry, strike, option_type) plus the tape start.

    ``{"rows": [...], "tape_start": ts | None}``, cached for one poll interval.
    """
    return _cache.get_or_refresh(f"dealer_flow:{currency}", lambda _: _dealer_inputs(currency))


def tape_start(currency: str) -> datetime | None:
    """Earliest archived print, ``None`` on an empty tape; cached for one poll interval."""
    return _cache.get_or_refresh(f"tape_start:{currency}", lambda _: _earliest_ts(currency))


def recent_prints(currency: str, limit: int, min_premium: float) -> list[dict]:
    """The latest prints, newest first, optionally floored by USD premium.

    With a floor, prints lacking an index price (premium unknown) are excluded.
    """
    c = schema.trade.c
    premium = (c.price * c.index_price * c.amount).label("premium")
    stmt = (
        select(
            c.trade_id,
            c.ts,
            c.instrument_name,
            c.expiry,
            c.strike,
            c.option_type,
            c.direction,
            c.price,
            c.amount,
            c.iv,
            premium,
            c.block_trade_id,
            c.liquidation,
        )
        .where(c.currency == currency)
        .order_by(c.ts.desc())
        .limit(limit)
    )
    if min_premium > 0:
        stmt = stmt.where(c.price * c.index_price * c.amount >= min_premium)
    return db.rows(stmt, "tape")
