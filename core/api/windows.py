"""The time-span vocabulary the routes speak: duration tokens in, ``timedelta`` out.

Two aliases, because the admissible sets differ. ``RecentWindow`` sizes a trailing tape
aggregate or picks the archived book to diff against, so it is intraday-to-weekly;
``ArchiveWindow`` sizes a daily series and runs out to a year. Tokens stay in ``api``;
only ``timedelta`` crosses into ``data``.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal, NamedTuple

RecentWindow = Literal["24h", "7d"]
ArchiveWindow = Literal["7d", "30d", "90d", "1y"]

SPANS: dict[str, timedelta] = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
    "90d": timedelta(days=90),
    "1y": timedelta(days=365),
}


class Span(NamedTuple):
    start: datetime
    end: datetime


def duration(window: str) -> timedelta:
    """How far back ``window`` reaches."""
    return SPANS[window]


def span(window: str, *, ending: datetime) -> Span:
    """The half-open interval of length ``window`` ending at ``ending``."""
    return Span(ending - SPANS[window], ending)
