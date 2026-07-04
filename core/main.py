"""FastAPI application entrypoint."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from log_config import setup_logging
from routers.health import router as health_router
from routers.iv import router as iv_router
from routers.greeks import router as greeks_router
from routers.summary import router as summary_router

setup_logging(settings.log_level)

server = FastAPI(
    title="Options Data API",
    version="1.0.0",
    description="REST analytics for BTC options (from Deribit).",
)

server.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

server.include_router(health_router, prefix="/api")
server.include_router(iv_router, prefix="/api")
server.include_router(greeks_router, prefix="/api")
server.include_router(summary_router, prefix="/api")
