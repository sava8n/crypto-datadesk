"""Shared pieces of the response contract."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from api.windows import RecentWindow

OptionType = Literal["C", "P"]

DatabaseStatus = Literal["ok", "down"]

# earliest archived print; later than the window start means the tape truncates it
TapeStart = Annotated[datetime | None, Field(default=None)]


class CurrencyEnvelope(BaseModel):
    """Which book a response is about. Carried by every response but health."""

    currency: str


class MarketEnvelope(CurrencyEnvelope):
    """Which book, at what price, as of when - carried by every live-market response.

    ``as_of`` is the observation time, not the response time: a frozen value is how a
    client sees that the last good state is being served past a failed upstream fetch.
    """

    spot: float
    as_of: datetime


class BaselineEnvelope(MarketEnvelope):
    """A live-market response diffed against the archived book ``window`` ago."""

    window: RecentWindow
    baseline_as_of: datetime | None = None
    # the nearest archived snapshot missed the target window by more than half of it
    baseline_stale: bool = False


class SpanEnvelope(CurrencyEnvelope):
    """An archive-only response: the half-open interval it covers, echoed for the axis."""

    start: datetime
    end: datetime
