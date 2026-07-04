"""Implied-volatility routes: surface and smile curves."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from schemas.iv import (
    CurvePoint,
    IVCurvesResponse,
    IVSurfaceResponse,
    SurfacePoint,
)
from shared.market_data import load_market_data, validate_currency
from iv import curves, surface

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iv", tags=["volatility"])


@router.get("/surface", response_model=IVSurfaceResponse)
def get_iv_surface(currency: str = Query("BTC")) -> IVSurfaceResponse:
    """BTC options implied-volatility surface: (delta, expiry) -> IV, plus axis ticks."""
    cur = validate_currency(currency)
    spot, summaries = load_market_data(cur)

    grid = surface.build(summaries, spot)

    points = [
        SurfacePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            delta=float(row.delta),
            mark_iv=float(row.mark_iv),
            option_type=str(row.option_type),
        )
        for row in grid.itertuples(index=False)
    ]

    return IVSurfaceResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        points=points,
    )


@router.get("/curves", response_model=IVCurvesResponse)
def get_iv_curves(currency: str = Query("BTC")) -> IVCurvesResponse:
    """BTC options implied-volatility smile curves: (strike, expiry) -> IV, one curve per expiry."""
    cur = validate_currency(currency)
    spot, summaries = load_market_data(cur)

    grid = curves.build(summaries, spot)

    points = [
        CurvePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            strike=float(row.strike),
            mark_iv=float(row.mark_iv),
            option_type=str(row.option_type),
        )
        for row in grid.itertuples(index=False)
    ]

    return IVCurvesResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        points=points,
    )
