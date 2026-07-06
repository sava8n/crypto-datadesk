"""Dollar-gamma exposure (GEX) by strike.

Joins the full OI chain with per-contract Black-76 gamma from the OTM quotes:
gamma is strike-symmetric (the call and put of an expiry/strike share it), so
the surviving OTM quote prices gamma for both sides' open interest. OI at
strikes with no quality-surviving OTM quote is dropped.

Dollar GEX per contract = OI · Γ · F² · 1% - the change in aggregate dollar
delta for a 1% move. Signs follow the standard dealer-positioning assumption:
dealers are long call gamma (+) and short put gamma (-).
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from greeks.chain import build_chain

logger = logging.getLogger(__name__)

GEX_COLUMNS = ["strike", "call_gex", "put_gex", "net_gex"]


def _empty_gex() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "strike": pd.Series([], dtype="float64"),
            "call_gex": pd.Series([], dtype="float64"),
            "put_gex": pd.Series([], dtype="float64"),
            "net_gex": pd.Series([], dtype="float64"),
        }
    )


def build(otm_quotes: pd.DataFrame, oi_chain: pd.DataFrame) -> pd.DataFrame:
    """Per-strike dollar GEX (calls +, puts -), sorted by strike."""
    logger.info(
        "building GEX from %d OTM quotes and %d OI contracts", len(otm_quotes), len(oi_chain)
    )
    if otm_quotes.empty or oi_chain.empty:
        return _empty_gex()

    greeks = build_chain(otm_quotes)
    # one gamma per (expiry, strike): only one side of a strike is OTM.
    gamma = greeks[["expiry", "strike", "gamma"]].dropna().drop_duplicates(["expiry", "strike"])

    merged = oi_chain.merge(gamma, on=["expiry", "strike"], how="inner")
    if merged.empty:
        logger.warning("no OI contract matched a gamma-bearing OTM quote")
        return _empty_gex()

    dollar = merged["open_interest"] * merged["gamma"] * merged["forward"] ** 2 * 0.01
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
    frac = cum[idx] / (cum[idx] - cum[idx + 1])
    levels = strikes[idx] + frac * (strikes[idx + 1] - strikes[idx])
    return float(levels[np.argmin(np.abs(levels - spot))])
