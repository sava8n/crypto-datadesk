"""Gamma: sensitivity of delta to a $1 move in the forward (Black-76)."""

from __future__ import annotations

import numpy as np

NAME = "gamma"


def from_d1(
    pdf_d1: np.ndarray,
    forward: np.ndarray,
    sigma: np.ndarray,
    sqrt_tte: np.ndarray,
) -> np.ndarray:
    """Black-76 gamma = ``n(d1) / (F * sigma * sqrt(T))``, per $1 change in the forward."""
    return pdf_d1 / (forward * sigma * sqrt_tte)
