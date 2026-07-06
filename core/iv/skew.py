"""25Δ skew term structure: risk reversal and butterfly per expiry."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from iv.term_structure import atm_iv

logger = logging.getLogger(__name__)

# one row per expiry, sorted by time to expiry.
SKEW_COLUMNS = ["expiry", "tte_years", "rr", "bf"]

CALL_DELTA = 0.25
PUT_DELTA = -0.25


def _empty_skew() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "expiry": pd.Series([], dtype="datetime64[ns, UTC]"),
            "tte_years": pd.Series([], dtype="float64"),
            "rr": pd.Series([], dtype="float64"),
            "bf": pd.Series([], dtype="float64"),
        }
    )


def _wing_iv(group: pd.DataFrame, option_type: str, target_delta: float) -> float | None:
    """Interpolate mark_iv at ``target_delta`` on one OTM side of an expiry's smile."""
    side = group[group["option_type"] == option_type].sort_values("delta")
    if len(side) < 2:
        return None
    deltas = side["delta"].to_numpy(dtype=float)
    ivs = side["mark_iv"].to_numpy(dtype=float)
    if not deltas[0] <= target_delta <= deltas[-1]:
        return None
    return float(np.interp(target_delta, deltas, ivs))


def build(prepared_quotes: pd.DataFrame) -> pd.DataFrame:
    """25Δ risk reversal (call IV - put IV) and butterfly (wing mean - ATM) per expiry.

    Both wings are interpolated over delta on the expiry's OTM smile; the ATM level
    reuses the term-structure interpolation to the forward. Expiries lacking 25Δ
    coverage on either wing are skipped rather than extrapolated.
    """
    logger.info("building 25d skew term structure")
    if prepared_quotes.empty:
        return _empty_skew()

    rows = []
    for expiry, group in prepared_quotes.groupby("expiry", sort=False):
        fwd = float(group["forward"].median())
        atm = atm_iv(group, fwd)
        call_25 = _wing_iv(group, "C", CALL_DELTA)
        put_25 = _wing_iv(group, "P", PUT_DELTA)
        if atm is None or not np.isfinite(atm) or call_25 is None or put_25 is None:
            continue
        rows.append(
            {
                "expiry": expiry,
                "tte_years": float(group["tte_years"].iloc[0]),
                "rr": call_25 - put_25,
                "bf": 0.5 * (call_25 + put_25) - atm,
            }
        )

    if not rows:
        logger.warning("no expiries had 25Δ coverage on both wings")
        return _empty_skew()

    result = pd.DataFrame(rows, columns=SKEW_COLUMNS).sort_values("tte_years").reset_index(drop=True)
    result["expiry"] = pd.to_datetime(result["expiry"], utc=True)
    logger.info("25d skew built for %d expiries", len(result))
    return result
