"""Dealer-exposure routes: dollar GEX and vanna/charm exposure by strike."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.gex import (
    ExposurePoint,
    ExposureResponse,
    GEXByStrikePoint,
    GEXByStrikeResponse,
)

router = APIRouter(prefix="/gex", tags=["gex"])


@router.get("/strike", response_model=GEXByStrikeResponse)
def get_gex_by_strike(ccy: CurrencyDep, state: StateDep) -> GEXByStrikeResponse:
    """Dollar GEX per strike with the zero-gamma flip level."""
    return GEXByStrikeResponse(
        **envelope(ccy, state),
        gex_flip=state.gex_flip,
        points=points(state.gex_by_strike, GEXByStrikePoint),
    )


@router.get("/exposure", response_model=ExposureResponse)
def get_exposure_by_strike(
    ccy: CurrencyDep,
    state: StateDep,
    greek: Literal["vanna", "charm"] = Query("vanna"),
) -> ExposureResponse:
    """Dollar vanna or charm exposure per strike (calls +, puts -)."""
    frame = state.vanna_exposure if greek == "vanna" else state.charm_exposure
    return ExposureResponse(
        **envelope(ccy, state),
        greek=greek,
        points=points(frame, ExposurePoint),
    )
