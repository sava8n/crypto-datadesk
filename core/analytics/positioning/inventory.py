"""Flow-signed dealer inventory per contract.

    signed_oi = clip(-net_taker, -OI, +OI) + classic_sign * residual

The tape-explained share of open interest is signed by cumulative taker flow
(taker buy -> dealer short); the residual keeps the classic dealer assumption
(calls +, puts -), so an empty tape reproduces the assumption convention exactly.
"""

from __future__ import annotations

import numpy as np
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
    explained = (-net_taker).clip(lower=-oi, upper=oi)
    classic = np.where(merged["option_type"] == "C", 1.0, -1.0)
    merged["signed_oi"] = explained + classic * (oi - explained.abs())
    fraction = float(explained.abs().sum() / oi.sum())
    return merged.drop(columns=["net_taker"]), fraction
