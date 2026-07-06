"""Implied-volatility routes: surface and smile curves."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from schemas.iv import (
    CurvePoint,
    IVCurvesResponse,
    IVSurfaceResponse,
    SkewPoint,
    SkewResponse,
    SurfacePoint,
    TermStructurePoint,
    TermStructureResponse,
)
from shared.market_data import load_otm_quotes, validate_currency
from iv import curves, skew, surface, term_structure

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iv", tags=["volatility"])


@router.get("/surface", response_model=IVSurfaceResponse)
def get_iv_surface(currency: str = Query("BTC")) -> IVSurfaceResponse:
    """BTC options implied-volatility surface: (delta, expiry) -> IV, plus axis ticks."""
    cur = validate_currency(currency)
    spot, otm_quotes = load_otm_quotes(cur)

    grid = surface.build(otm_quotes)

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
    spot, otm_quotes = load_otm_quotes(cur)

    grid = curves.build(otm_quotes)

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


@router.get("/skew", response_model=SkewResponse)
def get_iv_skew(currency: str = Query("BTC")) -> SkewResponse:
    """BTC options 25Δ skew term structure: risk reversal and butterfly per expiry."""
    cur = validate_currency(currency)
    spot, otm_quotes = load_otm_quotes(cur)

    grid = skew.build(otm_quotes)

    points = [
        SkewPoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            rr=float(row.rr),
            bf=float(row.bf),
        )
        for row in grid.itertuples(index=False)
    ]

    return SkewResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        points=points,
    )


@router.get("/term-structure", response_model=TermStructureResponse)
def get_iv_term_structure(currency: str = Query("BTC")) -> TermStructureResponse:
    """BTC options ATM implied-volatility term structure: one ATM IV per expiry."""
    cur = validate_currency(currency)
    spot, otm_quotes = load_otm_quotes(cur)

    grid = term_structure.build(otm_quotes)

    points = [
        TermStructurePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            atm_iv=float(row.atm_iv),
            forward=float(row.forward),
        )
        for row in grid.itertuples(index=False)
    ]

    return TermStructureResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        points=points,
    )
