"""Vol statistics: DVOL level/rank, realized vol and constant-maturity ATM IV."""

from __future__ import annotations

import math

import pandas as pd
import pytest

from analytics.stats import atm_iv_at, dvol_stats, realized_vol, skew_at


def _candle(close):
    return [0, 0, 0, 0, close]  # only index 4 (close) is read


def test_dvol_stats_decimal_and_rank():
    dvol, rank = dvol_stats([_candle(40.0), _candle(60.0), _candle(50.0)])
    assert dvol == pytest.approx(0.50)  # last close 50 / 100
    assert rank == pytest.approx((50.0 - 40.0) / (60.0 - 40.0))


def test_dvol_stats_flat_window_rank_none():
    dvol, rank = dvol_stats([_candle(50.0), _candle(50.0)])
    assert dvol == pytest.approx(0.50)
    assert rank is None


def test_dvol_stats_empty_returns_none_pair():
    assert dvol_stats([]) == (None, None)


def test_realized_vol_constant_prices_is_zero():
    assert realized_vol([100.0] * 10) == pytest.approx(0.0)


def test_realized_vol_insufficient_data_returns_none():
    assert realized_vol([100.0]) is None
    assert realized_vol([100.0, 101.0]) is None  # only one return


def test_realized_vol_non_positive_close_is_nan():
    """log(0) is -inf, so the std is NaN - callers turn that into None via finite()."""
    assert math.isnan(realized_vol([100.0, 0.0, 102.0, 103.0]))


def test_atm_iv_at_flat_term_returns_same_iv():
    term = pd.DataFrame({"tte_years": [0.05, 0.25], "atm_iv": [0.6, 0.6]})
    assert atm_iv_at(term, days=30) == pytest.approx(0.6)


def test_atm_iv_at_interpolates_in_total_variance():
    """The point of the module: variance is ~linear in tte, IV is not.

    30d sits between a 0.05y 50-vol and a 0.25y 70-vol expiry. Interpolating total
    variance gives ~0.606; interpolating IV directly would give ~0.532, so this
    distinguishes the two rather than just checking a value in range.
    """
    term = pd.DataFrame({"tte_years": [0.05, 0.25], "atm_iv": [0.50, 0.70]})
    assert atm_iv_at(term, days=30) == pytest.approx(0.6061146756184014)


def test_atm_iv_at_clamps_beyond_chain():
    term = pd.DataFrame({"tte_years": [0.1, 0.2], "atm_iv": [0.6, 0.5]})
    # 400 days is past the last expiry -> clamps to the far tte, i.e. its ATM IV
    assert atm_iv_at(term, days=400) == pytest.approx(0.5)


def test_atm_iv_at_empty_returns_none():
    assert atm_iv_at(pd.DataFrame({"tte_years": [], "atm_iv": []})) is None


def test_skew_at_interpolates_linearly():
    skew = pd.DataFrame({"tte_years": [0.05, 0.25], "rr": [-0.04, -0.06], "bf": [0.01, 0.02]})
    frac = (30.0 / 365.25 - 0.05) / 0.20
    rr, bf = skew_at(skew, days=30)
    assert rr == pytest.approx(-0.04 - 0.02 * frac)
    assert bf == pytest.approx(0.01 + 0.01 * frac)


def test_skew_at_clamps_beyond_chain():
    skew = pd.DataFrame({"tte_years": [0.1, 0.2], "rr": [-0.04, -0.06], "bf": [0.01, 0.02]})
    assert skew_at(skew, days=400) == (pytest.approx(-0.06), pytest.approx(0.02))
    assert skew_at(skew, days=1) == (pytest.approx(-0.04), pytest.approx(0.01))


def test_skew_at_empty_returns_none_pair():
    assert skew_at(pd.DataFrame({"tte_years": [], "rr": [], "bf": []})) == (None, None)
