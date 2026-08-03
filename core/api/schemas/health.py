"""Response model for the health route."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from api.schemas.base import DatabaseStatus


class HealthResponse(BaseModel):
    """Not currency-scoped: the only response outside ``CurrencyEnvelope``."""

    status: Literal["ok"]
    database: DatabaseStatus
