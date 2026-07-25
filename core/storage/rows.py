"""``MarketState`` -> archive rows.

Pure mapping, no database imports, so it is unit-testable like the domain builders.
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd

from shared.quotes import CONTRACT_COLUMNS

CONTRACT_ROW_COLUMNS = ["snapshot_id", "as_of", *CONTRACT_COLUMNS]


def _finite(value: Any) -> float | None:
    """A plain float, or ``None`` for missing and non-finite values."""
    if value is None:
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def snapshot_row(state, currency: str) -> dict:
    return {"currency": currency, "as_of": state.as_of, "spot": float(state.spot)}


def contract_rows(state, snapshot_id: int) -> list[dict]:
    """One row per instrument in the unfiltered book, keyed to ``snapshot_id``.

    ``NaN`` becomes ``None`` so unquoted books land as SQL NULL rather than NaN.
    """
    frame = state.contracts
    if frame.empty:
        return []

    out = frame[CONTRACT_COLUMNS].copy()
    out.insert(0, "as_of", state.as_of)
    out.insert(0, "snapshot_id", snapshot_id)
    # object dtype boxes numpy scalars back to plain Python for the driver
    out = out.astype(object)
    return [
        {key: (None if pd.isna(value) else value) for key, value in record.items()}
        for record in out.to_dict("records")
    ]


def summary_row(state, snapshot_id: int) -> dict:
    """Scalars cached alongside the snapshot; all recomputable from ``contract``."""
    return {
        "snapshot_id": snapshot_id,
        "iv30": _finite(state.iv30),
        "rv30": _finite(state.rv30),
        "dvol": _finite(state.dvol),
        "dvol_rank": _finite(state.dvol_rank),
        "gex_flip": _finite(state.gex_flip),
    }
