"""Spot price-history route: daily candles of the ``<currency>_USDC`` pair."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Query

from schemas.spot import SpotCandle, SpotHistoryResponse
from shared.market_data import load_spot_candles, validate_currency

router = APIRouter(prefix="/spot", tags=["spot"])


@router.get("/history", response_model=SpotHistoryResponse)
def get_spot_history(currency: str = Query("BTC")) -> SpotHistoryResponse:
    """A trailing year of daily spot candles."""
    cur = validate_currency(currency)
    raw = load_spot_candles(cur)

    candles = []
    if raw.get("status") == "ok":
        candles = [
            SpotCandle(
                ts=datetime.fromtimestamp(ts / 1000, tz=timezone.utc),
                open=o,
                high=h,
                low=lo,
                close=c,
                volume=v,
            )
            for ts, o, h, lo, c, v in zip(
                raw["ticks"], raw["open"], raw["high"], raw["low"], raw["close"], raw["volume"]
            )
        ]

    return SpotHistoryResponse(
        currency=cur,
        instrument=f"{cur}_USDC",
        as_of=datetime.now(timezone.utc),
        candles=candles,
    )
