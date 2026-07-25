"""Settings parsers for the comma-separated env fields."""

from __future__ import annotations

from config import Settings


def test_cors_origin_list_splits_and_strips():
    settings = Settings(cors_origins="  http://a.com , http://b.com ,")
    assert settings.cors_origin_list == ["http://a.com", "http://b.com"]


def test_supported_currency_list_uppercases():
    settings = Settings(supported_currencies="btc, eth ,")
    assert settings.supported_currency_list == ["BTC", "ETH"]


def test_persistence_settings_read_the_env_prefix(monkeypatch):
    monkeypatch.setenv("DATADESK_SERVICE_PERSISTENCE_ENABLED", "true")
    monkeypatch.setenv("DATADESK_SERVICE_SNAPSHOT_INTERVAL_SECONDS", "900")
    monkeypatch.setenv("DATADESK_SERVICE_RETENTION_DAYS", "30")
    monkeypatch.setenv("DATADESK_SERVICE_RETENTION_SWEEP_HOUR_UTC", "3")

    settings = Settings()

    assert settings.persistence_enabled is True
    assert settings.snapshot_interval_seconds == 900
    assert settings.retention_days == 30
    assert settings.retention_sweep_hour_utc == 3
