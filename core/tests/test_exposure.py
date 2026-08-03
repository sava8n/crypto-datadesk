"""Dollar dealer exposure by strike, and the zero-gamma flip level."""

from __future__ import annotations

import pandas as pd
import pytest

from analytics.positioning.exposure import build, flip_level

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


def test_gamma_carries_the_forward_squared_and_a_1pct_move():
    """Gamma is the one greek quoted per 1% move, so it scales by F^2 * 0.01, not F."""
    greeks = _greeks([90.0, 110.0], [0.001, 0.002], "gamma")
    oi = _oi([90.0, 110.0], ["P", "C"], [10.0, 5.0], forward=100.0)
    out = build(greeks, oi, "gamma")

    # put at 90: dollar = 10 * 0.001 * 100^2 * 0.01 = 1.0, signed negative
    put_row = out[out["strike"] == 90.0].iloc[0]
    assert put_row["put_exposure"] == pytest.approx(-1.0)
    assert put_row["call_exposure"] == pytest.approx(0.0)

    # call at 110: dollar = 5 * 0.002 * 100^2 * 0.01 = 1.0, signed positive
    call_row = out[out["strike"] == 110.0].iloc[0]
    assert call_row["call_exposure"] == pytest.approx(1.0)
    assert call_row["net_exposure"] == pytest.approx(1.0)


def test_value_is_shared_by_both_legs_of_a_strike():
    """One value per (expiry, strike) prices both sides' OI."""
    greeks = _greeks([110.0], [0.002], "charm")
    oi = _oi([110.0, 110.0], ["C", "P"], [5.0, 5.0], forward=100.0)

    out = build(greeks, oi, "charm")

    row = out.iloc[0]
    assert row["call_exposure"] == pytest.approx(1.0)
    assert row["put_exposure"] == pytest.approx(-1.0)
    assert row["net_exposure"] == pytest.approx(0.0)


def test_gamma_is_shared_by_both_legs_of_a_strike():
    greeks = _greeks([110.0], [0.002], "gamma")
    oi = _oi([110.0, 110.0], ["C", "P"], [5.0, 5.0], forward=100.0)

    out = build(greeks, oi, "gamma")

    row = out.iloc[0]
    assert row["call_exposure"] == pytest.approx(1.0)
    assert row["put_exposure"] == pytest.approx(-1.0)
    assert row["net_exposure"] == pytest.approx(0.0)


@pytest.mark.parametrize("greek", ["gamma", "vanna", "charm"])
def test_open_interest_without_a_quote_is_dropped(greek):
    """The greek comes from the OTM quote that survived the quality filters, so OI at a
    strike with no such quote has no price."""
    greeks = _greeks([110.0], [0.002], greek)
    oi = _oi([90.0, 110.0], ["P", "C"], [10.0, 5.0], forward=100.0)

    out = build(greeks, oi, greek)

    assert list(out["strike"]) == [110.0]


@pytest.mark.parametrize("greek", ["gamma", "vanna", "charm"])
def test_signed_oi_overrides_the_classic_sign(greek):
    """A chain carrying flow-signed OI is priced as-is - no put negation."""
    greeks = _greeks([90.0], [0.001], greek)
    oi = _oi([90.0], ["P"], [10.0], forward=100.0)
    oi["signed_oi"] = [10.0]  # flow says dealers are long these puts

    out = build(greeks, oi, greek)

    row = out.iloc[0]
    assert row["put_exposure"] == pytest.approx(1.0)
    assert row["net_exposure"] == pytest.approx(1.0)


def test_no_matching_quote_at_all_is_empty():
    greeks = _greeks([500.0], [0.002], "gamma")
    oi = _oi([90.0], ["P"], [10.0], forward=100.0)
    assert build(greeks, oi, "gamma").empty


@pytest.mark.parametrize("greek", ["gamma", "vanna", "charm"])
def test_build_empty_inputs_typed(assert_declared_dtypes, greek):
    empty_greeks = pd.DataFrame({"expiry": [], "strike": [], greek: []})
    empty_oi = pd.DataFrame(
        {"expiry": [], "strike": [], "option_type": [], "open_interest": [], "forward": []}
    )
    out = build(empty_greeks, empty_oi, greek)
    assert out.empty
    assert_declared_dtypes(out)


def test_flip_level_single_crossing():
    per_strike = pd.DataFrame({"strike": [90.0, 100.0, 110.0], "net_exposure": [-2.0, -1.0, 5.0]})
    # cumulative net exposure = [-2, -3, 2]; sign flips between strikes 100 and 110
    # frac = -3 / (-3 - 2) = 0.6 -> 100 + 0.6 * 10 = 106
    assert flip_level(per_strike, spot=100.0) == pytest.approx(106.0)


def test_flip_level_picks_crossing_nearest_spot():
    per_strike = pd.DataFrame(
        {"strike": [80.0, 90.0, 100.0, 110.0], "net_exposure": [3.0, -6.0, 6.0, -6.0]}
    )
    # cumulative = [3, -3, 3, -3]; crossings at 85, 95, 105 -> nearest to spot 101 is 105
    assert flip_level(per_strike, spot=101.0) == pytest.approx(105.0)


def test_flip_level_no_crossing_returns_none():
    per_strike = pd.DataFrame({"strike": [90.0, 100.0], "net_exposure": [1.0, 2.0]})  # cum = [1, 3]
    assert flip_level(per_strike, spot=95.0) is None


def test_flip_level_too_few_rows_returns_none():
    per_strike = pd.DataFrame({"strike": [100.0], "net_exposure": [1.0]})
    assert flip_level(per_strike, spot=100.0) is None
