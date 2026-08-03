"""Nightly pruning of snapshots past the retention window."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, time, timedelta

from sqlalchemy import select, text

from config import settings
from data.storage import db, schema

logger = logging.getLogger(__name__)

# a sweep queued behind a long analytical scan should give up, not block readers
LOCK_TIMEOUT_SECONDS = 5
# ~175k contract rows per transaction at hourly captures of the BTC book
SNAPSHOTS_PER_CHUNK = 200
# ~5 days of BTC prints per transaction at ~10k/day
TRADES_PER_CHUNK = 50_000


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


def _aged_snapshot_ids(horizon: datetime, limit: int) -> list[int]:
    stmt = (
        select(schema.snapshot.c.id)
        .where(schema.snapshot.c.as_of < horizon)
        .order_by(schema.snapshot.c.as_of)
        .limit(limit)
    )
    with db.connection() as conn:
        return list(conn.scalars(stmt))


def _delete_chunk(snapshot_ids: list[int]) -> tuple[int, int]:
    """Delete these snapshots and their contracts in one transaction."""
    with db.connection() as conn:
        # set_config is the bindable form of SET LOCAL, which takes no parameters
        conn.execute(
            text("select set_config('lock_timeout', :timeout, true)"),
            {"timeout": f"{LOCK_TIMEOUT_SECONDS}s"},
        )
        # children first, so the cascade never has bulk work to do
        contracts = conn.execute(
            schema.contract.delete().where(schema.contract.c.snapshot_id.in_(snapshot_ids))
        ).rowcount
        snapshots = conn.execute(
            schema.snapshot.delete().where(schema.snapshot.c.id.in_(snapshot_ids))
        ).rowcount
    return contracts, snapshots


def _delete_aged_trades(horizon: datetime) -> int:
    """Delete prints older than ``horizon`` in bounded chunks; returns rows removed."""
    total = 0
    while True:
        aged = (
            select(schema.trade.c.trade_id)
            .where(schema.trade.c.ts < horizon)
            .limit(TRADES_PER_CHUNK)
        )
        with db.connection() as conn:
            conn.execute(
                text("select set_config('lock_timeout', :timeout, true)"),
                {"timeout": f"{LOCK_TIMEOUT_SECONDS}s"},
            )
            removed = conn.execute(
                schema.trade.delete().where(schema.trade.c.trade_id.in_(aged))
            ).rowcount
        total += removed
        if removed < TRADES_PER_CHUNK:
            return total


def _delete_aged_outcomes(horizon: datetime) -> int:
    """One small delete - a year holds only a few hundred outcome rows."""
    with db.connection() as conn:
        return conn.execute(
            schema.expiry_outcome.delete().where(schema.expiry_outcome.c.expiry < horizon)
        ).rowcount


def prune() -> tuple[int, int]:
    """Delete everything older than the window; returns ``(contracts, snapshots)``."""
    horizon = cutoff(datetime.now(UTC), settings.retention_days)
    total_contracts = total_snapshots = 0

    while ids := _aged_snapshot_ids(horizon, SNAPSHOTS_PER_CHUNK):
        contracts, snapshots = _delete_chunk(ids)
        total_contracts += contracts
        total_snapshots += snapshots

    trades = _delete_aged_trades(horizon)
    outcomes = _delete_aged_outcomes(horizon)

    logger.info(
        "retention sweep removed %d contracts, %d snapshots, %d prints and %d outcomes "
        "older than %s",
        total_contracts,
        total_snapshots,
        trades,
        outcomes,
        horizon.isoformat(),
    )
    return total_contracts, total_snapshots


async def run() -> None:
    """Sweep once per day at ``retention_sweep_at_utc``; failures retry the next night."""
    while True:
        delay = seconds_until(datetime.now(UTC), settings.retention_sweep_at_utc)
        logger.info("next retention sweep in %.0f s", delay)
        await asyncio.sleep(delay)
        try:
            await asyncio.to_thread(prune)
        except Exception:
            logger.exception("retention sweep failed")
