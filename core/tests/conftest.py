"""Shared fixtures and helpers.

The factories build small, internally-consistent in-memory frames that mirror the
shapes the domain builders expect, so tests can exercise real code paths without
touching 3rd-party APIs.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
import pytest

from shared.black76 import black76_delta

FORWARD = 100_000.0
AS_OF = datetime(2026, 7, 18, tzinfo=timezone.utc)

# far-future expiries keep tte_years positive no matter when the suite runs
_EXPIRIES = [
    (pd.Timestamp("2035-01-31 08:00", tz="UTC"), 0.05),
    (pd.Timestamp("2035-03-28 08:00", tz="UTC"), 0.15),
]
_PUT_FRACS = (0.80, 0.85, 0.90, 0.95)          # OTM puts: K < F
_CALL_FRACS = (1.00, 1.05, 1.10, 1.15, 1.20)   # OTM calls: K >= F


def make_otm_quotes(forward: float = FORWARD, iv: float = 0.60) -> pd.DataFrame:
    """A clean OTM chain (calls K>=F, puts K<F) with internally consistent Black-76 delta."""
    rows = []
    for expiry, tte in _EXPIRIES:
        for frac in _PUT_FRACS:
            rows.append((expiry, tte, forward * frac, forward, iv, "P"))
        for frac in _CALL_FRACS:
            rows.append((expiry, tte, forward * frac, forward, iv, "C"))
    df = pd.DataFrame(
        rows, columns=["expiry", "tte_years", "strike", "forward", "mark_iv", "option_type"]
    )
    df["delta"] = black76_delta(
        df["forward"].to_numpy(float),
        df["strike"].to_numpy(float),
        df["tte_years"].to_numpy(float),
        df["mark_iv"].to_numpy(float),
        (df["option_type"] == "C").to_numpy(),
    )
    return df[["expiry", "tte_years", "strike", "delta", "forward", "mark_iv", "option_type"]]


def make_oi_chain(forward: float = FORWARD) -> pd.DataFrame:
    """Full chain (ITM+OTM, a call and a put at every strike) with positive OI and volume."""
    fracs = (0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20)
    rows = []
    for expiry, tte in _EXPIRIES:
        for i, frac in enumerate(fracs):
            strike = forward * frac
            rows.append((expiry, tte, strike, forward, "C", 100.0 + i, 10.0 + i))
            rows.append((expiry, tte, strike, forward, "P", 120.0 + i, 12.0 + i))
    return pd.DataFrame(
        rows,
        columns=["expiry", "tte_years", "strike", "forward", "option_type", "open_interest", "volume"],
    )


def make_spot_candles(n: int = 40, start: float = 90_000.0) -> dict:
    """TradingView-format daily candles with a gentle uptrend."""
    ticks = [1_700_000_000_000 + i * 86_400_000 for i in range(n)]
    close = [start * (1.0 + 0.001 * i) for i in range(n)]
    return {
        "status": "ok",
        "ticks": ticks,
        "open": close,
        "high": [c * 1.01 for c in close],
        "low": [c * 0.99 for c in close],
        "close": close,
        "volume": [1000.0 + i for i in range(n)],
    }


def make_dvol_candles(n: int = 40, start: float = 50.0) -> list[list[float]]:
    """``[[ts, o, h, l, c], ...]`` DVOL candles (close is index 4)."""
    return [
        [1_700_000_000_000 + i * 86_400_000, start + i, start + i + 2, start + i - 2, start + i + 1]
        for i in range(n)
    ]


def make_market_state():
    from market.state import MarketState

    return MarketState(
        as_of=AS_OF,
        spot=FORWARD,
        otm_quotes=make_otm_quotes(),
        oi_chain=make_oi_chain(),
        spot_candles=make_spot_candles(),
        dvol_candles=make_dvol_candles(),
    )


@pytest.fixture
def otm_quotes():
    return make_otm_quotes()


@pytest.fixture
def oi_chain():
    return make_oi_chain()


@pytest.fixture
def market_state():
    return make_market_state()


@pytest.fixture
def client(monkeypatch, market_state):
    """A FastAPI TestClient with the network-backed loaders stubbed out."""
    from fastapi.testclient import TestClient

    import main
    import routers.gex
    import routers.greeks
    import routers.iv
    import routers.oi
    import routers.prob
    import routers.spot
    import routers.stats
    import routers.volume

    market_routers = (
        routers.gex,
        routers.greeks,
        routers.iv,
        routers.oi,
        routers.prob,
        routers.spot,
        routers.stats,
        routers.volume,
    )
    for mod in market_routers:
        monkeypatch.setattr(mod, "load_market_state", lambda cur, _s=market_state: _s)

    return TestClient(main.server)
