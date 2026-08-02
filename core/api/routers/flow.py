"""Trade-flow routes: net taker flow and the raw tape. DB-only - no upstream fetch."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Query

from api.deps import CurrencyDep
from api.responses import records
from api.schemas.flow import (
    FlowByExpirationResponse,
    FlowByStrikeResponse,
    FlowExpirationPoint,
    FlowStrikePoint,
    TapePrint,
    TapeResponse,
)
from data.storage import flow, series

router = APIRouter(prefix="/flow", tags=["flow"])


def _window(window: str) -> tuple[datetime, datetime]:
    end = datetime.now(UTC)
    return end - series.WINDOWS[window], end


@router.get("/strike", response_model=FlowByStrikeResponse)
def get_flow_by_strike(
    ccy: CurrencyDep,
    window: Literal["24h", "7d"] = Query("24h"),
) -> FlowByStrikeResponse:
    """Net taker flow (buys - sells) per strike over the trailing window."""
    start, end = _window(window)
    return FlowByStrikeResponse(
        currency=ccy,
        window=window,
        start=start,
        end=end,
        points=records(flow.net_flow_by_strike(ccy, start, end), FlowStrikePoint),
    )


@router.get("/expiration", response_model=FlowByExpirationResponse)
def get_flow_by_expiration(
    ccy: CurrencyDep,
    window: Literal["24h", "7d"] = Query("24h"),
) -> FlowByExpirationResponse:
    """Net taker flow (buys - sells) per expiry over the trailing window."""
    start, end = _window(window)
    return FlowByExpirationResponse(
        currency=ccy,
        window=window,
        start=start,
        end=end,
        points=records(flow.net_flow_by_expiry(ccy, start, end), FlowExpirationPoint),
    )


@router.get("/tape", response_model=TapeResponse)
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
