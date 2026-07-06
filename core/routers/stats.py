"""Market stats route: spot, DVOL (+rank) and 30-day implied vs realized vol."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Query

from schemas.stats import StatsResponse
from shared.market_data import (
    load_dvol_history,
    load_otm_quotes,
    load_spot_candles,
    validate_currency,
)
from iv import term_structure
from stats.dvol import dvol_stats
from stats.iv30 import atm_iv_at
from stats.realized import realized_vol

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
def get_stats(currency: str = Query("BTC")) -> StatsResponse:
    """Stats: spot, DVOL with its trailing-year rank, 30d ATM IV vs realized vol."""
    cur = validate_currency(currency)
    spot, otm_quotes = load_otm_quotes(cur)
    dvol, dvol_rank = dvol_stats(load_dvol_history(cur))

    spot_candles = load_spot_candles(cur)
    closes = [float(c) for c in spot_candles.get("close", [])] if spot_candles.get("status") == "ok" else []

    return StatsResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        dvol=dvol,
        dvol_rank=dvol_rank,
        iv30=atm_iv_at(term_structure.build(otm_quotes)),
        rv30=realized_vol(closes),
    )
