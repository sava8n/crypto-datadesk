"""MarketState wires the pure builders together off in-memory frames."""

from __future__ import annotations

import pytest


def test_derived_products_build(market_state):
    greeks = market_state.greeks_chain
    assert not greeks.empty
    assert greeks[["delta", "gamma", "theta", "vega"]].notna().all().all()

    curves = market_state.prob_curves
    assert not curves.empty
    assert ((curves["prob_above"] >= 0.0) & (curves["prob_above"] <= 1.0)).all()

    assert not market_state.oi_by_expiration.empty
    assert not market_state.volume_by_strike.empty
    assert not market_state.gex_by_strike.empty


def test_scalar_stats(market_state):
    assert market_state.iv30 is not None and market_state.iv30 > 0
    assert market_state.dvol is not None
    assert market_state.dvol_rank is not None
    assert market_state.rv30 is not None


def test_derived_scalars_match_their_frames(market_state):
    chain = market_state.oi_chain
    calls = chain.loc[chain["option_type"] == "C", "open_interest"].sum()
    puts = chain.loc[chain["option_type"] == "P", "open_interest"].sum()
    assert market_state.oi_total_calls == pytest.approx(calls)
    assert market_state.oi_total_puts == pytest.approx(puts)
    assert market_state.gex_net_total == pytest.approx(market_state.gex_by_strike["net_gex"].sum())
    assert market_state.max_pain_front == market_state.oi_by_strike(market_state.oi_expiries[0])[1]
    assert market_state.iv7 is not None and market_state.iv7 > 0
    for name in ("rr25_7", "bf25_7", "rr25_30", "bf25_30"):
        assert getattr(market_state, name) is not None


def test_oi_by_strike_single_expiry_carries_settlement(market_state):
    grid, max_pain = market_state.oi_by_strike(market_state.oi_expiries[0])
    assert not grid.empty
    # the intrinsic value is joined on, one per strike, no gaps
    assert grid["intrinsic_value"].notna().all()
    assert max_pain in set(grid["strike"])


def test_oi_by_strike_whole_chain_has_no_settlement(market_state):
    """Intrinsic value and max pain conflate settlement dates across expiries."""
    grid, max_pain = market_state.oi_by_strike()
    assert not grid.empty
    assert "intrinsic_value" not in grid.columns
    assert max_pain is None
