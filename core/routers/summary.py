"""Dashboard summary route: spot, as-of and chain size."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Query

from schemas.summary import SummaryResponse
from shared.market_data import load_or_get_cached, validate_currency

router = APIRouter(tags=["summary"])


@router.get("/summary", response_model=SummaryResponse)
def get_summary(currency: str = Query("BTC")) -> SummaryResponse:
    """Lightweight market summary derived from the shared prepared-quote cache."""
    cur = validate_currency(currency)
    spot, prepared = load_or_get_cached(cur)
    return SummaryResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        instrument_count=len(prepared),
        expiry_count=int(prepared["expiry"].nunique()),
    )
