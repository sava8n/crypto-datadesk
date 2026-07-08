"""Cached loading of the COT state.

A weekly-cadence feed behind a long TTL: one CFTC round-trip per window feeds
every endpoint. A failed refresh keeps serving the previous state and the
price-overlay fetch is best-effort - a failure keeps the previous candles.
"""

from __future__ import annotations

import logging
import time

from fastapi import HTTPException

from clients import cftc, deribit
from clients.cftc import CftcError
from clients.deribit import DeribitError
from config import settings
from cot import prices
from cot.fields import CONTRACT_WEIGHTS
from cot.normalize import build as normalize
from cot.state import CotState
from shared.cache import TTLCache

logger = logging.getLogger(__name__)

_cache = TTLCache(settings.cot_cache_ttl_seconds)

PRICE_INSTRUMENT = "BTC-PERPETUAL"
PRICE_START_MS = 1_512_086_400_000  # 2017-12-01, first BTC COT report era
_CHUNK_MS = 1000 * 86_400_000  # stay under any per-request bar cap


def _fetch_price_candles(prev: dict | None) -> dict | None:
    try:
        end_ms = int(time.time() * 1000)
        prev_ticks = (prev or {}).get("ticks") or []
        start = int(prev_ticks[-1]) if prev_ticks else PRICE_START_MS
        chunks = []
        while start < end_ms:
            stop = min(start + _CHUNK_MS, end_ms)
            chunks.append(deribit.fetch_instrument_history(PRICE_INSTRUMENT, start, stop))
            start = stop
        return prices.splice(prev, chunks)
    except DeribitError as exc:
        logger.warning("keeping stale COT price candles, %s", exc)
        return prev


def load_cot_state() -> CotState:
    def refresh(prev: CotState | None) -> CotState:
        try:
            tidy = normalize(cftc.fetch_tff_history(tuple(CONTRACT_WEIGHTS)))
        except (CftcError, ValueError) as exc:
            if prev is not None:
                logger.warning("keeping stale COT state, %s", exc)
                return prev
            logger.warning("cannot fetch COT data, %s", exc)
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        return CotState(
            tidy=tidy,
            price_candles=_fetch_price_candles(prev.price_candles if prev else None),
        )

    return _cache.get_or_refresh("cot", refresh)


def warm_up() -> None:
    """Best-effort pre-load at startup; failures log and never block boot."""
    start = time.perf_counter()
    try:
        load_cot_state()
    except Exception as exc:
        logger.warning("COT warm-up failed: %s", exc)
    logger.info("COT warm-up complete in %.0f ms", (time.perf_counter() - start) * 1000)
