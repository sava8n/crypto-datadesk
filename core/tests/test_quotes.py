"""Deribit chain preparation: instrument parsing, the unfiltered book, and its filters."""

from __future__ import annotations

import pandas as pd
import pytest

from data.market.chain import (
    _parse_instrument_fields,
    empty_contracts,
    prepare_contracts,
    prepare_oi_chain,
    prepare_otm_quotes,
)

_SPOT = 100_000.0


def _summary(name, mark_iv, mark_price, bid, underlying=_SPOT, open_interest=0.0, volume=0.0):
    summary = {
        "instrument_name": name,
        "mark_iv": mark_iv,
        "mark_price": mark_price,
        "bid_price": bid,
        "open_interest": open_interest,
        "volume": volume,
    }
    if underlying is not None:
        summary["underlying_price"] = underlying
    return summary


def test_parse_instrument_fields():
    df = pd.DataFrame({"instrument_name": ["BTC-31JAN35-120000-C", "BTC-31JAN35-80000-P"]})
    out = _parse_instrument_fields(df)
    # expiries settle at 08:00 UTC
    assert out["expiry"].iloc[0] == pd.Timestamp("2035-01-31 08:00", tz="UTC")
    assert out["strike"].tolist() == [120000.0, 80000.0]
    assert out["option_type"].tolist() == ["C", "P"]
    # tte is a positive number of years to a 2035 expiry, and both legs of one expiry
    # share it. (Recomputing the formula here would only assert it equals itself.)
    tte = out["tte_years"]
    assert tte.iloc[0] == tte.iloc[1]
    assert 8.0 < tte.iloc[0] < 15.0


def test_parsed_and_empty_frames_agree_on_dtypes(assert_declared_dtypes):
    """The archive round trip compares these two, and inference alone does not match.

    ``to_numeric`` yields int64 for the integer strikes Deribit quotes, and pandas infers
    microsecond datetimes - so both paths coerce through the declared registry.
    """
    parsed = prepare_contracts([_summary("BTC-31JAN35-120000-C", 60.0, 0.01, 0.009)])
    assert_declared_dtypes(parsed)
    assert_declared_dtypes(empty_contracts())
    assert parsed.dtypes.to_dict() == empty_contracts().dtypes.to_dict()


def test_prepare_contracts_keeps_what_the_filters_drop():
    summaries = [
        _summary("BTC-31JAN35-120000-C", 60.0, 0.01, 0.009, open_interest=5.0),  # survives both
        _summary("BTC-31JAN35-80000-C", 70.0, 0.50, 0.400, open_interest=0.0),  # ITM, no OI
        _summary("BTC-31JAN35-125000-C", 3.0, 0.01, 0.009, open_interest=1.0),  # mark_iv below MIN
        _summary("BTC-31JAN35-115000-C", 60.0, 0.01, 0.000, open_interest=1.0),  # no bid
    ]
    out = prepare_contracts(summaries)
    assert len(out) == 4  # nothing is filtered at parse time

    # mark_iv is rescaled from Deribit percent to a fraction
    assert out["mark_iv"].tolist() == pytest.approx([0.60, 0.70, 0.03, 0.60])

    # the two filters between them discard three of these four rows
    assert len(prepare_otm_quotes(out, _SPOT)) == 1
    assert set(prepare_oi_chain(out, _SPOT)["strike"]) == {120000.0, 125000.0, 115000.0}


def test_prepare_contracts_leaves_missing_forward_null():
    """The spot fallback belongs to the filters, so the parsed frame keeps what Deribit sent."""
    out = prepare_contracts([_summary("BTC-31JAN35-120000-C", 60.0, 0.01, 0.009, underlying=None)])
    assert out["forward"].isna().all()

    filtered = prepare_otm_quotes(out, _SPOT)
    assert filtered["forward"].tolist() == [_SPOT]


def test_prepare_contracts_drops_unparseable_instruments():
    out = prepare_contracts([_summary("BTC-31JAN35-NOTANUMBER-C", 60.0, 0.01, 0.009)])
    assert out.empty


def test_prepare_contracts_empty_is_typed(assert_declared_dtypes):
    out = prepare_contracts([])
    assert out.empty
    assert_declared_dtypes(out)


def test_prepare_otm_quotes_applies_quality_and_otm_filters():
    summaries = [
        _summary("BTC-31JAN35-120000-C", 60.0, 0.01, 0.009),  # OTM call, kept
        _summary("BTC-31JAN35-80000-P", 65.0, 0.02, 0.018),  # OTM put, kept
        _summary("BTC-31JAN35-80000-C", 70.0, 0.50, 0.400),  # ITM call (K<F) -> OTM filter drops
        _summary("BTC-31JAN35-125000-C", 3.0, 0.01, 0.009),  # mark_iv 0.03 < MIN -> dropped
        _summary("BTC-31JAN35-115000-C", 60.0, 0.01, 0.000),  # bid 0 -> dropped
    ]
    out = prepare_otm_quotes(prepare_contracts(summaries), _SPOT)
    assert len(out) == 2

    kept = set(zip(out["strike"], out["option_type"], strict=True))
    assert (120000.0, "C") in kept
    assert (80000.0, "P") in kept
    assert (80000.0, "C") not in kept  # ITM call filtered out

    row = out.set_index(["strike", "option_type"]).loc[(120000.0, "C")]
    assert row["mark_iv"] == pytest.approx(0.60)


def test_prepare_otm_quotes_empty_is_typed(assert_declared_dtypes):
    out = prepare_otm_quotes(prepare_contracts([]), _SPOT)
    assert out.empty
    assert_declared_dtypes(out)


def test_prepare_oi_chain_keeps_positive_oi_only():
    summaries = [
        _summary(
            "BTC-31JAN35-80000-C", 60.0, 0.5, 0.4, open_interest=10.0, volume=3.0
        ),  # ITM, kept
        _summary(
            "BTC-31JAN35-120000-C", 60.0, 0.01, 0.009, open_interest=0.0, volume=1.0
        ),  # OI 0 -> dropped
        _summary("BTC-31JAN35-120000-P", 60.0, 0.5, 0.4, open_interest=5.0, volume=2.0),  # kept
    ]
    out = prepare_oi_chain(prepare_contracts(summaries), _SPOT)
    assert len(out) == 2
    assert set(out["strike"]) == {80000.0, 120000.0}


def test_prepare_oi_chain_empty_is_typed(assert_declared_dtypes):
    out = prepare_oi_chain(prepare_contracts([]), _SPOT)
    assert out.empty
    assert_declared_dtypes(out)
