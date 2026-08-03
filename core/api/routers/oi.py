"""Open-interest routes: open interest by expiry, by strike, and its change."""

from __future__ import annotations

from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Query

from analytics.positioning import open_interest
from api import windows
from api.deps import CurrencyDep, StateDep
from api.responses import market, points
from api.schemas.oi import (
    MaxPainPoint,
    MaxPainResponse,
    OIByExpiryPoint,
    OIByExpiryResponse,
    OIByStrikePoint,
    OIByStrikeResponse,
    OIChangeByStrikePoint,
    OIChangeByStrikeResponse,
)
from api.windows import RecentWindow
from data.storage import series

router = APIRouter(prefix="/oi", tags=["oi"])

BASELINE_COLUMNS = ["strike", "option_type", "open_interest"]


@router.get("/expiry", response_model=OIByExpiryResponse)
def get_oi_by_expiry(ccy: CurrencyDep, state: StateDep) -> OIByExpiryResponse:
    """Per-expiry open interest split into ITM/OTM calls and puts."""
    return market(
        OIByExpiryResponse,
        ccy,
        state,
        points=points(state.oi_by_expiry, OIByExpiryPoint),
    )


@router.get("/strike", response_model=OIByStrikeResponse)
def get_oi_by_strike(
    ccy: CurrencyDep,
    state: StateDep,
    expiry: datetime | None = Query(None),
) -> OIByStrikeResponse:
    """Per-strike open interest split into ITM/OTM calls and puts.

    Without ``expiry`` the whole chain is grouped by strike. With ``expiry`` the chain is
    sliced to it and each point also carries its intrinsic value, alongside max pain.
    """
    grid, max_pain = state.oi_by_strike(expiry)
    return market(
        OIByStrikeResponse,
        ccy,
        state,
        expiries=state.oi_expiries,
        expiry=expiry,
        max_pain=max_pain,
        points=points(grid, OIByStrikePoint),
    )


@router.get("/max-pain", response_model=MaxPainResponse)
def get_max_pain_by_expiry(ccy: CurrencyDep, state: StateDep) -> MaxPainResponse:
    """Max-pain strike per expiry across the chain."""
    return market(
        MaxPainResponse,
        ccy,
        state,
        points=points(state.max_pain_by_expiry, MaxPainPoint),
    )


@router.get("/strike-change", response_model=OIChangeByStrikeResponse)
def get_oi_strike_change(
    ccy: CurrencyDep,
    state: StateDep,
    window: RecentWindow = Query("24h"),
    expiry: datetime | None = Query(None),
) -> OIChangeByStrikeResponse:
    """Per-strike open-interest change against the latest archived book at or before
    ``as_of - window``.

    ``baseline_as_of`` reports the baseline actually used; ``None`` with empty points
    means nothing that old is archived yet.
    """
    target = state.as_of - windows.duration(window)
    baseline = series.baseline_snapshot(ccy, target)
    if baseline is None:
        return market(
            OIChangeByStrikeResponse,
            ccy,
            state,
            window=window,
            expiries=state.oi_expiries,
            expiry=expiry,
            points=[],
        )

    snapshot_id, baseline_as_of, _spot = baseline
    then = pd.DataFrame(
        series.baseline_oi_by_strike(snapshot_id, expiry, state.as_of),
        columns=BASELINE_COLUMNS,
    )
    now = state.oi_chain
    if expiry is not None:
        now = now[now["expiry"] == pd.Timestamp(expiry)]
    return market(
        OIChangeByStrikeResponse,
        ccy,
        state,
        window=window,
        baseline_as_of=baseline_as_of,
        baseline_stale=series.baseline_stale(baseline_as_of, target, windows.duration(window)),
        expiries=state.oi_expiries,
        expiry=expiry,
        points=points(open_interest.strike_change(now, then), OIChangeByStrikePoint),
    )
