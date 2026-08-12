"""Reading scalar time series and baseline books back from the archive."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import Select, func, select

from data.storage import db, schema
from data.storage.errors import StorageUnavailable

Resolution = Literal["1h", "1d"]

# below this many daily observations a percentile says more about the window than the value
MIN_PERCENTILE_POINTS = 30
PERCENTILE_WINDOW_DAYS = 365


def _series_stmt(columns: list, currency: str, start: datetime, resolution: Resolution) -> Select:
    """Range scan over ``uq_snapshot_currency_as_of``; ``1d`` keeps the last capture per
    UTC day via ``DISTINCT ON`` (the archive is postgres-only already)."""
    where = (schema.snapshot.c.currency == currency, schema.snapshot.c.as_of >= start)
    if resolution == "1h":
        return select(*columns).where(*where).order_by(schema.snapshot.c.as_of)
    day = func.date_trunc("day", schema.snapshot.c.as_of)
    daily = (
        select(*columns)
        .where(*where)
        .distinct(day)
        .order_by(day, schema.snapshot.c.as_of.desc())
        .subquery()
    )
    return select(daily).order_by(daily.c.as_of)


def vol_series(currency: str, start: datetime, resolution: Resolution) -> list[dict]:
    """Archived vol scalars per capture, ascending in time."""
    c = schema.snapshot.c
    columns = [
        c.as_of,
        c.spot,
        c.iv7,
        c.iv30,
        (c.iv30 - c.iv7).label("term_slope"),
        c.rv7,
        c.rv30,
        c.dvol,
        c.rr25_7,
        c.bf25_7,
        c.rr25_30,
        c.bf25_30,
    ]
    return db.rows(_series_stmt(columns, currency, start, resolution), "archive")


def positioning_series(currency: str, start: datetime, resolution: Resolution) -> list[dict]:
    """Archived positioning scalars per capture, ascending in time."""
    c = schema.snapshot.c
    columns = [
        c.as_of,
        c.spot,
        c.oi_total_calls,
        c.oi_total_puts,
        c.gex_net_total,
        c.gex_flip,
        c.max_pain_front,
    ]
    return db.rows(_series_stmt(columns, currency, start, resolution), "archive")


def iv30_percentile(currency: str, current: float | None) -> float | None:
    """Percentile of ``current`` among the trailing year's daily iv30 observations.

    Fail-soft by contract: any storage failure or thin history reads as ``None`` so the
    stats route keeps serving without the archive.
    """
    if current is None:
        return None
    start = datetime.now(UTC) - timedelta(days=PERCENTILE_WINDOW_DAYS)
    c = schema.snapshot.c
    try:
        rows = db.rows(_series_stmt([c.as_of, c.iv30], currency, start, "1d"), "archive")
    except StorageUnavailable:
        return None
    values = [row["iv30"] for row in rows if row["iv30"] is not None]
    if len(values) < MIN_PERCENTILE_POINTS:
        return None
    return sum(v <= current for v in values) / len(values)


def cm_bands(currency: str, start: datetime) -> list[dict]:
    """Per-tenor percentiles of the CM grid over the window, daily-downsampled.

    One row per tenor: p25/p50/p75 for atm_iv, rr25 and bf25 plus the number of daily
    atm_iv observations behind them. ``percentile_cont`` ignores NULL inputs, so a
    metric a day's chain did not span simply contributes nothing.
    """
    s, m = schema.snapshot.c, schema.cm_metric.c
    day = func.date_trunc("day", s.as_of)
    daily = (
        select(m.tenor_days, m.atm_iv, m.rr25, m.bf25)
        .join_from(schema.cm_metric, schema.snapshot, m.snapshot_id == s.id)
        .where(s.currency == currency, s.as_of >= start)
        .distinct(day, m.tenor_days)
        .order_by(day, m.tenor_days, s.as_of.desc())
        .subquery()
    )

    def pct(column, q: float):
        return func.percentile_cont(q).within_group(column)

    stmt = (
        select(
            daily.c.tenor_days,
            *(
                pct(daily.c[metric], q).label(f"{metric}_p{int(q * 100)}")
                for metric in ("atm_iv", "rr25", "bf25")
                for q in (0.25, 0.50, 0.75)
            ),
            func.count(daily.c.atm_iv).label("count"),
        )
        .group_by(daily.c.tenor_days)
        .order_by(daily.c.tenor_days)
    )
    return db.rows(stmt, "archive")


# a baseline drifting further than this fraction of the window off its target is
# flagged as stale rather than dropped - an older-but-usable baseline still informs
BASELINE_STALE_FRACTION = 0.25


def baseline_stale(baseline_as_of: datetime, target: datetime, window: timedelta) -> bool:
    """Whether the baseline drifted more than ``BASELINE_STALE_FRACTION`` of ``window``."""
    return abs(target - baseline_as_of) > BASELINE_STALE_FRACTION * window


def baseline_snapshot(currency: str, target: datetime) -> tuple[int, datetime, float] | None:
    """The latest archived ``(id, as_of, spot)`` at or before ``target``."""
    c = schema.snapshot.c
    stmt = (
        select(c.id, c.as_of, c.spot)
        .where(c.currency == currency, c.as_of <= target)
        .order_by(c.as_of.desc())
        .limit(1)
    )
    rows = db.rows(stmt, "archive")
    if not rows:
        return None
    return int(rows[0]["id"]), rows[0]["as_of"], float(rows[0]["spot"])


def baseline_oi_by_strike(snapshot_id: int, expiry: datetime | None, now: datetime) -> list[dict]:
    """Per-(strike, option_type) open interest of one archived book.

    Expiries at or before ``now`` are excluded: they have rolled off since capture, and
    counting them would read as positions closing rather than time passing.
    """
    c = schema.contract.c
    stmt = (
        select(c.strike, c.option_type, func.sum(c.open_interest).label("open_interest"))
        .where(c.snapshot_id == snapshot_id, c.open_interest > 0, c.expiry > now)
        .group_by(c.strike, c.option_type)
    )
    if expiry is not None:
        stmt = stmt.where(c.expiry == expiry)
    return db.rows(stmt, "archive")
