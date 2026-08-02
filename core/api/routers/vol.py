"""Vol analytics routes: the realized-vol cone."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.vol import RVConePoint, RVConeResponse

router = APIRouter(prefix="/vol", tags=["vol"])


@router.get("/cone", response_model=RVConeResponse)
def get_rv_cone(ccy: CurrencyDep, state: StateDep) -> RVConeResponse:
    """Rolling realized-vol percentiles per window, from the trailing year of closes."""
    return RVConeResponse(
        **envelope(ccy, state),
        points=points(state.rv_cone, RVConePoint),
    )
