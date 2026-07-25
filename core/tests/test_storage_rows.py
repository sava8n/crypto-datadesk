"""``MarketState`` -> archive rows: shape, NaN handling and the cached scalars."""

from __future__ import annotations

import math

import numpy as np
import pytest

from shared.quotes import empty_contracts
from storage import rows
from storage.rows import CONTRACT_ROW_COLUMNS


class _Scalars:
    """Stands in for a MarketState when only the summary scalars matter."""

    def __init__(self, **values):
        self.__dict__.update(values)


def test_snapshot_row(market_state):
    row = rows.snapshot_row(market_state, "BTC")
    assert row == {"currency": "BTC", "as_of": market_state.as_of, "spot": market_state.spot}


def test_contract_rows_cover_the_unfiltered_book(market_state):
    out = rows.contract_rows(market_state, 7)

    assert len(out) == len(market_state.contracts)
    assert list(out[0]) == CONTRACT_ROW_COLUMNS
    assert {r["snapshot_id"] for r in out} == {7}
    assert {r["as_of"] for r in out} == {market_state.as_of}
    # the book, not either filtered projection
    assert len(out) > len(market_state.otm_quotes)


def test_contract_rows_map_nan_to_none(market_state):
    market_state.contracts.loc[0, "bid_price"] = np.nan
    out = rows.contract_rows(market_state, 1)

    assert out[0]["bid_price"] is None
    assert out[1]["bid_price"] is not None


def test_contract_rows_empty_chain(market_state):
    market_state.contracts = empty_contracts()
    assert rows.contract_rows(market_state, 1) == []


def test_summary_row(market_state):
    row = rows.summary_row(market_state, 3)
    assert row["snapshot_id"] == 3
    assert row["iv30"] == pytest.approx(market_state.iv30)
    assert row["gex_flip"] == pytest.approx(market_state.gex_flip)


def test_summary_row_nulls_missing_and_non_finite():
    row = rows.summary_row(
        _Scalars(iv30=math.nan, rv30=None, dvol=0.55, dvol_rank=math.inf, gex_flip=np.float64(1.5)),
        1,
    )
    assert row["iv30"] is None
    assert row["rv30"] is None
    assert row["dvol_rank"] is None
    assert row["dvol"] == 0.55
    # numpy scalars become plain floats so the driver does not have to adapt them
    assert type(row["gex_flip"]) is float
