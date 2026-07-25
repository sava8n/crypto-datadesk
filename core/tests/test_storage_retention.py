"""Retention window and sweep-schedule arithmetic."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from storage.window import cutoff, seconds_until_hour

_DAY = 86_400.0


def _utc(*args) -> datetime:
    return datetime(*args, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "now, hour, expected",
    [
        (_utc(2026, 7, 25, 12, 0, 0), 0, 12 * 3600),
        (_utc(2026, 7, 25, 23, 59, 59), 0, 1),
        (_utc(2026, 7, 25, 5, 0, 0), 8, 3 * 3600),
        (_utc(2026, 7, 25, 9, 0, 0), 8, 23 * 3600),
    ],
)
def test_seconds_until_hour(now, hour, expected):
    assert seconds_until_hour(now, hour) == pytest.approx(expected)


def test_seconds_until_hour_on_the_hour_waits_a_full_day():
    """Returning 0 here would spin the sweep loop."""
    assert seconds_until_hour(_utc(2026, 7, 25, 0, 0, 0), 0) == _DAY


def test_cutoff_rounds_down_to_midnight():
    assert cutoff(_utc(2027, 7, 25, 3, 17, 42), 365) == _utc(2026, 7, 25)


@pytest.mark.parametrize("hour", [0, 6, 13, 23])
def test_cutoff_never_prunes_younger_than_the_window(hour):
    now = _utc(2027, 7, 25, hour, 30, 0)
    assert now - cutoff(now, 365) >= timedelta(days=365)
