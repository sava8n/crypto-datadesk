"""``MarketState`` -> archive rows."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Protocol

import pandas as pd

from analytics.frames import finite
from data.market.chain import CONTRACT_COLUMNS

logger = logging.getLogger(__name__)

# the natural key: one row per instrument per capture
CONTRACT_KEY = ["expiry", "strike", "option_type"]
CONTRACT_ROW_COLUMNS = ["snapshot_id", *CONTRACT_COLUMNS]


class Archivable(Protocol):
    """What the archive needs of a market state."""

    as_of: datetime
    spot: float
    contracts: pd.DataFrame

    @property
    def iv30(self) -> float | None: ...
    @property
    def rv7(self) -> float | None: ...
    @property
    def rv30(self) -> float | None: ...
    @property
    def dvol(self) -> float | None: ...
    @property
    def dvol_rank(self) -> float | None: ...
    @property
    def gex_flip(self) -> float | None: ...
    @property
    def iv7(self) -> float | None: ...
    @property
    def rr25_7(self) -> float | None: ...
    @property
    def bf25_7(self) -> float | None: ...
    @property
    def rr25_30(self) -> float | None: ...
    @property
    def bf25_30(self) -> float | None: ...
    @property
    def oi_total_calls(self) -> float | None: ...
    @property
    def oi_total_puts(self) -> float | None: ...
    @property
    def max_pain_front(self) -> float | None: ...
    @property
    def gex_net_total(self) -> float | None: ...
    @property
    def cm_grid(self) -> pd.DataFrame: ...


# scalars derived from (contracts, spot) alone - no candle history involved, so the
# backfill can restore them for any archived book.
#
# gex_flip and gex_net_total are recorded under the assumption convention so the archived
# series keeps one meaning as the tape deepens; flow-signed figures are served live only.
# That is a convention choice, not a candle dependency - both still backfill.
DERIVED_SCALARS = (
    "iv7",
    "iv30",
    "rr25_7",
    "bf25_7",
    "rr25_30",
    "bf25_30",
    "oi_total_calls",
    "oi_total_puts",
    "max_pain_front",
    "gex_flip",
    "gex_net_total",
)


def derived_row(state: Archivable) -> dict:
    """The candle-free derived scalars, finite-or-None per column."""
    return {name: finite(getattr(state, name)) for name in DERIVED_SCALARS}


def snapshot_row(state: Archivable, currency: str) -> dict | None:
    """The snapshot row - identity, spot and the cached scalars - or ``None`` if unusable.

    ``snapshot.spot`` is NOT NULL and every stored product is priced off it, so a
    non-finite or non-positive spot makes the whole capture worthless; better to record
    nothing than a row that poisons every reader.
    """
    spot = finite(state.spot)
    if spot is None or spot <= 0:
        return None
    return {
        "currency": currency,
        "as_of": state.as_of,
        "spot": spot,
        # candle-derived, so the backfill cannot restore them from an archived book.
        # MarketState already returns these finite-or-None; finite() repeats the guard
        # because `state` is duck-typed and this is the last step before a typed column
        "rv7": finite(state.rv7),
        "rv30": finite(state.rv30),
        "dvol": finite(state.dvol),
        "dvol_rank": finite(state.dvol_rank),
        **derived_row(state),
    }


def cm_rows(state: Archivable, snapshot_id: int) -> list[dict]:
    """One row per constant-maturity tenor the capture's chain spanned; NaN -> None."""
    grid = state.cm_grid
    if grid.empty:
        return []
    rows_ = grid.astype(object)
    rows_.insert(0, "snapshot_id", snapshot_id)
    return [
        {key: (None if pd.isna(value) else value) for key, value in record.items()}
        for record in rows_.to_dict("records")
    ]


def contract_rows(state: Archivable, snapshot_id: int) -> list[dict]:
    """One row per instrument in the unfiltered book, keyed to ``snapshot_id``.

    Deduplicated on the natural key first: two rows resolving to the same
    (expiry, strike, option_type) would violate the primary key and abort the whole
    capture, and losing one contract beats losing the snapshot.

    ``NaN`` becomes ``None`` so unquoted books land as SQL NULL rather than NaN.
    """
    book = state.contracts
    if book.empty:
        return []

    deduped = book[CONTRACT_COLUMNS].drop_duplicates(CONTRACT_KEY).copy()
    if len(deduped) != len(book):
        logger.warning(
            "dropped %d contract rows duplicating the natural key", len(book) - len(deduped)
        )
    deduped.insert(0, "snapshot_id", snapshot_id)
    # object dtype boxes numpy scalars back to plain Python for the driver
    deduped = deduped.astype(object)
    return [
        {key: (None if pd.isna(value) else value) for key, value in record.items()}
        for record in deduped.to_dict("records")
    ]
