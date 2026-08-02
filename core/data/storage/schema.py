"""Relational schema for the snapshot archive."""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
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
    # scalars cached alongside the capture; all recomputable from `contract`
    Column("iv30", Float),
    Column("rv30", Float),
    Column("dvol", Float),
    Column("dvol_rank", Float),
    Column("gex_flip", Float),
    Column("iv7", Float),
    Column("rr25_7", Float),
    Column("bf25_7", Float),
    Column("rr25_30", Float),
    Column("bf25_30", Float),
    Column("oi_total_calls", Float),
    Column("oi_total_puts", Float),
    Column("max_pain_front", Float),
    Column("gex_net_total", Float),
    # doubles as the index the currency+range read path uses, ascending on both columns
    UniqueConstraint("currency", "as_of", name="uq_snapshot_currency_as_of"),
    CheckConstraint("spot > 0", name="ck_snapshot_spot_positive"),
)

# the retention sweep deletes on as_of alone, and uq_snapshot_currency_as_of leads with
# currency so it cannot serve that
Index("ix_snapshot_as_of", snapshot.c.as_of)

contract = Table(
    "contract",
    metadata,
    Column(
        "snapshot_id", BigInteger, ForeignKey("snapshot.id", ondelete="CASCADE"), nullable=False
    ),
    # Deribit's own identity for the row. Parsed into the columns below, but kept so an
    # archived contract can be tied back to the instrument it came from.
    Column("instrument_name", String(64), nullable=False),
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
    CheckConstraint("option_type in ('C', 'P')", name="ck_contract_option_type"),
    CheckConstraint("strike > 0", name="ck_contract_strike_positive"),
)

# one contract's history through time - the trailing snapshot_id is what makes the index
# answer that question rather than scanning every capture at the strike
Index(
    "ix_contract_expiry_strike",
    contract.c.expiry,
    contract.c.strike,
    contract.c.option_type,
    contract.c.snapshot_id,
)

# constant-maturity tenor grid per capture; tenors a snapshot's chain did not span are
# absent rather than clamped, so percentiles over this table stay honest
cm_metric = Table(
    "cm_metric",
    metadata,
    Column(
        "snapshot_id", BigInteger, ForeignKey("snapshot.id", ondelete="CASCADE"), nullable=False
    ),
    Column("tenor_days", Float, nullable=False),
    Column("atm_iv", Float),
    Column("rr25", Float),
    Column("bf25", Float),
    PrimaryKeyConstraint("snapshot_id", "tenor_days"),
    CheckConstraint("tenor_days > 0", name="ck_cm_metric_tenor_positive"),
)
