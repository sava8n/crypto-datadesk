"""The HTTP surface, served from an in-memory state (see the ``client`` fixture)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from data.storage import series
from data.storage.errors import StorageUnavailable

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
    "/api/vol/cone": "points",
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


def test_stats_reports_iv30_percentile(client, monkeypatch):
    monkeypatch.setattr(series, "iv30_percentile", lambda ccy, current: 0.42)
    assert client.get("/api/stats").json()["iv30_percentile"] == pytest.approx(0.42)


def test_rv_cone_windows_fit_the_candle_history(client):
    """The conftest state carries 40 daily closes - enough for 7/14/30d, not 60/90d."""
    points = client.get("/api/vol/cone").json()["points"]
    assert {p["days"] for p in points} == {7, 14, 30}
    assert all(p["p10"] <= p["p50"] <= p["p90"] for p in points)


def test_oi_strike_change_diffs_against_the_baseline(client, market_state, monkeypatch):
    """Baseline at half the current OI -> the delta is the other half."""
    baseline_as_of = market_state.as_of - timedelta(hours=25)
    chain = market_state.oi_chain
    halved = [
        {"strike": s, "option_type": t, "open_interest": oi / 2}
        for s, t, oi in zip(
            chain["strike"], chain["option_type"], chain["open_interest"], strict=True
        )
    ]
    monkeypatch.setattr(series, "baseline_snapshot", lambda ccy, target: (1, baseline_as_of))
    monkeypatch.setattr(series, "baseline_oi_by_strike", lambda sid, expiry, now: halved)

    body = client.get("/api/oi/strike-change").json()

    assert body["window"] == "24h"
    assert body["baseline_as_of"].startswith(baseline_as_of.strftime("%Y-%m-%dT%H:%M:%S"))
    total = sum(p["call_oi_change"] + p["put_oi_change"] for p in body["points"])
    assert total == pytest.approx(chain["open_interest"].sum() / 2)


def test_oi_strike_change_without_a_baseline_is_empty(client, monkeypatch):
    monkeypatch.setattr(series, "baseline_snapshot", lambda ccy, target: None)

    body = client.get("/api/oi/strike-change", params={"window": "7d"}).json()

    assert body["window"] == "7d"
    assert body["baseline_as_of"] is None
    assert body["points"] == []


def test_history_vol_serves_archived_rows(client, monkeypatch):
    row = {
        "as_of": datetime(2026, 7, 30, tzinfo=UTC),
        "spot": 63_000.0,
        "iv7": 0.31,
        "iv30": 0.33,
        "term_slope": 0.02,
        "rv30": 0.27,
        "dvol": 0.35,
        "rr25_7": -0.04,
        "bf25_7": 0.008,
        "rr25_30": -0.05,
        "bf25_30": 0.01,
    }
    monkeypatch.setattr(series, "vol_series", lambda ccy, start, resolution: [row])

    body = client.get("/api/history/vol", params={"lookback_days": 7, "resolution": "1h"}).json()

    assert body["currency"] == "BTC"
    assert body["resolution"] == "1h"
    assert body["points"][0]["term_slope"] == pytest.approx(0.02)
    # a history envelope reports its window, not a live market
    assert "spot" not in body


def test_history_positioning_serves_archived_rows(client, monkeypatch):
    row = {
        "as_of": datetime(2026, 7, 30, tzinfo=UTC),
        "spot": 63_000.0,
        "oi_total_calls": 24_000.0,
        "oi_total_puts": 5_600.0,
        "gex_net_total": 1.2e7,
        "gex_flip": 99_000.0,
        "max_pain_front": 64_000.0,
    }
    monkeypatch.setattr(series, "positioning_series", lambda ccy, start, resolution: [row])

    body = client.get("/api/history/positioning").json()

    assert body["resolution"] == "1d"  # the default
    assert body["points"][0]["max_pain_front"] == 64_000.0


def test_history_unreachable_archive_is_503(client, monkeypatch):
    def unavailable(ccy, start, resolution):
        raise StorageUnavailable("archive unavailable")

    monkeypatch.setattr(series, "vol_series", unavailable)

    response = client.get("/api/history/vol")

    assert response.status_code == 503
    assert response.json() == {"detail": "archive unavailable"}


def test_unsupported_currency_returns_422(client):
    response = client.get("/api/stats", params={"currency": "XYZ"})
    assert response.status_code == 422


def test_currency_is_case_insensitive(client):
    assert client.get("/api/stats", params={"currency": "btc"}).json()["currency"] == "BTC"
