"""Dealer-exposure route: dollar gamma, vanna or charm by strike.

``convention=assumption`` serves the memoized state products and never touches the
archive; ``convention=flow`` signs OI by cumulative taker flow and raises 503 when the
storage is down to avoid silently serving assumption signs under a flow label.
"""

from __future__ import annotations

from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Query

from analytics.frames import finite
from analytics.positioning import exposure, inventory
from api.deps import CurrencyDep, StateDep
from api.responses import market, points
from api.schemas.exposure import (
    ExposureByStrikePoint,
    ExposureByStrikeResponse,
    ExposureConvention,
    ExposureGreek,
)
from data.market.state import MarketState
from data.storage import flow

router = APIRouter(prefix="/exposure", tags=["exposure"])


def _flow_chain(ccy: str, state: MarketState) -> tuple[pd.DataFrame, datetime | None, float]:
    """The flow-signed OI chain, the tape start backing it, and the OI share it explains."""
    inputs = flow.dealer_flow(ccy)
    chain, fraction = inventory.flow_signed_chain(
        state.oi_chain, inventory.net_flow_frame(inputs["rows"])
    )
    return chain, inputs["tape_start"], fraction


@router.get("/strike", response_model=ExposureByStrikeResponse)
def get_exposure_by_strike(
    ccy: CurrencyDep,
    state: StateDep,
    greek: ExposureGreek = Query("gamma"),
    convention: ExposureConvention = Query("assumption"),
) -> ExposureByStrikeResponse:
    """Dollar dealer exposure per strike; the zero-gamma flip comes with ``greek=gamma``."""
    if convention == "flow":
        chain, tape_start, fraction = _flow_chain(ccy, state)
        per_strike = exposure.build(state.greeks_chain, chain, greek)
        flip = exposure.flip_level(per_strike, state.spot) if greek == "gamma" else None
        return market(
            ExposureByStrikeResponse,
            ccy,
            state,
            convention="flow",
            tape_start=tape_start,
            oi_explained_fraction=fraction,
            greek=greek,
            gex_flip=finite(flip) if flip is not None else None,
            points=points(per_strike, ExposureByStrikePoint),
        )
    return market(
        ExposureByStrikeResponse,
        ccy,
        state,
        greek=greek,
        gex_flip=state.gex_flip if greek == "gamma" else None,
        points=points(state.exposure(greek), ExposureByStrikePoint),
    )
