"""Response models for implied-volatility routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SurfacePoint(BaseModel):
    expiry: datetime
    tte_years: float
    delta: float
    mark_iv: float
    option_type: str


class IVSurfaceResponse(BaseModel):
    currency: str
    spot: float
    as_of: datetime
    points: list[SurfacePoint]


class CurvePoint(BaseModel):
    expiry: datetime
    tte_years: float
    strike: float
    mark_iv: float
    option_type: str


class IVCurvesResponse(BaseModel):
    currency: str
    spot: float
    as_of: datetime
    points: list[CurvePoint]


class SkewPoint(BaseModel):
    expiry: datetime
    tte_years: float
    rr: float
    bf: float


class SkewResponse(BaseModel):
    currency: str
    spot: float
    as_of: datetime
    points: list[SkewPoint]


class TermStructurePoint(BaseModel):
    expiry: datetime
    tte_years: float
    atm_iv: float
    forward: float


class TermStructureResponse(BaseModel):
    currency: str
    spot: float
    as_of: datetime
    points: list[TermStructurePoint]
