"""Weekly report generation on a fixed wall-clock schedule."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, time, timedelta

from config import settings
from data.report import generate
from data.storage import report as storage

logger = logging.getLogger(__name__)

# Sunday, datetime.weekday() convention
REPORT_WEEKDAY = 6


def seconds_until_weekday(now: datetime, weekday: int, at: time) -> float:
    """Seconds from ``now`` to the next ``weekday`` at ``at`` UTC.

    Always strictly in the future - landing exactly on it returns a full week, so a
    caller looping on this cannot spin.
    """
    target = now.replace(hour=at.hour, minute=at.minute, second=at.second, microsecond=0)
    target += timedelta(days=(weekday - now.weekday()) % 7)
    if target <= now:
        target += timedelta(days=7)
    return (target - now).total_seconds()


def last_scheduled(now: datetime) -> datetime:
    """The most recent scheduled slot at or before ``now``."""
    at = settings.report_generate_at_utc
    ahead = seconds_until_weekday(now, REPORT_WEEKDAY, at)
    return now + timedelta(seconds=ahead) - timedelta(days=7)


def next_run(now: datetime) -> datetime:
    """The next scheduled slot strictly after ``now``."""
    at = settings.report_generate_at_utc
    return now + timedelta(seconds=seconds_until_weekday(now, REPORT_WEEKDAY, at))


def ensure_current() -> None:
    """Generate this week's report unless one exists.

    The guard makes restarts safe: a container bounce after the slot must not trigger
    a second paid research call.
    """
    now = datetime.now(UTC)
    latest = storage.latest_generated_at()
    if latest is not None and latest >= last_scheduled(now):
        logger.debug("report from %s is current, skipping generation", latest.isoformat())
        return
    generate.generate(now)


async def run() -> None:
    """Catch up at boot, then generate every ``REPORT_WEEKDAY`` at the configured time.

    A failed attempt retries with doubling backoff instead of waiting for the next slot.
    """
    delay = settings.report_retry_seconds
    while True:
        try:
            await asyncio.to_thread(ensure_current)
        except Exception:
            logger.exception("weekly report generation failed, retrying in %.0f s", delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, settings.report_retry_max_seconds)
            continue
        delay = settings.report_retry_seconds
        pause = seconds_until_weekday(
            datetime.now(UTC), REPORT_WEEKDAY, settings.report_generate_at_utc
        )
        logger.info("next report generation in %.0f s", pause)
        await asyncio.sleep(pause)
