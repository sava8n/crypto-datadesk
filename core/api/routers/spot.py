"""Spot price-history route: daily candles of the ``<currency>_USDC`` pair."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.spot import SpotCandle, SpotHistoryResponse

router = APIRouter(prefix="/spot", tags=["spot"])


@router.get("/history", response_model=SpotHistoryResponse)
def get_spot_history(ccy: CurrencyDep, state: StateDep) -> SpotHistoryResponse:
    """A trailing year of daily spot candles."""
    return SpotHistoryResponse(
        **envelope(ccy, state),
        instrument=f"{ccy}_USDC",
        candles=points(state.spot_history, SpotCandle),
    )
