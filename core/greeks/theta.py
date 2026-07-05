"""Theta: option value decay per calendar day (Black-76, undiscounted)."""

from __future__ import annotations

import numpy as np

NAME = "theta"

DAYS_PER_YEAR = 365.25


def from_d1(
    pdf_d1: np.ndarray,
    forward: np.ndarray,
    sigma: np.ndarray,
    sqrt_tte: np.ndarray,
) -> np.ndarray:
    """Black-76 theta = ``-F * n(d1) * sigma / (2*sqrt(T))``, per calendar day."""
    return -forward * pdf_d1 * sigma / (2.0 * sqrt_tte) / DAYS_PER_YEAR
