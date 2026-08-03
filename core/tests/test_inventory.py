"""Flow-signed dealer inventory blending."""

from __future__ import annotations

import pandas as pd
import pytest

from analytics.frames import as_declared_dtypes
from analytics.positioning.inventory import flow_signed_chain, net_flow_frame

_EXPIRY = pd.Timestamp("2035-01-31 08:00", tz="UTC")


def _chain(strikes, option_types, ois):
    return as_declared_dtypes(
        pd.DataFrame(
            {
                "expiry": [_EXPIRY] * len(strikes),
                "strike": strikes,
                "option_type": option_types,
                "open_interest": ois,
                "forward": [100.0] * len(strikes),
            }
        )
    )


def _flow(strikes, option_types, net_takers):
    return net_flow_frame(
        [
            {"expiry": _EXPIRY, "strike": s, "option_type": t, "net_taker": n}
            for s, t, n in zip(strikes, option_types, net_takers, strict=True)
        ]
    )


def test_empty_flow_reproduces_the_classic_signs():
    chain = _chain([110.0, 90.0], ["C", "P"], [100.0, 50.0])

    out, fraction = flow_signed_chain(chain, net_flow_frame([]))

    assert list(out["signed_oi"]) == [100.0, -50.0]
    assert fraction == 0.0


def test_taker_buying_beyond_oi_clips_to_fully_short():
    chain = _chain([110.0], ["C"], [100.0])
    flow = _flow([110.0], ["C"], [150.0])

    out, fraction = flow_signed_chain(chain, flow)

    assert out["signed_oi"].iloc[0] == pytest.approx(-100.0)
    assert fraction == pytest.approx(1.0)


def test_partial_flow_blends_with_the_classic_residual():
    """Takers sold 40 of 100 puts: +40 explained long, 60 residual at the classic -1."""
    chain = _chain([90.0], ["P"], [100.0])
    flow = _flow([90.0], ["P"], [-40.0])

    out, fraction = flow_signed_chain(chain, flow)

    assert out["signed_oi"].iloc[0] == pytest.approx(-20.0)
    assert fraction == pytest.approx(0.4)


def test_dominant_taker_selling_flips_a_put_positive():
    chain = _chain([90.0], ["P"], [100.0])
    flow = _flow([90.0], ["P"], [-80.0])

    out, _ = flow_signed_chain(chain, flow)

    assert out["signed_oi"].iloc[0] == pytest.approx(60.0)


def test_fraction_is_explained_oi_over_total_oi():
    chain = _chain([110.0, 90.0], ["C", "P"], [100.0, 100.0])
    flow = _flow([110.0], ["C"], [50.0])

    _, fraction = flow_signed_chain(chain, flow)

    assert fraction == pytest.approx(50.0 / 200.0)


def test_flow_for_contracts_outside_the_chain_is_ignored():
    chain = _chain([110.0], ["C"], [100.0])
    flow = _flow([110.0, 70.0], ["C", "P"], [10.0, 500.0])

    out, fraction = flow_signed_chain(chain, flow)

    assert len(out) == 1
    assert out["signed_oi"].iloc[0] == pytest.approx(-10.0 + 90.0)
    assert fraction == pytest.approx(0.1)


def test_empty_chain_is_empty_with_no_fraction():
    chain = _chain([], [], [])

    out, fraction = flow_signed_chain(chain, _flow([110.0], ["C"], [10.0]))

    assert out.empty
    assert "signed_oi" in out.columns
    assert fraction is None
