"""Periodic archiving of the market state.

Goes through the same ``load_market_state`` the API uses, so a snapshot is exactly what
the service would have served at that instant and the fetch is shared with any request
landing in the same TTL window.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from config import settings
from data.market.loader import load_market_state
from data.storage import snapshots

logger = logging.getLogger(__name__)


def _due(currency: str) -> bool:
    """False when a capture is already stored within half the interval.

    ``as_of`` is an observation time, so a restart mid-interval would otherwise record a
    second snapshot of the same market seconds after the first - the unique constraint
    on ``(currency, as_of)`` only catches a byte-identical replay. Checking before the
    fetch also saves the upstream round-trip.
    """
    latest = snapshots.latest_as_of(currency)
    if latest is None:
        return True
    age = (datetime.now(UTC) - latest).total_seconds()
    if age >= settings.snapshot_interval_seconds / 2:
        return True
    logger.debug("skipping snapshot for currency=%s, last one is %.0fs old", currency, age)
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
    """Record immediately, then every ``snapshot_interval_seconds``."""
    await _record_all()
    while True:
        await asyncio.sleep(settings.snapshot_interval_seconds)
        await _record_all()
