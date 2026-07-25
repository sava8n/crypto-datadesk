"""Response models for the traded-volume route."""

from __future__ import annotations

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope


class VolumeByStrikePoint(BaseModel):
    strike: float
    call_volume: float
    put_volume: float


class VolumeByStrikeResponse(MarketEnvelope):
    points: list[VolumeByStrikePoint]
