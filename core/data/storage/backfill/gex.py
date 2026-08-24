"""One-shot recompute of the gex scalars over archived snapshots, tape-signed.

Run from ``core/``: ``python -m data.storage.backfill.gex``. Replays cumulative taker
flow up to each capture's ``as_of``, so every snapshot is signed exactly as the live
route would have signed it with today's tape. Captures older than the earliest archived
print get NULLs.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import case, func, select, update

from analytics.frames import finite
from analytics.positioning import inventory
from config import settings
from data.market import dealer
from data.market.state import MarketState
from data.storage import db, read, schema

logger = logging.getLogger(__name__)

NULL_SCALARS = {"gex_flip": None, "gex_net_total": None, "oi_explained_fraction": None}


def _snapshots(currency: str) -> list[tuple[int, datetime, float]]:
    s = schema.snapshot.c
    stmt = select(s.id, s.as_of, s.spot).where(s.currency == currency).order_by(s.as_of)
    with db.connection() as conn:
        return [(int(id_), as_of, float(spot)) for id_, as_of, spot in conn.execute(stmt)]


def _earliest_print(currency: str) -> datetime | None:
    c = schema.trade.c
    stmt = select(func.min(c.ts)).where(c.currency == currency)
    with db.connection() as conn:
        return conn.execute(stmt).scalar()


def _window_sums(currency: str, start: datetime | None, end: datetime) -> list[dict]:
    """Net taker contracts per (expiry, strike, option_type) printed in ``(start, end]``."""
    c = schema.trade.c
    signed = case((c.direction == "buy", c.amount), else_=-c.amount)
    stmt = (
        select(c.expiry, c.strike, c.option_type, func.sum(signed).label("net"))
        .where(c.currency == currency, c.ts <= end)
        .group_by(c.expiry, c.strike, c.option_type)
    )
    if start is not None:
        stmt = stmt.where(c.ts > start)
    return db.rows(stmt, "gex recompute window")


def _tape_values(
    currency: str, snapshot_id: int, as_of: datetime, spot: float, net_taker: dict
) -> dict:
    """The tape-signed scalars for one capture, from the accumulated flow at ``as_of``."""
    state = MarketState(as_of, spot, read.load_contracts(snapshot_id), None, None)
    flow_rows = [
        {"expiry": expiry, "strike": strike, "option_type": option_type, "net_taker": net}
        for (expiry, strike, option_type), net in net_taker.items()
    ]
    chain, fraction = inventory.flow_signed_chain(
        state.oi_chain, inventory.net_flow_frame(flow_rows)
    )
    return dealer.gamma_scalars(state, chain) | {"oi_explained_fraction": finite(fraction)}


def recompute_currency(currency: str) -> int:
    """Rewrite every capture's gex scalars in ``as_of`` order; returns snapshots touched."""
    tape_start = _earliest_print(currency)
    net_taker: dict[tuple, float] = {}
    prev: datetime | None = None
    done = 0

    for snapshot_id, as_of, spot in _snapshots(currency):
        if tape_start is None or as_of < tape_start:
            values = NULL_SCALARS
        else:
            for row in _window_sums(currency, prev, as_of):
                key = (row["expiry"], row["strike"], row["option_type"])
                net_taker[key] = net_taker.get(key, 0.0) + float(row["net"] or 0.0)
            prev = as_of
            # settled contracts can never re-enter a chain; dropping them keeps the
            # accumulator bounded by the live book
            for key in [key for key in net_taker if key[0] <= as_of]:
                del net_taker[key]
            values = _tape_values(currency, snapshot_id, as_of, spot, net_taker)

        with db.connection() as conn:
            conn.execute(
                update(schema.snapshot).where(schema.snapshot.c.id == snapshot_id).values(values)
            )
        done += 1
    return done


def main() -> None:
    logging.basicConfig(level=settings.log_level)
    for currency in settings.supported_currency_list:
        count = recompute_currency(currency)
        logger.info("recomputed gex scalars for %d snapshots for %s", count, currency)


if __name__ == "__main__":
    main()
