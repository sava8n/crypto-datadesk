"""Option-greeks routes: per-contract delta, gamma, theta, vega vs strike."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from schemas.greeks import GreekPoint, GreeksResponse
from shared.market_data import load_market_data, validate_currency
from greeks.chain import build_greek

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/greeks", tags=["greeks"])


def _greek_response(greek: str, currency: str) -> GreeksResponse:
    cur = validate_currency(currency)
    spot, summaries = load_market_data(cur)

    frame = build_greek(summaries, spot, greek)
    points = [
        GreekPoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            strike=float(row.strike),
            value=float(row.value),
            option_type=str(row.option_type),
        )
        for row in frame.itertuples(index=False)
    ]

    return GreeksResponse(
        currency=cur,
        spot=spot,
        greek=greek,
        as_of=datetime.now(timezone.utc),
        points=points,
    )


@router.get("/delta", response_model=GreeksResponse)
def get_delta(currency: str = Query("BTC")) -> GreeksResponse:
    """Per-contract Black-76 delta across the OTM chain, keyed by (strike, expiry)."""
    return _greek_response("delta", currency)


@router.get("/gamma", response_model=GreeksResponse)
def get_gamma(currency: str = Query("BTC")) -> GreeksResponse:
    """Per-contract Black-76 gamma (per $1) across the OTM chain, keyed by (strike, expiry)."""
    return _greek_response("gamma", currency)


@router.get("/theta", response_model=GreeksResponse)
def get_theta(currency: str = Query("BTC")) -> GreeksResponse:
    """Per-contract Black-76 theta (per day) across the OTM chain, keyed by (strike, expiry)."""
    return _greek_response("theta", currency)


@router.get("/vega", response_model=GreeksResponse)
def get_vega(currency: str = Query("BTC")) -> GreeksResponse:
    """Per-contract Black-76 vega (per vol-point) across the OTM chain, keyed by (strike, expiry)."""
    return _greek_response("vega", currency)
