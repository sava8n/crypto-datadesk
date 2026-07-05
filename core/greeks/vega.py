"""Vega: sensitivity of option value to volatility (Black-76)."""

from __future__ import annotations

import numpy as np

NAME = "vega"

# sigma is a fraction (0.65 = 65%)
# vega is reported per 1 vol *point* (a 0.01 change in sigma)
# matching how it is conventionally quoted.
VOL_POINT = 0.01


def from_d1(
    pdf_d1: np.ndarray,
    forward: np.ndarray,
    sqrt_tte: np.ndarray,
) -> np.ndarray:
    """Black-76 vega = ``F * n(d1) * sqrt(T)``, scaled to per 1 vol-point (1%)."""
    return forward * pdf_d1 * sqrt_tte * VOL_POINT
