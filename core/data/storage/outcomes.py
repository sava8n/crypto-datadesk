"""Settled-expiry expected-move outcomes: implied +-1 sigma vs the realized move.

Each settled expiry's book is replayed from the archive at most once - the result is
cached in ``expiry_outcome`` and served from there. The implied move is read from the
snapshot nearest one day before settlement; the realized move compares that snapshot's
spot with Deribit's delivery price.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from analytics.frames import finite
from analytics.prob import distribution, quantiles
from data.clients import deribit
from data.market.chain import prepare_otm_quotes
from data.storage import db, read, schema, series

logger = logging.getLogger(__name__)

# the implied move is quoted "as of T-1d"; a reference older than this is not that
EM_HORIZON = timedelta(days=1)
MAX_REFERENCE_AGE = timedelta(days=2)
CANDIDATE_LOOKBACK = timedelta(days=14)


def stored(currency: str, limit: int) -> list[dict]:
    """Cached outcomes, most recently settled first."""
    c = schema.expiry_outcome.c
    stmt = (
        select(c.expiry, c.reference_as_of, c.spot_ref, c.em_implied, c.settlement, c.realized_move)
        .where(c.currency == currency)
        .order_by(c.expiry.desc())
        .limit(limit)
    )
    return db.rows(stmt, "outcome")


def _settled_candidates(currency: str, now: datetime, limit: int) -> list[datetime]:
    """Recently settled expiries present in the archive, newest first.

    ``ix_contract_expiry_strike`` leads on expiry, so the distinct range scan is cheap.
    """
    c, s = schema.contract.c, schema.snapshot.c
    stmt = (
        select(c.expiry)
        .join_from(schema.contract, schema.snapshot, c.snapshot_id == s.id)
        .where(s.currency == currency, c.expiry <= now, c.expiry >= now - CANDIDATE_LOOKBACK)
        .distinct()
        .order_by(c.expiry.desc())
        .limit(limit)
    )
    return db.scalars(stmt, "outcome candidate")


def _implied_em(snapshot_id: int, spot_ref: float, expiry: datetime) -> float | None:
    """+-1 sigma implied move from the archived book, through the live prob pipeline."""
    quotes = prepare_otm_quotes(read.load_contracts(snapshot_id), spot_ref)
    frame = quantiles.build(distribution.build(quotes[quotes["expiry"] == pd.Timestamp(expiry)]))
    if frame.empty:
        return None
    row = frame.iloc[0]
    p16, p84 = finite(row["p16"]), finite(row["p84"])
    if p16 is None or p84 is None:
        return None
    return (p84 - p16) / 2.0


def refresh(currency: str, now: datetime, limit: int) -> None:
    """Compute and cache outcomes for settled expiries not yet stored.

    Best-effort per expiry: a missing delivery price or a reference snapshot too far
    from T-1d skips the expiry, to be retried on a later call. Raises ``DeribitError``
    only when delivery prices themselves cannot be fetched.
    """
    candidates = _settled_candidates(currency, now, limit)
    known = {row["expiry"] for row in stored(currency, limit)}
    missing = [expiry for expiry in candidates if expiry not in known]
    if not missing:
        return

    deliveries = {
        entry["date"]: float(entry["delivery_price"])
        for entry in deribit.fetch_delivery_prices(currency)
    }

    for expiry in missing:
        settlement = deliveries.get(expiry.date().isoformat())
        if settlement is None:
            continue
        baseline = series.baseline_snapshot(currency, expiry - EM_HORIZON)
        if baseline is None:
            continue
        snapshot_id, reference_as_of, spot_ref = baseline
        if expiry - reference_as_of > MAX_REFERENCE_AGE:
            continue
        row = {
            "currency": currency,
            "expiry": expiry,
            "reference_as_of": reference_as_of,
            "spot_ref": spot_ref,
            "em_implied": _implied_em(snapshot_id, spot_ref, expiry),
            "settlement": settlement,
            "realized_move": abs(settlement - spot_ref),
        }
        with db.connection() as conn:
            conn.execute(
                pg_insert(schema.expiry_outcome)
                .values(row)
                .on_conflict_do_nothing(index_elements=["currency", "expiry"])
            )
        logger.info("cached outcome for %s expiry %s", currency, expiry.isoformat())
