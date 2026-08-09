"""Weekly schedule arithmetic, the restart guard, and failure retries."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, time, timedelta

import pytest

from data.report import scheduler

AT = time(8, 0)
SUNDAY = scheduler.REPORT_WEEKDAY

# 2026-08-09 is a Sunday
SUNDAY_SLOT = datetime(2026, 8, 9, 8, 0, tzinfo=UTC)


def test_midweek_waits_until_sunday():
    wednesday = datetime(2026, 8, 5, 12, 30, tzinfo=UTC)
    seconds = scheduler.seconds_until_weekday(wednesday, SUNDAY, AT)
    assert wednesday + timedelta(seconds=seconds) == SUNDAY_SLOT


def test_sunday_before_the_slot_waits_until_it():
    early = SUNDAY_SLOT.replace(hour=6)
    seconds = scheduler.seconds_until_weekday(early, SUNDAY, AT)
    assert early + timedelta(seconds=seconds) == SUNDAY_SLOT


def test_on_the_slot_waits_a_full_week():
    """Strictly future, so the run loop cannot spin."""
    seconds = scheduler.seconds_until_weekday(SUNDAY_SLOT, SUNDAY, AT)
    assert seconds == pytest.approx(timedelta(days=7).total_seconds())


def test_sunday_after_the_slot_waits_until_next_week():
    late = SUNDAY_SLOT.replace(hour=9)
    seconds = scheduler.seconds_until_weekday(late, SUNDAY, AT)
    assert late + timedelta(seconds=seconds) == SUNDAY_SLOT + timedelta(days=7)


def test_last_scheduled_and_next_run_bracket_now():
    for now in (
        SUNDAY_SLOT,
        SUNDAY_SLOT + timedelta(minutes=1),
        SUNDAY_SLOT + timedelta(days=3),
        SUNDAY_SLOT - timedelta(minutes=1),
    ):
        last, upcoming = scheduler.last_scheduled(now), scheduler.next_run(now)
        assert last <= now < upcoming
        assert upcoming - last == timedelta(days=7)


def test_ensure_current_skips_when_this_weeks_report_exists(monkeypatch):
    now = SUNDAY_SLOT + timedelta(days=2)
    monkeypatch.setattr(scheduler, "datetime", _frozen(now))
    monkeypatch.setattr(scheduler.storage, "latest_generated_at", lambda: SUNDAY_SLOT)

    def unexpected(_now):
        raise AssertionError("must not regenerate an existing report")

    monkeypatch.setattr(scheduler.generate, "generate", unexpected)
    scheduler.ensure_current()


@pytest.mark.parametrize(
    "latest", [None, SUNDAY_SLOT - timedelta(days=7), SUNDAY_SLOT - timedelta(minutes=1)]
)
def test_ensure_current_generates_when_stale_or_empty(monkeypatch, latest):
    now = SUNDAY_SLOT + timedelta(days=2)
    monkeypatch.setattr(scheduler, "datetime", _frozen(now))
    monkeypatch.setattr(scheduler.storage, "latest_generated_at", lambda: latest)
    ran = []
    monkeypatch.setattr(scheduler.generate, "generate", lambda when: ran.append(when))

    scheduler.ensure_current()
    assert ran == [now]


class _Stop(Exception):
    pass


def test_run_retries_failures_with_capped_backoff(monkeypatch):
    monkeypatch.setattr(scheduler.settings, "report_retry_seconds", 100)
    monkeypatch.setattr(scheduler.settings, "report_retry_max_seconds", 250)
    attempts = []

    def failing():
        attempts.append(1)
        raise RuntimeError("boom")

    sleeps = []

    async def fake_sleep(seconds):
        sleeps.append(seconds)
        if len(sleeps) == 4:
            raise _Stop

    monkeypatch.setattr(scheduler, "ensure_current", failing)
    monkeypatch.setattr(scheduler.asyncio, "sleep", fake_sleep)

    with pytest.raises(_Stop):
        asyncio.run(scheduler.run())
    assert sleeps == [100, 200, 250, 250]
    assert len(attempts) == 4


def test_run_success_resets_backoff_and_resumes_weekly_cadence(monkeypatch):
    monkeypatch.setattr(scheduler, "datetime", _frozen(SUNDAY_SLOT + timedelta(days=2)))
    monkeypatch.setattr(scheduler.settings, "report_retry_seconds", 100)
    calls = []

    def flaky():
        calls.append(1)
        if len(calls) == 1:
            raise RuntimeError("boom")

    sleeps = []

    async def fake_sleep(seconds):
        sleeps.append(seconds)
        if len(sleeps) == 2:
            raise _Stop

    monkeypatch.setattr(scheduler, "ensure_current", flaky)
    monkeypatch.setattr(scheduler.asyncio, "sleep", fake_sleep)

    with pytest.raises(_Stop):
        asyncio.run(scheduler.run())
    # retry delay first, then the weekly sleep (frozen Tuesday 08:00 -> next Sunday)
    assert sleeps == [100, timedelta(days=5).total_seconds()]
    assert len(calls) == 2


def _frozen(now: datetime):
    class _Datetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return now

    return _Datetime
