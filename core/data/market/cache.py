"""In-memory TTL cache with per-key locks to collapse concurrent misses.

Fast lock-free freshness read, then a per-key lock around the (expensive)
producer so that when several callers miss the same key at once only one computes
it and the rest reuse the result - no thundering herd. Expired entries are kept
and handed to the producer so it can refresh incrementally instead of rebuilding
from scratch.

Failures are cached for the same TTL. Without that the lock only serializes the herd
rather than collapsing it: a raising producer stores nothing, so every waiter in turn
acquires the lock and calls upstream again, and a rate-limited upstream stays
rate-limited while every request for that key blocks behind the lock.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

_T = TypeVar("_T")


class TTLCache:
    """Thread-safe cache whose entries expire ``ttl_seconds`` after they are stored."""

    def __init__(self, ttl_seconds: float) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}
        self._failures: dict[str, tuple[float, Exception]] = {}
        self._store_lock = threading.Lock()
        # per-key locks serialize concurrent misses so only one caller computes a key
        self._key_locks: dict[str, threading.Lock] = {}
        self._key_locks_guard = threading.Lock()

    def _lock_for(self, key: str) -> threading.Lock:
        with self._key_locks_guard:
            lock = self._key_locks.get(key)
            if lock is None:
                lock = threading.Lock()
                self._key_locks[key] = lock
            return lock

    def _is_fresh(self, stored_at: float) -> bool:
        return time.monotonic() - stored_at < self._ttl

    def _read_fresh(self, key: str) -> tuple[bool, Any]:
        with self._store_lock:
            entry = self._store.get(key)
            if entry is not None and self._is_fresh(entry[0]):
                return True, entry[1]
        return False, None

    def _fresh_failure(self, key: str) -> Exception | None:
        with self._store_lock:
            entry = self._failures.get(key)
            return entry[1] if entry is not None and self._is_fresh(entry[0]) else None

    def get_or_refresh(self, key: str, refresh: Callable[[_T | None], _T]) -> _T:
        """Return the fresh cached value for ``key``, else refresh, store and return it.

        ``refresh`` receives the previous (expired) value - ``None`` on first build -
        so producers can update incrementally. A raising ``refresh`` has its exception
        cached and re-raised for the rest of the TTL, so upstream is attempted at most
        once per window per key.
        """
        hit, value = self._read_fresh(key)
        if hit:
            logger.debug("cache hit for key=%s", key)
            return value

        with self._lock_for(key):
            # another caller may have populated the cache while we waited for the lock
            hit, value = self._read_fresh(key)
            if hit:
                logger.debug("cache hit for key=%s (filled while waiting)", key)
                return value

            failure = self._fresh_failure(key)
            if failure is not None:
                logger.debug("cache miss for key=%s, replaying cached failure", key)
                raise failure

            with self._store_lock:
                entry = self._store.get(key)
            prev = entry[1] if entry is not None else None

            logger.debug("cache miss for key=%s, refreshing", key)
            try:
                value = refresh(prev)
            except Exception as exc:
                with self._store_lock:
                    self._failures[key] = (time.monotonic(), exc)
                raise

            with self._store_lock:
                self._store[key] = (time.monotonic(), value)
                self._failures.pop(key, None)
            return value
