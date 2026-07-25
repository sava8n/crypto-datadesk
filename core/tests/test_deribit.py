"""Deribit API client."""

from __future__ import annotations

import pytest
import requests

from data.clients import deribit
from data.clients.deribit import DeribitError


class _Response:
    def __init__(self, payload, status_error=None):
        self._payload = payload
        self._status_error = status_error

    def raise_for_status(self):
        if self._status_error:
            raise self._status_error

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


@pytest.fixture
def respond(monkeypatch):
    """Make the shared session return one canned response and record the request."""
    seen = {}

    def stub(url, params=None, timeout=None):
        seen["url"] = url
        seen["params"] = params
        seen["timeout"] = timeout
        return stub.response

    monkeypatch.setattr(deribit._SESSION, "get", stub)

    def set_response(payload, status_error=None):
        stub.response = _Response(payload, status_error)
        return seen

    return set_response


def test_fetch_spot_unwraps_the_index_price(respond):
    seen = respond({"result": {"index_price": 101_234.5}})
    assert deribit.fetch_spot("BTC") == pytest.approx(101_234.5)
    assert seen["params"]["index_name"] == "btc_usd"
    # a connect timeout is a reachability check, a read timeout must cover the book
    assert isinstance(seen["timeout"], tuple)


def test_missing_key_becomes_deribit_error(respond):
    """The bug this guards: reading the key outside the try leaked a bare KeyError.

    ``market.loader`` catches only ``DeribitError``, so that escaped to a 500.
    """
    respond({"result": {"unexpected": 1}})
    with pytest.raises(DeribitError):
        deribit.fetch_spot("BTC")


def test_missing_result_envelope_becomes_deribit_error(respond):
    respond({"error": {"message": "bad request"}})
    with pytest.raises(DeribitError):
        deribit.fetch_option_summaries("BTC")


def test_non_numeric_index_price_becomes_deribit_error(respond):
    respond({"result": {"index_price": "not a number"}})
    with pytest.raises(DeribitError):
        deribit.fetch_spot("BTC")


def test_bad_status_becomes_deribit_error(respond):
    respond({}, status_error=requests.HTTPError("429 Too Many Requests"))
    with pytest.raises(DeribitError):
        deribit.fetch_spot("BTC")


def test_unparseable_body_becomes_deribit_error(respond):
    respond(ValueError("no JSON"))
    with pytest.raises(DeribitError):
        deribit.fetch_spot("BTC")


def test_transport_failure_becomes_deribit_error(monkeypatch):
    def boom(*_args, **_kwargs):
        raise requests.ConnectionError("no route to host")

    monkeypatch.setattr(deribit._SESSION, "get", boom)
    with pytest.raises(DeribitError):
        deribit.fetch_spot("BTC")


def test_dvol_history_unwraps_data_and_windows_the_request(respond):
    seen = respond({"result": {"data": [[1, 2, 3, 4, 5]]}})
    assert deribit.fetch_dvol_history("BTC", days=30) == [[1, 2, 3, 4, 5]]

    span_ms = seen["params"]["end_timestamp"] - seen["params"]["start_timestamp"]
    assert span_ms == 30 * 86_400_000
    assert seen["params"]["resolution"] == "86400"


def test_spot_history_asks_for_the_usdc_pair(respond):
    seen = respond({"result": {"status": "ok", "ticks": []}})
    deribit.fetch_spot_history("btc", days=7)
    assert seen["params"]["instrument_name"] == "BTC_USDC"
    assert seen["params"]["end_timestamp"] - seen["params"]["start_timestamp"] == 7 * 86_400_000


def test_session_retries_transient_failures():
    """Retry policy lives on the adapter, so a 429 is not one shot."""
    adapter = deribit._SESSION.get_adapter("https://www.deribit.com")
    retry = adapter.max_retries
    assert retry.total == 3
    assert 429 in retry.status_forcelist
