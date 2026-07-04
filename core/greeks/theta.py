"""Theta: option value decay per calendar day (Black-76, undiscounted)."""

from __future__ import annotations

import numpy as np

from shared.black76 import d1, norm_pdf, valid_mask

NAME = "theta"

DAYS_PER_YEAR = 365.25


def compute(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
    is_call: np.ndarray,
) -> np.ndarray:
    """Black-76 theta = ``-F * n(d1) * sigma / (2*sqrt(T))``, per calendar day."""
    valid = valid_mask(forward, strike, tte_years, sigma)
    with np.errstate(divide="ignore", invalid="ignore"):
        annual = (
            -forward
            * norm_pdf(d1(forward, strike, tte_years, sigma))
            * sigma
            / (2.0 * np.sqrt(tte_years))
        )
    return np.where(valid, annual / DAYS_PER_YEAR, np.nan)
