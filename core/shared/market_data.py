"""Shared request helpers."""

from __future__ import annotations

import logging

from fastapi import HTTPException

from config import settings
from clients import deribit
from clients.deribit import DeribitError

logger = logging.getLogger(__name__)


def validate_currency(currency: str) -> str:
    cur = currency.upper()
    if cur not in settings.supported_currency_list:
        logger.warning("rejected due to unsupported currency=%s", cur)
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported currency '{currency}'. Supported: {settings.supported_currency_list}",
        )
    return cur


def load_market_data(cur: str) -> tuple[float, list[dict]]:
    try:
        spot = deribit.fetch_spot(cur)
        summaries = deribit.fetch_option_summaries(cur)
    except DeribitError as exc:
        logger.warning("cannot fetch upstream data for currency=%s, %s", cur, exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return spot, summaries
