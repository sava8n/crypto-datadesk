"""Build the per-contract greeks table across the OTM option chain."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from greeks import delta, gamma, theta, vega
from shared.black76 import d1, norm_pdf, valid_mask

logger = logging.getLogger(__name__)

CHAIN_COLUMNS = [
    "expiry",
    "tte_years",
    "strike",
    "option_type",
    delta.NAME,
    gamma.NAME,
    theta.NAME,
    vega.NAME,
]


def build_chain(prepared_quotes: pd.DataFrame) -> pd.DataFrame:
    """All four Black-76 greeks per OTM contract, from one shared d1/n(d1) pass."""
    logger.info("building greeks chain for %d quotes", len(prepared_quotes))

    forward = prepared_quotes["forward"].to_numpy(dtype=float)
    strike = prepared_quotes["strike"].to_numpy(dtype=float)
    tte = prepared_quotes["tte_years"].to_numpy(dtype=float)
    sigma = prepared_quotes["mark_iv"].to_numpy(dtype=float)
    is_call = (prepared_quotes["option_type"] == "C").to_numpy()

    result = prepared_quotes[["expiry", "tte_years", "strike", "option_type"]].copy()
    valid = valid_mask(forward, strike, tte, sigma)
    with np.errstate(divide="ignore", invalid="ignore"):
        d1_vals = d1(forward, strike, tte, sigma)
        pdf_d1 = norm_pdf(d1_vals)
        sqrt_tte = np.sqrt(tte)
        result[delta.NAME] = np.where(valid, delta.from_d1(d1_vals, is_call), np.nan)
        result[gamma.NAME] = np.where(valid, gamma.from_d1(pdf_d1, forward, sigma, sqrt_tte), np.nan)
        result[theta.NAME] = np.where(valid, theta.from_d1(pdf_d1, forward, sigma, sqrt_tte), np.nan)
        result[vega.NAME] = np.where(valid, vega.from_d1(pdf_d1, forward, sqrt_tte), np.nan)
    return result[CHAIN_COLUMNS]
