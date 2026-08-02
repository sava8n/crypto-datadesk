"""Market stats route: spot, DVOL (+rank) and 30-day implied vs realized vol."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import envelope
from api.schemas.stats import StatsResponse
from data.storage import series

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
def get_stats(ccy: CurrencyDep, state: StateDep) -> StatsResponse:
    """Spot, DVOL with its trailing-year rank, 30d ATM IV vs realized vol."""
    return StatsResponse(
        **envelope(ccy, state),
        dvol=state.dvol,
        dvol_rank=state.dvol_rank,
        iv30=state.iv30,
        rv30=state.rv30,
        iv30_percentile=series.iv30_percentile(ccy, state.iv30),
    )
