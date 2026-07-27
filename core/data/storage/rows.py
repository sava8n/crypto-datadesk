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
    def rv30(self) -> float | None: ...
    @property
    def dvol(self) -> float | None: ...
    @property
    def dvol_rank(self) -> float | None: ...
    @property
    def gex_flip(self) -> float | None: ...


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
        # MarketState already returns these finite-or-None; finite() repeats the guard
        # because `state` is duck-typed and this is the last step before a typed column
        "iv30": finite(state.iv30),
        "rv30": finite(state.rv30),
        "dvol": finite(state.dvol),
        "dvol_rank": finite(state.dvol_rank),
        "gex_flip": finite(state.gex_flip),
    }


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
