"""Response models for the open-interest routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope


class OIByExpirationPoint(BaseModel):
    expiry: datetime
    tte_years: float
    itm_calls: float
    otm_calls: float
    itm_puts: float
    otm_puts: float


class OIByExpirationResponse(MarketEnvelope):
    points: list[OIByExpirationPoint]


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
