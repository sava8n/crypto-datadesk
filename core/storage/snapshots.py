"""Writing one market state to the archive."""

from __future__ import annotations

import logging

from sqlalchemy.dialects.postgresql import insert as pg_insert

from storage import db, rows, schema

logger = logging.getLogger(__name__)


def record(state, currency: str) -> int | None:
    """Archive ``state`` in one transaction; ``None`` when this ``as_of`` is already stored.

    Idempotent on ``(currency, as_of)``, so replaying a snapshot is a no-op rather
    than a duplicate.
    """
    with db.connection() as conn:
        inserted = conn.execute(
            pg_insert(schema.snapshot)
            .values(rows.snapshot_row(state, currency))
            .on_conflict_do_nothing(index_elements=["currency", "as_of"])
            .returning(schema.snapshot.c.id)
        ).first()

        if inserted is None:
            logger.debug("snapshot already stored for currency=%s as_of=%s", currency, state.as_of)
            return None

        snapshot_id = int(inserted[0])
        contracts = rows.contract_rows(state, snapshot_id)
        if contracts:
            conn.execute(schema.contract.insert(), contracts)
        conn.execute(schema.snapshot_summary.insert(), rows.summary_row(state, snapshot_id))

    logger.info(
        "recorded snapshot id=%d currency=%s as_of=%s with %d contracts",
        snapshot_id,
        currency,
        state.as_of,
        len(contracts),
    )
    return snapshot_id
