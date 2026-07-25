"""Health-check route."""

from __future__ import annotations

from fastapi import APIRouter

from schemas.health import HealthResponse
from storage import service as storage

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Always 200 - the archive being down does not make the API unhealthy."""
    return HealthResponse(status="ok", database=storage.status())
