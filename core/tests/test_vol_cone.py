"""Realized-vol cone: rolling RV windows, percentile ordering, short-history omission."""

from __future__ import annotations

import math

import numpy as np
import pytest

from analytics.conventions import TRADING_DAYS_PER_YEAR
from analytics.stats import realized_vol
from analytics.vol.cone import CONE_COLUMNS, CONE_WINDOWS, build


def _alternating_closes(n: int, step: float = 0.01) -> list[float]:
    """Closes whose log returns alternate +-step, so every rolling std is known."""
    closes = [100.0]
    for i in range(n - 1):
        closes.append(closes[-1] * math.exp(step if i % 2 == 0 else -step))
    return closes


def test_current_matches_realized_vol_convention():
    """The cone's trailing window must equal ``stats.realized_vol`` for the same span."""
    closes = list(100.0 * np.exp(np.cumsum(np.sin(np.arange(400)) * 0.01)))
    out = build(closes).set_index("days")
    for window in CONE_WINDOWS:
        assert out.loc[window, "current"] == pytest.approx(realized_vol(closes, days=window))


def test_known_alternating_returns():
    """+-1% alternating returns: every full window's std is exactly known."""
    closes = _alternating_closes(100)
    out = build(closes).set_index("days")
    # sample std of an even-length +-step alternation is step * sqrt(n/(n-1))
    expected = 0.01 * math.sqrt(30 / 29) * math.sqrt(TRADING_DAYS_PER_YEAR)
    assert out.loc[30, "p50"] == pytest.approx(expected)
    assert out.loc[30, "current"] == pytest.approx(expected)


def test_percentiles_are_ordered():
    rng = np.random.default_rng(7)
    closes = list(100.0 * np.exp(np.cumsum(rng.normal(0, 0.02, 380))))
    out = build(closes)
    assert list(out.columns) == CONE_COLUMNS
    assert set(out["days"]) == set(CONE_WINDOWS)
    for _, row in out.iterrows():
        assert row["p10"] <= row["p25"] <= row["p50"] <= row["p75"] <= row["p90"]


def test_short_history_omits_long_windows():
    out = build(_alternating_closes(40))  # 39 returns: enough for 7/14/30, not 60/90
    assert set(out["days"]) == {7, 14, 30}


def test_empty_and_tiny_history_yield_typed_empty(assert_declared_dtypes):
    for closes in ([], [100.0], _alternating_closes(5)):
        out = build(closes)
        assert out.empty
        assert_declared_dtypes(out)
