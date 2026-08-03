"""Flow aggregation shaping (the SQL sums are pivoted to call/put columns in python)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from data.cache import TTLCache
from data.storage import flow


@pytest.fixture
def fresh_cache(monkeypatch):
    monkeypatch.setattr(flow, "_cache", TTLCache(60.0))


def test_pivot_merges_sides_and_sorts():
    rows = [
        {"strike": 65_000.0, "option_type": "C", "contracts": 10.0, "premium": 5_000.0},
        {"strike": 60_000.0, "option_type": "P", "contracts": -3.0, "premium": None},
        {"strike": 65_000.0, "option_type": "P", "contracts": 2.0, "premium": 900.0},
    ]
    out = flow._pivot(rows, "strike")

    assert [r["strike"] for r in out] == [60_000.0, 65_000.0]
    # a side with no prints stays zero; a NULL premium sum reads as zero
    assert out[0]["call_contracts"] == 0.0
    assert out[0]["put_contracts"] == -3.0
    assert out[0]["put_premium"] == 0.0
    assert out[1]["call_contracts"] == 10.0
    assert out[1]["put_premium"] == 900.0


def test_pivot_empty_is_empty():
    assert flow._pivot([], "strike") == []


def test_dealer_inputs_returns_per_contract_rows_and_the_tape_start(monkeypatch):
    ts = datetime(2026, 7, 26, tzinfo=UTC)
    row = {"expiry": datetime(2026, 8, 7, 8, tzinfo=UTC), "strike": 64_000.0,
           "option_type": "C", "net_taker": 5.0}
    results = iter([[row], [{"ts": ts}]])
    monkeypatch.setattr(flow, "_rows", lambda stmt: next(results))

    out = flow._dealer_inputs("BTC")

    assert out["rows"] == [row]
    assert out["tape_start"] == ts


def test_dealer_flow_hits_storage_once_per_ttl(fresh_cache, monkeypatch):
    calls = []

    def inputs(currency):
        calls.append(currency)
        return {"rows": [], "tape_start": None}

    monkeypatch.setattr(flow, "_dealer_inputs", inputs)

    first = flow.dealer_flow("BTC")
    second = flow.dealer_flow("BTC")

    assert first == second == {"rows": [], "tape_start": None}
    assert calls == ["BTC"]


def test_tape_start_is_none_on_an_empty_tape(fresh_cache, monkeypatch):
    monkeypatch.setattr(flow, "_rows", lambda stmt: [{"ts": None}])
    assert flow.tape_start("BTC") is None
