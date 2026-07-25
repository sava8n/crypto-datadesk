"""Relational schema for the snapshot archive.

``contract`` is the book as Deribit sent it - no quality, moneyness or open-interest
filter - so any derived product can be replayed over the retained window.
``snapshot_summary`` caches scalars that are recomputable from it.
"""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    MetaData,
    PrimaryKeyConstraint,
    String,
    Table,
    UniqueConstraint,
    func,
)

metadata = MetaData()

snapshot = Table(
    "snapshot",
    metadata,
    Column("id", BigInteger, primary_key=True, autoincrement=True),
    Column("currency", String(16), nullable=False),
    Column("as_of", DateTime(timezone=True), nullable=False),
    Column("spot", Float, nullable=False),
    Column("recorded_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    UniqueConstraint("currency", "as_of", name="uq_snapshot_currency_as_of"),
)

Index("ix_snapshot_currency_as_of", snapshot.c.currency, snapshot.c.as_of.desc())

contract = Table(
    "contract",
    metadata,
    Column("snapshot_id", BigInteger, ForeignKey("snapshot.id", ondelete="CASCADE"), nullable=False),
    # denormalized from snapshot so time-range queries stay single-table
    Column("as_of", DateTime(timezone=True), nullable=False),
    Column("expiry", DateTime(timezone=True), nullable=False),
    Column("strike", Float, nullable=False),
    Column("option_type", String(1), nullable=False),
    Column("tte_years", Float),
    # underlying_price as sent; the spot fallback is applied on read
    Column("forward", Float),
    Column("mark_iv", Float),
    Column("mark_price", Float),
    Column("bid_price", Float),
    Column("ask_price", Float),
    Column("open_interest", Float),
    Column("volume", Float),
    PrimaryKeyConstraint("snapshot_id", "expiry", "strike", "option_type"),
)

# rows are written in as_of order, so BRIN is a few pages for the whole table
Index("ix_contract_as_of", contract.c.as_of, postgresql_using="brin")
# one contract's history through time
Index("ix_contract_expiry_strike", contract.c.expiry, contract.c.strike)

snapshot_summary = Table(
    "snapshot_summary",
    metadata,
    Column(
        "snapshot_id",
        BigInteger,
        ForeignKey("snapshot.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("iv30", Float),
    Column("rv30", Float),
    Column("dvol", Float),
    Column("dvol_rank", Float),
    Column("gex_flip", Float),
)
