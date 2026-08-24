"""Tape-signed dealer inventory: the market state composed with the trade archive."""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from analytics.frames import finite
from analytics.positioning import exposure, inventory
from data.market.state import MarketState
from data.storage import flow


def signed_chain(
    ccy: str, state: MarketState
) -> tuple[pd.DataFrame, datetime | None, float | None]:
    """The tape-signed OI chain, the tape start backing it, and the OI share it explains."""
    inputs = flow.dealer_flow(ccy)
    chain, fraction = inventory.flow_signed_chain(
        state.oi_chain, inventory.net_flow_frame(inputs["rows"])
    )
    return chain, inputs["tape_start"], fraction


def gamma_scalars(state: MarketState, chain: pd.DataFrame) -> dict:
    """``gex_flip`` and ``gex_net_total`` for a tape-signed chain, finite-or-None."""
    per_strike = exposure.build(state.greeks_chain, chain, "gamma")
    net = per_strike["net_exposure"].sum() if not per_strike.empty else None
    return {
        "gex_flip": finite(exposure.flip_level(per_strike, state.spot)),
        "gex_net_total": finite(net),
    }


def tape_scalars(ccy: str, state: MarketState) -> dict:
    """The tape-signed archive scalars: gex pair plus ``oi_explained_fraction``."""
    chain, _, fraction = signed_chain(ccy, state)
    return gamma_scalars(state, chain) | {"oi_explained_fraction": finite(fraction)}
