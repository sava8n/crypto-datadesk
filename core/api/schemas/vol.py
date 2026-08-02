"""Response models for the vol analytics routes."""

from __future__ import annotations

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope


class RVConePoint(BaseModel):
    days: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    current: float | None = None  # trailing-window RV; None when it failed to compute


class RVConeResponse(MarketEnvelope):
    points: list[RVConePoint]
