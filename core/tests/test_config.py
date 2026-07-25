"""Settings parsers for the comma-separated env fields."""

from __future__ import annotations

from datetime import time

import pytest
from pydantic import ValidationError

from config import Settings


def test_cors_origin_list_splits_and_strips():
    settings = Settings(cors_origins="  http://a.com , http://b.com ,")
    assert settings.cors_origin_list == ["http://a.com", "http://b.com"]


def test_supported_currency_list_uppercases():
    settings = Settings(supported_currencies="btc, eth ,")
    assert settings.supported_currency_list == ["BTC", "ETH"]


def test_persistence_settings_read_the_env_prefix(monkeypatch):
    monkeypatch.setenv("DATADESK_SERVICE_SNAPSHOT_INTERVAL_MINUTES", "15")
    monkeypatch.setenv("DATADESK_SERVICE_RETENTION_DAYS", "30")
    monkeypatch.setenv("DATADESK_SERVICE_RETENTION_SWEEP_AT_UTC", "00:05")

    settings = Settings()

    assert settings.snapshot_interval_minutes == 15
    assert settings.snapshot_interval_seconds == 900
    assert settings.retention_days == 30
    assert settings.retention_sweep_at_utc == time(0, 5)


def test_a_sweep_time_that_is_not_a_time_is_rejected_at_startup(monkeypatch):
    """Misconfiguration should fail the boot, not silently sweep at midnight."""
    monkeypatch.setenv("DATADESK_SERVICE_RETENTION_SWEEP_AT_UTC", "25:00")

    with pytest.raises(ValidationError):
        Settings()
