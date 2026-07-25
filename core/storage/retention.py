"""Nightly pruning of snapshots past the retention window.

One horizon for everything: a snapshot is either wholly retained or wholly gone, so
nothing inside the window is ever un-recomputable.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import text

from config import settings
from storage import db, schema
from storage.window import cutoff, seconds_until_hour

logger = logging.getLogger(__name__)

# a sweep behind a long analytical scan should give up, not queue and block readers
_LOCK_TIMEOUT = "5s"


def prune() -> tuple[int, int]:
    """Delete everything older than the window; returns ``(contracts, snapshots)``."""
    horizon = cutoff(datetime.now(timezone.utc), settings.retention_days)
    with db.connection() as conn:
        conn.execute(text(f"SET LOCAL lock_timeout = '{_LOCK_TIMEOUT}'"))
        # children first, so the cascade never has bulk work to do
        contracts = conn.execute(
            schema.contract.delete().where(schema.contract.c.as_of < horizon)
        ).rowcount
        snapshots = conn.execute(
            schema.snapshot.delete().where(schema.snapshot.c.as_of < horizon)
        ).rowcount

    logger.info(
        "retention sweep removed %d contracts and %d snapshots older than %s",
        contracts,
        snapshots,
        horizon.isoformat(),
    )
    return contracts, snapshots


async def run() -> None:
    """Sweep once per day at ``retention_sweep_hour_utc``; failures retry the next night."""
    while True:
        delay = seconds_until_hour(datetime.now(timezone.utc), settings.retention_sweep_hour_utc)
        logger.info("next retention sweep in %.0f s", delay)
        await asyncio.sleep(delay)
        try:
            await asyncio.to_thread(prune)
        except Exception:
            logger.exception("retention sweep failed")
