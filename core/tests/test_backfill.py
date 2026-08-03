"""Backfill restores capture-time derived scalars from the archived book alone."""

from __future__ import annotations

from conftest import AS_OF, FORWARD, make_contracts
from data.market.state import MarketState
from data.storage.rows import DERIVED_SCALARS, cm_rows, derived_row


def test_derived_row_from_restored_book_matches_live_state(market_state):
    """A candle-free state - what the backfill builds - yields the same derived scalars
    as the fully hydrated state the recorder archived."""
    restored = MarketState(AS_OF, FORWARD, make_contracts(), None, None)
    assert derived_row(restored) == derived_row(market_state)


def test_cm_rows_from_restored_book_match_live_state(market_state):
    restored = MarketState(AS_OF, FORWARD, make_contracts(), None, None)
    assert cm_rows(restored, 1) == cm_rows(market_state, 1)


def test_derived_row_covers_every_column(market_state):
    row = derived_row(market_state)
    assert set(row) == set(DERIVED_SCALARS)
    # gex_flip alone is nullable by contract: a chain whose cumulative net gamma never
    # crosses zero has no flip level, which is this fixture's case
    assert {name for name, value in row.items() if value is None} <= {"gex_flip"}
