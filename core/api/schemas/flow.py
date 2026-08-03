"""Response models for the trade-flow routes."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from api.schemas.base import CurrencyEnvelope, OptionType, SpanEnvelope, TapeStart
from api.windows import RecentWindow


class FlowEnvelope(SpanEnvelope):
    """Tape-backed aggregates over a trailing window; no live-market dependency."""

    window: RecentWindow
    # later than ``start`` means the tape truncates the requested window
    tape_start: TapeStart


class FlowByStrikePoint(BaseModel):
    strike: float
    # net taker flow: buys - sells
    call_contracts: float
    put_contracts: float
    call_premium: float
    put_premium: float


class FlowByStrikeResponse(FlowEnvelope):
    points: list[FlowByStrikePoint]


class FlowByExpiryPoint(BaseModel):
    expiry: datetime
    call_contracts: float
    put_contracts: float
    call_premium: float
    put_premium: float


class FlowByExpiryResponse(FlowEnvelope):
    points: list[FlowByExpiryPoint]


class TapePrint(BaseModel):
    trade_id: str
    ts: datetime
    instrument_name: str
    expiry: datetime
    strike: float
    option_type: OptionType
    direction: Literal["buy", "sell"]
    price: float
    amount: float
    iv: float | None = None
    # price * index_price * amount; None when the print carried no index price
    premium: float | None = None
    block_trade_id: str | None = None
    liquidation: str | None = None


class TapeResponse(CurrencyEnvelope):
    """Bounded by ``limit`` and premium, not by a span - hence no ``FlowEnvelope``."""

    points: list[TapePrint]
