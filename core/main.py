"""FastAPI application entrypoint."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from log_config import setup_logging
from market.loader import warm_up as market_warm_up
from routers.health import router as health_router
from routers.iv import router as iv_router
from routers.greeks import router as greeks_router
from routers.gex import router as gex_router
from routers.oi import router as oi_router
from routers.prob import router as prob_router
from routers.volume import router as volume_router
from routers.spot import router as spot_router
from routers.stats import router as stats_router

setup_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # best-effort warm-up so the first request doesn't pay the upstream fetch
    await asyncio.to_thread(market_warm_up)
    yield


server = FastAPI(
    title="Crypto Datadesk API",
    version="0.0.2",
    description="REST analytics for crypto options (from Deribit).",
    lifespan=lifespan,
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
server.include_router(gex_router, prefix="/api")
server.include_router(oi_router, prefix="/api")
server.include_router(prob_router, prefix="/api")
server.include_router(volume_router, prefix="/api")
server.include_router(spot_router, prefix="/api")
server.include_router(stats_router, prefix="/api")
