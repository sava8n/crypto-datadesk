"""Deribit public API client."""

from __future__ import annotations

import logging
import time
from typing import Any

import certifi
import requests
from requests.adapters import HTTPAdapter, Retry

from config import settings

logger = logging.getLogger(__name__)

_DAY_MS = 86_400_000


class DeribitError(RuntimeError):
    """Raised when a Deribit request fails or returns an unexpected payload."""


def _build_session() -> requests.Session:
    """Pooled session that retries idempotent GETs on transport errors and 429/5xx."""
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=(429, 502, 503, 504),
        allowed_methods=("GET",),
        # let raise_for_status report the status instead of a MaxRetryError
        raise_on_status=False,
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    session.verify = certifi.where()
    return session


_SESSION = _build_session()


def _get(path: str, params: dict, *, key: str | None = None) -> Any:
    """GET ``path``, unwrap ``result``, then ``result[key]`` when given.

    Transport failure, bad status, malformed body and a missing key all raise
    ``DeribitError``, so callers need catch nothing else.
    """
    start = time.perf_counter()
    try:
        resp = _SESSION.get(
            f"{settings.deribit_api_url}{path}",
            params=params,
            timeout=(settings.http_connect_timeout, settings.http_read_timeout),
        )
        resp.raise_for_status()
        result = resp.json()["result"]
        if key is not None:
            result = result[key]
    except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
        logger.warning("Deribit request to %s failed: %s", path, exc)
        raise DeribitError(f"Deribit request to {path} failed: {exc}") from exc
    logger.info("fetched %s in %.0f ms", path, (time.perf_counter() - start) * 1000)
    return result


def _window(days: int) -> tuple[int, int]:
    """``(start_ms, end_ms)`` spanning the trailing ``days``."""
    end_ms = int(time.time() * 1000)
    return end_ms - days * _DAY_MS, end_ms


def fetch_spot(currency: str = "BTC") -> float:
    """Current USD index price for ``currency``, from Deribit's ``<currency>_usd`` index."""
    price = _get(
        "/public/get_index_price",
        {"index_name": f"{currency.lower()}_usd"},
        key="index_price",
    )
    try:
        return float(price)
    except (TypeError, ValueError) as exc:
        raise DeribitError(f"Deribit returned a non-numeric index price: {price!r}") from exc


def fetch_option_summaries(currency: str = "BTC") -> list[dict]:
    """Full option book summary for ``currency``."""
    return _get(
        "/public/get_book_summary_by_currency",
        {"currency": currency.upper(), "kind": "option"},
    )


def fetch_dvol_history(currency: str = "BTC", days: int = 365) -> list[list[float]]:
    """Daily DVOL candles ``[[ts_ms, open, high, low, close], …]`` for the past ``days``."""
    start_ms, end_ms = _window(days)
    return _get(
        "/public/get_volatility_index_data",
        {
            "currency": currency.upper(),
            "start_timestamp": start_ms,
            "end_timestamp": end_ms,
            "resolution": "86400",
        },
        key="data",
    )


def fetch_spot_history(currency: str = "BTC", days: int = 365) -> dict:
    """Daily OHLCV candles of the ``<currency>_USDC`` spot pair for the past ``days``.

    TradingView-format parallel arrays.
    """
    start_ms, end_ms = _window(days)
    return _get(
        "/public/get_tradingview_chart_data",
        {
            "instrument_name": f"{currency.upper()}_USDC",
            "start_timestamp": start_ms,
            "end_timestamp": end_ms,
            "resolution": "1D",
        },
    )
