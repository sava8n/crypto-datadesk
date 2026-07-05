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
def get_greeks_chain(
    currency: str = Query("BTC"),
    expiry: datetime | None = Query(None),
) -> GreeksChainResponse:
    """All four Black-76 greeks per OTM contract, optionally sliced to one expiry."""
    cur = validate_currency(currency)
    spot, otm_quotes = load_otm_quotes(cur)

    # full expiry list (pre-filter) so selectors always have every option.
    expiries = [pd.Timestamp(e).to_pydatetime() for e in sorted(otm_quotes["expiry"].unique())]

    quotes = otm_quotes
    if expiry is not None:
        quotes = otm_quotes[otm_quotes["expiry"] == pd.Timestamp(expiry)]

    frame = build_chain(quotes)

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
        expiry=expiry,
        points=points,
    )
