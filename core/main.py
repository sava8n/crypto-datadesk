"""FastAPI application entrypoint."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import errors
from api.routers.exposure import router as exposure_router
from api.routers.flow import router as flow_router
from api.routers.health import router as health_router
from api.routers.history import router as history_router
from api.routers.iv import router as iv_router
from api.routers.oi import router as oi_router
from api.routers.prob import router as prob_router
from api.routers.report import router as report_router
from api.routers.spot import router as spot_router
from api.routers.stats import router as stats_router
from api.routers.vol import router as vol_router
from api.routers.volume import router as volume_router
from config import VERSION, settings
from data.market.loader import warm_up as market_warm_up
from data.storage import service as storage
from log_config import setup_logging

setup_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # best-effort warm-up so the first request doesn't pay the upstream fetch
    await asyncio.to_thread(market_warm_up)
    # equally best-effort: an unreachable storage db logs and leaves the API serving
    tasks = await storage.start()
    yield
    await storage.stop(tasks)


server = FastAPI(
    title="Crypto Datadesk API",
    version=VERSION,
    description="REST analytics for crypto options (from Deribit).",
    lifespan=lifespan,
)

# before the middleware, so exception-handler responses still get CORS headers
errors.register(server)

server.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# registration order drives the tag order in /docs, so it follows the import order
for router in (
    exposure_router,
    flow_router,
    health_router,
    history_router,
    iv_router,
    oi_router,
    prob_router,
    report_router,
    spot_router,
    stats_router,
    vol_router,
    volume_router,
):
    server.include_router(router, prefix="/api")
