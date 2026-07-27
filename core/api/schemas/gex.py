"""Response models for the gamma-exposure route."""

from __future__ import annotations

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope


class GEXByStrikePoint(BaseModel):
    strike: float
    call_gex: float
    put_gex: float
    net_gex: float


class GEXByStrikeResponse(MarketEnvelope):
    # zero-gamma level: the cumulative net-GEX crossing nearest spot
    gex_flip: float | None
    points: list[GEXByStrikePoint]
