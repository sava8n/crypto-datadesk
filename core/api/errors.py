"""Domain errors to HTTP statuses."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from data.market.errors import UpstreamError


def register(app: FastAPI) -> None:
    @app.exception_handler(UpstreamError)
    async def _upstream_unavailable(request: Request, exc: UpstreamError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"detail": str(exc)})
