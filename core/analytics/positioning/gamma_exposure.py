"""Dollar-gamma exposure (GEX) by strike.

    dollar GEX = OI · Γ · F² · SPOT_MOVE      calls +, puts -

Gamma is strike-symmetric, so the one OTM quote that survived the quality filters prices
both legs' open interest; OI at a strike with no such quote has no gamma and is dropped.
Signs follow the usual dealer-positioning assumption: long call gamma, short put gamma.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.frames import empty_frame

logger = logging.getLogger(__name__)

GEX_COLUMNS = ["strike", "call_gex", "put_gex", "net_gex"]

# GEX is quoted for a 1% move in the forward. Same number as greeks.VOL_POINT and a
# different quantity - that one is a 0.01 move in sigma.
SPOT_MOVE = 0.01


def build(greeks_chain: pd.DataFrame, oi_chain: pd.DataFrame) -> pd.DataFrame:
    """Per-strike dollar GEX (calls +, puts -), sorted by strike."""
    logger.info(
        "building GEX from %d greek rows and %d OI contracts", len(greeks_chain), len(oi_chain)
    )
    if greeks_chain.empty or oi_chain.empty:
        return empty_frame(GEX_COLUMNS)

    # one gamma per (expiry, strike): only one side of a strike is OTM
    gamma = (
        greeks_chain[["expiry", "strike", "gamma"]].dropna().drop_duplicates(["expiry", "strike"])
    )

    merged = oi_chain.merge(gamma, on=["expiry", "strike"], how="inner")
    if merged.empty:
        logger.warning("no OI contract matched a gamma-bearing OTM quote")
        return empty_frame(GEX_COLUMNS)

    dollar = merged["open_interest"] * merged["gamma"] * merged["forward"] ** 2 * SPOT_MOVE
    is_call = merged["option_type"] == "C"
    merged["call_gex"] = np.where(is_call, dollar, 0.0)
    merged["put_gex"] = np.where(is_call, 0.0, -dollar)

    per_strike = merged.groupby("strike", as_index=False)[["call_gex", "put_gex"]].sum()
    per_strike["net_gex"] = per_strike["call_gex"] + per_strike["put_gex"]
    result = per_strike[GEX_COLUMNS].sort_values("strike").reset_index(drop=True)
    logger.info(
        "GEX built for %d strikes (%d/%d OI contracts had no gamma quote)",
        len(result),
        len(oi_chain) - len(merged),
        len(oi_chain),
    )
    return result


def flip_level(per_strike: pd.DataFrame, spot: float) -> float | None:
    """Zero-gamma flip: cumulative net-GEX sign change (strikes ascending) nearest spot.

    Linear interpolation between the bracketing strikes; ``None`` when the
    cumulative profile never changes sign.
    """
    if len(per_strike) < 2:
        return None
    strikes = per_strike["strike"].to_numpy(dtype=float)
    cum = per_strike["net_gex"].cumsum().to_numpy(dtype=float)

    idx = np.nonzero(np.diff(np.sign(cum)) != 0)[0]  # crossing between i and i+1
    if idx.size == 0:
        return None
    # solve cum[i] + f*(cum[i+1] - cum[i]) = 0 for f, the fraction of the way from strike
    # i to i+1 where the cumulative profile crosses zero: f = cum[i] / (cum[i] - cum[i+1])
    frac = cum[idx] / (cum[idx] - cum[idx + 1])
    levels = strikes[idx] + frac * (strikes[idx + 1] - strikes[idx])
    return float(levels[np.argmin(np.abs(levels - spot))])
