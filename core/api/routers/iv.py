"""Implied-volatility routes: smile curves, skew, term structure and the archived smile."""

from __future__ import annotations

from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Query

from api import windows
from api.deps import CurrencyDep, StateDep
from api.responses import market, points
from api.schemas.iv import (
    IVCurvePoint,
    IVCurvesResponse,
    SkewPoint,
    SkewResponse,
    SmileHistoryResponse,
    TermStructurePoint,
    TermStructureResponse,
)
from api.windows import RecentWindow
from data.market.chain import prepare_otm_quotes
from data.storage import read, series

router = APIRouter(prefix="/iv", tags=["iv"])


@router.get("/curves", response_model=IVCurvesResponse)
def get_iv_curves(ccy: CurrencyDep, state: StateDep) -> IVCurvesResponse:
    """Implied-volatility smile curves: (strike, expiry) -> IV, one curve per expiry."""
    return market(
        IVCurvesResponse,
        ccy,
        state,
        points=points(state.otm_quotes, IVCurvePoint),
    )


@router.get("/smile-history", response_model=SmileHistoryResponse)
def get_smile_history(
    ccy: CurrencyDep,
    state: StateDep,
    expiry: datetime = Query(...),
    window: RecentWindow = Query("24h"),
) -> SmileHistoryResponse:
    """The smile for ``expiry`` as the service served it ``window`` ago.

    The archived book is restored and re-filtered through the same OTM quality gate as
    the live curves, priced off the spot stored with the capture. ``baseline_as_of``
    ``None`` with empty points means nothing that old is archived; an expiry that was
    not yet listed then simply yields no points.
    """
    target = state.as_of - windows.duration(window)
    baseline = series.baseline_snapshot(ccy, target)
    if baseline is None:
        return market(SmileHistoryResponse, ccy, state, expiry=expiry, window=window, points=[])

    snapshot_id, baseline_as_of, spot_ref = baseline
    quotes = prepare_otm_quotes(read.load_contracts(snapshot_id), spot_ref)
    return market(
        SmileHistoryResponse,
        ccy,
        state,
        expiry=expiry,
        window=window,
        baseline_as_of=baseline_as_of,
        baseline_stale=series.baseline_stale(baseline_as_of, target, windows.duration(window)),
        points=points(quotes[quotes["expiry"] == pd.Timestamp(expiry)], IVCurvePoint),
    )


@router.get("/skew", response_model=SkewResponse)
def get_iv_skew(ccy: CurrencyDep, state: StateDep) -> SkewResponse:
    """25Δ skew term structure: risk reversal and butterfly per expiry."""
    return market(SkewResponse, ccy, state, points=points(state.skew, SkewPoint))


@router.get("/term-structure", response_model=TermStructureResponse)
def get_iv_term_structure(ccy: CurrencyDep, state: StateDep) -> TermStructureResponse:
    """ATM implied-volatility term structure: one ATM IV per expiry."""
    return market(
        TermStructureResponse,
        ccy,
        state,
        points=points(state.term_structure, TermStructurePoint),
    )
