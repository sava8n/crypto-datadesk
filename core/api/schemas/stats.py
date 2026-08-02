"""Response model for the market stats route."""

from __future__ import annotations

from api.schemas.base import MarketEnvelope


class StatsResponse(MarketEnvelope):
    dvol: float | None  # 30d DVOL index as a decimal (0.38 = index 38)
    dvol_rank: float | None  # last close's position in the trailing-year range, [0, 1]
    iv30: float | None  # 30d constant-maturity ATM IV
    rv30: float | None  # 30d close-to-close realized vol, annualized
    # percentile of iv30 among the trailing year's archived daily observations
    iv30_percentile: float | None = None
