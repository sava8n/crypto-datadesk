"""The guards that run before the archive is touched and the slot-aligned loop."""

from __future__ import annotations

import asyncio
import math
from datetime import UTC, datetime, timedelta

import pytest

from config import settings
from data.storage import db, recorder, snapshots

INTERVAL_MINUTES = 60
INTERVAL_SECONDS = INTERVAL_MINUTES * 60
MID_SLOT = datetime(2026, 8, 22, 14, 37, 12, tzinfo=UTC)
SLOT = datetime(2026, 8, 22, 14, 0, tzinfo=UTC)


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


def _frozen(now: datetime):
    class _Datetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return now

    return _Datetime


@pytest.fixture
def stored(monkeypatch):
    """Stands in for the archive: ``latest_as_of`` reads back whatever ``record`` wrote."""
    written: list[datetime] = []

    def record(state, currency):
        written.append(state.as_of)
        return len(written)

    monkeypatch.setattr(settings, "snapshot_interval_minutes", INTERVAL_MINUTES)
    monkeypatch.setattr(recorder, "datetime", _frozen(MID_SLOT))
    monkeypatch.setattr(snapshots, "latest_as_of", lambda _ccy: written[-1] if written else None)
    monkeypatch.setattr(snapshots, "record", record)
    return written


def _serves(monkeypatch, state):
    monkeypatch.setattr(recorder, "load_market_state", lambda _ccy: state)


@pytest.mark.parametrize(
    ("now", "interval", "expected"),
    [
        (MID_SLOT, 3600, SLOT),
        (MID_SLOT, 900, SLOT.replace(minute=30)),
        (SLOT, 3600, SLOT),
    ],
)
def test_slot_start_floors_to_the_interval(now, interval, expected):
    assert recorder.slot_start(now, interval) == expected


@pytest.mark.parametrize(
    ("now", "interval", "expected"),
    [
        (MID_SLOT, 3600, 22 * 60 + 48),
        (MID_SLOT, 900, 7 * 60 + 48),
        # exactly on the boundary: a full interval, never zero
        (SLOT, 3600, 3600),
    ],
)
def test_seconds_until_slot_is_strictly_future(now, interval, expected):
    assert recorder.seconds_until_slot(now, interval) == expected


def test_first_capture_is_due(stored, market_state, monkeypatch):
    """Nothing archived yet, so there is nothing for the guard to compare against."""
    _serves(monkeypatch, _at(market_state, MID_SLOT))

    assert recorder.record_once("BTC") is not None
    assert len(stored) == 1


def test_recapture_inside_the_same_slot_is_skipped(stored, market_state, monkeypatch):
    """A restart mid-slot refetches a *different* ``as_of``.

    The unique constraint only catches a byte-identical replay, so the slot guard is the
    only thing standing between a restart loop and a snapshot per boot.
    """
    _serves(monkeypatch, _at(market_state, SLOT + timedelta(seconds=3)))
    assert recorder.record_once("BTC") is not None

    _serves(monkeypatch, _at(market_state, MID_SLOT))
    assert recorder.record_once("BTC") is None
    assert len(stored) == 1


def test_capture_in_a_new_slot_is_due(stored, market_state, monkeypatch):
    """A row from the previous slot must not block this one, however fresh it is."""
    stored.append(SLOT - timedelta(seconds=1))
    _serves(monkeypatch, _at(market_state, MID_SLOT))

    assert recorder.record_once("BTC") is not None
    assert len(stored) == 2


def test_skipping_costs_no_upstream_fetch(stored, market_state, monkeypatch):
    """``_due`` runs before ``load_market_state``, which is half the point of having it."""

    def explode(_ccy):
        raise AssertionError("upstream must not be fetched when a capture is not due")

    stored.append(SLOT)
    monkeypatch.setattr(recorder, "load_market_state", explode)

    assert recorder.record_once("BTC") is None


def test_unusable_spot_never_opens_a_connection(market_state, monkeypatch):
    """``snapshot.spot`` is NOT NULL, so a bad spot has to abort before the transaction."""

    def explode():
        raise AssertionError("record must not connect for a state it cannot store")

    monkeypatch.setattr(db, "connection", explode)

    assert snapshots.record(_at(market_state, MID_SLOT, spot=math.nan), "BTC") is None


class _Stop(Exception):
    pass


def test_run_records_at_boot_then_sleeps_to_the_boundary(monkeypatch):
    monkeypatch.setattr(settings, "snapshot_interval_minutes", INTERVAL_MINUTES)
    monkeypatch.setattr(recorder, "datetime", _frozen(MID_SLOT))
    sleeps = []
    passes = []

    async def record_all():
        passes.append(len(sleeps))

    async def fake_sleep(seconds):
        sleeps.append(seconds)
        if len(sleeps) == 2:
            raise _Stop

    monkeypatch.setattr(recorder, "_record_all", record_all)
    monkeypatch.setattr(recorder.asyncio, "sleep", fake_sleep)

    with pytest.raises(_Stop):
        asyncio.run(recorder.run())
    # a pass before any sleep, then one per wake-up; the wait is to the next :00, not 1h
    assert passes == [0, 1]
    assert sleeps == [22 * 60 + 48, 22 * 60 + 48]
