"""Black-76 primitives."""

from __future__ import annotations

from math import erf, sqrt

import numpy as np

_SQRT2 = sqrt(2.0)
_SQRT_2PI = sqrt(2.0 * np.pi)
# np.vectorize is not a true vectorization, but numpy ships no erf 
# and the alternative is a scipy dependency
_erf = np.vectorize(erf, otypes=[float])


def norm_cdf(x: np.ndarray) -> np.ndarray:
    return 0.5 * (1.0 + _erf(x / _SQRT2))


def norm_pdf(x: np.ndarray) -> np.ndarray:
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


def d2(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
) -> np.ndarray:
    """Black-76 ``d2 = d1 - sigma*sqrt(tte)``.

    May be inf/NaN where inputs are invalid; guard with ``valid_mask``.
    """
    with np.errstate(divide="ignore", invalid="ignore"):
        return d1(forward, strike, tte_years, sigma) - sigma * np.sqrt(tte_years)


def delta_from_d1(d1_values: np.ndarray, is_call: np.ndarray) -> np.ndarray:
    """Forward delta from a precomputed ``d1``: ``N(d1)`` for calls, ``N(d1) - 1`` for puts."""
    cdf = norm_cdf(d1_values)
    return np.where(is_call, cdf, cdf - 1.0)


def black76_delta(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
    is_call: np.ndarray,
) -> np.ndarray:
    """Forward (Black-76) delta; NaN where inputs are invalid."""
    delta = delta_from_d1(d1(forward, strike, tte_years, sigma), is_call)
    return np.where(valid_mask(forward, strike, tte_years, sigma), delta, np.nan)
