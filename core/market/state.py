"""One consistent view of the market: the snapshot inputs plus the derived data graph.

The unfiltered book is the only chain input; the OTM and open-interest frames are
projections of it. Derived products compute on first access and are memoized for the
object's lifetime - one cache TTL window, so every endpoint serves the same numbers
and shared intermediates (greeks chain, term structure, etc.) are built once.
"""

from __future__ import annotations

from datetime import datetime
from functools import cached_property

import pandas as pd

from gex import by_strike as gex
from greeks.chain import build_chain
from iv import curves, skew as skew_mod, surface, term_structure as term
from oi import by_expiration, by_strike
from prob import curves as prob_mod, quantiles as prob_quantiles_mod
from shared.quotes import prepare_oi_chain, prepare_otm_quotes
from stats.dvol import dvol_stats
from stats.iv30 import atm_iv_at
from stats.realized import realized_vol
from volume import by_strike as volume


class MarketState:
    def __init__(
        self,
        as_of: datetime,
        spot: float,
        contracts: pd.DataFrame,
        spot_candles: dict | None,
        dvol_candles: list[list[float]] | None,
    ) -> None:
        self.as_of = as_of
        self.spot = spot
        self.contracts = contracts  # the book as sent; shared across requests, read-only
        self.spot_candles = spot_candles  # TradingView arrays, trailing year
        self.dvol_candles = dvol_candles  # [[ts_ms, o, h, l, c], …], trailing year

    # ---- chain projections ----

    @cached_property
    def otm_quotes(self) -> pd.DataFrame:
        return prepare_otm_quotes(self.contracts, self.spot)

    @cached_property
    def oi_chain(self) -> pd.DataFrame:
        return prepare_oi_chain(self.contracts, self.spot)

    # ---- shared intermediates ----

    @cached_property
    def greeks_chain(self) -> pd.DataFrame:
        return build_chain(self.otm_quotes)

    @cached_property
    def term_structure(self) -> pd.DataFrame:
        return term.build(self.otm_quotes)

    # ---- per-view products ----

    @cached_property
    def iv_surface(self) -> pd.DataFrame:
        return surface.build(self.otm_quotes)

    @cached_property
    def iv_curves(self) -> pd.DataFrame:
        return curves.build(self.otm_quotes)

    @cached_property
    def skew(self) -> pd.DataFrame:
        return skew_mod.build(self.otm_quotes)

    @cached_property
    def prob_curves(self) -> pd.DataFrame:
        return prob_mod.build(self.otm_quotes)

    @cached_property
    def prob_quantiles(self) -> pd.DataFrame:
        return prob_quantiles_mod.build(self.prob_curves)

    @cached_property
    def gex_by_strike(self) -> pd.DataFrame:
        return gex.build(self.greeks_chain, self.oi_chain)

    @cached_property
    def gex_flip(self) -> float | None:
        return gex.flip_level(self.gex_by_strike, self.spot)

    @cached_property
    def oi_by_expiration(self) -> pd.DataFrame:
        return by_expiration.build(self.oi_chain)

    def oi_by_strike(
        self, expiry: pd.Timestamp | None = None
    ) -> tuple[pd.DataFrame, dict[float, float], float | None]:
        """(grid, intrinsic value by strike, max pain) - intrinsic/max-pain are
        settlement analytics, so they exist only for a single-expiry slice."""
        chain = self.oi_chain
        intrinsic: dict[float, float] = {}
        max_pain: float | None = None
        if expiry is not None:
            chain = chain[chain["expiry"] == expiry]
            frame = by_strike.intrinsic_values(chain)
            intrinsic = dict(zip(frame["strike"], frame["intrinsic_value"]))
            max_pain = by_strike.max_pain(frame)
        return by_strike.build(chain), intrinsic, max_pain

    @cached_property
    def volume_by_strike(self) -> pd.DataFrame:
        return volume.build(self.oi_chain)

    # ---- expiry lists for selectors (near-dated first) ----

    @cached_property
    def otm_expiries(self) -> list:
        return [pd.Timestamp(e).to_pydatetime() for e in sorted(self.otm_quotes["expiry"].unique())]

    @cached_property
    def oi_expiries(self) -> list:
        return [pd.Timestamp(e).to_pydatetime() for e in sorted(self.oi_chain["expiry"].unique())]

    # ---- scalar stats ----

    @cached_property
    def iv30(self) -> float | None:
        return atm_iv_at(self.term_structure)

    @cached_property
    def _dvol_stats(self) -> tuple[float | None, float | None]:
        return dvol_stats(self.dvol_candles or [])

    @property
    def dvol(self) -> float | None:
        return self._dvol_stats[0]

    @property
    def dvol_rank(self) -> float | None:
        return self._dvol_stats[1]

    @cached_property
    def rv30(self) -> float | None:
        if not self.spot_candles or self.spot_candles.get("status") != "ok":
            return None
        return realized_vol([float(c) for c in self.spot_candles.get("close", [])])
