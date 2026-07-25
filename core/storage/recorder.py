"""Periodic archiving of the market state.

Goes through the same ``load_market_state`` the API uses, so a snapshot is exactly
what the service would have served at that instant and the fetch is shared with any
request landing in the same TTL window.
"""

from __future__ import annotations

import asyncio
import logging

from config import settings
from market.loader import load_market_state
from storage import snapshots

logger = logging.getLogger(__name__)


def record_once(currency: str) -> int | None:
    state = load_market_state(currency)
    return snapshots.record(state, currency)


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
