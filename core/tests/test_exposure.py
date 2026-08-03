"""Dollar vanna/charm exposure by strike."""

from __future__ import annotations

import pandas as pd
import pytest

from analytics.positioning.exposure import build

_EXPIRY = pd.Timestamp("2035-01-31", tz="UTC")


def _greeks(strikes, values, greek):
    return pd.DataFrame({"expiry": [_EXPIRY] * len(strikes), "strike": strikes, greek: values})


def _oi(strikes, option_types, ois, forward):
    return pd.DataFrame(
        {
            "expiry": [_EXPIRY] * len(strikes),
            "strike": strikes,
            "option_type": option_types,
            "open_interest": ois,
            "forward": [forward] * len(strikes),
        }
    )


def test_build_dollar_exposure_and_signs():
    greeks = _greeks([90.0, 110.0], [0.001, 0.002], "vanna")
    oi = _oi([90.0, 110.0], ["P", "C"], [10.0, 5.0], forward=100.0)
    out = build(greeks, oi, "vanna")

    # put at 90: dollar = 10 * 0.001 * 100 = 1.0, signed negative
    put_row = out[out["strike"] == 90.0].iloc[0]
    assert put_row["put_exposure"] == pytest.approx(-1.0)
    assert put_row["call_exposure"] == pytest.approx(0.0)

    # call at 110: dollar = 5 * 0.002 * 100 = 1.0, signed positive
    call_row = out[out["strike"] == 110.0].iloc[0]
    assert call_row["call_exposure"] == pytest.approx(1.0)
    assert call_row["net_exposure"] == pytest.approx(1.0)


def test_value_is_shared_by_both_legs_of_a_strike():
    """Like gamma: one value per (expiry, strike) prices both sides' OI."""
    greeks = _greeks([110.0], [0.002], "charm")
    oi = _oi([110.0, 110.0], ["C", "P"], [5.0, 5.0], forward=100.0)

    out = build(greeks, oi, "charm")

    row = out.iloc[0]
    assert row["call_exposure"] == pytest.approx(1.0)
    assert row["put_exposure"] == pytest.approx(-1.0)
    assert row["net_exposure"] == pytest.approx(0.0)


def test_open_interest_without_a_quote_is_dropped():
    greeks = _greeks([110.0], [0.002], "vanna")
    oi = _oi([90.0, 110.0], ["P", "C"], [10.0, 5.0], forward=100.0)

    out = build(greeks, oi, "vanna")

    assert list(out["strike"]) == [110.0]


def test_signed_oi_overrides_the_classic_sign():
    greeks = _greeks([90.0], [0.001], "vanna")
    oi = _oi([90.0], ["P"], [10.0], forward=100.0)
    oi["signed_oi"] = [10.0]  # flow says dealers are long these puts

    out = build(greeks, oi, "vanna")

    assert out.iloc[0]["put_exposure"] == pytest.approx(1.0)


def test_build_empty_inputs_typed(assert_declared_dtypes):
    empty_greeks = pd.DataFrame({"expiry": [], "strike": [], "vanna": []})
    empty_oi = pd.DataFrame(
        {"expiry": [], "strike": [], "option_type": [], "open_interest": [], "forward": []}
    )
    out = build(empty_greeks, empty_oi, "vanna")
    assert out.empty
    assert_declared_dtypes(out)
