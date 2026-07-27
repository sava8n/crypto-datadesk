"""Nightly pruning of snapshots past the retention window."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select, text

from config import settings
from data.storage import db, schema
from data.storage.window import cutoff, seconds_until

logger = logging.getLogger(__name__)

# a sweep queued behind a long analytical scan should give up, not block readers
LOCK_TIMEOUT_SECONDS = 5
# ~175k contract rows per transaction at hourly captures of the BTC book
SNAPSHOTS_PER_CHUNK = 200


def _aged_snapshot_ids(horizon: datetime, limit: int) -> list[int]:
    stmt = (
        select(schema.snapshot.c.id)
        .where(schema.snapshot.c.as_of < horizon)
        .order_by(schema.snapshot.c.as_of)
        .limit(limit)
    )
    with db.connection() as conn:
        return list(conn.scalars(stmt))


def _delete_chunk(snapshot_ids: list[int]) -> tuple[int, int]:
    """Delete these snapshots and their contracts in one transaction."""
    with db.connection() as conn:
        # set_config is the bindable form of SET LOCAL, which takes no parameters
        conn.execute(
            text("select set_config('lock_timeout', :timeout, true)"),
            {"timeout": f"{LOCK_TIMEOUT_SECONDS}s"},
        )
        # children first, so the cascade never has bulk work to do
        contracts = conn.execute(
            schema.contract.delete().where(schema.contract.c.snapshot_id.in_(snapshot_ids))
        ).rowcount
        snapshots = conn.execute(
            schema.snapshot.delete().where(schema.snapshot.c.id.in_(snapshot_ids))
        ).rowcount
    return contracts, snapshots


def prune() -> tuple[int, int]:
    """Delete everything older than the window; returns ``(contracts, snapshots)``."""
    horizon = cutoff(datetime.now(UTC), settings.retention_days)
    total_contracts = total_snapshots = 0

    while ids := _aged_snapshot_ids(horizon, SNAPSHOTS_PER_CHUNK):
        contracts, snapshots = _delete_chunk(ids)
        total_contracts += contracts
        total_snapshots += snapshots

    logger.info(
        "retention sweep removed %d contracts and %d snapshots older than %s",
        total_contracts,
        total_snapshots,
        horizon.isoformat(),
    )
    return total_contracts, total_snapshots


async def run() -> None:
    """Sweep once per day at ``retention_sweep_at_utc``; failures retry the next night."""
    while True:
        delay = seconds_until(datetime.now(UTC), settings.retention_sweep_at_utc)
        logger.info("next retention sweep in %.0f s", delay)
        await asyncio.sleep(delay)
        try:
            await asyncio.to_thread(prune)
        except Exception:
            logger.exception("retention sweep failed")
