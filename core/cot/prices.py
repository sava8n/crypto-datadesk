"""Daily close candles: incremental merging and alignment to COT report dates."""

from __future__ import annotations

import numpy as np
import pandas as pd


def splice(prev: dict | None, chunks: list[dict]) -> dict | None:
    """Merge fresh candle chunks over the previous candles; per tick the freshest close wins
    (the re-fetched seam candle replaces a previously partial day)."""
    merged: dict[int, float] = {}
    for source in ([prev] if prev else []) + chunks:
        if not source or source.get("status") != "ok":
            continue
        for tick, close in zip(source.get("ticks", []), source.get("close", [])):
            merged[int(tick)] = float(close)
    if not merged:
        return prev
    ticks = sorted(merged)
    return {"status": "ok", "ticks": ticks, "close": [merged[t] for t in ticks]}


def align(candles: dict | None, report_dates: pd.Index) -> pd.Series:
    if not candles or candles.get("status") != "ok" or not candles.get("ticks"):
        return pd.Series(float("nan"), index=report_dates, dtype="float64")
    closes = pd.Series(
        [float(c) for c in candles["close"]],
        index=pd.to_datetime(candles["ticks"], unit="ms"),
    ).sort_index()
    closes = closes[~closes.index.duplicated(keep="last")]
    # candle timestamps are day-opens, so the tick on the report date is that day's close
    pos = closes.index.searchsorted(report_dates, side="right") - 1
    values = np.where(pos >= 0, closes.to_numpy()[np.maximum(pos, 0)], np.nan)
    return pd.Series(values, index=report_dates, dtype="float64")
