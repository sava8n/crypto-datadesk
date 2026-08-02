"""Reading scalar time series and baseline books back from the archive."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import Select, func, select

from data.storage import db, schema
from data.storage.errors import StorageUnavailable

logger = logging.getLogger(__name__)

Resolution = Literal["1h", "1d"]

# below this many daily observations a percentile says more about the window than the value
MIN_PERCENTILE_POINTS = 30
PERCENTILE_WINDOW_DAYS = 365


def _rows(stmt: Select) -> list[dict]:
    try:
        with db.connection() as conn:
            return [dict(row) for row in conn.execute(stmt).mappings()]
    except Exception as exc:
        logger.warning("archive read failed: %s", exc)
        raise StorageUnavailable("archive unavailable") from exc


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
        c.rv30,
        c.dvol,
        c.rr25_7,
        c.bf25_7,
        c.rr25_30,
        c.bf25_30,
    ]
    return _rows(_series_stmt(columns, currency, start, resolution))


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
    return _rows(_series_stmt(columns, currency, start, resolution))


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
        rows = _rows(_series_stmt([c.as_of, c.iv30], currency, start, "1d"))
    except StorageUnavailable:
        return None
    values = [row["iv30"] for row in rows if row["iv30"] is not None]
    if len(values) < MIN_PERCENTILE_POINTS:
        return None
    return sum(v <= current for v in values) / len(values)


def baseline_snapshot(currency: str, target: datetime) -> tuple[int, datetime] | None:
    """The latest archived ``(id, as_of)`` at or before ``target``."""
    c = schema.snapshot.c
    stmt = (
        select(c.id, c.as_of)
        .where(c.currency == currency, c.as_of <= target)
        .order_by(c.as_of.desc())
        .limit(1)
    )
    rows = _rows(stmt)
    if not rows:
        return None
    return int(rows[0]["id"]), rows[0]["as_of"]


def baseline_oi_by_strike(
    snapshot_id: int, expiry: datetime | None, now: datetime
) -> list[dict]:
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
    return _rows(stmt)
