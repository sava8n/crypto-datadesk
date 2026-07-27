"""Lifecycle for the database's background tasks.

Best-effort, matching the market warm-up: an unreachable database logs and leaves the
API serving as before, it never blocks boot.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress

from data.storage import db, recorder, retention

logger = logging.getLogger(__name__)


def status() -> str:
    """``"ok"`` or ``"down"`` - reported by the health route."""
    return "ok" if db.is_available() else "down"


async def start() -> list[asyncio.Task]:
    """The recorder and retention tasks, or an empty list if the db is unreachable."""
    try:
        await asyncio.to_thread(db.init_schema)
    except Exception:
        logger.exception("cannot reach the db")
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
        await asyncio.to_thread(db.dispose)
