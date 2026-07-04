"""Delta: sensitivity of option value to the forward price (Black-76)."""

from __future__ import annotations

import numpy as np

from shared.black76 import black76_delta

NAME = "delta"


def compute(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
    is_call: np.ndarray,
) -> np.ndarray:
    """Forward (Black-76) delta: ``N(d1)`` for calls, ``N(d1) - 1`` for puts."""
    return black76_delta(forward, strike, tte_years, sigma, is_call)
