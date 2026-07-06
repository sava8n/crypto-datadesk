"""Close-to-close realized volatility from daily closes."""

from __future__ import annotations

import numpy as np


def realized_vol(closes: list[float], days: int = 30) -> float | None:
    """Annualized std of the last ``days`` daily log returns (crypto trades 365 days/year)."""
    rets = np.diff(np.log(np.asarray(closes[-(days + 1) :], dtype=float)))
    if rets.size < 2:
        return None
    return float(rets.std(ddof=1) * np.sqrt(365.0))
