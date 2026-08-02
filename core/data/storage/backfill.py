"""One-shot backfill of derived scalars over archived snapshots.

Run from ``core/``: ``python -m data.storage.backfill``. Idempotent - only snapshots
still missing derived scalars are touched, so it is safe to re-run after outages.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select, update

from config import settings
from data.storage import db, read, schema
from data.storage.rows import derived_row

logger = logging.getLogger(__name__)


def pending_snapshots(currency: str) -> list[tuple[int, datetime, float]]:
    """Snapshots whose derived scalars were never written.

    ``oi_total_calls`` is the sentinel: a real book always carries open interest, so
    the column is never legitimately NULL after a pass. Snapshots whose other scalars
    fail to compute are recomputed on re-run - deterministic and cheap.
    """
    stmt = (
        select(schema.snapshot.c.id, schema.snapshot.c.as_of, schema.snapshot.c.spot)
        .where(
            schema.snapshot.c.currency == currency,
            schema.snapshot.c.oi_total_calls.is_(None),
        )
        .order_by(schema.snapshot.c.as_of)
    )
    with db.connection() as conn:
        return [(int(id_), as_of, float(spot)) for id_, as_of, spot in conn.execute(stmt)]


def backfill_currency(currency: str) -> int:
    """Restore each pending snapshot's book and write its derived scalars back."""
    from data.market.state import MarketState

    done = 0
    for snapshot_id, as_of, spot in pending_snapshots(currency):
        # stored tte_years is capture-time tte, so the restored state reproduces the
        # analytics exactly as they were served; candles are not needed for these scalars
        state = MarketState(as_of, spot, read.load_contracts(snapshot_id), None, None)
        values = derived_row(state)
        # one transaction per snapshot: a crash mid-run loses nothing already written
        with db.connection() as conn:
            conn.execute(
                update(schema.snapshot).where(schema.snapshot.c.id == snapshot_id).values(values)
            )
        done += 1
    return done


def main() -> None:
    logging.basicConfig(level=settings.log_level)
    for currency in settings.supported_currency_list:
        count = backfill_currency(currency)
        logger.info("backfilled %d snapshots for %s", count, currency)


if __name__ == "__main__":
    main()
