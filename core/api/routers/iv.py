"""Implied-volatility routes: surface, smile curves, skew, term structure and the
archived smile."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Query

from api.deps import CurrencyDep, StateDep
from api.responses import envelope, points
from api.schemas.iv import (
    IVCurvePoint,
    IVCurvesResponse,
    IVSurfacePoint,
    IVSurfaceResponse,
    SkewPoint,
    SkewResponse,
    SmileHistoryResponse,
    TermStructurePoint,
    TermStructureResponse,
)
from data.market.chain import prepare_otm_quotes
from data.storage import read, series

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


@router.get("/smile-history", response_model=SmileHistoryResponse)
def get_smile_history(
    ccy: CurrencyDep,
    state: StateDep,
    expiry: datetime = Query(...),
    window: Literal["24h", "7d"] = Query("24h"),
) -> SmileHistoryResponse:
    """The smile for ``expiry`` as the service served it ``window`` ago.

    The archived book is restored and re-filtered through the same OTM quality gate as
    the live curves, priced off the spot stored with the capture. ``baseline_as_of``
    ``None`` with empty points means nothing that old is archived; an expiry that was
    not yet listed then simply yields no points.
    """
    target = state.as_of - series.WINDOWS[window]
    baseline = series.baseline_snapshot(ccy, target)
    if baseline is None:
        return SmileHistoryResponse(
            **envelope(ccy, state), expiry=expiry, window=window, points=[]
        )

    snapshot_id, baseline_as_of, spot_then = baseline
    quotes = prepare_otm_quotes(read.load_contracts(snapshot_id), spot_then)
    return SmileHistoryResponse(
        **envelope(ccy, state),
        expiry=expiry,
        window=window,
        baseline_as_of=baseline_as_of,
        baseline_stale=series.baseline_stale(baseline_as_of, target, series.WINDOWS[window]),
        points=points(quotes[quotes["expiry"] == pd.Timestamp(expiry)], IVCurvePoint),
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
