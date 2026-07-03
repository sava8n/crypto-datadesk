"""Implied-volatility surface for Deribit options."""

from __future__ import annotations

import logging
import pandas as pd

from .quotes import prepare_quotes

logger = logging.getLogger(__name__)

GRID_COLUMNS = ["expiry", "tte_years", "delta", "mark_iv", "option_type"]


def build_surface(summaries: list[dict], spot: float) -> pd.DataFrame:
    """BTC IV surface grid: OTM quotes keyed by (delta, expiry)."""
    logger.info("building IV surface")
    return prepare_quotes(summaries, spot)[GRID_COLUMNS]
