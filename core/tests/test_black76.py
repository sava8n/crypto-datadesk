"""Black-76 primitives: normal CDF/PDF, validity mask, d1/d2 and forward delta."""

from __future__ import annotations

import numpy as np
import pytest

from analytics import black76


def test_norm_cdf_known_values():
    assert float(black76.norm_cdf(np.array(0.0))) == pytest.approx(0.5)
    assert float(black76.norm_cdf(np.array(1.0))) == pytest.approx(0.8413447, abs=1e-6)


def test_norm_cdf_symmetry():
    x = np.array([0.3, 1.0, 2.5, -0.7])
    np.testing.assert_allclose(black76.norm_cdf(-x), 1.0 - black76.norm_cdf(x), atol=1e-12)


def test_norm_pdf_peak_and_symmetry():
    assert float(black76.norm_pdf(np.array(0.0))) == pytest.approx(1.0 / np.sqrt(2 * np.pi))
    x = np.array([0.5, 1.3, 2.0])
    np.testing.assert_allclose(black76.norm_pdf(-x), black76.norm_pdf(x), atol=1e-12)


def test_valid_mask_requires_all_strictly_positive():
    # columns: all-ok, zero-forward, zero-strike, zero-tte, zero-sigma, negative-forward
    forward = np.array([100.0, 0.0, 100.0, 100.0, 100.0, -1.0])
    strike = np.array([100.0, 100.0, 0.0, 100.0, 100.0, 100.0])
    tte = np.array([0.5, 0.5, 0.5, 0.0, 0.5, 0.5])
    sigma = np.array([0.6, 0.6, 0.6, 0.6, 0.0, 0.6])
    mask = black76.valid_mask(forward, strike, tte, sigma)
    assert mask.tolist() == [True, False, False, False, False, False]


def test_d1_atm_value_and_d2_relationship():
    forward = np.array([100.0])
    strike = np.array([100.0])
    tte = np.array([0.25])
    sigma = np.array([0.5])
    d1 = black76.d1(forward, strike, tte, sigma)
    d2 = black76.d2(forward, strike, tte, sigma)
    # ATM (F == K): d1 = 0.5 * sigma * sqrt(T)
    np.testing.assert_allclose(d1, 0.5 * sigma * np.sqrt(tte))
    np.testing.assert_allclose(d2, d1 - sigma * np.sqrt(tte))


def test_black76_delta_put_call_parity():
    forward = np.array([100.0, 100.0])
    strike = np.array([110.0, 90.0])
    tte = np.array([0.3, 0.3])
    sigma = np.array([0.6, 0.6])
    call = black76.black76_delta(forward, strike, tte, sigma, np.array([True, True]))
    put = black76.black76_delta(forward, strike, tte, sigma, np.array([False, False]))
    np.testing.assert_allclose(call - put, 1.0)


def test_black76_delta_nan_where_invalid():
    forward = np.array([100.0, 100.0])
    strike = np.array([100.0, 100.0])
    tte = np.array([0.3, 0.0])  # second row has zero time to expiry
    sigma = np.array([0.6, 0.6])
    delta = black76.black76_delta(forward, strike, tte, sigma, np.array([True, True]))
    assert np.isfinite(delta[0])
    assert np.isnan(delta[1])
