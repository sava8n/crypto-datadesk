"""Vectorized Black-76 option-pricing primitives."""

from __future__ import annotations

from math import erf, sqrt

import numpy as np

_SQRT2 = sqrt(2.0)
_SQRT_2PI = sqrt(2.0 * np.pi)
_erf = np.vectorize(erf, otypes=[float])


def norm_cdf(x: np.ndarray) -> np.ndarray:
    """Standard normal CDF."""
    return 0.5 * (1.0 + _erf(x / _SQRT2))


def norm_pdf(x: np.ndarray) -> np.ndarray:
    """Standard normal PDF."""
    return np.exp(-0.5 * x * x) / _SQRT_2PI


def valid_mask(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
) -> np.ndarray:
    """True where the Black-76 inputs are well-defined (all strictly positive)."""
    return (forward > 0) & (strike > 0) & (tte_years > 0) & (sigma > 0)


def d1(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
) -> np.ndarray:
    """Black-76 ``d1``; may be inf/NaN where inputs are invalid (guard with ``valid_mask``)."""
    with np.errstate(divide="ignore", invalid="ignore"):
        return (np.log(forward / strike) + 0.5 * sigma * sigma * tte_years) / (
            sigma * np.sqrt(tte_years)
        )


def black76_delta(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
    is_call: np.ndarray,
) -> np.ndarray:
    """Forward (Black-76) delta; NaN where inputs are invalid."""
    call_delta = norm_cdf(d1(forward, strike, tte_years, sigma))
    delta = np.where(is_call, call_delta, call_delta - 1.0)
    return np.where(valid_mask(forward, strike, tte_years, sigma), delta, np.nan)
