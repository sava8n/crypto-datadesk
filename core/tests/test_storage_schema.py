"""The archive schema against the frame contract it stores."""

from __future__ import annotations

from data.market.chain import CONTRACT_COLUMNS
from data.storage import rows, schema
from data.storage.rows import CONTRACT_ROW_COLUMNS


def test_contract_table_holds_every_frame_column():
    missing = [c for c in CONTRACT_COLUMNS if c not in schema.contract.c]
    assert missing == []


def test_contract_table_holds_nothing_else():
    """Only the foreign key may be extra - anything more would be written by nobody."""
    extra = set(schema.contract.c.keys()) - set(CONTRACT_COLUMNS)
    assert extra == {"snapshot_id"}


def test_written_row_keys_match_the_table():
    assert set(CONTRACT_ROW_COLUMNS) == set(schema.contract.c.keys())


def test_snapshot_holds_the_cached_scalars_inline():
    """Folded in from the old 1:1 side table; a join for nullable floats bought nothing."""
    assert "snapshot_summary" not in schema.metadata.tables
    for column in ("iv30", "rv30", "iv7", "rv7", "dvol", "dvol_rank", "gex_flip"):
        assert column in schema.snapshot.c


def test_snapshot_row_keys_match_the_table(market_state):
    """Only the generated columns may be absent - anything else is a column nobody writes."""
    tape = dict.fromkeys(("gex_flip", "gex_net_total", "oi_explained_fraction"))
    written = set(rows.snapshot_row(market_state, "BTC", tape))
    assert written <= set(schema.snapshot.c.keys())
    assert set(schema.snapshot.c.keys()) - written == {"id", "recorded_at"}


def _indexed(table) -> set[tuple[str, ...]]:
    return {tuple(index.columns.keys()) for index in table.indexes}


def test_retention_predicates_are_indexed():
    """All four sweep predicates, each of which scans a whole table without an index.

    A composite key led by another column cannot serve a scan on the delete predicate
    alone, so ``snapshot`` and ``expiry_outcome`` each need a standalone index.
    """
    assert ("as_of",) in _indexed(schema.snapshot)
    assert ("ts",) in _indexed(schema.trade)
    assert ("expiry",) in _indexed(schema.expiry_outcome)
    # contracts are deleted by snapshot_id, which leads the primary key
    assert next(iter(schema.contract.primary_key.columns.keys())) == "snapshot_id"


def test_contract_carries_no_denormalized_as_of():
    """Dropped with the chunked sweep: once retention keys on snapshot_id nothing read it."""
    assert "as_of" not in schema.contract.c


def test_market_report_columns():
    expected = {
        "id",
        "generated_at",
        "model",
        "prompt_tokens",
        "completion_tokens",
        "cost_usd",
        "payload",
    }
    assert set(schema.market_report.c.keys()) == expected


def test_market_report_listing_scan_is_indexed():
    assert ("generated_at",) in _indexed(schema.market_report)
