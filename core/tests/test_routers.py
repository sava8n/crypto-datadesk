"""Router glue via FastAPI TestClient, with the network-backed loaders stubbed (see conftest)."""

from __future__ import annotations

import pytest

_MARKET_ENDPOINTS = [
    "/api/iv/surface",
    "/api/iv/curves",
    "/api/iv/skew",
    "/api/iv/term-structure",
    "/api/greeks/chain",
    "/api/gex/strike",
    "/api/oi/expiration",
    "/api/oi/strike",
    "/api/prob/curves",
    "/api/volume/strike",
    "/api/spot/history",
    "/api/stats",
]

def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize("path", _MARKET_ENDPOINTS)
def test_market_endpoints_ok(client, path):
    response = client.get(path)
    assert response.status_code == 200
    assert response.json()["currency"] == "BTC"


def test_oi_by_strike_with_expiry_returns_max_pain(client, market_state):
    expiry = market_state.oi_expiries[0].isoformat()
    response = client.get("/api/oi/strike", params={"expiry": expiry})
    assert response.status_code == 200
    assert response.json()["max_pain"] is not None


def test_unsupported_currency_returns_422(client):
    response = client.get("/api/stats", params={"currency": "XYZ"})
    assert response.status_code == 422
