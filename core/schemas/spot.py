"""Response models for the spot price-history route."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SpotCandle(BaseModel):
    ts: datetime  # candle open time
    open: float
    high: float
    low: float
    close: float
    volume: float


class SpotHistoryResponse(BaseModel):
    currency: str
    instrument: str
    as_of: datetime
    candles: list[SpotCandle]
