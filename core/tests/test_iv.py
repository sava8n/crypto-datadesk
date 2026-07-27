"""IV views: ATM interpolation, term structure, 25-delta skew and the trivial projections."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from analytics.frames import empty_frame
from analytics.iv import skew, term
from data.market.chain import OTM_QUOTE_COLUMNS

_EXPIRY = pd.Timestamp("2035-01-31 08:00", tz="UTC")


def _group(strikes, sigmas, forward, option_type="C", tte=0.1, deltas=None):
    n = len(strikes)
    return pd.DataFrame(
        {
            "expiry": [_EXPIRY] * n,
            "tte_years": [tte] * n,
            "strike": strikes,
            "delta": deltas if deltas is not None else [np.nan] * n,
            "forward": [forward] * n,
            "mark_iv": sigmas,
            "option_type": [option_type] * n,
        }
    )


def test_atm_iv_symmetric_smile_returns_trough():
    group = _group([80, 90, 100, 110, 120], [0.7, 0.62, 0.6, 0.62, 0.7], forward=100.0)
    assert term.atm_iv(group, 100.0) == pytest.approx(0.6, abs=1e-9)


def test_atm_iv_invalid_forward_returns_none():
    group = _group([100], [0.6], forward=100.0)
    assert term.atm_iv(group, 0.0) is None
    assert term.atm_iv(group, float("nan")) is None


def test_term_structure_build_sorted(otm_quotes):
    ts = term.build(otm_quotes)
    assert ts["tte_years"].is_monotonic_increasing
    assert (ts["atm_iv"] > 0).all()


def test_term_structure_empty_is_typed(assert_declared_dtypes):
    ts = term.build(empty_frame(OTM_QUOTE_COLUMNS))
    assert ts.empty
    assert_declared_dtypes(ts)


def test_wing_iv_interpolates_and_rejects_out_of_range():
    group = pd.DataFrame(
        {"option_type": ["C", "C", "C"], "delta": [0.1, 0.25, 0.4], "mark_iv": [0.7, 0.65, 0.6]}
    )
    assert skew._wing_iv(group, "C", 0.25) == pytest.approx(0.65)
    assert skew._wing_iv(group, "C", 0.50) is None  # beyond the delta range
    assert skew._wing_iv(group.head(1), "C", 0.25) is None  # fewer than two points


def test_skew_build_risk_reversal_and_butterfly():
    # ATM strike (K=F=100) IV = 0.60; 25d call IV 0.64, 25d put IV 0.68.
    data = [  # (option_type, strike, delta, mark_iv)
        ("C", 100.0, 0.50, 0.60),
        ("C", 110.0, 0.25, 0.64),
        ("C", 130.0, 0.10, 0.70),
        ("P", 95.0, -0.40, 0.62),
        ("P", 90.0, -0.25, 0.68),
        ("P", 80.0, -0.10, 0.72),
    ]
    df = pd.DataFrame(
        {
            "expiry": [_EXPIRY] * len(data),
            "tte_years": [0.1] * len(data),
            "strike": [d[1] for d in data],
            "delta": [d[2] for d in data],
            "forward": [100.0] * len(data),
            "mark_iv": [d[3] for d in data],
            "option_type": [d[0] for d in data],
        }
    )
    out = skew.build(df, term.build(df))
    assert len(out) == 1
    assert out["rr"].iloc[0] == pytest.approx(0.64 - 0.68)  # call - put
    assert out["bf"].iloc[0] == pytest.approx(0.5 * (0.64 + 0.68) - 0.60)  # wing mean - ATM


def test_skew_reads_atm_from_the_term_structure(otm_quotes):
    """Shifting the term structure's ATM shifts the butterfly by exactly as much.

    Proves the ATM level comes from the passed-in frame rather than being
    re-interpolated, so the two views cannot drift apart.
    """
    term_structure = term.build(otm_quotes)
    base = skew.build(otm_quotes, term_structure)
    assert not base.empty

    bumped = term_structure.copy()
    bumped["atm_iv"] += 0.01
    shifted = skew.build(otm_quotes, bumped)

    np.testing.assert_allclose(shifted["bf"], base["bf"] - 0.01, atol=1e-12)
    np.testing.assert_allclose(shifted["rr"], base["rr"])  # wings are untouched


def test_skew_empty_is_typed(assert_declared_dtypes):
    empty = empty_frame(OTM_QUOTE_COLUMNS)
    out = skew.build(empty, term.build(empty))
    assert out.empty
    assert_declared_dtypes(out)
