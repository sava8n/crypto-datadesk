"""Cached loading of the market state: one state per currency per TTL window.

A failed chain fetch serves the previous state until it is ``max_stale_seconds`` old.
The stale state keeps its original ``as_of`` - that is what tells a client the data is
not moving, and what makes the recorder's ``ON CONFLICT (currency, as_of)`` a no-op
rather than one duplicate row per interval for the length of the outage.
"""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime

from config import settings
from data.cache import TTLCache
from data.clients import deribit
from data.clients.deribit import DeribitError
from data.market import history
from data.market.chain import prepare_contracts
from data.market.errors import UpstreamError
from data.market.state import MarketState

logger = logging.getLogger(__name__)

_cache = TTLCache(settings.market_cache_ttl_seconds)


def _refresh_spot_candles(prev: dict | None, ccy: str) -> dict | None:
    try:
        days = history.refresh_days(history.spot_last_tick(prev))
        return history.splice_spot(prev, deribit.fetch_spot_history(ccy, days=days))
    except DeribitError as exc:
        logger.warning("keeping stale spot candles for currency=%s, %s", ccy, exc)
        return prev


def _refresh_dvol_candles(prev: list[list[float]] | None, ccy: str) -> list[list[float]] | None:
    try:
        days = history.refresh_days(history.dvol_last_tick(prev))
        return history.splice_dvol(prev or [], deribit.fetch_dvol_history(ccy, days=days))
    except DeribitError as exc:
        logger.warning("keeping stale DVOL history for currency=%s, %s", ccy, exc)
        return prev


def _staleness_seconds(state: MarketState) -> float:
    return (datetime.now(UTC) - state.as_of).total_seconds()


def load_market_state(ccy: str) -> MarketState:
    def refresh(prev: MarketState | None) -> MarketState:
        try:
            spot = deribit.fetch_spot(ccy)
            summaries = deribit.fetch_option_summaries(ccy)
        except DeribitError as exc:
            if prev is not None and _staleness_seconds(prev) <= settings.max_stale_seconds:
                logger.warning(
                    "upstream failed for currency=%s, serving state from %s (%.0fs old), %s",
                    ccy,
                    prev.as_of.isoformat(),
                    _staleness_seconds(prev),
                    exc,
                )
                return prev
            logger.warning("cannot fetch upstream data for currency=%s, %s", ccy, exc)
            raise UpstreamError(str(exc)) from exc
        return MarketState(
            as_of=datetime.now(UTC),
            spot=spot,
            contracts=prepare_contracts(summaries),
            spot_candles=_refresh_spot_candles(prev.spot_candles if prev else None, ccy),
            dvol_candles=_refresh_dvol_candles(prev.dvol_candles if prev else None, ccy),
        )

    return _cache.get_or_refresh(f"market:{ccy}", refresh)


def warm_up() -> None:
    """Best-effort pre-load at startup; failures log and never block boot."""
    start = time.perf_counter()
    for ccy in settings.supported_currency_list:
        try:
            load_market_state(ccy)
        except Exception as exc:  # noqa: BLE001, warm-up must never block boot
            logger.warning("warm-up failed for currency=%s, %s", ccy, exc)
    logger.info("warm-up complete in %.0f ms", (time.perf_counter() - start) * 1000)
