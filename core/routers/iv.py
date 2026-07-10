"""Implied-volatility routes: surface, smile curves, skew and term structure."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query

from schemas.iv import (
    IVCurvePoint,
    IVCurvesResponse,
    IVSurfaceResponse,
    SkewPoint,
    SkewResponse,
    IVSurfacePoint,
    TermStructurePoint,
    TermStructureResponse,
)
from market.loader import load_market_state
from shared.currency import validate_currency

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iv", tags=["volatility"])


@router.get("/surface", response_model=IVSurfaceResponse)
def get_iv_surface(currency: str = Query("BTC")) -> IVSurfaceResponse:
    """Options implied-volatility surface: (delta, expiry) -> IV, plus axis ticks."""
    cur = validate_currency(currency)
    state = load_market_state(cur)

    points = [
        IVSurfacePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            delta=float(row.delta),
            mark_iv=float(row.mark_iv),
            option_type=str(row.option_type),
        )
        for row in state.iv_surface.itertuples(index=False)
    ]

    return IVSurfaceResponse(
        currency=cur,
        spot=state.spot,
        as_of=state.as_of,
        points=points,
    )


@router.get("/curves", response_model=IVCurvesResponse)
def get_iv_curves(currency: str = Query("BTC")) -> IVCurvesResponse:
    """Options implied-volatility smile curves: (strike, expiry) -> IV, one curve per expiry."""
    cur = validate_currency(currency)
    state = load_market_state(cur)

    points = [
        IVCurvePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            strike=float(row.strike),
            mark_iv=float(row.mark_iv),
            option_type=str(row.option_type),
        )
        for row in state.iv_curves.itertuples(index=False)
    ]

    return IVCurvesResponse(
        currency=cur,
        spot=state.spot,
        as_of=state.as_of,
        points=points,
    )


@router.get("/skew", response_model=SkewResponse)
def get_iv_skew(currency: str = Query("BTC")) -> SkewResponse:
    """Options 25Δ skew term structure: risk reversal and butterfly per expiry."""
    cur = validate_currency(currency)
    state = load_market_state(cur)

    points = [
        SkewPoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            rr=float(row.rr),
            bf=float(row.bf),
        )
        for row in state.skew.itertuples(index=False)
    ]

    return SkewResponse(
        currency=cur,
        spot=state.spot,
        as_of=state.as_of,
        points=points,
    )


@router.get("/term-structure", response_model=TermStructureResponse)
def get_iv_term_structure(currency: str = Query("BTC")) -> TermStructureResponse:
    """Options ATM implied-volatility term structure: one ATM IV per expiry."""
    cur = validate_currency(currency)
    state = load_market_state(cur)

    points = [
        TermStructurePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            atm_iv=float(row.atm_iv),
            forward=float(row.forward),
        )
        for row in state.term_structure.itertuples(index=False)
    ]

    return TermStructureResponse(
        currency=cur,
        spot=state.spot,
        as_of=state.as_of,
        points=points,
    )
