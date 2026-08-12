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

from analytics import greeks
from analytics.frames import finite
from analytics.iv import term
from analytics.iv.skew import build as build_skew
from analytics.positioning import exposure, open_interest, traded_volume
from analytics.prob import distribution, quantiles
from analytics.stats import atm_iv_at, cm_grid, dvol_stats, realized_vol, skew_at
from analytics.vol import cone
from data.market import history
from data.market.chain import prepare_oi_chain, prepare_otm_quotes


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
        self.spot_candles = spot_candles
        self.dvol_candles = dvol_candles
        self._exposure: dict[str, pd.DataFrame] = {}

    @cached_property
    def otm_quotes(self) -> pd.DataFrame:
        return prepare_otm_quotes(self.contracts, self.spot)

    @cached_property
    def oi_chain(self) -> pd.DataFrame:
        return prepare_oi_chain(self.contracts, self.spot)

    @cached_property
    def greeks_chain(self) -> pd.DataFrame:
        return greeks.build(self.otm_quotes)

    @cached_property
    def term_structure(self) -> pd.DataFrame:
        return term.build(self.otm_quotes)

    @cached_property
    def skew(self) -> pd.DataFrame:
        return build_skew(self.otm_quotes, self.term_structure)

    @cached_property
    def prob_curves(self) -> pd.DataFrame:
        return distribution.build(self.otm_quotes)

    @cached_property
    def prob_quantiles(self) -> pd.DataFrame:
        return quantiles.build(self.prob_curves)

    def exposure(self, greek: str) -> pd.DataFrame:
        """Per-strike dollar exposure to ``greek``; memoized per greek, like the properties."""
        if greek not in self._exposure:
            self._exposure[greek] = exposure.build(self.greeks_chain, self.oi_chain, greek)
        return self._exposure[greek]

    @cached_property
    def gex_flip(self) -> float | None:
        return finite(exposure.flip_level(self.exposure("gamma"), self.spot))

    @cached_property
    def oi_by_expiry(self) -> pd.DataFrame:
        return open_interest.by_expiry(self.oi_chain)

    @cached_property
    def max_pain_by_expiry(self) -> pd.DataFrame:
        return open_interest.max_pain_by_expiry(self.oi_chain)

    def oi_by_strike(self, expiry: datetime | None = None) -> tuple[pd.DataFrame, float | None]:
        """Open interest per strike, and the max-pain strike.

        Intrinsic value and max pain are settlement analytics, so they come back only for
        a single-expiry slice; over the whole chain the column is absent and max pain is
        ``None``.
        """
        if expiry is None:
            return open_interest.by_strike(self.oi_chain), None
        slice_ = self.oi_chain[self.oi_chain["expiry"] == pd.Timestamp(expiry)]
        return open_interest.with_settlement(slice_)

    @cached_property
    def volume_by_strike(self) -> pd.DataFrame:
        return traded_volume.build(self.oi_chain)

    @cached_property
    def spot_history(self) -> pd.DataFrame:
        """Daily spot candles; empty when no usable payload was fetched."""
        return history.to_frame(self.spot_candles)

    @cached_property
    def rv_cone(self) -> pd.DataFrame:
        return cone.build(self.spot_history["close"].tolist())

    @cached_property
    def otm_expiries(self) -> list:
        return [pd.Timestamp(e).to_pydatetime() for e in sorted(self.otm_quotes["expiry"].unique())]

    @cached_property
    def oi_expiries(self) -> list:
        return [pd.Timestamp(e).to_pydatetime() for e in sorted(self.oi_chain["expiry"].unique())]

    # the scalars below go through finite(): numpy returns NaN instead of raising, and
    # "could not be computed" has to reach the caller as None

    @cached_property
    def iv30(self) -> float | None:
        return finite(atm_iv_at(self.term_structure))

    @cached_property
    def iv7(self) -> float | None:
        return finite(atm_iv_at(self.term_structure, days=7.0))

    @cached_property
    def _skew_cm7(self) -> tuple[float | None, float | None]:
        rr, bf = skew_at(self.skew, days=7.0)
        return finite(rr), finite(bf)

    @cached_property
    def _skew_cm30(self) -> tuple[float | None, float | None]:
        rr, bf = skew_at(self.skew, days=30.0)
        return finite(rr), finite(bf)

    @property
    def rr25_7(self) -> float | None:
        return self._skew_cm7[0]

    @property
    def bf25_7(self) -> float | None:
        return self._skew_cm7[1]

    @property
    def rr25_30(self) -> float | None:
        return self._skew_cm30[0]

    @property
    def bf25_30(self) -> float | None:
        return self._skew_cm30[1]

    @cached_property
    def oi_total_calls(self) -> float | None:
        chain = self.oi_chain
        return finite(chain.loc[chain["option_type"] == "C", "open_interest"].sum())

    @cached_property
    def oi_total_puts(self) -> float | None:
        chain = self.oi_chain
        return finite(chain.loc[chain["option_type"] == "P", "open_interest"].sum())

    @cached_property
    def max_pain_front(self) -> float | None:
        expiries = self.oi_expiries
        if not expiries:
            return None
        return finite(self.oi_by_strike(expiries[0])[1])

    @cached_property
    def gex_net_total(self) -> float | None:
        gex = self.exposure("gamma")
        if gex.empty:
            return None
        return finite(gex["net_exposure"].sum())

    @cached_property
    def cm_grid(self) -> pd.DataFrame:
        return cm_grid(self.term_structure, self.skew)

    @cached_property
    def _dvol_stats(self) -> tuple[float | None, float | None]:
        dvol, rank = dvol_stats(self.dvol_candles or [])
        return finite(dvol), finite(rank)

    @property
    def dvol(self) -> float | None:
        return self._dvol_stats[0]

    @property
    def dvol_rank(self) -> float | None:
        return self._dvol_stats[1]

    @cached_property
    def _closes(self) -> list[float]:
        return self.spot_history["close"].tolist()

    @cached_property
    def rv30(self) -> float | None:
        return finite(realized_vol(self._closes)) if self._closes else None

    @cached_property
    def rv7(self) -> float | None:
        return finite(realized_vol(self._closes, days=7)) if self._closes else None
