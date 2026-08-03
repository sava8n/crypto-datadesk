"""Realized-vol cone: rolling RV percentiles per window against the current value."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from numpy.lib.stride_tricks import sliding_window_view

from analytics.conventions import TRADING_DAYS_PER_YEAR
from analytics.frames import as_declared_dtypes, empty_frame

logger = logging.getLogger(__name__)

CONE_COLUMNS = ["days", "p10", "p25", "p50", "p75", "p90", "current"]
CONE_WINDOWS = (7, 14, 30, 60, 90)
PERCENTILES = (10, 25, 50, 75, 90)


def build(closes: list[float]) -> pd.DataFrame:
    """One CONE_COLUMNS row per window with at least two rolling RV observations.

    Same convention as ``stats.realized_vol``: close-to-close log returns, ``ddof=1``,
    annualized by ``sqrt(TRADING_DAYS_PER_YEAR)``. ``current`` is the trailing window's
    RV; NaN (a non-positive close inside it) serializes as null downstream.
    """
    # a non-positive close is data, not a bug: log it to -inf and let the NaN propagate
    with np.errstate(divide="ignore", invalid="ignore"):
        rets = np.diff(np.log(np.asarray(closes, dtype=float)))

    rows = []
    for window in CONE_WINDOWS:
        if rets.size < window + 1:  # fewer than two rolling observations
            continue
        rv = sliding_window_view(rets, window).std(axis=1, ddof=1) * np.sqrt(
            TRADING_DAYS_PER_YEAR
        )
        finite_rv = rv[np.isfinite(rv)]
        if finite_rv.size < 2:
            continue
        levels = np.percentile(finite_rv, PERCENTILES)
        rows.append(
            {
                "days": float(window),
                **{f"p{p}": float(v) for p, v in zip(PERCENTILES, levels, strict=True)},
                "current": float(rv[-1]),
            }
        )

    if not rows:
        logger.warning("no window had enough closes for a cone (%d closes)", len(closes))
        return empty_frame(CONE_COLUMNS)
    return as_declared_dtypes(pd.DataFrame(rows, columns=CONE_COLUMNS))
