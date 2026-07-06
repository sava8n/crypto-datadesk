"""Gamma-exposure route: dollar GEX by strike across the full chain."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Query

from schemas.gex import GEXByStrikePoint, GEXByStrikeResponse
from shared.market_data import load_oi_chain, load_otm_quotes, validate_currency
from gex import by_strike

router = APIRouter(prefix="/gex", tags=["gex"])


@router.get("/strike", response_model=GEXByStrikeResponse)
def get_gex_by_strike(currency: str = Query("BTC")) -> GEXByStrikeResponse:
    """Dollar GEX per strike with the zero-gamma flip level."""
    cur = validate_currency(currency)
    spot, otm_quotes = load_otm_quotes(cur)
    _, oi_chain = load_oi_chain(cur)

    grid = by_strike.build(otm_quotes, oi_chain)

    points = [
        GEXByStrikePoint(
            strike=float(row.strike),
            call_gex=float(row.call_gex),
            put_gex=float(row.put_gex),
            net_gex=float(row.net_gex),
        )
        for row in grid.itertuples(index=False)
    ]

    return GEXByStrikeResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        flip=by_strike.flip_level(grid, spot),
        points=points,
    )
