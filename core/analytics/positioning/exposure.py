"""Dollar vanna/charm exposure by strike.

    dollar exposure = signed_OI · greek · F

Vanna is delta change per vol point and charm delta change per calendar day (see
``analytics.greeks``), so the dollar figures read "delta dollars gained per 1 vol-pt
rise" and "per day passing". Under zero rates both greeks are identical for the call
and put at a strike, so - exactly as with gamma - the one OTM quote that survived the
quality filters prices both legs' open interest. A chain without a ``signed_oi`` column
is signed by the classic dealer assumption: long call greeks (+OI), short put greeks (-OI).
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.frames import empty_frame

logger = logging.getLogger(__name__)

EXPOSURE_COLUMNS = ["strike", "call_exposure", "put_exposure", "net_exposure"]


def build(greeks_chain: pd.DataFrame, oi_chain: pd.DataFrame, greek: str) -> pd.DataFrame:
    """Per-strike dollar exposure to ``greek``, sorted by strike; sign carried by ``signed_oi``."""
    logger.info(
        "building %s exposure from %d greek rows and %d OI contracts",
        greek,
        len(greeks_chain),
        len(oi_chain),
    )
    if greeks_chain.empty or oi_chain.empty:
        return empty_frame(EXPOSURE_COLUMNS)

    # one value per (expiry, strike): only one side of a strike is OTM
    values = (
        greeks_chain[["expiry", "strike", greek]].dropna().drop_duplicates(["expiry", "strike"])
    )

    merged = oi_chain.merge(values, on=["expiry", "strike"], how="inner")
    if merged.empty:
        logger.warning("no OI contract matched a %s-bearing OTM quote", greek)
        return empty_frame(EXPOSURE_COLUMNS)

    is_call = merged["option_type"] == "C"
    if "signed_oi" not in merged.columns:
        merged["signed_oi"] = np.where(is_call, merged["open_interest"], -merged["open_interest"])
    dollar = merged["signed_oi"] * merged[greek] * merged["forward"]
    merged["call_exposure"] = np.where(is_call, dollar, 0.0)
    merged["put_exposure"] = np.where(is_call, 0.0, dollar)

    per_strike = merged.groupby("strike", as_index=False)[["call_exposure", "put_exposure"]].sum()
    per_strike["net_exposure"] = per_strike["call_exposure"] + per_strike["put_exposure"]
    return per_strike[EXPOSURE_COLUMNS].sort_values("strike").reset_index(drop=True)
