"""Delta: sensitivity of option value to the forward price (Black-76)."""

from __future__ import annotations

import numpy as np

from shared.black76 import norm_cdf

NAME = "delta"


def from_d1(d1: np.ndarray, is_call: np.ndarray) -> np.ndarray:
    """Forward (Black-76) delta: ``N(d1)`` for calls, ``N(d1) - 1`` for puts."""
    cdf = norm_cdf(d1)
    return np.where(is_call, cdf, cdf - 1.0)
