"""Constant-maturity ATM implied volatility, interpolated on the term structure."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd


def atm_iv_at(term: pd.DataFrame, days: float = 30.0) -> float | None:
    """ATM IV at a fixed ``days`` horizon, linear in total variance between expiries.

    The horizon is clamped into the term structure's tte range, so a thin chain
    falls back to the nearest expiry's ATM IV.
    """
    if term.empty:
        return None
    tte = term["tte_years"].to_numpy(dtype=float)  # build() returns rows sorted by tte
    iv = term["atm_iv"].to_numpy(dtype=float)
    t = float(np.clip(days / 365.25, tte[0], tte[-1]))
    w = float(np.interp(t, tte, iv * iv * tte))  # total variance is ~linear in tte
    return math.sqrt(w / t)
