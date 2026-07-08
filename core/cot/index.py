"""Causal rolling COT index over a trailing window, 0-100.

minmax: net position within the window's range - the classic COT Index; sensitive
to outliers (one spike stretches the range);
rank: percentile rank of the current net among the window's weeks - outlier-robust,
uniform by construction.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from cot.fields import CATEGORIES

WINDOWS = (0, 52, 156, 260)  # weeks; 0 = full history (expanding)
METHODS = ("minmax", "rank")
MIN_PERIODS = 52  # an index prints once a year of history exists; larger windows fill partially


def build(history: pd.DataFrame, window: int, method: str = "rank") -> pd.DataFrame:
    """Per-category index columns aligned to ``history``; NaN before ``MIN_PERIODS``
    or (minmax only) while the range is flat."""
    out = pd.DataFrame(index=history.index)
    for cat in CATEGORIES:
        net = history[f"{cat}_net"]
        roll = (
            net.rolling(window, min_periods=MIN_PERIODS)
            if window
            else net.expanding(min_periods=MIN_PERIODS)
        )
        if method == "rank":
            out[cat] = roll.rank(pct=True) * 100.0
        else:
            lo, hi = roll.min(), roll.max()
            spread = hi - lo
            out[cat] = np.where(spread > 0, (net - lo) / spread * 100.0, np.nan)
    return out
