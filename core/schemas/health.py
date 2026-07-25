"""Response models for health routes."""

from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    database: str  # "ok" | "down" | "disabled" - degraded persistence must not fail the check
