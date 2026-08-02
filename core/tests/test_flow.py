"""Flow aggregation shaping (the SQL sums are pivoted to call/put columns in python)."""

from __future__ import annotations

from data.storage import flow


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
