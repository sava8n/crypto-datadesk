"""History routes: archived scalar series. DB-only - no upstream fetch involved."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Query

from api.deps import CurrencyDep
from api.responses import records
from api.schemas.history import (
    CMBandPoint,
    CMBandsResponse,
    PositioningHistoryPoint,
    PositioningHistoryResponse,
    VolHistoryPoint,
    VolHistoryResponse,
)
from data.storage import series

router = APIRouter(prefix="/history", tags=["history"])


def _window(lookback_days: int) -> tuple[datetime, datetime]:
    end = datetime.now(UTC)
    return end - timedelta(days=lookback_days), end


@router.get("/vol", response_model=VolHistoryResponse)
def get_vol_history(
    ccy: CurrencyDep,
    lookback_days: int = Query(90, ge=1, le=365),
    resolution: Literal["1h", "1d"] = Query("1d"),
) -> VolHistoryResponse:
    """Constant-maturity ATM IV, 25Δ skew, DVOL and realized vol through time."""
    start, end = _window(lookback_days)
    return VolHistoryResponse(
        currency=ccy,
        start=start,
        end=end,
        resolution=resolution,
        points=records(series.vol_series(ccy, start, resolution), VolHistoryPoint),
    )


@router.get("/cm-bands", response_model=CMBandsResponse)
def get_cm_bands(
    ccy: CurrencyDep,
    lookback_days: int = Query(90, ge=1, le=365),
) -> CMBandsResponse:
    """Percentile bands of the constant-maturity grid per tenor, daily-downsampled."""
    start, end = _window(lookback_days)
    return CMBandsResponse(
        currency=ccy,
        start=start,
        end=end,
        resolution="1d",
        points=records(series.cm_bands(ccy, start), CMBandPoint),
    )


@router.get("/positioning", response_model=PositioningHistoryResponse)
def get_positioning_history(
    ccy: CurrencyDep,
    lookback_days: int = Query(90, ge=1, le=365),
    resolution: Literal["1h", "1d"] = Query("1d"),
) -> PositioningHistoryResponse:
    """Open-interest totals, net GEX, gamma flip and front max pain through time."""
    start, end = _window(lookback_days)
    return PositioningHistoryResponse(
        currency=ccy,
        start=start,
        end=end,
        resolution=resolution,
        points=records(series.positioning_series(ccy, start, resolution), PositioningHistoryPoint),
    )
