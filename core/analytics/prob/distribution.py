"""Option-implied probability curves (P(S_T > K) vs strike, per expiry).

Black-76 under the forward measure with the Breeden-Litzenberger skew correction:

    P(S_T > K) = N(d2) - (F/K) * n(d1) * sqrt(T) * dsigma/dk,   k = ln(K/F)
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.black76 import d1, d2, norm_cdf, norm_pdf, valid_mask
from analytics.frames import expiry_forward, expiry_tte
from analytics.prob.smoothing import MIN_STRIKES_FOR_FIT, smooth_smile

logger = logging.getLogger(__name__)

# one row per surviving OTM quote, keyed by strike so each expiry forms a curve
CURVE_COLUMNS = ["expiry", "tte_years", "strike", "prob_above", "option_type"]


def _expiry_prob_above(group: pd.DataFrame) -> pd.Series:
    """P(S_T > K) per distinct strike for one expiry, indexed by strike."""
    forward = expiry_forward(group)
    tte = expiry_tte(group)

    # collapse to one row per strike (a call and a put can share one near the forward)
    by_strike = group.groupby("strike")["mark_iv"].mean()
    strike = by_strike.index.to_numpy(dtype=float)
    sigma = by_strike.to_numpy(dtype=float)

    slope = np.zeros_like(sigma)
    if len(strike) >= MIN_STRIKES_FOR_FIT and forward > 0 and tte > 0:
        sigma, slope = smooth_smile(np.log(strike / forward), sigma)

    valid = valid_mask(forward, strike, tte, sigma)
    with np.errstate(divide="ignore", invalid="ignore"):
        prob = (
            norm_cdf(d2(forward, strike, tte, sigma))
            - (forward / strike) * norm_pdf(d1(forward, strike, tte, sigma)) * np.sqrt(tte) * slope
        )
    prob = np.where(valid, prob, np.nan)

    # a survival curve lives in [0, 1] and is non-increasing in strike
    # residual violations (fit noise, butterfly arbitrage in the marks) are clamped away
    ok = ~np.isnan(prob)
    prob[ok] = np.minimum.accumulate(np.clip(prob[ok], 0.0, 1.0))
    return pd.Series(prob, index=by_strike.index)


def build(prepared_quotes: pd.DataFrame) -> pd.DataFrame:
    """Skew-corrected P(S_T > K) per OTM quote, from a smoothed per-expiry smile."""
    logger.info("building implied-probability curves for %d quotes", len(prepared_quotes))

    result = prepared_quotes[["expiry", "tte_years", "strike", "option_type"]].copy()
    result["prob_above"] = np.nan
    n_fallback = 0
    for _, group in prepared_quotes.groupby("expiry"):
        if group["strike"].nunique() < MIN_STRIKES_FOR_FIT:
            n_fallback += 1
        result.loc[group.index, "prob_above"] = group["strike"].map(_expiry_prob_above(group))
    if n_fallback:
        logger.debug("%d expiries below %d strikes, naive N(d2)", n_fallback, MIN_STRIKES_FOR_FIT)
    return result.dropna(subset=["prob_above"])[CURVE_COLUMNS].reset_index(drop=True)
