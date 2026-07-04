"""ATM implied-volatility term structure (ATM IV vs expiry)."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# one row per expiry: the interpolated ATM IV, keyed/sorted by time to expiry.
TERM_COLUMNS = ["expiry", "tte_years", "atm_iv", "forward"]


def _empty_term() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "expiry": pd.Series([], dtype="datetime64[ns, UTC]"),
            "tte_years": pd.Series([], dtype="float64"),
            "atm_iv": pd.Series([], dtype="float64"),
            "forward": pd.Series([], dtype="float64"),
        }
    )


def _atm_iv(group: pd.DataFrame, fwd: float) -> float | None:
    """Interpolate mark_iv to the forward (log-moneyness ln(K/F)=0) for one expiry.

    Only OTM quotes survive upstream, so the forward is bracketed by the nearest
    OTM put (K<F) and call (K>F). ``np.interp`` clamps to the nearest endpoint
    when the forward falls outside the strike range (one-sided illiquid expiry).
    """
    if not np.isfinite(fwd) or fwd <= 0:
        return None
    # average IV per strike (a call and a put may share a strike), sorted by strike.
    per_strike = group.groupby("strike")["mark_iv"].mean().sort_index()
    strikes = per_strike.index.to_numpy(dtype=float)
    ivs = per_strike.to_numpy(dtype=float)
    if strikes.size == 0:
        return None
    return float(np.interp(0.0, np.log(strikes / fwd), ivs))


def build(prepared: pd.DataFrame) -> pd.DataFrame:
    """BTC ATM IV term structure: one interpolated ATM IV per expiry, sorted by tte."""
    logger.info("building term structure")
    if prepared.empty:
        return _empty_term()

    rows = []
    for expiry, group in prepared.groupby("expiry", sort=False):
        fwd = float(group["forward"].median())
        atm_iv = _atm_iv(group, fwd)
        if atm_iv is None or not np.isfinite(atm_iv):
            continue
        rows.append(
            {
                "expiry": expiry,
                "tte_years": float(group["tte_years"].iloc[0]),
                "atm_iv": atm_iv,
                "forward": fwd,
            }
        )

    if not rows:
        logger.warning("no expiries produced an ATM IV")
        return _empty_term()

    result = pd.DataFrame(rows, columns=TERM_COLUMNS).sort_values("tte_years").reset_index(drop=True)
    result["expiry"] = pd.to_datetime(result["expiry"], utc=True)
    logger.info("term structure built for %d expiries", len(result))
    return result
