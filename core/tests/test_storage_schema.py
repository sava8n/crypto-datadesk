"""The archive schema against the frame contract it stores."""

from __future__ import annotations

from data.market.chain import CONTRACT_COLUMNS
from data.storage import schema
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
    """Folded in from the old 1:1 side table; a join for five nullable floats bought nothing."""
    assert "snapshot_summary" not in schema.metadata.tables
    for column in ("iv30", "rv30", "dvol", "dvol_rank", "gex_flip"):
        assert column in schema.snapshot.c


def test_retention_predicates_are_indexed():
    """The sweep deletes snapshots on as_of and contracts on snapshot_id."""
    snapshot_indexed = {tuple(i.columns.keys()) for i in schema.snapshot.indexes}
    assert ("as_of",) in snapshot_indexed
    # contracts are deleted by snapshot_id, which leads the primary key
    assert list(schema.contract.primary_key.columns.keys())[0] == "snapshot_id"


def test_contract_carries_no_denormalized_as_of():
    """Dropped with the chunked sweep: once retention keys on snapshot_id nothing read it."""
    assert "as_of" not in schema.contract.c
