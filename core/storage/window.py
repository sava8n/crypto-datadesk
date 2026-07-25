"""Retention window and sweep-schedule arithmetic. Pure, no database imports."""

from __future__ import annotations

from datetime import datetime, timedelta


def seconds_until_hour(now: datetime, hour: int) -> float:
    """Seconds from ``now`` to the next ``hour``:00 UTC.

    Always strictly in the future - landing exactly on the hour returns a full day,
    so a caller looping on this cannot spin.
    """
    target = now.replace(hour=hour, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def cutoff(now: datetime, days: int) -> datetime:
    """Start of the UTC day ``days`` before ``now``.

    Rounded down to midnight, so a sweep at any hour deletes only rows that are at
    least ``days`` old - the window is never shorter than configured.
    """
    return now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
