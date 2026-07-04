"""Build a per-contract greek table across the OTM option chain."""

from __future__ import annotations

import logging

import pandas as pd

from greeks import delta, gamma, theta, vega
from shared.quotes import prepare_quotes

logger = logging.getLogger(__name__)

# greek name -> module exposing compute(forward, strike, tte, sigma, is_call)
GREEKS = {module.NAME: module for module in (delta, gamma, theta, vega)}

# one row per OTM quote; `value` holds the selected greek, keyed by (strike, expiry)
GREEK_COLUMNS = ["expiry", "tte_years", "strike", "value", "option_type"]


def build_greek(summaries: list[dict], spot: float, greek: str) -> pd.DataFrame:
    """OTM per-contract values of ``greek`` keyed by (strike, expiry)."""
    if greek not in GREEKS:
        raise ValueError(f"unknown greek '{greek}'; expected one of {sorted(GREEKS)}")

    logger.info("building %s greek", greek)
    quotes = prepare_quotes(summaries, spot)
    quotes["value"] = GREEKS[greek].compute(
        quotes["forward"].to_numpy(dtype=float),
        quotes["strike"].to_numpy(dtype=float),
        quotes["tte_years"].to_numpy(dtype=float),
        quotes["mark_iv"].to_numpy(dtype=float),
        (quotes["option_type"] == "C").to_numpy(),
    )
    return quotes[GREEK_COLUMNS]
