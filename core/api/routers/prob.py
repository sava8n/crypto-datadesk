"""Option-implied probability routes."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Query

from api.deps import CurrencyDep, StateDep
from api.responses import market, points, records
from api.schemas.prob import (
    ExpiryOutcomePoint,
    ExpiryOutcomesResponse,
    ProbCurvePoint,
    ProbCurvesResponse,
    ProbQuantilePoint,
)
from data.clients.deribit import DeribitError
from data.storage import outcomes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prob", tags=["prob"])


@router.get("/curves")
def get_prob_curves(ccy: CurrencyDep, state: StateDep) -> ProbCurvesResponse:
    """Option-implied P(S_T > K): (strike, expiry) -> probability, one curve per expiry."""
    return market(
        ProbCurvesResponse,
        ccy,
        state,
        points=points(state.prob_curves, ProbCurvePoint),
        quantiles=points(state.prob_quantiles, ProbQuantilePoint),
    )


@router.get("/expiry-outcomes")
def get_expiry_outcomes(
    ccy: CurrencyDep,
    limit: int = Query(10, ge=1, le=50),
) -> ExpiryOutcomesResponse:
    """Implied vs realized expected move for recently settled expiries.

    The refresh is best-effort: if delivery prices cannot be fetched, whatever is
    already cached is served.
    """
    try:
        outcomes.refresh(ccy, datetime.now(UTC), limit)
    except DeribitError as exc:
        logger.warning("outcome refresh skipped: %s", exc)
    return ExpiryOutcomesResponse(
        currency=ccy,
        points=records(outcomes.stored(ccy, limit), ExpiryOutcomePoint),
    )
