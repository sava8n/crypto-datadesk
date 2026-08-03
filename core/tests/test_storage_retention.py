"""Retention window and sweep-schedule arithmetic."""

from __future__ import annotations

from datetime import UTC, datetime, time, timedelta

import pytest

from data.storage.retention import cutoff, seconds_until

_DAY = 86_400.0


def _utc(*args) -> datetime:
    return datetime(*args, tzinfo=UTC)


@pytest.mark.parametrize(
    "now, at, expected",
    [
        (_utc(2026, 7, 25, 12, 0, 0), time(0, 0), 12 * 3600),
        (_utc(2026, 7, 25, 23, 59, 59), time(0, 0), 1),
        (_utc(2026, 7, 25, 5, 0, 0), time(8, 0), 3 * 3600),
        (_utc(2026, 7, 25, 9, 0, 0), time(8, 0), 23 * 3600),
        # minutes and seconds are honoured, not truncated to the hour
        (_utc(2026, 7, 25, 0, 0, 0), time(0, 5), 5 * 60),
        (_utc(2026, 7, 25, 0, 10, 0), time(0, 5), _DAY - 5 * 60),
        (_utc(2026, 7, 25, 3, 0, 0), time(3, 30, 15), 30 * 60 + 15),
    ],
)
def test_seconds_until(now, at, expected):
    assert seconds_until(now, at) == pytest.approx(expected)


def test_seconds_until_on_the_mark_waits_a_full_day():
    """Returning 0 here would spin the sweep loop."""
    assert seconds_until(_utc(2026, 7, 25, 0, 5, 0), time(0, 5)) == _DAY


def test_cutoff_rounds_down_to_midnight():
    assert cutoff(_utc(2027, 7, 25, 3, 17, 42), 365) == _utc(2026, 7, 25)


@pytest.mark.parametrize("hour", [0, 6, 13, 23])
def test_cutoff_never_prunes_younger_than_the_window(hour):
    now = _utc(2027, 7, 25, hour, 30, 0)
    assert now - cutoff(now, 365) >= timedelta(days=365)
