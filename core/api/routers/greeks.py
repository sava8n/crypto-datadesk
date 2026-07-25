"""Option-greeks route: per-contract delta, gamma, theta and vega across the OTM chain."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.greeks import GreeksChainPoint, GreeksChainResponse

router = APIRouter(prefix="/greeks", tags=["greeks"])


@router.get("/chain", response_model=GreeksChainResponse)
def get_greeks_chain(ccy: CurrencyDep, state: StateDep) -> GreeksChainResponse:
    """All four Black-76 greeks per OTM contract across the chain."""
    return GreeksChainResponse(
        **envelope(ccy, state),
        expiries=state.otm_expiries,
        points=points(state.greeks_chain, GreeksChainPoint),
    )
