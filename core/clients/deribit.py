"""Shared Deribit public-API client with a small in-memory TTL cache."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Callable, TypeVar

import certifi
import requests

logger = logging.getLogger(__name__)

DERIBIT_API = "https://www.deribit.com/api/v2"
HTTP_TIMEOUT = 10
CACHE_TTL_SECONDS = 20

# Deribit spot index names keyed by option currency.
_INDEX_NAMES: dict[str, str] = {"BTC": "btc_usd"}

_T = TypeVar("_T")
_cache: dict[str, tuple[float, Any]] = {}
_cache_lock = threading.Lock()
# per-key locks serialize concurrent misses so only one caller fetches a given key;
_fetch_locks: dict[str, threading.Lock] = {}
_fetch_locks_guard = threading.Lock()


class DeribitError(RuntimeError):
    """Raised when a Deribit request fails or returns an unexpected payload."""


def _lock_for(key: str) -> threading.Lock:
    with _fetch_locks_guard:
        lock = _fetch_locks.get(key)
        if lock is None:
            lock = threading.Lock()
            _fetch_locks[key] = lock
        return lock


def _read_fresh(key: str, ttl: float) -> tuple[bool, Any]:
    with _cache_lock:
        entry = _cache.get(key)
        if entry is not None and time.monotonic() - entry[0] < ttl:
            return True, entry[1]
    return False, None


def _cached(key: str, ttl: float, producer: Callable[[], _T]) -> _T:
    """Return a cached value for ``key`` if fresh, otherwise recompute and store it."""
    hit, value = _read_fresh(key, ttl)
    if hit:
        logger.debug("cache hit for key=%s", key)
        return value

    with _lock_for(key):
        # another caller may have populated the cache while we waited for the lock.
        hit, value = _read_fresh(key, ttl)
        if hit:
            logger.debug("cache hit for key=%s (filled while waiting)", key)
            return value

        logger.info("cache miss for key=%s, fetching from Deribit", key)
        start = time.perf_counter()
        value = producer()
        logger.info("fetched by key=%s in %.0f ms", key, (time.perf_counter() - start) * 1000)
        with _cache_lock:
            _cache[key] = (time.monotonic(), value)
        return value


def _get(path: str, params: dict) -> Any:
    try:
        resp = requests.get(
            f"{DERIBIT_API}{path}",
            params=params,
            timeout=HTTP_TIMEOUT,
            verify=certifi.where(),
        )
        resp.raise_for_status()
        return resp.json()["result"]
    except (requests.RequestException, KeyError, ValueError) as exc:
        logger.warning("Deribit request to %s failed: %s", path, exc)
        raise DeribitError(f"Deribit request to {path} failed: {exc}") from exc


def fetch_spot(currency: str = "BTC") -> float:
    """Return the current USD index price for ``currency`` (default BTC)."""
    index_name = _INDEX_NAMES.get(currency.upper())
    if index_name is None:
        raise DeribitError(f"Unsupported currency: {currency}")

    def producer() -> float:
        result = _get("/public/get_index_price", {"index_name": index_name})
        return float(result["index_price"])

    return _cached(f"spot:{currency.upper()}", CACHE_TTL_SECONDS, producer)


def fetch_option_summaries(currency: str = "BTC") -> list[dict]:
    """Return the full option book summary for ``currency`` (default BTC)."""
    cur = currency.upper()
    if cur not in _INDEX_NAMES:
        raise DeribitError(f"Unsupported currency: {currency}")

    def producer() -> list[dict]:
        return _get(
            "/public/get_book_summary_by_currency",
            {"currency": cur, "kind": "option"},
        )

    return _cached(f"summaries:{cur}", CACHE_TTL_SECONDS, producer)
