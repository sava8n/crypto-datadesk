"""Dollar dealer exposure by strike, for gamma, vanna or charm.

    dollar exposure = signed_OI · greek · scale(F)

``scale`` is ``F² · SPOT_MOVE`` for gamma, quoting it per 1% move in the forward, and
``F`` for vanna and charm, quoting them per vol point and per calendar day. Under zero
rates all three greeks are identical for the call and the put at a strike, so the one OTM
quote that survived the quality filters prices both legs' open interest. The OI chain
must carry ``signed_oi`` - the tape-signed dealer inventory.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.frames import empty_frame

logger = logging.getLogger(__name__)

EXPOSURE_COLUMNS = ["strike", "call_exposure", "put_exposure", "net_exposure"]

# gamma is quoted for a 1% move in the forward
SPOT_MOVE = 0.01


def _dollar_scale(greek: str, forward: pd.Series) -> pd.Series:
    return forward**2 * SPOT_MOVE if greek == "gamma" else forward


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
    dollar = merged["signed_oi"] * merged[greek] * _dollar_scale(greek, merged["forward"])
    merged["call_exposure"] = np.where(is_call, dollar, 0.0)
    merged["put_exposure"] = np.where(is_call, 0.0, dollar)

    per_strike = merged.groupby("strike", as_index=False)[["call_exposure", "put_exposure"]].sum()
    per_strike["net_exposure"] = per_strike["call_exposure"] + per_strike["put_exposure"]
    result = per_strike[EXPOSURE_COLUMNS].sort_values("strike").reset_index(drop=True)
    logger.info(
        "%s exposure built for %d strikes (%d/%d OI contracts had no quote)",
        greek,
        len(result),
        len(oi_chain) - len(merged),
        len(oi_chain),
    )
    return result


def flip_level(per_strike: pd.DataFrame, spot: float) -> float | None:
    """Zero-gamma flip: cumulative net-exposure sign change (strikes ascending) nearest spot.

    Linear interpolation between the bracketing strikes; ``None`` when the cumulative
    profile never changes sign.
    """
    if len(per_strike) < 2:
        return None
    strikes = per_strike["strike"].to_numpy(dtype=float)
    cum = per_strike["net_exposure"].cumsum().to_numpy(dtype=float)

    idx = np.nonzero(np.diff(np.sign(cum)) != 0)[0]  # crossing between i and i+1
    if idx.size == 0:
        return None
    # solve cum[i] + f*(cum[i+1] - cum[i]) = 0 for f, the fraction of the way from strike
    # i to i+1 where the cumulative profile crosses zero: f = cum[i] / (cum[i] - cum[i+1])
    frac = cum[idx] / (cum[idx] - cum[idx + 1])
    levels = strikes[idx] + frac * (strikes[idx + 1] - strikes[idx])
    return float(levels[np.argmin(np.abs(levels - spot))])
