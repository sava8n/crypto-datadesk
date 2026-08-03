"""TTLCache: miss populates, hit reuses, expiry refreshes with prev and misses collapse.

Collapsing is the whole reason the per-key lock exists, so it is tested under real
threads rather than asserted about.
"""

from __future__ import annotations

import threading
import time

import pytest

import data.cache as cache_mod
from data.cache import TTLCache


def test_miss_then_hit_then_expiry(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(cache_mod.time, "monotonic", lambda: clock[0])

    seen_prev = []

    def refresh(prev):
        seen_prev.append(prev)
        return f"v{len(seen_prev)}"

    cache = TTLCache(ttl_seconds=10)

    # first call: miss -> refresh(None)
    assert cache.get_or_refresh("k", refresh) == "v1"
    assert seen_prev == [None]

    # within TTL: hit -> refresh not called again
    assert cache.get_or_refresh("k", refresh) == "v1"
    assert len(seen_prev) == 1

    # past TTL: miss -> refresh receives the previous (expired) value
    clock[0] = 1011.0
    assert cache.get_or_refresh("k", refresh) == "v2"
    assert seen_prev[-1] == "v1"


def _hammer(cache, key, producer, threads=12):
    """Release ``threads`` at the same instant onto one cold key."""
    start = threading.Barrier(threads)
    results, errors = [], []

    def worker():
        start.wait()
        try:
            results.append(cache.get_or_refresh(key, producer))
        except Exception as exc:  # noqa: BLE001 - the test inspects what was raised
            errors.append(exc)

    workers = [threading.Thread(target=worker) for _ in range(threads)]
    for w in workers:
        w.start()
    for w in workers:
        w.join()
    return results, errors


def test_concurrent_misses_call_the_producer_once():
    calls = []

    def slow(prev):
        calls.append(1)
        time.sleep(0.05)  # long enough that the others are certainly waiting
        return "value"

    results, errors = _hammer(TTLCache(ttl_seconds=60), "k", slow)

    assert not errors
    assert len(calls) == 1  # the point of the per-key lock
    assert results == ["value"] * 12


def test_a_failing_producer_is_also_called_once():
    """Without a cached failure the lock only serializes the herd instead of collapsing it.

    Every waiter would re-enter the producer in turn, so a rate-limited upstream stays
    rate-limited while each request blocks behind the lock.
    """
    calls = []

    def failing(prev):
        calls.append(1)
        time.sleep(0.02)
        raise RuntimeError("upstream down")

    results, errors = _hammer(TTLCache(ttl_seconds=60), "k", failing)

    assert not results
    assert len(calls) == 1
    assert len(errors) == 12
    assert all(isinstance(e, RuntimeError) for e in errors)


def test_a_cached_failure_expires_with_the_ttl(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(cache_mod.time, "monotonic", lambda: clock[0])
    cache = TTLCache(ttl_seconds=10)

    calls = []

    def failing(prev):
        calls.append(1)
        raise RuntimeError("upstream down")

    for _ in range(3):
        with pytest.raises(RuntimeError):
            cache.get_or_refresh("k", failing)
    assert len(calls) == 1  # replayed, not retried

    clock[0] = 1011.0
    assert cache.get_or_refresh("k", lambda prev: "recovered") == "recovered"
    # and a success clears the failure, so the next miss is a real attempt again
    clock[0] = 1022.0
    assert cache.get_or_refresh("k", lambda prev: "again") == "again"
