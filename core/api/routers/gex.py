"""Gamma-exposure route: dollar GEX by strike across the full chain."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.gex import GEXByStrikePoint, GEXByStrikeResponse

router = APIRouter(prefix="/gex", tags=["gex"])


@router.get("/strike", response_model=GEXByStrikeResponse)
def get_gex_by_strike(ccy: CurrencyDep, state: StateDep) -> GEXByStrikeResponse:
    """Dollar GEX per strike with the zero-gamma flip level."""
    return GEXByStrikeResponse(
        **envelope(ccy, state),
        gex_flip=state.gex_flip,
        points=points(state.gex_by_strike, GEXByStrikePoint),
    )
