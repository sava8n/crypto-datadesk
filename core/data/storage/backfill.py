"""One-shot backfill of derived scalars and the CM grid over archived snapshots.

Run from ``core/``: ``python -m data.storage.backfill``. Idempotent - only snapshots
still missing derived data are touched, so it is safe to re-run after outages.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import exists, or_, select, update

from config import settings
from data.market.state import MarketState
from data.storage import db, read, schema
from data.storage.rows import cm_rows, derived_row

logger = logging.getLogger(__name__)


def pending_snapshots(currency: str) -> list[tuple[int, datetime, float]]:
    """Snapshots whose derived scalars or CM grid were never written.

    ``oi_total_calls`` is the scalar sentinel: a real book always carries open interest,
    so the column is never legitimately NULL after a pass. A snapshot whose chain spans
    no CM tenor re-qualifies every run - recomputing it is deterministic and cheap.
    """
    s = schema.snapshot.c
    no_cm = ~exists(select(1).where(schema.cm_metric.c.snapshot_id == s.id))
    stmt = (
        select(s.id, s.as_of, s.spot)
        .where(s.currency == currency, or_(s.oi_total_calls.is_(None), no_cm))
        .order_by(s.as_of)
    )
    with db.connection() as conn:
        return [(int(id_), as_of, float(spot)) for id_, as_of, spot in conn.execute(stmt)]


def backfill_currency(currency: str) -> int:
    """Restore each pending snapshot's book and write its derived data back."""
    done = 0
    for snapshot_id, as_of, spot in pending_snapshots(currency):
        # stored tte_years is capture-time tte, so the restored state reproduces the
        # analytics exactly as they were served; candles are not needed for these scalars
        state = MarketState(as_of, spot, read.load_contracts(snapshot_id), None, None)
        values = derived_row(state)
        cm = cm_rows(state, snapshot_id)
        # one transaction per snapshot: a crash mid-run loses nothing already written
        with db.connection() as conn:
            conn.execute(
                update(schema.snapshot).where(schema.snapshot.c.id == snapshot_id).values(values)
            )
            conn.execute(
                schema.cm_metric.delete().where(schema.cm_metric.c.snapshot_id == snapshot_id)
            )
            if cm:
                conn.execute(schema.cm_metric.insert(), cm)
        done += 1
    return done


def main() -> None:
    logging.basicConfig(level=settings.log_level)
    for currency in settings.supported_currency_list:
        count = backfill_currency(currency)
        logger.info("backfilled %d snapshots for %s", count, currency)


if __name__ == "__main__":
    main()
