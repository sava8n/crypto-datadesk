"""Response model for the dashboard summary route."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SummaryResponse(BaseModel):
    currency: str
    spot: float
    as_of: datetime
    instrument_count: int  # surviving OTM quotes in the chain
    expiry_count: int  # distinct expiries among those quotes
