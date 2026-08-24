"""Response models for the dealer-exposure route."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from api.schemas.base import MarketEnvelope, TapeStart

ExposureGreek = Literal["gamma", "vanna", "charm"]


class ExposureEnvelope(MarketEnvelope):
    """Tape-coverage fields shared by the dealer-exposure responses."""

    # backs the tape signing; None on an empty tape
    tape_start: TapeStart
    # share of open interest whose sign the tape explains; None on an empty chain
    oi_explained_fraction: float | None = None


class ExposureByStrikePoint(BaseModel):
    strike: float
    call_exposure: float
    put_exposure: float
    net_exposure: float


class ExposureByStrikeResponse(ExposureEnvelope):
    # dollar per 1% move (gamma), per vol point (vanna) or per calendar day (charm)
    greek: ExposureGreek
    # zero-gamma level: cumulative net-exposure crossing nearest spot; gamma only
    gex_flip: float | None = None
    points: list[ExposureByStrikePoint]
