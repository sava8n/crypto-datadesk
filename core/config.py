"""Runtime settings, overridable via ``DATADESK_SERVICE_*`` environment variables."""

from __future__ import annotations

from datetime import time

from pydantic_settings import BaseSettings, SettingsConfigDict

VERSION = "0.3.1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DATADESK_SERVICE_", extra="ignore")

    cors_origins: str = "http://localhost:5173,http://localhost:8080"
    supported_currencies: str = "BTC"
    log_level: str = "INFO"
    market_cache_ttl_seconds: int = 10
    deribit_api_url: str = "https://www.deribit.com/api/v2"
    http_connect_timeout: float = 3.0
    # must cover the multi-MB option book
    http_read_timeout: float = 20.0
    # how long a state may be served past its TTL when upstream is failing
    max_stale_seconds: int = 300
    db_dsn: str = "postgresql+psycopg://user:password@localhost:5432/datadesk"
    snapshot_interval_minutes: int = 60
    retention_days: int = 365
    retention_sweep_at_utc: time = time(0, 0)
    tape_poll_seconds: int = 60
    # how far back the first tape poll reaches when the archive is empty
    tape_bootstrap_days: int = 7
    openrouter_api_key: str = ""
    openrouter_api_url: str = "https://openrouter.ai/api/v1"
    # deep research holds the connection for many minutes
    openrouter_read_timeout: float = 3600.0
    report_model: str = "perplexity/sonar-deep-research"
    # the deep-research report needs reasoning; "" omits the param entirely
    report_reasoning_effort: str = "high"
    # "openrouter" | "fixture" - fixture replays the bundled sample, no silent fallback
    report_source: str = "openrouter"
    # Sundays, weekday fixed in data/report/scheduler.py
    report_generate_at_utc: time = time(8, 0)

    @property
    def snapshot_interval_seconds(self) -> int:
        return self.snapshot_interval_minutes * 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def supported_currency_list(self) -> list[str]:
        return [c.strip().upper() for c in self.supported_currencies.split(",") if c.strip()]


settings = Settings()
