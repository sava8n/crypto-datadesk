"""``MarketState`` -> archive rows: shape, NaN handling and the cached scalars."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

from data.market.chain import empty_contracts
from data.storage import rows
from data.storage.rows import CONTRACT_ROW_COLUMNS


class _State:
    """Stands in for a MarketState when only the archived attributes matter."""

    contracts = empty_contracts()
    as_of = pd.Timestamp("2026-07-18", tz="UTC").to_pydatetime()

    def __init__(self, **values):
        self.__dict__.update(values)


_TAPE = {"gex_flip": 101_000.0, "gex_net_total": -2.5e6, "oi_explained_fraction": 0.6}


def test_snapshot_row_carries_identity_and_scalars(market_state):
    row = rows.snapshot_row(market_state, "BTC", _TAPE)
    assert row["currency"] == "BTC"
    assert row["as_of"] == market_state.as_of
    assert row["spot"] == market_state.spot
    assert row["iv30"] == market_state.iv30
    assert row["gex_flip"] == _TAPE["gex_flip"]
    assert row["oi_explained_fraction"] == _TAPE["oi_explained_fraction"]


def test_snapshot_row_nulls_non_finite_scalars():
    derived = dict.fromkeys(rows.DERIVED_SCALARS)
    row = rows.snapshot_row(
        _State(
            spot=100_000.0,
            rv7=None,
            rv30=None,
            dvol=0.55,
            dvol_rank=math.inf,
            **{**derived, "iv30": math.nan, "oi_total_calls": math.nan},
        ),
        "BTC",
        {
            "gex_flip": np.float64(1.5),
            "gex_net_total": np.float64(2.5),
            "oi_explained_fraction": math.nan,
        },
    )
    assert row["iv30"] is None
    assert row["rv30"] is None
    assert row["dvol_rank"] is None
    assert row["dvol"] == 0.55
    assert row["oi_total_calls"] is None
    assert row["oi_explained_fraction"] is None
    # numpy scalars become plain floats so the driver does not have to adapt them
    assert type(row["gex_flip"]) is float
    assert type(row["gex_net_total"]) is float


def test_snapshot_row_rejects_unusable_spot():
    """``snapshot.spot`` is NOT NULL, so a bad spot has to skip the whole capture."""
    scalars = dict(
        rv7=None, rv30=None, dvol=None, dvol_rank=None, **dict.fromkeys(rows.DERIVED_SCALARS)
    )
    assert rows.snapshot_row(_State(spot=math.nan, **scalars), "BTC", _TAPE) is None
    assert rows.snapshot_row(_State(spot=0.0, **scalars), "BTC", _TAPE) is None
    assert rows.snapshot_row(_State(spot=-1.0, **scalars), "BTC", _TAPE) is None


def test_snapshot_row_carries_derived_scalars(market_state):
    row = rows.snapshot_row(market_state, "BTC", _TAPE)
    for name in rows.DERIVED_SCALARS:
        assert row[name] == getattr(market_state, name)


def test_cm_rows_cover_the_spanned_tenors(market_state):
    out = rows.cm_rows(market_state, 7)

    assert len(out) == len(market_state.cm_grid)
    assert len(out) > 0  # the conftest chain spans at least the 30d tenor
    assert {r["snapshot_id"] for r in out} == {7}
    assert all(r["tenor_days"] > 0 for r in out)


def test_cm_rows_empty_grid_yields_no_rows():
    empty = pd.DataFrame({"tenor_days": [], "atm_iv": [], "rr25": [], "bf25": []})
    assert rows.cm_rows(_State(cm_grid=empty), 1) == []


def test_contract_rows_cover_the_unfiltered_book(market_state):
    out = rows.contract_rows(market_state, 7)

    assert len(out) == len(market_state.contracts)
    assert list(out[0]) == CONTRACT_ROW_COLUMNS
    assert {r["snapshot_id"] for r in out} == {7}
    # the instrument's own identity survives the round trip
    assert out[0]["instrument_name"].startswith("BTC-")
    # the book, not either filtered projection
    assert len(out) > len(market_state.otm_quotes)


def test_contract_rows_drop_duplicate_natural_keys(market_state):
    """A duplicated key would abort the insert; losing the row beats losing the capture."""
    doubled = pd.concat([market_state.contracts, market_state.contracts.head(1)])
    out = rows.contract_rows(_State(contracts=doubled), 1)
    assert len(out) == len(market_state.contracts)


def test_contract_rows_map_nan_to_none(market_state):
    market_state.contracts.loc[0, "bid_price"] = np.nan
    out = rows.contract_rows(market_state, 1)

    assert out[0]["bid_price"] is None
    assert out[1]["bid_price"] is not None


def test_contract_rows_empty_chain(market_state):
    market_state.contracts = empty_contracts()
    assert rows.contract_rows(market_state, 1) == []
