"""Cached loading of the market state.

One state per currency: a single upstream round-trip (spot + option book) feeds
every endpoint, so all views within a TTL window see the same market and
concurrent misses collapse on one per-key lock. Candle history is carried across
windows and spliced incrementally; its fetches are best-effort - a failure keeps
the previous candles instead of failing the state.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from fastapi import HTTPException

from clients import deribit
from clients.deribit import DeribitError
from config import settings
from market import history
from market.state import MarketState
from shared.cache import TTLCache
from shared.quotes import prepare_contracts

logger = logging.getLogger(__name__)

_cache = TTLCache(settings.market_cache_ttl_seconds)


def _refresh_spot_candles(prev: dict | None, cur: str) -> dict | None:
    try:
        days = history.refresh_days(history.spot_last_tick(prev))
        return history.splice_spot(prev, deribit.fetch_spot_history(cur, days=days))
    except DeribitError as exc:
        logger.warning("keeping stale spot candles for currency=%s, %s", cur, exc)
        return prev


def _refresh_dvol_candles(prev: list[list[float]] | None, cur: str) -> list[list[float]] | None:
    try:
        days = history.refresh_days(history.dvol_last_tick(prev))
        return history.splice_dvol(prev or [], deribit.fetch_dvol_history(cur, days=days))
    except DeribitError as exc:
        logger.warning("keeping stale DVOL history for currency=%s, %s", cur, exc)
        return prev


def load_market_state(cur: str) -> MarketState:
    def refresh(prev: MarketState | None) -> MarketState:
        try:
            spot = deribit.fetch_spot(cur)
            summaries = deribit.fetch_option_summaries(cur)
        except DeribitError as exc:
            logger.warning("cannot fetch upstream data for currency=%s, %s", cur, exc)
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        return MarketState(
            as_of=datetime.now(timezone.utc),
            spot=spot,
            contracts=prepare_contracts(summaries),
            spot_candles=_refresh_spot_candles(prev.spot_candles if prev else None, cur),
            dvol_candles=_refresh_dvol_candles(prev.dvol_candles if prev else None, cur),
        )

    return _cache.get_or_refresh(f"market:{cur}", refresh)


def warm_up() -> None:
    """Best-effort pre-load at startup; failures log and never block boot."""
    start = time.perf_counter()
    for cur in settings.supported_currency_list:
        try:
            load_market_state(cur)
        except Exception as exc:
            logger.warning("warm-up failed for currency=%s, %s", cur, exc)
    logger.info("warm-up complete in %.0f ms", (time.perf_counter() - start) * 1000)
