"""24h traded volume by strike - the flow companion to open interest's stock.

Rides the OI chain, so flow at contracts whose open interest closed back to zero is
not counted.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.frames import as_declared_dtypes, empty_frame, sum_by

logger = logging.getLogger(__name__)

VOLUME_COLUMNS = ["strike", "call_volume", "put_volume"]

_SIDES = ("call_volume", "put_volume")


def build(chain: pd.DataFrame) -> pd.DataFrame:
    """Per-strike 24h volume split into calls and puts; zero-flow strikes dropped."""
    if chain.empty:
        return empty_frame(VOLUME_COLUMNS)

    sided = chain[["strike", "volume"]].copy()
    sided["side"] = np.where(chain["option_type"] == "C", "call_volume", "put_volume")
    pivot = sum_by(sided, "strike", "side", "volume", _SIDES)

    result = pivot.reset_index().sort_values("strike")
    result = result[(result["call_volume"] > 0) | (result["put_volume"] > 0)]
    result = result[VOLUME_COLUMNS].reset_index(drop=True)
    logger.info("volume by strike built for %d strikes", len(result))
    return as_declared_dtypes(result)
