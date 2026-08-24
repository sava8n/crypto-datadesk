"""Response models for the archive-backed history routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from api.schemas.base import SpanEnvelope
from data.storage.series import Resolution


class HistoryEnvelope(SpanEnvelope):
    """Archive-backed series: the queried window, no live spot, no upstream dependency."""

    resolution: Resolution


class VolHistoryPoint(BaseModel):
    as_of: datetime
    spot: float
    iv7: float | None = None
    iv30: float | None = None
    term_slope: float | None = None  # iv30 - iv7
    rv7: float | None = None
    rv30: float | None = None
    dvol: float | None = None
    rr25_7: float | None = None
    bf25_7: float | None = None
    rr25_30: float | None = None
    bf25_30: float | None = None


class VolHistoryResponse(HistoryEnvelope):
    points: list[VolHistoryPoint]


class PositioningHistoryPoint(BaseModel):
    as_of: datetime
    spot: float
    oi_total_calls: float | None = None
    oi_total_puts: float | None = None
    gex_net_total: float | None = None
    gex_flip: float | None = None
    max_pain_front: float | None = None
    oi_explained_fraction: float | None = None


class PositioningHistoryResponse(HistoryEnvelope):
    points: list[PositioningHistoryPoint]


class CMBandPoint(BaseModel):
    tenor_days: float
    atm_iv_p25: float | None = None
    atm_iv_p50: float | None = None
    atm_iv_p75: float | None = None
    rr25_p25: float | None = None
    rr25_p50: float | None = None
    rr25_p75: float | None = None
    bf25_p25: float | None = None
    bf25_p50: float | None = None
    bf25_p75: float | None = None
    # daily atm_iv observations behind the percentiles
    count: int


class CMBandsResponse(HistoryEnvelope):
    points: list[CMBandPoint]
