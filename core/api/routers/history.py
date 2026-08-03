"""History routes: archived scalar series. DB-only - no upstream fetch involved."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Query

from api import windows
from api.deps import CurrencyDep
from api.responses import records, spanned
from api.schemas.history import (
    CMBandPoint,
    CMBandsResponse,
    PositioningHistoryPoint,
    PositioningHistoryResponse,
    VolHistoryPoint,
    VolHistoryResponse,
)
from api.windows import ArchiveWindow
from data.storage import series
from data.storage.series import Resolution

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/vol")
def get_vol_history(
    ccy: CurrencyDep,
    window: ArchiveWindow = Query("90d"),
    resolution: Resolution = Query("1d"),
) -> VolHistoryResponse:
    """Constant-maturity ATM IV, 25Δ skew, DVOL and realized vol through time."""
    start, end = windows.span(window, ending=datetime.now(UTC))
    return spanned(
        VolHistoryResponse,
        ccy,
        start,
        end,
        resolution=resolution,
        points=records(series.vol_series(ccy, start, resolution), VolHistoryPoint),
    )


@router.get("/cm-bands")
def get_cm_bands(
    ccy: CurrencyDep,
    window: ArchiveWindow = Query("90d"),
) -> CMBandsResponse:
    """Percentile bands of the constant-maturity grid per tenor, daily-downsampled."""
    start, end = windows.span(window, ending=datetime.now(UTC))
    return spanned(
        CMBandsResponse,
        ccy,
        start,
        end,
        resolution="1d",
        points=records(series.cm_bands(ccy, start), CMBandPoint),
    )


@router.get("/positioning")
def get_positioning_history(
    ccy: CurrencyDep,
    window: ArchiveWindow = Query("90d"),
    resolution: Resolution = Query("1d"),
) -> PositioningHistoryResponse:
    """Open-interest totals, net GEX, gamma flip and front max pain through time."""
    start, end = windows.span(window, ending=datetime.now(UTC))
    return spanned(
        PositioningHistoryResponse,
        ccy,
        start,
        end,
        resolution=resolution,
        points=records(series.positioning_series(ccy, start, resolution), PositioningHistoryPoint),
    )
