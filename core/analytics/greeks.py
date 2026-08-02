"""Black-76 greeks across the OTM chain, from one shared d1 / n(d1) pass.

delta = N(d1) calls, N(d1) - 1 puts
gamma = n(d1) / (F sigma sqrt(T))                 per $1 of forward
theta = -F n(d1) sigma / (2 sqrt(T)) / YEAR_DAYS  per calendar day
vega  = F n(d1) sqrt(T) * VOL_POINT               per vol point
vanna = -n(d1) d2 / sigma * VOL_POINT             delta change per vol point
charm = n(d1) d2 / (2T) / YEAR_DAYS               delta change per calendar day

Zero rates make vanna and charm identical for the call and put at a strike, like gamma.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.black76 import d1, delta_from_d1, norm_pdf, valid_mask
from analytics.conventions import YEAR_DAYS

logger = logging.getLogger(__name__)

GREEKS_COLUMNS = [
    "expiry",
    "tte_years",
    "strike",
    "option_type",
    "delta",
    "gamma",
    "theta",
    "vega",
    "vanna",
    "charm",
]

# vega is quoted per vol *point* - a 0.01 move in sigma, which is a fraction (0.65 = 65%)
VOL_POINT = 0.01


def build(quotes: pd.DataFrame) -> pd.DataFrame:
    """All four greeks per OTM contract; NaN on rows whose Black-76 inputs are invalid."""
    logger.info("building greeks chain for %d quotes", len(quotes))

    forward = quotes["forward"].to_numpy(dtype=float)
    strike = quotes["strike"].to_numpy(dtype=float)
    tte = quotes["tte_years"].to_numpy(dtype=float)
    sigma = quotes["mark_iv"].to_numpy(dtype=float)
    is_call = (quotes["option_type"] == "C").to_numpy()

    result = quotes[["expiry", "tte_years", "strike", "option_type"]].copy()
    valid = valid_mask(forward, strike, tte, sigma)
    with np.errstate(divide="ignore", invalid="ignore"):
        d1_values = d1(forward, strike, tte, sigma)
        d2_values = d1_values - sigma * np.sqrt(tte)
        pdf = norm_pdf(d1_values)
        sqrt_tte = np.sqrt(tte)
        result["delta"] = np.where(valid, delta_from_d1(d1_values, is_call), np.nan)
        result["gamma"] = np.where(valid, pdf / (forward * sigma * sqrt_tte), np.nan)
        result["theta"] = np.where(
            valid, -forward * pdf * sigma / (2.0 * sqrt_tte) / YEAR_DAYS, np.nan
        )
        result["vega"] = np.where(valid, forward * pdf * sqrt_tte * VOL_POINT, np.nan)
        result["vanna"] = np.where(valid, -pdf * d2_values / sigma * VOL_POINT, np.nan)
        result["charm"] = np.where(valid, pdf * d2_values / (2.0 * tte) / YEAR_DAYS, np.nan)
    return result[GREEKS_COLUMNS]
