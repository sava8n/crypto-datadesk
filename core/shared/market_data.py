"""Shared request helpers."""

from __future__ import annotations

import logging
from typing import NamedTuple

import pandas as pd
from fastapi import HTTPException

from config import settings
from clients import deribit
from clients.deribit import DeribitError
from shared.cache import TTLCache
from shared.quotes import prepare_oi_chain, prepare_otm_quotes

logger = logging.getLogger(__name__)

# One snapshot per currency: a single upstream round-trip (spot + option book) feeds
# every endpoint, so all views within a TTL window see the same market state and
# concurrent misses collapse on one per-key lock.
_market_cache = TTLCache(settings.market_cache_ttl_seconds)

# history in daily resolution 
_history_cache = TTLCache(settings.history_cache_ttl_seconds)


class MarketSnapshot(NamedTuple):
    spot: float
    otm_quotes: pd.DataFrame  # shared across requests; treat as read-only
    oi_chain: pd.DataFrame  # shared across requests; treat as read-only


def validate_currency(currency: str) -> str:
    cur = currency.upper()
    if cur not in settings.supported_currency_list:
        logger.warning("rejected due to unsupported currency=%s", cur)
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported currency '{currency}'. Supported: {settings.supported_currency_list}",
        )
    return cur


def _load_snapshot(cur: str) -> MarketSnapshot:
    def producer() -> MarketSnapshot:
        try:
            spot = deribit.fetch_spot(cur)
            summaries = deribit.fetch_option_summaries(cur)
        except DeribitError as exc:
            logger.warning("cannot fetch upstream data for currency=%s, %s", cur, exc)
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        return MarketSnapshot(
            spot=spot,
            otm_quotes=prepare_otm_quotes(summaries, spot),
            oi_chain=prepare_oi_chain(summaries, spot),
        )

    return _market_cache.get_or_compute(f"market:{cur}", producer)


def load_otm_quotes(cur: str) -> tuple[float, pd.DataFrame]:
    snapshot = _load_snapshot(cur)
    return snapshot.spot, snapshot.otm_quotes


def load_oi_chain(cur: str) -> tuple[float, pd.DataFrame]:
    snapshot = _load_snapshot(cur)
    return snapshot.spot, snapshot.oi_chain


def load_spot_candles(cur: str) -> dict:
    def producer() -> dict:
        try:
            return deribit.fetch_spot_candles(cur)
        except DeribitError as exc:
            logger.warning("cannot fetch spot candles for currency=%s, %s", cur, exc)
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return _history_cache.get_or_compute(f"spot_candles:{cur}", producer)


def load_dvol_history(cur: str) -> list[list[float]]:
    def producer() -> list[list[float]]:
        try:
            return deribit.fetch_dvol_history(cur)
        except DeribitError as exc:
            logger.warning("cannot fetch DVOL history for currency=%s, %s", cur, exc)
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return _history_cache.get_or_compute(f"dvol:{cur}", producer)
