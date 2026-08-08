"""The report payload contract the model must return.

Structural only: shape and enums, no length caps or citation cross-checks.
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel

Importance = Literal["high", "med", "low"]
ReferenceRole = Literal["citation", "further_reading"]


class Reference(BaseModel):
    id: int
    title: str
    url: str
    note: str
    role: ReferenceRole


class CalendarEvent(BaseModel):
    date: date
    # "HH:MM" 24h UTC; null for all-day events
    time_utc: str | None = None
    title: str
    note: str
    importance: Importance


class ReportPayload(BaseModel):
    headline: str
    standfirst: str
    body_md: str
    references: list[Reference]
    calendar: list[CalendarEvent]
