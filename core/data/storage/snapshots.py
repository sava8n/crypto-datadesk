"""Writing one market state to the archive."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from data.storage import db, rows, schema

logger = logging.getLogger(__name__)


def record(state: rows.Archivable, currency: str) -> int | None:
    """Archive ``state`` in one transaction; ``None`` when nothing was written.

    ``ON CONFLICT (currency, as_of) DO NOTHING`` is the backstop, not the primary guard:
    ``as_of`` is the observation time, so it only collides when the very same state is
    replayed - which is exactly what happens while the loader is serving a stale state
    through an upstream outage. The recorder's own interval check is what stops ordinary
    duplicates.
    """
    snapshot = rows.snapshot_row(state, currency)
    if snapshot is None:
        logger.warning("skipping snapshot for currency=%s: unusable spot %r", currency, state.spot)
        return None

    with db.connection() as conn:
        inserted = conn.execute(
            pg_insert(schema.snapshot)
            .values(snapshot)
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
        cm = rows.cm_rows(state, snapshot_id)
        if cm:
            conn.execute(schema.cm_metric.insert(), cm)

    logger.info(
        "recorded snapshot id=%d currency=%s as_of=%s with %d contracts",
        snapshot_id,
        currency,
        state.as_of,
        len(contracts),
    )
    return snapshot_id


def latest_as_of(currency: str) -> datetime | None:
    """The most recent ``as_of`` stored for ``currency``, or ``None`` if there is none."""
    c = schema.snapshot.c
    stmt = select(func.max(c.as_of).label("as_of")).where(c.currency == currency)
    return db.rows(stmt, "snapshot cursor")[0]["as_of"]
