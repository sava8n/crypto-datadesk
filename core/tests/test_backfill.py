"""Backfill restores capture-time derived scalars from the archived book alone."""

from __future__ import annotations

from conftest import AS_OF, FORWARD, make_contracts
from data.market.state import MarketState
from data.storage.rows import DERIVED_SCALARS, derived_row


def test_derived_row_from_restored_book_matches_live_state(market_state):
    """A candle-free state - what the backfill builds - yields the same derived scalars
    as the fully hydrated state the recorder archived."""
    restored = MarketState(AS_OF, FORWARD, make_contracts(), None, None)
    assert derived_row(restored) == derived_row(market_state)


def test_derived_row_covers_every_column(market_state):
    row = derived_row(market_state)
    assert set(row) == set(DERIVED_SCALARS)
    assert all(value is not None for value in row.values())
