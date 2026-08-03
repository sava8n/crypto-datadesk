"""Trade-flow routes: net taker flow and the raw tape. DB-only - no upstream fetch."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Query

from api import windows
from api.deps import CurrencyDep
from api.responses import records, spanned
from api.schemas.flow import (
    FlowByExpiryPoint,
    FlowByExpiryResponse,
    FlowByStrikePoint,
    FlowByStrikeResponse,
    TapePrint,
    TapeResponse,
)
from api.windows import RecentWindow
from data.storage import flow

router = APIRouter(prefix="/flow", tags=["flow"])


@router.get("/strike")
def get_flow_by_strike(
    ccy: CurrencyDep,
    window: RecentWindow = Query("24h"),
) -> FlowByStrikeResponse:
    """Net taker flow (buys - sells) per strike over the trailing window."""
    start, end = windows.span(window, ending=datetime.now(UTC))
    return spanned(
        FlowByStrikeResponse,
        ccy,
        start,
        end,
        window=window,
        tape_start=flow.tape_start(ccy),
        points=records(flow.net_flow_by_strike(ccy, start, end), FlowByStrikePoint),
    )


@router.get("/expiry")
def get_flow_by_expiry(
    ccy: CurrencyDep,
    window: RecentWindow = Query("24h"),
) -> FlowByExpiryResponse:
    """Net taker flow (buys - sells) per expiry over the trailing window."""
    start, end = windows.span(window, ending=datetime.now(UTC))
    return spanned(
        FlowByExpiryResponse,
        ccy,
        start,
        end,
        window=window,
        tape_start=flow.tape_start(ccy),
        points=records(flow.net_flow_by_expiry(ccy, start, end), FlowByExpiryPoint),
    )


@router.get("/tape")
def get_tape(
    ccy: CurrencyDep,
    limit: int = Query(50, ge=1, le=500),
    min_premium: float = Query(0.0, ge=0.0),
) -> TapeResponse:
    """The latest prints, newest first, optionally floored by USD premium."""
    return TapeResponse(
        currency=ccy,
        points=records(flow.recent_prints(ccy, limit, min_premium), TapePrint),
    )
