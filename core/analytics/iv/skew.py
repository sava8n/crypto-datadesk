"""25Δ skew term structure: risk reversal and butterfly per expiry."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.frames import as_declared_dtypes, empty_frame, expiry_tte

logger = logging.getLogger(__name__)

# one row per expiry, sorted by time to expiry
SKEW_COLUMNS = ["expiry", "tte_years", "rr", "bf"]

CALL_DELTA = 0.25
PUT_DELTA = -0.25


def _wing_iv(group: pd.DataFrame, option_type: str, target_delta: float) -> float | None:
    """Interpolate mark_iv at ``target_delta`` on one OTM side of an expiry's smile."""
    side = group[group["option_type"] == option_type].sort_values("delta")
    if len(side) < 2:
        return None
    deltas = side["delta"].to_numpy(dtype=float)
    sigma = side["mark_iv"].to_numpy(dtype=float)
    # one ascending bracket check covers both wings because put deltas are negative:
    # sorting puts -0.5 before -0.1, so PUT_DELTA = -0.25 falls inside the same way
    # CALL_DELTA = 0.25 does. Outside the range means no 25d coverage - skip, never
    # extrapolate, since the wings are exactly where extrapolation is worst.
    if not deltas[0] <= target_delta <= deltas[-1]:
        return None
    return float(np.interp(target_delta, deltas, sigma))


def build(quotes: pd.DataFrame, term_structure: pd.DataFrame) -> pd.DataFrame:
    """25Δ risk reversal (call IV - put IV) and butterfly (wing mean - ATM) per expiry.

    Both wings are interpolated over delta on the expiry's OTM smile. The ATM level is
    read from the already-built term structure rather than re-interpolated here, so the
    two views cannot disagree and the interpolation runs once per expiry, not twice.
    Expiries lacking 25Δ coverage on either wing are skipped rather than extrapolated.
    """
    logger.info("building 25d skew term structure")
    if quotes.empty or term_structure.empty:
        return empty_frame(SKEW_COLUMNS)

    atm_by_expiry = dict(zip(term_structure["expiry"], term_structure["atm_iv"], strict=True))

    rows = []
    for expiry, group in quotes.groupby("expiry", sort=False):
        atm = atm_by_expiry.get(expiry)  # absent when the expiry produced no ATM IV
        call_25 = _wing_iv(group, "C", CALL_DELTA)
        put_25 = _wing_iv(group, "P", PUT_DELTA)
        if atm is None or call_25 is None or put_25 is None:
            continue
        rows.append(
            {
                "expiry": expiry,
                "tte_years": expiry_tte(group),
                "rr": call_25 - put_25,
                "bf": 0.5 * (call_25 + put_25) - atm,
            }
        )

    if not rows:
        logger.warning("no expiries had 25Δ coverage on both wings")
        return empty_frame(SKEW_COLUMNS)

    result = (
        pd.DataFrame(rows, columns=SKEW_COLUMNS).sort_values("tte_years").reset_index(drop=True)
    )
    logger.info("25d skew built for %d expiries", len(result))
    return as_declared_dtypes(result)
