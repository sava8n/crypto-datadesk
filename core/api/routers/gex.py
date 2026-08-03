"""Dealer-exposure routes: dollar GEX and vanna/charm exposure by strike.

``convention=assumption`` serves the memoized state products and never touches the
archive; ``convention=flow`` signs OI by cumulative taker flow and raises 503 when the
storage is down to avoid silently serving assumption signs under a flow label.
"""

from __future__ import annotations

from typing import Literal

import pandas as pd
from fastapi import APIRouter, Query

from analytics.frames import finite
from analytics.positioning import exposure, gamma_exposure, inventory
from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.gex import (
    Convention,
    ExposurePoint,
    ExposureResponse,
    GEXByStrikePoint,
    GEXByStrikeResponse,
)
from data.market.state import MarketState
from data.storage import flow

router = APIRouter(prefix="/gex", tags=["gex"])


def _flow_chain(ccy: str, state: MarketState) -> tuple[pd.DataFrame, dict]:
    """The flow-signed OI chain and its coverage fields, ready to splat."""
    inputs = flow.dealer_flow(ccy)
    chain, fraction = inventory.flow_signed_chain(
        state.oi_chain, inventory.net_flow_frame(inputs["rows"])
    )
    return chain, {
        "convention": "flow",
        "tape_start": inputs["tape_start"],
        "oi_explained_fraction": fraction,
    }


@router.get("/strike", response_model=GEXByStrikeResponse)
def get_gex_by_strike(
    ccy: CurrencyDep,
    state: StateDep,
    convention: Convention = Query("assumption"),
) -> GEXByStrikeResponse:
    """Dollar GEX per strike with the zero-gamma flip level."""
    if convention == "assumption":
        return GEXByStrikeResponse(
            **envelope(ccy, state),
            gex_flip=state.gex_flip,
            points=points(state.gex_by_strike, GEXByStrikePoint),
        )
    chain, coverage = _flow_chain(ccy, state)
    per_strike = gamma_exposure.build(state.greeks_chain, chain)
    return GEXByStrikeResponse(
        **envelope(ccy, state),
        **coverage,
        gex_flip=finite(gamma_exposure.flip_level(per_strike, state.spot)),
        points=points(per_strike, GEXByStrikePoint),
    )


@router.get("/exposure", response_model=ExposureResponse)
def get_exposure_by_strike(
    ccy: CurrencyDep,
    state: StateDep,
    greek: Literal["vanna", "charm"] = Query("vanna"),
    convention: Convention = Query("assumption"),
) -> ExposureResponse:
    """Dollar vanna or charm exposure per strike."""
    if convention == "assumption":
        frame = state.vanna_exposure if greek == "vanna" else state.charm_exposure
        return ExposureResponse(
            **envelope(ccy, state),
            greek=greek,
            points=points(frame, ExposurePoint),
        )
    chain, coverage = _flow_chain(ccy, state)
    return ExposureResponse(
        **envelope(ccy, state),
        **coverage,
        greek=greek,
        points=points(exposure.build(state.greeks_chain, chain, greek), ExposurePoint),
    )
