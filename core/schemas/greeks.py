"""Response models for option-greeks routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class GreekPoint(BaseModel):
    expiry: datetime
    tte_years: float
    strike: float
    value: float
    option_type: str


class GreeksResponse(BaseModel):
    currency: str
    spot: float
    greek: str  # "delta" | "gamma" | "theta" | "vega"
    as_of: datetime
    points: list[GreekPoint]
