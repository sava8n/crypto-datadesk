"""24h traded volume split into calls/puts per strike, zero-flow strikes dropped."""

from __future__ import annotations

import pandas as pd

from analytics.positioning.traded_volume import build


def test_volume_split_and_zero_flow_dropped():
    chain = pd.DataFrame(
        {
            "strike": [100.0, 100.0, 110.0, 120.0],
            "volume": [3.0, 5.0, 0.0, 0.0],
            "option_type": ["C", "P", "C", "P"],
        }
    )
    out = build(chain)
    row = out[out["strike"] == 100.0].iloc[0]
    assert row["call_volume"] == 3.0
    assert row["put_volume"] == 5.0
    # strikes 110 and 120 carry no flow and are dropped
    assert set(out["strike"]) == {100.0}


def test_volume_empty_is_typed(assert_declared_dtypes):
    out = build(pd.DataFrame({"strike": [], "volume": [], "option_type": []}))
    assert out.empty
    assert_declared_dtypes(out)
