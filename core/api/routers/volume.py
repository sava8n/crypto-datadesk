"""Traded-volume route: 24h volume by strike across the full chain."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import market, points
from api.schemas.volume import VolumeByStrikePoint, VolumeByStrikeResponse

router = APIRouter(prefix="/volume", tags=["volume"])


@router.get("/strike")
def get_volume_by_strike(ccy: CurrencyDep, state: StateDep) -> VolumeByStrikeResponse:
    """24h traded volume per strike, split into calls and puts."""
    return market(
        VolumeByStrikeResponse,
        ccy,
        state,
        points=points(state.volume_by_strike, VolumeByStrikePoint),
    )
