"""Settled-expiry outcomes: implied-EM replay and the refresh skip rules."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import pandas as pd
import pytest

from data.storage import outcomes


def test_implied_em_matches_live_quantiles(market_state, monkeypatch):
    """The replay must reproduce exactly what the live pipeline serves."""
    monkeypatch.setattr(outcomes.read, "load_contracts", lambda sid: market_state.contracts)
    expiry = market_state.otm_expiries[0]

    em = outcomes._implied_em(1, market_state.spot, expiry)

    quantile = market_state.prob_quantiles
    row = quantile[quantile["expiry"] == pd.Timestamp(expiry)].iloc[0]
    assert em == pytest.approx((row["p84"] - row["p16"]) / 2.0)


def test_refresh_skips_unusable_candidates(monkeypatch):
    """Only an expiry with a delivery price and a fresh T-1d reference is cached."""
    ok = datetime(2026, 8, 1, 8, tzinfo=UTC)
    no_delivery = datetime(2026, 7, 31, 8, tzinfo=UTC)
    stale = datetime(2026, 7, 30, 8, tzinfo=UTC)

    monkeypatch.setattr(
        outcomes, "_settled_candidates", lambda ccy, now, limit: [ok, no_delivery, stale]
    )
    monkeypatch.setattr(outcomes, "stored", lambda ccy, limit: [])
    monkeypatch.setattr(
        outcomes.deribit,
        "fetch_delivery_prices",
        lambda ccy: [
            {"date": "2026-08-01", "delivery_price": 63_000.0},
            {"date": "2026-07-30", "delivery_price": 61_000.0},
        ],
    )

    def baseline(ccy, target):
        if target == ok - outcomes.EM_HORIZON:
            return 1, ok - timedelta(days=1), 62_000.0
        return 2, stale - timedelta(days=5), 60_000.0  # too far from T-1d

    monkeypatch.setattr(outcomes.series, "baseline_snapshot", baseline)
    monkeypatch.setattr(outcomes, "_implied_em", lambda sid, spot, expiry: 1_500.0)

    executed = []

    class _Conn:
        def execute(self, stmt):
            executed.append(stmt)

    @contextmanager
    def fake_connection():
        yield _Conn()

    monkeypatch.setattr(outcomes.db, "connection", fake_connection)

    outcomes.refresh("BTC", datetime(2026, 8, 2, tzinfo=UTC), limit=10)

    assert len(executed) == 1  # only `ok` produced a cached row


def test_refresh_with_nothing_missing_never_fetches(monkeypatch):
    expiry = datetime(2026, 8, 1, 8, tzinfo=UTC)
    monkeypatch.setattr(outcomes, "_settled_candidates", lambda ccy, now, limit: [expiry])
    monkeypatch.setattr(outcomes, "stored", lambda ccy, limit: [{"expiry": expiry}])

    def explode(ccy):
        raise AssertionError("delivery prices must not be fetched when nothing is missing")

    monkeypatch.setattr(outcomes.deribit, "fetch_delivery_prices", explode)

    outcomes.refresh("BTC", datetime(2026, 8, 2, tzinfo=UTC), limit=10)
