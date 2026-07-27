"""Open-interest routes: open interest by expiration and by strike."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.oi import (
    OIByExpirationPoint,
    OIByExpirationResponse,
    OIByStrikePoint,
    OIByStrikeResponse,
)

router = APIRouter(prefix="/oi", tags=["open-interest"])


@router.get("/expiration", response_model=OIByExpirationResponse)
def get_oi_by_expiration(ccy: CurrencyDep, state: StateDep) -> OIByExpirationResponse:
    """Per-expiry open interest split into ITM/OTM calls and puts."""
    return OIByExpirationResponse(
        **envelope(ccy, state),
        points=points(state.oi_by_expiration, OIByExpirationPoint),
    )


@router.get("/strike", response_model=OIByStrikeResponse)
def get_oi_by_strike(
    ccy: CurrencyDep,
    state: StateDep,
    expiry: datetime | None = Query(None),
) -> OIByStrikeResponse:
    """Per-strike open interest split into ITM/OTM calls and puts.

    Without ``expiry`` the whole chain is grouped by strike. With ``expiry`` the chain is
    sliced to it and each point also carries its intrinsic value, alongside max pain.
    """
    grid, max_pain = state.oi_by_strike(expiry)
    return OIByStrikeResponse(
        **envelope(ccy, state),
        expiries=state.oi_expiries,
        expiry=expiry,
        max_pain=max_pain,
        points=points(grid, OIByStrikePoint),
    )
