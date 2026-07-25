"""Black-76 greeks across the chain: reference values, shape properties, invalid rows."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from analytics.greeks import build
from data.market.chain import prepare_otm_quotes

_GREEKS = ["delta", "gamma", "theta", "vega"]


def _quotes(strikes, forward=100_000.0, tte=0.05, iv=0.6, option_type="C"):
    return pd.DataFrame(
        {
            "expiry": pd.to_datetime(["2035-01-31"] * len(strikes), utc=True),
            "tte_years": [tte] * len(strikes),
            "strike": [float(k) for k in strikes],
            "option_type": [option_type] * len(strikes),
            "forward": [forward] * len(strikes),
            "mark_iv": [iv] * len(strikes),
        }
    )


def test_matches_black76_reference():
    """Values computed independently from the closed form, pinned here."""
    row = build(_quotes([100_000.0])).iloc[0]
    assert row["delta"] == pytest.approx(0.5267418038869226)
    assert row["gamma"] == pytest.approx(2.966857249284088e-05)
    assert row["theta"] == pytest.approx(-146.21062419469843)
    assert row["vega"] == pytest.approx(89.00571747852266)


def test_signs_and_ranges(otm_quotes):
    chain = build(otm_quotes)
    assert chain[_GREEKS].notna().all().all()

    assert (chain["gamma"] > 0).all()
    assert (chain["vega"] > 0).all()
    assert (chain["theta"] < 0).all()

    is_call = chain["option_type"] == "C"
    assert chain.loc[is_call, "delta"].between(0.0, 1.0).all()
    assert chain.loc[~is_call, "delta"].between(-1.0, 0.0).all()


def test_gamma_and_vega_peak_at_the_money():
    """Both are maximised where the forward is, and fall away symmetrically in log-strike."""
    forward = 100_000.0
    chain = build(_quotes([80_000, 90_000, 100_000, 111_111.11, 125_000], forward=forward))
    peak = chain["strike"].sub(forward).abs().idxmin()
    assert chain["gamma"].idxmax() == peak
    assert chain["vega"].idxmax() == peak


def test_delta_agrees_with_the_chain_column(otm_quotes):
    """One definition of forward delta: the chain's own column and the greeks build."""
    np.testing.assert_allclose(build(otm_quotes)["delta"], otm_quotes["delta"])


def test_longer_expiry_has_more_vega_and_less_gamma():
    near = build(_quotes([100_000.0], tte=0.05)).iloc[0]
    far = build(_quotes([100_000.0], tte=0.50)).iloc[0]
    assert far["vega"] > near["vega"]
    assert far["gamma"] < near["gamma"]


def test_invalid_row_is_nan():
    # a zero-tte contract fails valid_mask, so every greek must be NaN
    chain = build(_quotes([100_000.0], tte=0.0))
    assert chain[_GREEKS].isna().all().all()


def test_put_and_call_deltas_differ_by_one():
    """N(d1) and N(d1) - 1 at identical inputs, so the two legs are exactly 1 apart."""
    call = build(_quotes([100_000.0], option_type="C")).iloc[0]["delta"]
    put = build(_quotes([100_000.0], option_type="P")).iloc[0]["delta"]
    assert call - put == pytest.approx(1.0)


def test_survives_the_full_prepared_chain(contracts):
    """The real path: prepared OTM quotes in, one greek row per quote out."""
    quotes = prepare_otm_quotes(contracts, 100_000.0)
    chain = build(quotes)
    assert len(chain) == len(quotes)
    assert chain[_GREEKS].notna().all().all()
