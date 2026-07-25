"""Retention window and sweep-schedule arithmetic."""

from __future__ import annotations

from datetime import datetime, time, timedelta


def seconds_until(now: datetime, at: time) -> float:
    """Seconds from ``now`` to the next ``at`` UTC.

    Always strictly in the future - landing exactly on it returns a full day, so a
    caller looping on this cannot spin.
    """
    target = now.replace(hour=at.hour, minute=at.minute, second=at.second, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def cutoff(now: datetime, days: int) -> datetime:
    """Start of the UTC day ``days`` before ``now``.

    Rounded down to midnight, so a sweep at any time of day deletes only rows that are
    at least ``days`` old - the window is never shorter than configured.
    """
    return now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
