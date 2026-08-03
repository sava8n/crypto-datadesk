"""Trade tape: instrument parsing, row shaping and the polling cursor."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from data.storage import tape


def _print(trade_id: str, ts_ms: int, **over) -> dict:
    t = {
        "trade_id": trade_id,
        "timestamp": ts_ms,
        "instrument_name": "BTC-31JAN35-100000-C",
        "price": 0.01,
        "amount": 5.0,
        "direction": "buy",
        "iv": 62.5,
        "index_price": 100_000.0,
    }
    t.update(over)
    return t


def test_parse_instrument_settles_at_eight_utc():
    expiry, strike, option_type = tape.parse_instrument("BTC-31JAN35-100000-C")
    assert expiry == datetime(2035, 1, 31, 8, tzinfo=UTC)
    assert strike == 100_000.0
    assert option_type == "C"


@pytest.mark.parametrize(
    "name",
    [
        "BTC-PERPETUAL",  # not an option
        "BTC-31XXX35-100000-C",  # bad month
        "BTC-31JAN35-abc-P",  # bad strike
        "BTC-31JAN35-0-C",  # non-positive strike
        "BTC-31JAN35-100000-X",  # bad leg
    ],
)
def test_parse_instrument_rejects_unidentifiable(name):
    assert tape.parse_instrument(name) is None


def test_trade_rows_shape_and_iv_rescale():
    rows = tape.trade_rows([_print("a", 1_700_000_000_000)], "BTC")
    row = rows[0]
    assert row["ts"] == datetime.fromtimestamp(1_700_000_000, tz=UTC)
    assert row["iv"] == pytest.approx(0.625)  # percent -> fraction, like mark_iv
    assert row["direction"] == "buy"
    assert row["expiry"] == datetime(2035, 1, 31, 8, tzinfo=UTC)


def test_trade_rows_drop_incomplete_prints():
    prints = [
        _print("ok", 1_000),
        _print("bad-name", 1_000, instrument_name="BTC-PERPETUAL"),
        _print("bad-side", 1_000, direction="both"),
        _print("no-price", 1_000, price=None),
    ]
    rows = tape.trade_rows(prints, "BTC")
    assert [r["trade_id"] for r in rows] == ["ok"]


def test_trade_rows_keep_optional_fields_nullable():
    row = tape.trade_rows([_print("a", 1_000, iv=None, index_price=None)], "BTC")[0]
    assert row["iv"] is None
    assert row["index_price"] is None
    assert row["block_trade_id"] is None


def test_record_trades_pages_until_caught_up(monkeypatch):
    cursor = datetime.fromtimestamp(1, tz=UTC)  # 1000 ms; prints arrive at or after it
    pages = [
        {"trades": [_print("a", 1_000), _print("b", 2_000)], "has_more": True},
        {"trades": [_print("c", 3_000)], "has_more": False},
    ]
    starts: list[int] = []

    def fetch(currency, start_ms, end_ms):
        starts.append(start_ms)
        return pages[len(starts) - 1]

    monkeypatch.setattr(tape.deribit, "fetch_option_trades", fetch)
    monkeypatch.setattr(tape, "latest_ts", lambda currency: cursor)
    monkeypatch.setattr(tape, "_insert", len)

    assert tape.record_trades("BTC") == 3
    assert starts == [1_000, 2_000]  # cursor advanced to the last print's timestamp


def test_record_trades_steps_past_a_stuck_millisecond(monkeypatch):
    """A full page printed in one millisecond must not loop on the same cursor."""
    cursor = datetime.fromtimestamp(2, tz=UTC)  # 2000 ms
    pages = [
        {"trades": [_print("a", 2_000)], "has_more": True},
        {"trades": [], "has_more": False},
    ]
    starts: list[int] = []

    def fetch(currency, start_ms, end_ms):
        starts.append(start_ms)
        return pages[len(starts) - 1]

    monkeypatch.setattr(tape.deribit, "fetch_option_trades", fetch)
    monkeypatch.setattr(tape, "latest_ts", lambda currency: cursor)
    monkeypatch.setattr(tape, "_insert", len)

    tape.record_trades("BTC")

    assert starts == [2_000, 2_001]
