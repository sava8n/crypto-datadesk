"""The guards that run before the archive is touched."""

from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta

import pytest

from config import settings
from data.storage import db, recorder, snapshots

INTERVAL_MINUTES = 60


def _at(state, as_of: datetime, spot: float | None = None):
    """The same market state stamped at a different time, optionally a different spot."""
    from data.market.state import MarketState

    return MarketState(
        as_of=as_of,
        spot=state.spot if spot is None else spot,
        contracts=state.contracts,
        spot_candles=state.spot_candles,
        dvol_candles=state.dvol_candles,
    )


@pytest.fixture
def stored(monkeypatch):
    """Stands in for the archive: ``latest_as_of`` reads back whatever ``record`` wrote."""
    written: list[datetime] = []

    def record(state, currency):
        written.append(state.as_of)
        return len(written)

    monkeypatch.setattr(settings, "snapshot_interval_minutes", INTERVAL_MINUTES)
    monkeypatch.setattr(snapshots, "latest_as_of", lambda _ccy: written[-1] if written else None)
    monkeypatch.setattr(snapshots, "record", record)
    return written


def _serves(monkeypatch, state):
    monkeypatch.setattr(recorder, "load_market_state", lambda _ccy: state)


def test_first_capture_is_due(stored, market_state, monkeypatch):
    """Nothing archived yet, so there is nothing for the guard to compare against."""
    _serves(monkeypatch, _at(market_state, datetime.now(UTC)))

    assert recorder.record_once("BTC") is not None
    assert len(stored) == 1


def test_recapture_inside_half_the_interval_is_skipped(stored, market_state, monkeypatch):
    """A restart mid-interval refetches a *different* ``as_of``.

    The unique constraint only catches a byte-identical replay, so the interval guard is
    the only thing standing between a restart loop and a snapshot per boot.
    """
    _serves(monkeypatch, _at(market_state, datetime.now(UTC)))
    assert recorder.record_once("BTC") is not None

    _serves(monkeypatch, _at(market_state, datetime.now(UTC)))
    assert recorder.record_once("BTC") is None
    assert len(stored) == 1


def test_capture_past_half_the_interval_is_due(stored, market_state, monkeypatch):
    """Half an interval is the threshold, not a whole one."""
    stored.append(datetime.now(UTC) - timedelta(minutes=INTERVAL_MINUTES / 2, seconds=1))
    _serves(monkeypatch, _at(market_state, datetime.now(UTC)))

    assert recorder.record_once("BTC") is not None
    assert len(stored) == 2


def test_skipping_costs_no_upstream_fetch(stored, market_state, monkeypatch):
    """``_due`` runs before ``load_market_state``, which is half the point of having it."""

    def explode(_ccy):
        raise AssertionError("upstream must not be fetched when a capture is not due")

    stored.append(datetime.now(UTC))
    monkeypatch.setattr(recorder, "load_market_state", explode)

    assert recorder.record_once("BTC") is None


def test_unusable_spot_never_opens_a_connection(market_state, monkeypatch):
    """``snapshot.spot`` is NOT NULL, so a bad spot has to abort before the transaction."""

    def explode():
        raise AssertionError("record must not connect for a state it cannot store")

    monkeypatch.setattr(db, "connection", explode)

    assert snapshots.record(_at(market_state, datetime.now(UTC), spot=math.nan), "BTC") is None
