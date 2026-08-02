"""Headline market statistics: DVOL and its rank, constant-maturity ATM IV, realized vol."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

from analytics.conventions import TRADING_DAYS_PER_YEAR, YEAR_DAYS


def dvol_stats(candles: list[list[float]]) -> tuple[float | None, float | None]:
    """(DVOL as a decimal, rank of the last close in the window's close range [0, 1])."""
    closes = [float(c[4]) for c in candles if len(c) >= 5]
    if not closes:
        return None, None
    current = closes[-1]
    lo, hi = min(closes), max(closes)
    rank = (current - lo) / (hi - lo) if hi > lo else None
    return current / 100.0, rank


def atm_iv_at(term: pd.DataFrame, days: float = 30.0) -> float | None:
    """ATM IV at a fixed ``days`` horizon, linear in total variance between expiries.

    The horizon is clamped into the term structure's tte range, so a thin chain falls
    back to the nearest expiry's ATM IV.
    """
    if term.empty:
        return None
    tte = term["tte_years"].to_numpy(dtype=float)  # build() returns rows sorted by tte
    iv = term["atm_iv"].to_numpy(dtype=float)
    horizon = float(np.clip(days / YEAR_DAYS, tte[0], tte[-1]))
    variance = float(np.interp(horizon, tte, iv * iv * tte))  # total variance is ~linear in tte
    return math.sqrt(variance / horizon)


def skew_at(skew: pd.DataFrame, days: float = 30.0) -> tuple[float | None, float | None]:
    """(25Δ RR, 25Δ BF) at a fixed ``days`` horizon, linear in tte between expiries.

    The horizon is clamped into the skew term structure's tte range, mirroring
    ``atm_iv_at``. The total-variance identity does not apply to vol differences, so
    plain linear interpolation is used.
    """
    if skew.empty:
        return None, None
    tte = skew["tte_years"].to_numpy(dtype=float)  # build() returns rows sorted by tte
    horizon = float(np.clip(days / YEAR_DAYS, tte[0], tte[-1]))
    rr = float(np.interp(horizon, tte, skew["rr"].to_numpy(dtype=float)))
    bf = float(np.interp(horizon, tte, skew["bf"].to_numpy(dtype=float)))
    return rr, bf


CM_TENOR_DAYS = (7.0, 14.0, 30.0, 60.0, 90.0, 180.0)
CM_COLUMNS = ["tenor_days", "atm_iv", "rr25", "bf25"]


def _covers(frame: pd.DataFrame, days: float) -> bool:
    """Whether the term/skew frame's tte range spans the tenor without clamping."""
    if frame.empty:
        return False
    tte = frame["tte_years"]
    return bool(tte.iloc[0] <= days / YEAR_DAYS <= tte.iloc[-1])


def cm_grid(term: pd.DataFrame, skew: pd.DataFrame) -> pd.DataFrame:
    """Constant-maturity ATM IV and 25Δ skew per tenor, CM_COLUMNS.

    Unlike the headline scalars, tenors outside a source frame's tte range yield NaN
    rather than a clamped value: a clamped 180d "observation" from a 30d chain would
    poison the percentile history the grid exists for. Tenors with no metric at all
    are dropped.
    """
    rows = []
    for days in CM_TENOR_DAYS:
        atm = atm_iv_at(term, days) if _covers(term, days) else None
        rr, bf = skew_at(skew, days) if _covers(skew, days) else (None, None)
        if atm is None and rr is None and bf is None:
            continue
        rows.append({"tenor_days": days, "atm_iv": atm, "rr25": rr, "bf25": bf})
    return pd.DataFrame(rows, columns=CM_COLUMNS, dtype=float)


def realized_vol(closes: list[float], days: int = 30) -> float | None:
    """Annualized std of the last ``days`` daily log returns.

    NaN when a close is non-positive: ``log`` yields -inf and the std of that is NaN.
    Callers turn it into ``None`` via ``frames.finite``.
    """
    # a non-positive close is data, not a bug: log it to -inf and let the NaN propagate
    with np.errstate(divide="ignore", invalid="ignore"):
        rets = np.diff(np.log(np.asarray(closes[-(days + 1) :], dtype=float)))
        if rets.size < 2:
            return None
        return float(rets.std(ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR))
