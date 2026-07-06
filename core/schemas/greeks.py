"""Response models for the option-greeks chain route."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class GreekChainPoint(BaseModel):
    expiry: datetime
    tte_years: float
    strike: float
    option_type: str
    delta: float
    gamma: float
    theta: float
    vega: float


class GreeksChainResponse(BaseModel):
    currency: str
    spot: float
    as_of: datetime
    expiries: list[datetime]
    points: list[GreekChainPoint]
