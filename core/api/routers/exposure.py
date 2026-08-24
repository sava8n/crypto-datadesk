"""Dealer-exposure route: dollar gamma, vanna or charm by strike, tape-signed.

Signing needs the trade archive; ``tape_start`` and ``oi_explained_fraction``
tell the client how much of the book the tape covers.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from analytics.frames import finite
from analytics.positioning import exposure
from api.deps import CurrencyDep, StateDep
from api.responses import market, points
from api.schemas.exposure import (
    ExposureByStrikePoint,
    ExposureByStrikeResponse,
    ExposureGreek,
)
from data.market import dealer

router = APIRouter(prefix="/exposure", tags=["exposure"])


@router.get("/strike")
def get_exposure_by_strike(
    ccy: CurrencyDep,
    state: StateDep,
    greek: ExposureGreek = Query("gamma"),
) -> ExposureByStrikeResponse:
    """Dollar dealer exposure per strike; the zero-gamma flip comes with ``greek=gamma``."""
    chain, tape_start, fraction = dealer.signed_chain(ccy, state)
    per_strike = exposure.build(state.greeks_chain, chain, greek)
    flip = exposure.flip_level(per_strike, state.spot) if greek == "gamma" else None
    return market(
        ExposureByStrikeResponse,
        ccy,
        state,
        tape_start=tape_start,
        oi_explained_fraction=fraction,
        greek=greek,
        gex_flip=finite(flip),
        points=points(per_strike, ExposureByStrikePoint),
    )
