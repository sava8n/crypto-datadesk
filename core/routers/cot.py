"""COT routes: latest-report summary, positioning history and the COT index."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from cot import report as report_mod
from cot.fields import CATEGORIES
from cot.index import METHODS, WINDOWS
from cot.loader import load_cot_state
from cot.values import opt_float
from schemas.cot import (
    CotHistoryPoint,
    CotHistoryResponse,
    CotIndexPoint,
    CotIndexResponse,
    CotReportResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cot", tags=["cot"])


def _validate_window(window: int) -> int:
    if window not in WINDOWS:
        logger.warning("rejected due to unsupported window=%s", window)
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported window '{window}'. Supported: {sorted(WINDOWS)}",
        )
    return window


def _validate_method(method: str) -> str:
    if method not in METHODS:
        logger.warning("rejected due to unsupported method=%s", method)
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported method '{method}'. Supported: {list(METHODS)}",
        )
    return method


@router.get("/report", response_model=CotReportResponse)
def get_cot_report(
    window: int = Query(52), method: str = Query("rank")
) -> CotReportResponse:
    """Latest TFF report vs the previous one, per participant category (BTC-equivalent)."""
    win = _validate_window(window)
    mtd = _validate_method(method)
    state = load_cot_state()
    payload = report_mod.build(
        state.history,
        state.index(win, mtd),
        state.weekly_prices,
        now=pd.Timestamp.now(tz="UTC").tz_localize(None),
    )
    return CotReportResponse(
        as_of=datetime.now(timezone.utc),
        window=win,
        method=mtd,
        micro_included_from=state.micro_included_from,
        **payload,
    )


@router.get("/history", response_model=CotHistoryResponse)
def get_cot_history() -> CotHistoryResponse:
    """Full weekly history of net positioning per category with aligned BTC closes."""
    state = load_cot_state()
    prices = state.weekly_prices

    points = []
    for date, row in state.history.iterrows():
        point = {
            "report_date": date,
            "oi_btc": float(row["oi"]),
            "price": opt_float(prices.loc[date]),
        }
        for cat in CATEGORIES:
            point[f"{cat}_net"] = float(row[f"{cat}_net"])
            point[f"{cat}_delta"] = opt_float(row[f"{cat}_delta"])
        points.append(CotHistoryPoint(**point))

    return CotHistoryResponse(
        as_of=datetime.now(timezone.utc),
        micro_included_from=state.micro_included_from,
        price_from=state.price_from,
        points=points,
    )


@router.get("/index", response_model=CotIndexResponse)
def get_cot_index(
    window: int = Query(52), method: str = Query("rank")
) -> CotIndexResponse:
    """Rolling COT index (0-100, min-max or rank) per participant category."""
    win = _validate_window(window)
    mtd = _validate_method(method)
    state = load_cot_state()

    points = [
        CotIndexPoint(
            report_date=date,
            **{cat: opt_float(row[cat]) for cat in CATEGORIES},
        )
        for date, row in state.index(win, mtd).iterrows()
    ]

    return CotIndexResponse(
        as_of=datetime.now(timezone.utc), window=win, method=mtd, points=points
    )
