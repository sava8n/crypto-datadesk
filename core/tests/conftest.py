"""Shared fixtures and helpers."""

from __future__ import annotations

import math
from datetime import UTC, datetime

import pandas as pd
import pytest

from analytics.frames import as_declared_dtypes, dtypes_for
from data.market.chain import CONTRACT_COLUMNS, prepare_oi_chain, prepare_otm_quotes


def _assert_declared_dtypes(frame):
    """Every column carries the dtype the registry declares.

    Worth asserting where ``list(frame.columns) == X_COLUMNS`` is not: builders end with
    ``frame[X_COLUMNS]``, so the column check cannot fail, while dtypes are inferred and
    have drifted before - an empty frame declaring ``datetime64[ns]`` against a built one
    inferring ``[us]`` compares unequal and breaks the archive round trip.
    """
    actual = {c: str(frame[c].dtype) for c in frame.columns}
    assert actual == dtypes_for(frame.columns)


@pytest.fixture
def assert_declared_dtypes():
    return _assert_declared_dtypes


FORWARD = 100_000.0
AS_OF = datetime(2026, 7, 18, tzinfo=UTC)

# far-future expiries keep tte_years positive no matter when the suite runs
_EXPIRIES = [
    (pd.Timestamp("2035-01-31 08:00", tz="UTC"), 0.05),
    (pd.Timestamp("2035-03-28 08:00", tz="UTC"), 0.15),
]
_FRACS = (0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20)


# A put-skewed, convex smile in log-moneyness: sigma(k) = ATM_IV + SKEW*k + CURVATURE*k^2.
# *Flat* smile makes smooth_smile return a zero slope, which silently switches off
# the Breeden-Litzenberger correction that prob.distribution exists for. Any test wanting
# the flat case must ask for it (skew=0, curvature=0) rather than get it by accident.
ATM_IV = 0.60
SKEW = -0.15
CURVATURE = 0.5


def smile_iv(frac: float, iv: float = ATM_IV, skew: float = SKEW, curvature: float = CURVATURE):
    """IV at strike ``frac * forward``."""
    k = math.log(frac)
    return iv + skew * k + curvature * k * k


def make_contracts(
    forward: float = FORWARD,
    iv: float = ATM_IV,
    skew: float = SKEW,
    curvature: float = CURVATURE,
) -> pd.DataFrame:
    """The whole book: a call and a put at every strike, all quotable and all with OI.

    Marks clear every quality filter, so ``prepare_otm_quotes`` drops exactly the ITM
    leg (calls K<F, puts K>=F) and ``prepare_oi_chain`` keeps every row. Strikes are
    whole numbers and the frame is coerced to the declared dtypes, so it matches what
    ``prepare_contracts`` really returns rather than whatever inference would give.
    """
    rows = []
    for expiry, tte in _EXPIRIES:
        stamp = expiry.strftime("%d%b%y").upper()
        for i, frac in enumerate(_FRACS):
            strike = round(forward * frac)
            mark_iv = smile_iv(frac, iv, skew, curvature)
            for kind, oi, vol in (("C", 100.0 + i, 10.0 + i), ("P", 120.0 + i, 12.0 + i)):
                rows.append(
                    (
                        f"BTC-{stamp}-{strike}-{kind}",
                        expiry,
                        tte,
                        float(strike),
                        kind,
                        forward,
                        mark_iv,
                        0.01,
                        0.009,
                        0.011,
                        oi,
                        vol,
                    )
                )
    return as_declared_dtypes(pd.DataFrame(rows, columns=CONTRACT_COLUMNS))


def make_flat_contracts(forward: float = FORWARD, iv: float = ATM_IV) -> pd.DataFrame:
    """The same book with one IV at every strike - a smile with no slope to correct for."""
    return make_contracts(forward, iv=iv, skew=0.0, curvature=0.0)


def make_otm_quotes(forward: float = FORWARD, iv: float = ATM_IV) -> pd.DataFrame:
    """A clean OTM chain (calls K>=F, puts K<F) with internally consistent Black-76 delta."""
    return prepare_otm_quotes(make_contracts(forward, iv), forward)


def make_oi_chain(forward: float = FORWARD) -> pd.DataFrame:
    """Full chain (ITM+OTM, a call and a put at every strike) with positive OI and volume."""
    return prepare_oi_chain(make_contracts(forward), forward)


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
    from data.market.state import MarketState

    return MarketState(
        as_of=AS_OF,
        spot=FORWARD,
        contracts=make_contracts(),
        spot_candles=make_spot_candles(),
        dvol_candles=make_dvol_candles(),
    )


@pytest.fixture
def contracts():
    return make_contracts()


@pytest.fixture
def otm_quotes():
    return make_otm_quotes()


@pytest.fixture
def flat_otm_quotes():
    """A smile with no slope - the Breeden-Litzenberger correction is identically zero."""
    return prepare_otm_quotes(make_flat_contracts(), FORWARD)


@pytest.fixture
def oi_chain():
    return make_oi_chain()


@pytest.fixture
def market_state():
    return make_market_state()


@pytest.fixture
def client(market_state):
    """A TestClient serving ``market_state`` instead of reaching upstream.

    One override on the dependency, so adding a router cannot silently escape the stub.
    """
    from fastapi.testclient import TestClient

    import main
    from api import deps

    main.server.dependency_overrides[deps.market_state] = lambda: market_state
    main.server.dependency_overrides[deps.database_status] = lambda: "ok"
    yield TestClient(main.server)
    main.server.dependency_overrides.clear()


@pytest.fixture
def reported_database_status():
    """Sets what the health route sees, in place of probing a real archive."""
    import main
    from api import deps

    def report(status):
        main.server.dependency_overrides[deps.database_status] = lambda: status

    return report
