"""Frame conventions and shaping shared by the analytics builders."""

from __future__ import annotations

import math
from collections.abc import Iterable, Sequence
from typing import Any

import numpy as np
import pandas as pd

_DTYPES = {
    "expiry": "datetime64[us, UTC]",
    "ts": "datetime64[us, UTC]",
    "option_type": "str",
    "instrument_name": "str",
}

# ITM/OTM x call/put, the four moneyness buckets open interest is reported in
BUCKETS = ("itm_calls", "otm_calls", "itm_puts", "otm_puts")


def dtypes_for(columns: Iterable[str]) -> dict[str, str]:
    """Declared dtype per column; anything unlisted is ``float64``."""
    return {c: _DTYPES.get(c, "float64") for c in columns}


def as_declared_dtypes(frame: pd.DataFrame) -> pd.DataFrame:
    """Coerce ``frame`` to the declared dtypes.

    Inference alone is not enough: ``to_numeric`` yields int64 for the integer strikes
    Deribit quotes, which would not match the float64 an empty frame declares.
    """
    return frame.astype(dtypes_for(frame.columns))


def empty_frame(columns: Iterable[str]) -> pd.DataFrame:
    """An empty frame carrying ``columns`` at their declared dtypes."""
    return pd.DataFrame({c: pd.Series([], dtype=d) for c, d in dtypes_for(columns).items()})


def finite(value: Any) -> float | None:
    """A plain float, or ``None`` for missing and non-finite values.

    NumPy reductions return NaN rather than raising, so a scalar that failed to compute
    arrives as NaN and has to become an explicit absence before a caller sees it.
    """
    if value is None:
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def expiry_forward(group: pd.DataFrame) -> float:
    """One expiry's forward - a median, because Deribit sends one per instrument and they
    disagree in the last decimals."""
    return float(group["forward"].median())


def expiry_tte(group: pd.DataFrame) -> float:
    """One expiry's time to expiry - any row's, since it is derived from the expiry
    itself and every row of the group therefore carries the same value."""
    return float(group["tte_years"].iloc[0])


def moneyness_bucket(chain: pd.DataFrame) -> np.ndarray:
    """One of ``BUCKETS`` per row of ``chain``.

    Classified on strike against the per-contract forward, so no IV is needed: a call is
    ITM when ``strike < forward``, a put when ``strike > forward``. At-the-money falls to
    OTM. The three predicates plus the default cover every case exactly once.
    """
    is_call = (chain["option_type"] == "C").to_numpy()
    strike = chain["strike"].to_numpy(dtype=float)
    forward = chain["forward"].to_numpy(dtype=float)
    itm = np.where(is_call, strike < forward, strike > forward)
    return np.select(
        [is_call & itm, is_call & ~itm, ~is_call & itm],
        ["itm_calls", "otm_calls", "itm_puts"],
        default="otm_puts",
    )


def sum_by(
    frame: pd.DataFrame,
    index: str,
    label: str,
    value: str,
    labels: Sequence[str],
) -> pd.DataFrame:
    """Sum ``value`` over (``index``, ``label``), spreading labels into columns.

    ``pivot_table`` only emits columns for labels actually present, so the absent ones
    are added as zeros - callers project a fixed column list and would otherwise raise
    on a chain that happens to hold no puts.
    """
    pivot = frame.pivot_table(
        index=index,
        columns=label,
        values=value,
        aggfunc="sum",
        fill_value=0.0,
    )
    for name in labels:
        if name not in pivot.columns:
            pivot[name] = 0.0
    return pivot
