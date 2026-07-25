"""Shared pieces of the response contract."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

OptionType = Literal["C", "P"]


class MarketEnvelope(BaseModel):
    """Which book, at what price, as of when - carried by every market response.

    ``as_of`` is the observation time, not the response time: when upstream is down the
    service serves the last good state, and a frozen ``as_of`` is how a client sees that.
    """

    currency: str
    spot: float
    as_of: datetime
