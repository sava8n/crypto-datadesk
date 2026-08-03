"""Response models for the dealer-exposure routes."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope

Convention = Literal["assumption", "flow"]


class ExposureEnvelope(MarketEnvelope):
    """Sign-convention fields shared by the dealer-exposure responses."""

    convention: Convention = "assumption"
    # earliest archived print backing the flow signing; None under assumption or empty tape
    tape_start: datetime | None = None
    # share of open interest whose sign the tape explains; None under assumption
    oi_explained_fraction: float | None = None


class GEXByStrikePoint(BaseModel):
    strike: float
    call_gex: float
    put_gex: float
    net_gex: float


class GEXByStrikeResponse(ExposureEnvelope):
    # zero-gamma level: the cumulative net-GEX crossing nearest spot
    gex_flip: float | None
    points: list[GEXByStrikePoint]


class ExposurePoint(BaseModel):
    strike: float
    call_exposure: float
    put_exposure: float
    net_exposure: float


class ExposureResponse(ExposureEnvelope):
    # dollar delta per 1 vol-pt (vanna) or per calendar day (charm)
    greek: Literal["vanna", "charm"]
    points: list[ExposurePoint]
