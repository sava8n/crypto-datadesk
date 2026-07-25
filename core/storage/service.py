"""Lifecycle for the archive's background tasks.

Best-effort, matching the market warm-up: a database that is disabled or unreachable
logs and leaves the API serving as before, it never blocks boot.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress

from config import settings

logger = logging.getLogger(__name__)


def status() -> str:
    """``"disabled"``, ``"ok"`` or ``"down"`` - reported by the health route."""
    if not settings.persistence_enabled:
        return "disabled"

    from storage import db

    return "ok" if db.is_available() else "down"


async def start() -> list[asyncio.Task]:
    """The recorder and retention tasks, or an empty list when persistence is off."""
    if not settings.persistence_enabled:
        logger.info("persistence disabled, not recording snapshots")
        return []

    from storage import db, recorder, retention

    try:
        await asyncio.to_thread(db.init_schema)
    except Exception:
        logger.exception("cannot reach the archive; persistence is off for this run")
        return []

    return [
        asyncio.create_task(recorder.run(), name="snapshot-recorder"),
        asyncio.create_task(retention.run(), name="retention-sweep"),
    ]


async def stop(tasks: list[asyncio.Task]) -> None:
    for task in tasks:
        task.cancel()
    for task in tasks:
        with suppress(asyncio.CancelledError):
            await task

    if tasks:
        from storage import db

        await asyncio.to_thread(db.dispose)
