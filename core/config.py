"""Runtime settings, overridable via ``DATADESK_SERVICE_*`` environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DATADESK_SERVICE_", extra="ignore")

    # comma-separated values keep env parsing simple
    cors_origins: str = "http://localhost:5173,http://localhost:8080"
    supported_currencies: str = "BTC"
    log_level: str = "INFO"
    market_cache_ttl_seconds: int = 10
    cot_cache_ttl_seconds: int = 3600

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def supported_currency_list(self) -> list[str]:
        return [c.strip().upper() for c in self.supported_currencies.split(",") if c.strip()]


settings = Settings()
