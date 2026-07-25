"""Per-expiry smile smoothing (local weighted quadratic in log-moneyness).

Deribit ``mark_iv`` is quantized to 0.01 vol pts and marked off the order book, so the
raw smile zig-zags at strike resolution and differencing it directly makes the
Breeden-Litzenberger skew term noise-dominated. A LOESS-style local quadratic recovers
a smooth ``sigma(k)`` and its slope analytically.
"""

from __future__ import annotations

import numpy as np

# below this many distinct strikes a local fit is meaningless; callers fall back to raw IVs
MIN_STRIKES_FOR_FIT = 5


def smooth_smile(k: np.ndarray, sigma: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Tricube-weighted quadratic fit of ``sigma(k)`` around each point.

    ``k`` (log-moneyness) must be sorted ascending with distinct values and at least
    ``MIN_STRIKES_FOR_FIT`` entries. Returns ``(sigma_smooth, dsigma_dk)`` at each point.
    """
    n = len(k)
    # neighbours per fit: a quarter of the chain, rounded up (-(-n // 4) is ceil for ints),
    # floored at MIN_STRIKES_FOR_FIT so a quadratic is always over-determined
    m = max(MIN_STRIKES_FOR_FIT, -(-n // 4))
    sigma_smooth = np.empty(n)
    dsigma_dk = np.empty(n)
    for i in range(n):
        dk = k - k[i]
        dist = np.abs(dk)
        # bandwidth = distance to the m-th nearest strike, so the window widens where the
        # chain is sparse and tightens where it is dense
        h = np.sort(dist)[min(m, n - 1)]
        weight = np.clip(1.0 - (dist / h) ** 3, 0.0, None) ** 3

        # weighted least squares by whitening: scaling both the design matrix and the
        # target by sqrt(w) makes the ordinary residual ||Xb - y||^2 equal the weighted
        # one, sum w_j (x_j b - y_j)^2, so plain lstsq solves the weighted problem.
        root_w = np.sqrt(weight)[:, None]
        design = np.column_stack((np.ones(n), dk, dk * dk)) * root_w
        beta, *_ = np.linalg.lstsq(design, sigma * root_w[:, 0], rcond=None)

        # fitted around dk = 0, so the constant term is sigma(k_i) and the linear term is
        # its slope - the derivative comes out of the fit rather than from differencing
        sigma_smooth[i] = beta[0]
        dsigma_dk[i] = beta[1]
    return sigma_smooth, dsigma_dk
