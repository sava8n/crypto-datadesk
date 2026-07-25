"""Health-check route."""

from __future__ import annotations

from fastapi import APIRouter

from api.deps import DatabaseStatusDep
from api.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(database: DatabaseStatusDep) -> HealthResponse:
    return HealthResponse(status="ok", database=database)
