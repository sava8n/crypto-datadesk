"""Open interest: contracts outstanding, bucketed by moneyness, plus settlement analytics.

``by_expiry`` and ``by_strike`` are the same bucketing over different group keys.
``intrinsic_values``/``max_pain`` answer a different question - what the book pays out at
a candidate settlement price - and only make sense for one expiry at a time.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.frames import BUCKETS, as_declared_dtypes, empty_frame, moneyness_bucket, sum_by

logger = logging.getLogger(__name__)

BY_EXPIRY_COLUMNS = ["expiry", "tte_years", *BUCKETS]
BY_STRIKE_COLUMNS = ["strike", *BUCKETS]
INTRINSIC_COLUMNS = ["strike", "intrinsic_value"]
CHANGE_COLUMNS = ["strike", "call_oi_change", "put_oi_change"]


def by_expiry(chain: pd.DataFrame) -> pd.DataFrame:
    """Per-expiry open interest split into ITM/OTM calls and puts, sorted by tte."""
    if chain.empty:
        return empty_frame(BY_EXPIRY_COLUMNS)

    bucketed = chain[["expiry", "tte_years", "open_interest"]].copy()
    bucketed["bucket"] = moneyness_bucket(chain)
    pivot = sum_by(bucketed, "expiry", "bucket", "open_interest", BUCKETS)

    tte = bucketed.groupby("expiry")["tte_years"].first()
    result = pivot.join(tte).reset_index().sort_values("tte_years").reset_index(drop=True)
    logger.info("open interest by expiration built for %d expiries", len(result))
    return as_declared_dtypes(result[BY_EXPIRY_COLUMNS])


def by_strike(chain: pd.DataFrame) -> pd.DataFrame:
    """Per-strike open interest split into ITM/OTM calls and puts, sorted by strike.

    Takes the whole chain or a single-expiry slice.
    """
    if chain.empty:
        return empty_frame(BY_STRIKE_COLUMNS)

    bucketed = chain[["strike", "open_interest"]].copy()
    bucketed["bucket"] = moneyness_bucket(chain)
    pivot = sum_by(bucketed, "strike", "bucket", "open_interest", BUCKETS)

    result = pivot.reset_index().sort_values("strike").reset_index(drop=True)
    logger.info("open interest by strike built for %d strikes", len(result))
    return as_declared_dtypes(result[BY_STRIKE_COLUMNS])


def _oi_sums(chain: pd.DataFrame) -> pd.DataFrame:
    """Call/put open-interest totals per strike, columns ``C``/``P``."""
    if chain.empty:
        return pd.DataFrame(columns=["C", "P"], dtype=float)
    pivot = sum_by(
        chain[["strike", "option_type", "open_interest"]],
        "strike",
        "option_type",
        "open_interest",
        ("C", "P"),
    )
    return pivot[["C", "P"]]


def strike_change(current: pd.DataFrame, baseline: pd.DataFrame) -> pd.DataFrame:
    """Per-strike call/put open-interest delta between two books, sorted by strike.

    Outer join on strike with a missing side counting as zero, so a strike appearing
    reads as its full OI and one disappearing as the full negative. Strikes unchanged
    on both sides are dropped.
    """
    now, then = _oi_sums(current), _oi_sums(baseline)
    joined = now.join(then, how="outer", lsuffix="_now", rsuffix="_then").fillna(0.0)
    result = pd.DataFrame(
        {
            "strike": joined.index.to_numpy(dtype=float),
            "call_oi_change": (joined["C_now"] - joined["C_then"]).to_numpy(),
            "put_oi_change": (joined["P_now"] - joined["P_then"]).to_numpy(),
        }
    )
    result = result[(result["call_oi_change"] != 0.0) | (result["put_oi_change"] != 0.0)]
    if result.empty:
        return empty_frame(CHANGE_COLUMNS)
    return as_declared_dtypes(result.sort_values("strike").reset_index(drop=True))


def with_settlement(chain: pd.DataFrame) -> tuple[pd.DataFrame, float | None]:
    """``by_strike`` carrying an ``intrinsic_value`` column, plus the max-pain strike.

    Single-expiry only. Joining here rather than in the caller keeps the two frames - both
    derived from the same chain - matched on strike by pandas instead of by float lookup.
    """
    grid = by_strike(chain)
    intrinsic = intrinsic_values(chain)
    return grid.merge(intrinsic, on="strike", how="left"), max_pain(intrinsic)


def intrinsic_values(chain: pd.DataFrame) -> pd.DataFrame:
    """Open-interest-weighted intrinsic value at each candidate settlement price.

    The candidates are the distinct strikes in the chain. At candidate ``K`` the book
    pays ``sum(call_oi * max(K - Ki, 0)) + sum(put_oi * max(Ki - K, 0))`` in USD. Meant
    for a single expiry - mixing expiries conflates unrelated settlement dates.
    """
    if chain.empty:
        return empty_frame(INTRINSIC_COLUMNS)

    is_call = (chain["option_type"] == "C").to_numpy()
    strike = chain["strike"].to_numpy(dtype=float)
    oi = chain["open_interest"].to_numpy(dtype=float)

    candidates = np.unique(strike)
    # broadcast candidates (rows) against contracts (cols): each contract's payoff at
    # each candidate settlement price
    diff = candidates[:, None] - strike[None, :]
    call_payoff = np.where(is_call[None, :], np.maximum(diff, 0.0), 0.0)
    put_payoff = np.where(~is_call[None, :], np.maximum(-diff, 0.0), 0.0)
    total = ((call_payoff + put_payoff) * oi[None, :]).sum(axis=1)

    return pd.DataFrame({"strike": candidates, "intrinsic_value": total})


def max_pain(intrinsic: pd.DataFrame) -> float | None:
    """The strike with the least total intrinsic value, or ``None`` for an empty frame."""
    if intrinsic.empty:
        return None
    return float(intrinsic.loc[intrinsic["intrinsic_value"].idxmin(), "strike"])
