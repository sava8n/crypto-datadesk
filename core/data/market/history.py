"""Incremental daily-candle history.

Closed daily candles are immutable, so a refresh only needs the window since the
last stored candle: the running candle is replaced, new ones appended, and the
series trimmed to the trailing year.
"""

from __future__ import annotations

import math
import time

import pandas as pd

from analytics.conventions import DAY_MS
from analytics.frames import as_declared_dtypes, empty_frame

WINDOW_DAYS = 365


_TV_ARRAYS = ("ticks", "open", "high", "low", "close", "volume")
_OHLCV = ("open", "high", "low", "close", "volume")

CANDLE_COLUMNS = ["ts", *_OHLCV]


def refresh_days(last_tick_ms: int | None) -> int:
    """Fetch window covering everything since the last stored candle (min 2 days)."""
    if last_tick_ms is None:
        return WINDOW_DAYS
    elapsed = (time.time() * 1000 - last_tick_ms) / DAY_MS
    return min(WINDOW_DAYS, max(2, math.ceil(elapsed) + 1))


def is_complete(candles: dict | None) -> bool:
    """True when ``candles`` is an ok payload carrying every array at one common length.

    Readers zip the arrays positionally, so a payload missing one - or carrying a short
    one - would splice into a ragged set that ``zip`` truncates to the shortest without
    complaint. Rejecting it here is what keeps that from being silent data loss.
    """
    if not candles or candles.get("status") != "ok":
        return False
    if any(key not in candles for key in _TV_ARRAYS):
        return False
    return len({len(candles[key]) for key in _TV_ARRAYS}) == 1


def to_frame(candles: dict | None) -> pd.DataFrame:
    """TradingView parallel arrays as one row per daily candle.

    The single place the upstream payload is decoded, so callers never touch its shape
    and an unusable payload becomes an empty frame rather than a partial one.
    """
    if not is_complete(candles):
        return empty_frame(CANDLE_COLUMNS)
    candle_frame = pd.DataFrame(
        {
            "ts": pd.to_datetime(candles["ticks"], unit="ms", utc=True),
            **{key: candles[key] for key in _OHLCV},
        }
    )
    return as_declared_dtypes(candle_frame[CANDLE_COLUMNS])


def spot_last_tick(candles: dict | None) -> int | None:
    """Open time (ms) of the last stored TradingView-format candle."""
    if candles and candles.get("status") == "ok" and candles.get("ticks"):
        return int(candles["ticks"][-1])
    return None


def splice_spot(prev: dict | None, fresh: dict) -> dict | None:
    """Merge TradingView-format arrays ``{ticks, open, …}``: fresh replaces overlap.

    Only complete payloads are spliced or returned; an incomplete one is discarded in
    favour of whatever was already held.
    """
    if not is_complete(fresh) or not fresh["ticks"]:
        return prev
    if not is_complete(prev):
        return fresh
    since = fresh["ticks"][0]
    keep = sum(1 for t in prev["ticks"] if t < since)
    merged: dict = {"status": "ok"}
    for key in _TV_ARRAYS:
        merged[key] = (list(prev[key])[:keep] + list(fresh[key]))[-WINDOW_DAYS:]
    return merged


def dvol_last_tick(candles: list | None) -> int | None:
    """Open time (ms) of the last stored DVOL candle."""
    return int(candles[-1][0]) if candles else None


def splice_dvol(prev: list | None, fresh: list) -> list:
    """Merge ``[[ts, o, h, l, c], …]`` candles: fresh replaces overlap."""
    if not prev:
        return fresh
    if not fresh:
        return prev
    since = fresh[0][0]
    kept = [c for c in prev if c[0] < since]
    return (kept + fresh)[-WINDOW_DAYS:]
