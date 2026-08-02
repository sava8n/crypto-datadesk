"""Response models for the dealer-exposure routes."""

from __future__ import annotations

from typing import Literal

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


class ExposurePoint(BaseModel):
    strike: float
    call_exposure: float
    put_exposure: float
    net_exposure: float


class ExposureResponse(MarketEnvelope):
    # dollar delta per 1 vol-pt (vanna) or per calendar day (charm)
    greek: Literal["vanna", "charm"]
    points: list[ExposurePoint]
