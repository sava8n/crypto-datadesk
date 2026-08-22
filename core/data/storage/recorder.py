"""Periodic archiving of the market state.

Goes through the same ``load_market_state`` the API uses, so a snapshot is exactly what
the service would have served at that instant and the fetch is shared with any request
landing in the same TTL window.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from config import settings
from data.market.loader import load_market_state
from data.storage import snapshots

logger = logging.getLogger(__name__)


def slot_start(now: datetime, interval_seconds: int) -> datetime:
    """Start of the slot containing ``now``: multiples of the interval since epoch (UTC)."""
    ts = int(now.timestamp())
    return datetime.fromtimestamp(ts - ts % interval_seconds, UTC)


def seconds_until_slot(now: datetime, interval_seconds: int) -> float:
    """Seconds from ``now`` to the next slot boundary.

    Always strictly in the future - landing exactly on it returns a full interval, so a
    caller looping on this cannot spin.
    """
    nxt = slot_start(now, interval_seconds) + timedelta(seconds=interval_seconds)
    return (nxt - now).total_seconds()


def _due(currency: str) -> bool:
    """False when the current slot already holds a capture.

    ``as_of`` is an observation time, so a restart mid-slot would otherwise record a
    second snapshot of the same market minutes after the first - the unique constraint
    on ``(currency, as_of)`` only catches a byte-identical replay. Checking before the
    fetch also saves the upstream round-trip.
    """
    latest = snapshots.latest_as_of(currency)
    if latest is None:
        return True
    if latest < slot_start(datetime.now(UTC), settings.snapshot_interval_seconds):
        return True
    logger.debug(
        "skipping snapshot for currency=%s, slot already captured at %s",
        currency,
        latest.isoformat(),
    )
    return False


def record_once(currency: str) -> int | None:
    if not _due(currency):
        return None
    return snapshots.record(load_market_state(currency), currency)


async def _record_all() -> None:
    for currency in settings.supported_currency_list:
        try:
            await asyncio.to_thread(record_once, currency)
        except Exception:
            logger.exception("snapshot failed for currency=%s", currency)


async def run() -> None:
    """Catch up at boot, then record at every slot boundary."""
    while True:
        await _record_all()
        delay = seconds_until_slot(datetime.now(UTC), settings.snapshot_interval_seconds)
        logger.info("next snapshot in %.0f s", delay)
        await asyncio.sleep(delay)
