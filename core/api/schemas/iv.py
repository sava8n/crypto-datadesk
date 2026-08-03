"""Response models for the implied-volatility routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from api.schemas.base import BaselineEnvelope, MarketEnvelope, OptionType


class IVCurvePoint(BaseModel):
    expiry: datetime
    tte_years: float
    strike: float
    mark_iv: float
    option_type: OptionType


class IVCurvesResponse(MarketEnvelope):
    points: list[IVCurvePoint]


class SmileHistoryResponse(BaselineEnvelope):
    expiry: datetime
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
