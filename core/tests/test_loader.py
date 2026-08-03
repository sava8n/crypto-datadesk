"""Market-state loading."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from config import settings
from data.clients.deribit import DeribitError
from data.market import loader
from data.cache import TTLCache
from data.market.errors import UpstreamError


@pytest.fixture
def cold_cache(monkeypatch):
    """A cache that never serves a hit, so every call exercises the producer."""
    cache = TTLCache(ttl_seconds=0)
    monkeypatch.setattr(loader, "_cache", cache)
    return cache


def _stored(cache, ccy, state):
    """Seed an expired entry, the shape the producer sees as ``prev``."""
    cache._store[f"market:{ccy}"] = (-1e9, state)


def _upstream_down(monkeypatch):
    def boom(*_args, **_kwargs):
        raise DeribitError("upstream down")

    monkeypatch.setattr(loader.deribit, "fetch_spot", boom)
    monkeypatch.setattr(loader.deribit, "fetch_option_summaries", boom)


def test_upstream_failure_with_no_previous_state_raises(cold_cache, monkeypatch):
    """A domain error, not an HTTPException: the recorder runs this with no request."""
    _upstream_down(monkeypatch)
    with pytest.raises(UpstreamError):
        loader.load_market_state("BTC")


def test_recent_state_is_served_stale(cold_cache, monkeypatch, market_state):
    prev = market_state
    prev.as_of = datetime.now(UTC) - timedelta(seconds=30)
    _stored(cold_cache, "BTC", prev)
    _upstream_down(monkeypatch)

    served = loader.load_market_state("BTC")

    assert served is prev
    # as_of must not be restamped: it is how a client sees the data has stopped moving,
    # and it is what keeps the recorder's ON CONFLICT a no-op through the outage
    assert served.as_of == prev.as_of


def test_state_older_than_the_window_raises(cold_cache, monkeypatch, market_state):
    prev = market_state
    prev.as_of = datetime.now(UTC) - timedelta(seconds=settings.max_stale_seconds + 60)
    _stored(cold_cache, "BTC", prev)
    _upstream_down(monkeypatch)

    with pytest.raises(UpstreamError):
        loader.load_market_state("BTC")


def test_candle_failures_keep_the_previous_history(cold_cache, monkeypatch, market_state):
    """Candles are best-effort: losing them must not cost the whole state."""
    prev = market_state
    _stored(cold_cache, "BTC", prev)

    monkeypatch.setattr(loader.deribit, "fetch_spot", lambda _ccy: 101_000.0)
    monkeypatch.setattr(loader.deribit, "fetch_option_summaries", lambda _ccy: [])

    def boom(*_args, **_kwargs):
        raise DeribitError("history unavailable")

    monkeypatch.setattr(loader.deribit, "fetch_spot_history", boom)
    monkeypatch.setattr(loader.deribit, "fetch_dvol_history", boom)

    state = loader.load_market_state("BTC")

    assert state.spot == 101_000.0  # the chain fetch succeeded, so this is a fresh state
    assert state.spot_candles is prev.spot_candles
    assert state.dvol_candles is prev.dvol_candles


def test_warm_up_never_raises(cold_cache, monkeypatch):
    """Boot must not be blocked by an upstream that happens to be down."""
    _upstream_down(monkeypatch)
    loader.warm_up()
