"""Response models for the gamma-exposure route."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class GEXByStrikePoint(BaseModel):
    strike: float
    call_gex: float
    put_gex: float
    net_gex: float


class GEXByStrikeResponse(BaseModel):
    currency: str
    spot: float
    as_of: datetime
    flip: float | None  # zero-gamma level: cumulative net-GEX crossing nearest spot
    points: list[GEXByStrikePoint]
