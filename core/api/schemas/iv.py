"""Response models for the implied-volatility routes."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope, OptionType


class IVSurfacePoint(BaseModel):
    expiry: datetime
    tte_years: float
    delta: float
    mark_iv: float
    option_type: OptionType


class IVSurfaceResponse(MarketEnvelope):
    points: list[IVSurfacePoint]


class IVCurvePoint(BaseModel):
    expiry: datetime
    tte_years: float
    strike: float
    mark_iv: float
    option_type: OptionType


class IVCurvesResponse(MarketEnvelope):
    points: list[IVCurvePoint]


class SmileHistoryResponse(MarketEnvelope):
    expiry: datetime
    window: Literal["24h", "7d"]
    # the archived book actually served; None = nothing archived that far back
    baseline_as_of: datetime | None = None
    # the baseline used is much younger than the window claims (short/gappy archive)
    baseline_stale: bool = False
    points: list[IVCurvePoint]


class SkewPoint(BaseModel):
    expiry: datetime
    tte_years: float
    rr: float
    bf: float


class SkewResponse(MarketEnvelope):
    points: list[SkewPoint]


class TermStructurePoint(BaseModel):
    expiry: datetime
    tte_years: float
    atm_iv: float
    forward: float


class TermStructureResponse(MarketEnvelope):
    points: list[TermStructurePoint]
