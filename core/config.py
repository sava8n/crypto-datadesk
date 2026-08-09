"""Runtime settings, overridable via ``DATADESK_SERVICE_*`` environment variables."""

from __future__ import annotations

from datetime import time

from pydantic_settings import BaseSettings, SettingsConfigDict

VERSION = "0.3.1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DATADESK_SERVICE_", extra="ignore")

    # --- api ---
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,http://localhost:8080"  # comma-separated
    supported_currencies: str = "BTC"  # comma-separated

    # --- market data (Deribit) ---
    deribit_api_url: str = "https://www.deribit.com/api/v2"
    http_connect_timeout: int = 3
    # must cover the multi-MB option book
    http_read_timeout: int = 20
    market_cache_ttl_seconds: int = 10
    # how long a state may be served past its TTL when upstream is failing
    max_stale_seconds: int = 300

    # --- database ---
    db_dsn: str = ""

    # --- archive: snapshots, tape, retention ---
    snapshot_interval_minutes: int = 60
    tape_poll_seconds: int = 60
    # how far back the first tape poll reaches when the archive is empty
    tape_bootstrap_days: int = 7
    retention_days: int = 365
    retention_sweep_at_utc: time = time(0, 0)

    # --- market reports (openrouter) ---
    openrouter_api_url: str = "https://openrouter.ai/api/v1"
    openrouter_api_key: str = ""
    # deep research holds the connection for many minutes
    openrouter_read_timeout: int = 3600
    report_model: str = "qwen/qwen3.8-max"
    # strict-JSON output plus openrouter's response-healing repair;
    # disable for models without response_format support
    report_json_mode: bool = True
    # openrouter-executed web search/fetch tools for models without built-in browsing;
    # disable for models that research on their own
    report_web_tools: bool = True
    # openrouter maps unsupported levels down to the model's nearest supported one
    report_reasoning_effort: str = "max"
    # "openrouter" | "fixture" - fixture replays the bundled sample, no silent fallback
    report_source: str = "openrouter"
    # Sundays at this UTC time
    report_generate_at_utc: time = time(8, 0)
    # failed generation retries with doubling backoff: first delay / ceiling
    report_retry_seconds: int = 1800
    report_retry_max_seconds: int = 43200

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
