"""Response models for the open-interest routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from api.schemas.base import BaselineEnvelope, MarketEnvelope


class OIByExpiryPoint(BaseModel):
    expiry: datetime
    tte_years: float
    itm_calls: float
    otm_calls: float
    itm_puts: float
    otm_puts: float


class OIByExpiryResponse(MarketEnvelope):
    points: list[OIByExpiryPoint]


class OIByStrikePoint(BaseModel):
    strike: float
    itm_calls: float
    otm_calls: float
    itm_puts: float
    otm_puts: float
    intrinsic_value: float | None = None  # single-expiry only


class OIByStrikeResponse(MarketEnvelope):
    expiries: list[datetime]
    expiry: datetime | None = None  # echo of the selected expiry; None = all
    max_pain: float | None = None  # single-expiry only
    points: list[OIByStrikePoint]


class MaxPainPoint(BaseModel):
    expiry: datetime
    tte_years: float
    max_pain: float | None = None  # None when the expiry's slice was uninvertible


class MaxPainResponse(MarketEnvelope):
    points: list[MaxPainPoint]


class OIChangeByStrikePoint(BaseModel):
    strike: float
    call_oi_change: float
    put_oi_change: float


class OIChangeByStrikeResponse(BaselineEnvelope):
    expiries: list[datetime]
    expiry: datetime | None = None  # echo of the selected expiry; None = all
    points: list[OIChangeByStrikePoint]
