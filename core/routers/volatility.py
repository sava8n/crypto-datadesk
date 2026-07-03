"""Implied-volatility routes: surface and smile curves."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from config import settings
from schemas.volatility import (
    CurvePoint,
    IVCurvesResponse,
    IVSurfaceResponse,
    SurfacePoint,
)
from clients import deribit
from clients.deribit import DeribitError
from volatility import iv_curves, iv_surface

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iv", tags=["volatility"])


def _validate_currency(currency: str) -> str:
    """Normalize ``currency`` to upper case, raising 422 if it is unsupported."""
    cur = currency.upper()
    if cur not in settings.supported_currency_list:
        logger.warning("rejected due to unsupported currency=%s", cur)
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported currency '{currency}'. Supported: {settings.supported_currency_list}",
        )
    return cur


def _load_market_data(cur: str) -> tuple[float, list[dict]]:
    """Fetch spot + option summaries for ``cur``, raising 502 on upstream failure."""
    try:
        spot = deribit.fetch_spot(cur)
        summaries = deribit.fetch_option_summaries(cur)
    except DeribitError as exc:
        logger.warning("cannot fetch upstream data for currency=%s, %s", cur, exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return spot, summaries


@router.get("/surface", response_model=IVSurfaceResponse)
def get_iv_surface(currency: str = Query("BTC")) -> IVSurfaceResponse:
    """BTC options implied-volatility surface: (delta, expiry) -> IV, plus axis ticks."""
    cur = _validate_currency(currency)
    spot, summaries = _load_market_data(cur)

    grid = iv_surface.build_surface(summaries, spot)

    points = [
        SurfacePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            delta=float(row.delta),
            mark_iv=float(row.mark_iv),
            option_type=str(row.option_type),
        )
        for row in grid.itertuples(index=False)
    ]

    return IVSurfaceResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        points=points,
    )


@router.get("/curves", response_model=IVCurvesResponse)
def get_iv_curves(currency: str = Query("BTC")) -> IVCurvesResponse:
    """BTC options implied-volatility smile curves: (strike, expiry) -> IV, one curve per expiry."""
    cur = _validate_currency(currency)
    spot, summaries = _load_market_data(cur)

    grid = iv_curves.build_curves(summaries, spot)

    points = [
        CurvePoint(
            expiry=row.expiry.to_pydatetime(),
            tte_years=float(row.tte_years),
            strike=float(row.strike),
            mark_iv=float(row.mark_iv),
            option_type=str(row.option_type),
        )
        for row in grid.itertuples(index=False)
    ]

    return IVCurvesResponse(
        currency=cur,
        spot=spot,
        as_of=datetime.now(timezone.utc),
        points=points,
    )
