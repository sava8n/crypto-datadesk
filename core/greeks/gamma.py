"""Gamma: sensitivity of delta to a $1 move in the forward (Black-76)."""

from __future__ import annotations

import numpy as np

from shared.black76 import d1, norm_pdf, valid_mask

NAME = "gamma"


def compute(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
    is_call: np.ndarray,
) -> np.ndarray:
    """Black-76 gamma = ``n(d1) / (F * sigma * sqrt(T))``, per $1 change in the forward."""
    valid = valid_mask(forward, strike, tte_years, sigma)
    with np.errstate(divide="ignore", invalid="ignore"):
        gamma = norm_pdf(d1(forward, strike, tte_years, sigma)) / (
            forward * sigma * np.sqrt(tte_years)
        )
    return np.where(valid, gamma, np.nan)
