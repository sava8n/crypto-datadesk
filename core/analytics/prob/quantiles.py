"""Strike quantiles of the option-implied distribution.

K(q): strike where P(S_T <= K) = q, i.e. prob_above = 1 - q, linearly
interpolated in strike on the per-expiry monotone survival curve.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from analytics.frames import expiry_tte

QUANTILE_LEVELS = (0.16, 0.50, 0.84)
QUANTILE_COLUMNS = ["expiry", "tte_years", "p16", "p50", "p84"]


def invert_survival(strike: np.ndarray, prob: np.ndarray, q: float) -> float:
    """K where prob_above = 1 - q; strikes ascending, prob non-increasing.
    NaN when the curve does not span the target (no extrapolation)."""
    target = 1.0 - q
    # keep the lowest strike of a flat run so interpolation is deterministic
    keep = np.concatenate(([True], prob[1:] != prob[:-1]))
    strike, prob = strike[keep], prob[keep]
    if len(strike) < 2 or target > prob[0] or target < prob[-1]:
        return float("nan")
    # interpolating strike *against* probability, and np.interp needs its x ascending
    # while the survival curve descends - hence both arrays reversed
    return float(np.interp(target, prob[::-1], strike[::-1]))


def build(prob_curves: pd.DataFrame) -> pd.DataFrame:
    """One QUANTILE_COLUMNS row per expiry of a curves frame; NaN where uninvertible."""
    rows = []
    for expiry, group in prob_curves.groupby("expiry"):
        # call and put can share a strike near the forward with one prob_above
        curve = group.drop_duplicates("strike").sort_values("strike")
        strike = curve["strike"].to_numpy(dtype=float)
        prob = curve["prob_above"].to_numpy(dtype=float)
        row = {"expiry": expiry, "tte_years": expiry_tte(group)}
        for q in QUANTILE_LEVELS:
            row[f"p{round(q * 100)}"] = invert_survival(strike, prob, q)
        rows.append(row)
    return pd.DataFrame(rows, columns=QUANTILE_COLUMNS)
