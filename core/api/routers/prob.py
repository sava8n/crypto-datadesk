"""Option-implied probability routes."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.prob import ProbCurvePoint, ProbCurvesResponse, ProbQuantilePoint

router = APIRouter(prefix="/prob", tags=["probabilities"])


@router.get("/curves", response_model=ProbCurvesResponse)
def get_prob_curves(ccy: CurrencyDep, state: StateDep) -> ProbCurvesResponse:
    """Option-implied P(S_T > K): (strike, expiry) -> probability, one curve per expiry."""
    return ProbCurvesResponse(
        **envelope(ccy, state),
        points=points(state.prob_curves, ProbCurvePoint),
        quantiles=points(state.prob_quantiles, ProbQuantilePoint),
    )
