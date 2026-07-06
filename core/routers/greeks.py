"""Option-greeks route: per-contract delta, gamma, theta and vega across the OTM chain."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Query

from schemas.greeks import GreekChainPoint, GreeksChainResponse
from shared.market_data import load_otm_quotes, validate_currency
from greeks.chain import build_chain

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/greeks", tags=["greeks"])


@router.get("/chain", response_model=GreeksChainResponse)
def get_greeks_chain(currency: str = Query("BTC")) -> GreeksChainResponse:
    """All four Black-76 greeks per OTM contract across the chain."""
    cur = validate_currency(currency)
    spot, otm_quotes = load_otm_quotes(cur)

    # unique expiries (near-dated first) for selectors
    expiries = [pd.Timestamp(e).to_pydatetime() for e in sorted(otm_quotes["expiry"].unique())]

    frame = build_chain(otm_quotes)

    points = [
        GreekChainPoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            strike=float(row.strike),
            option_type=str(row.option_type),
            delta=float(row.delta),
            gamma=float(row.gamma),
            theta=float(row.theta),
            vega=float(row.vega),
        )
        for row in frame.itertuples(index=False)
    ]

    return GreeksChainResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        expiries=expiries,
        points=points,
    )
