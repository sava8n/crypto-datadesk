"""Response models for the option-greeks chain route."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope, OptionType


class GreeksChainPoint(BaseModel):
    expiry: datetime
    tte_years: float
    strike: float
    option_type: OptionType
    delta: float
    gamma: float
    theta: float
    vega: float


class GreeksChainResponse(MarketEnvelope):
    expiries: list[datetime]
    points: list[GreeksChainPoint]
