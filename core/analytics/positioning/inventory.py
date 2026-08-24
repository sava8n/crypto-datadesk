"""Tape-signed dealer inventory per contract.

    signed_oi = clip(-net_taker, -OI, +OI)

Cumulative taker flow signs the open interest it explains (taker buy -> dealer short);
OI the tape cannot explain carries no exposure.
"""

from __future__ import annotations

import pandas as pd

from analytics.frames import as_declared_dtypes

NET_FLOW_COLUMNS = ["expiry", "strike", "option_type", "net_taker"]


def net_flow_frame(rows: list[dict]) -> pd.DataFrame:
    """Per-contract cumulative net taker flow rows as a typed frame."""
    return as_declared_dtypes(pd.DataFrame(rows, columns=NET_FLOW_COLUMNS))


def flow_signed_chain(
    oi_chain: pd.DataFrame, net_flow: pd.DataFrame
) -> tuple[pd.DataFrame, float | None]:
    """``oi_chain`` plus ``signed_oi``, and the fraction of OI the tape explains."""
    if oi_chain.empty:
        chain = oi_chain.copy()
        chain["signed_oi"] = pd.Series([], dtype="float64")
        return chain, None

    merged = oi_chain.merge(net_flow, on=["expiry", "strike", "option_type"], how="left")
    net_taker = merged["net_taker"].fillna(0.0)
    oi = merged["open_interest"]
    merged["signed_oi"] = (-net_taker).clip(lower=-oi, upper=oi)
    fraction = float(merged["signed_oi"].abs().sum() / oi.sum())
    return merged.drop(columns=["net_taker"]), fraction
