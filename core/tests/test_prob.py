"""Implied-probability pipeline: smile smoothing, survival curves and strike quantiles."""

from __future__ import annotations

import numpy as np
import pytest

from analytics.prob import distribution
from analytics.prob.distribution import build as build_curves
from analytics.prob.quantiles import build as build_quantiles
from analytics.prob.quantiles import invert_survival
from analytics.prob.smoothing import smooth_smile


def test_smooth_smile_recovers_linear_slope():
    k = np.linspace(-0.2, 0.2, 9)
    sigma = 0.6 + 0.5 * k  # exactly linear -> local quadratic fit is exact
    smoothed, slope = smooth_smile(k, sigma)
    np.testing.assert_allclose(smoothed, sigma, atol=1e-6)
    np.testing.assert_allclose(slope, 0.5, atol=1e-6)


def test_smooth_smile_flat_has_zero_slope():
    k = np.linspace(-0.2, 0.2, 9)
    sigma = np.full_like(k, 0.6)
    smoothed, slope = smooth_smile(k, sigma)
    np.testing.assert_allclose(smoothed, 0.6, atol=1e-9)
    np.testing.assert_allclose(slope, 0.0, atol=1e-9)


def test_build_curves_bounds_and_monotone(otm_quotes):
    curves = build_curves(otm_quotes)
    prob = curves["prob_above"].to_numpy()
    assert ((prob >= 0.0) & (prob <= 1.0)).all()
    # a survival curve is non-increasing in strike within each expiry
    for _, group in curves.groupby("expiry"):
        ordered = group.sort_values("strike")["prob_above"].to_numpy()
        assert np.all(np.diff(ordered) <= 1e-9)


def test_skew_correction_moves_the_curve(monkeypatch, otm_quotes):
    """The Breeden-Litzenberger term is what this module exists for.

    Forcing the fitted slope to zero reduces ``build`` to naive N(d2); the real curve has
    to differ from that by more than rounding, or the correction is not being applied.
    """
    real = build_curves(otm_quotes)

    monkeypatch.setattr(
        distribution, "smooth_smile", lambda k, sigma: (sigma, np.zeros_like(sigma))
    )
    naive = build_curves(otm_quotes)

    difference = real["prob_above"] - naive["prob_above"]
    assert difference.abs().max() > 1e-3
    # sigma falls with log-moneyness here (a put skew), so dsigma/dk < 0 and the
    # correction -(F/K) n(d1) sqrt(T) dsigma/dk is positive
    assert difference.mean() > 0


def test_flat_smile_has_nothing_to_correct(monkeypatch, flat_otm_quotes):
    """With one IV at every strike the slope is zero and the correction vanishes.

    This is the shape the shared fixture used to have, which hid the test above.
    """
    real = build_curves(flat_otm_quotes)

    monkeypatch.setattr(
        distribution, "smooth_smile", lambda k, sigma: (sigma, np.zeros_like(sigma))
    )
    naive = build_curves(flat_otm_quotes)

    np.testing.assert_allclose(real["prob_above"], naive["prob_above"], atol=1e-12)


def test_curve_is_repaired_when_the_raw_fit_misbehaves(monkeypatch, otm_quotes):
    """Fit noise and butterfly arbitrage can push the raw curve out of [0, 1] or make it
    rise with strike. Feeding the builder a deliberately wild N(.) proves the
    clamp-then-accumulate repairs that, rather than passing through clean data.
    """
    rng = np.random.default_rng(0)
    monkeypatch.setattr(
        distribution, "norm_cdf", lambda x: rng.uniform(-0.5, 1.5, size=np.shape(x))
    )
    curves = build_curves(otm_quotes)

    prob = curves["prob_above"].to_numpy()
    assert ((prob >= 0.0) & (prob <= 1.0)).all()
    for _, group in curves.groupby("expiry"):
        ordered = group.sort_values("strike")["prob_above"].to_numpy()
        assert np.all(np.diff(ordered) <= 1e-9)


def test_invert_survival_interpolates_median():
    strike = np.array([90.0, 100.0, 110.0])
    prob = np.array([0.9, 0.5, 0.1])  # non-increasing survival
    assert invert_survival(strike, prob, 0.50) == pytest.approx(100.0)


def test_invert_survival_out_of_range_is_nan():
    strike = np.array([90.0, 100.0, 110.0])
    prob = np.array([0.9, 0.5, 0.1])
    # target = 1 - 0.02 = 0.98 sits above the top of the curve (0.9) -> no extrapolation
    assert np.isnan(invert_survival(strike, prob, 0.02))


def test_invert_survival_needs_two_points():
    assert np.isnan(invert_survival(np.array([100.0]), np.array([0.5]), 0.5))


def test_build_quantiles_ordering(otm_quotes):
    quantiles = build_quantiles(build_curves(otm_quotes))
    row = quantiles.dropna().iloc[0]
    assert row["p16"] <= row["p50"] <= row["p84"]
