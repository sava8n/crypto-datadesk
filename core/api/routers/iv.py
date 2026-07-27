"""Implied-volatility routes: surface, smile curves, skew and term structure."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.iv import (
    IVCurvePoint,
    IVCurvesResponse,
    IVSurfacePoint,
    IVSurfaceResponse,
    SkewPoint,
    SkewResponse,
    TermStructurePoint,
    TermStructureResponse,
)

router = APIRouter(prefix="/iv", tags=["volatility"])


@router.get("/surface", response_model=IVSurfaceResponse)
def get_iv_surface(ccy: CurrencyDep, state: StateDep) -> IVSurfaceResponse:
    """Implied-volatility surface: (delta, expiry) -> IV."""
    return IVSurfaceResponse(
        **envelope(ccy, state),
        points=points(state.otm_quotes, IVSurfacePoint),
    )


@router.get("/curves", response_model=IVCurvesResponse)
def get_iv_curves(ccy: CurrencyDep, state: StateDep) -> IVCurvesResponse:
    """Implied-volatility smile curves: (strike, expiry) -> IV, one curve per expiry."""
    return IVCurvesResponse(
        **envelope(ccy, state),
        points=points(state.otm_quotes, IVCurvePoint),
    )


@router.get("/skew", response_model=SkewResponse)
def get_iv_skew(ccy: CurrencyDep, state: StateDep) -> SkewResponse:
    """25Δ skew term structure: risk reversal and butterfly per expiry."""
    return SkewResponse(**envelope(ccy, state), points=points(state.skew, SkewPoint))


@router.get("/term-structure", response_model=TermStructureResponse)
def get_iv_term_structure(ccy: CurrencyDep, state: StateDep) -> TermStructureResponse:
    """ATM implied-volatility term structure: one ATM IV per expiry."""
    return TermStructureResponse(
        **envelope(ccy, state),
        points=points(state.term_structure, TermStructurePoint),
    )
