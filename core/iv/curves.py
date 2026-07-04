"""Implied-volatility smile curves (IV vs strike, per expiry)."""

from __future__ import annotations

import logging
import pandas as pd

from shared.quotes import prepare_quotes

logger = logging.getLogger(__name__)

# one row per surviving OTM quote, keyed by strike so each expiry forms a smile.
CURVE_COLUMNS = ["expiry", "tte_years", "strike", "mark_iv", "option_type"]


def build(summaries: list[dict], spot: float) -> pd.DataFrame:
    """BTC IV smile curves: OTM quotes keyed by (strike, expiry)."""
    logger.info("building IV curves")
    return prepare_quotes(summaries, spot)[CURVE_COLUMNS]
