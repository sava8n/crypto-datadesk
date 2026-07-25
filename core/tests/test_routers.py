"""The HTTP surface, served from an in-memory state (see the ``client`` fixture)."""

from __future__ import annotations

import pytest

# path -> the key holding the row array
_MARKET_ENDPOINTS = {
    "/api/iv/surface": "points",
    "/api/iv/curves": "points",
    "/api/iv/skew": "points",
    "/api/iv/term-structure": "points",
    "/api/greeks/chain": "points",
    "/api/gex/strike": "points",
    "/api/oi/expiration": "points",
    "/api/oi/strike": "points",
    "/api/prob/curves": "points",
    "/api/volume/strike": "points",
    "/api/spot/history": "candles",
    "/api/stats": None,
}


@pytest.mark.parametrize("status", ["ok", "down"])
def test_health(client, reported_database_status, status):
    """A down storage db is reported in the body, never raised - the check stays 200."""
    reported_database_status(status)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": status}


@pytest.mark.parametrize("path,rows_key", _MARKET_ENDPOINTS.items())
def test_market_endpoints_carry_a_populated_envelope(client, market_state, path, rows_key):
    body = client.get(path).json()

    assert body["currency"] == "BTC"
    assert body["spot"] == pytest.approx(market_state.spot)
    assert body["as_of"].startswith(market_state.as_of.strftime("%Y-%m-%dT%H:%M:%S"))

    if rows_key is not None:
        assert body[rows_key], f"{path} returned no {rows_key}"


def test_iv_surface_points_match_the_chain(client, market_state):
    points = client.get("/api/iv/surface").json()["points"]
    quotes = market_state.otm_quotes

    assert len(points) == len(quotes)
    assert {p["option_type"] for p in points} <= {"C", "P"}
    # keyed by delta, and every quote that survived the filters has a defined one
    assert all(-1.0 <= p["delta"] <= 1.0 for p in points)
    assert min(p["mark_iv"] for p in points) > 0


def test_greeks_chain_values_and_expiries(client, market_state):
    body = client.get("/api/greeks/chain").json()

    assert len(body["expiries"]) == len(market_state.otm_expiries)
    assert all(p["gamma"] > 0 and p["vega"] > 0 and p["theta"] < 0 for p in body["points"])


def test_gex_reports_the_flip_under_its_domain_name(client, market_state):
    body = client.get("/api/gex/strike").json()

    assert "flip" not in body  # renamed to match the domain and the archive column
    assert body["gex_flip"] == pytest.approx(market_state.gex_flip)
    strikes = [p["strike"] for p in body["points"]]
    assert strikes == sorted(strikes)


def test_prob_curves_are_bounded_probabilities(client):
    body = client.get("/api/prob/curves").json()

    assert all(0.0 <= p["prob_above"] <= 1.0 for p in body["points"])
    row = next(q for q in body["quantiles"] if q["p50"] is not None)
    assert row["p16"] <= row["p50"] <= row["p84"]


def test_stats_reports_all_four_scalars(client, market_state):
    body = client.get("/api/stats").json()
    for key in ("dvol", "dvol_rank", "iv30", "rv30"):
        assert body[key] == pytest.approx(getattr(market_state, key))


def test_spot_history_is_ordered_ohlc(client):
    candles = client.get("/api/spot/history").json()["candles"]

    timestamps = [c["ts"] for c in candles]
    assert timestamps == sorted(timestamps)
    assert all(c["low"] <= c["open"] <= c["high"] for c in candles)
    assert all(c["low"] <= c["close"] <= c["high"] for c in candles)


def test_oi_by_strike_with_expiry_adds_settlement(client, market_state):
    expiry = market_state.oi_expiries[0]
    body = client.get("/api/oi/strike", params={"expiry": expiry.isoformat()}).json()

    assert body["max_pain"] in [p["strike"] for p in body["points"]]
    assert all(p["intrinsic_value"] is not None for p in body["points"])


def test_oi_by_strike_without_expiry_has_no_settlement(client):
    body = client.get("/api/oi/strike").json()

    assert body["expiry"] is None
    assert body["max_pain"] is None
    assert all(p["intrinsic_value"] is None for p in body["points"])


def test_unsupported_currency_returns_422(client):
    response = client.get("/api/stats", params={"currency": "XYZ"})
    assert response.status_code == 422


def test_currency_is_case_insensitive(client):
    assert client.get("/api/stats", params={"currency": "btc"}).json()["currency"] == "BTC"
