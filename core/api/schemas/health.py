"""Response model for the health route."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

DatabaseStatus = Literal["ok", "down"]


class HealthResponse(BaseModel):
    status: str
    database: DatabaseStatus
