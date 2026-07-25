"""Request-scoped dependencies: the currency, and the market state it selects.

Every market route takes these two, so the validate-then-load preamble exists once and
state can be swapped instead of patching each router module by name.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, Query

from api.schemas.health import DatabaseStatus
from config import settings
from data.market.loader import load_market_state
from data.market.state import MarketState
from data.storage import service as storage

logger = logging.getLogger(__name__)


def currency(currency: str = Query("BTC")) -> str:
    """The requested currency, upper-cased; 422 when it is not a configured book."""
    ccy = currency.upper()
    if ccy not in settings.supported_currency_list:
        logger.warning("rejected unsupported currency=%s", ccy)
        supported = settings.supported_currency_list
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported currency '{currency}'. Supported: {supported}",
        )
    return ccy


CurrencyDep = Annotated[str, Depends(currency)]


def market_state(ccy: CurrencyDep) -> MarketState:
    """The cached market state for the requested currency."""
    return load_market_state(ccy)


StateDep = Annotated[MarketState, Depends(market_state)]


def database_status() -> DatabaseStatus:
    """Whether the storage db is reachable."""
    return storage.status()


DatabaseStatusDep = Annotated[DatabaseStatus, Depends(database_status)]
