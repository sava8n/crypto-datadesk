"""Vega: sensitivity of option value to volatility (Black-76)."""

from __future__ import annotations

import numpy as np

from shared.black76 import d1, norm_pdf, valid_mask

NAME = "vega"

# sigma is a fraction (0.65 = 65%) 
# vega is reported per 1 vol *point* (a 0.01 change in sigma)
# matching how it is conventionally quoted.
VOL_POINT = 0.01


def compute(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
    is_call: np.ndarray,
) -> np.ndarray:
    """Black-76 vega = ``F * n(d1) * sqrt(T)``, scaled to per 1 vol-point (1%)."""
    valid = valid_mask(forward, strike, tte_years, sigma)
    with np.errstate(divide="ignore", invalid="ignore"):
        vega = forward * norm_pdf(d1(forward, strike, tte_years, sigma)) * np.sqrt(tte_years)
    return np.where(valid, vega * VOL_POINT, np.nan)
