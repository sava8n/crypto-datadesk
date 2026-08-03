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
    Column("rv7", Float),
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

# the trade tape: one row per print, archived raw; taker side is what turns volume
# into flow. Deribit's trade_id is the natural, exchange-wide identity.
trade = Table(
    "trade",
    metadata,
    Column("trade_id", String(64), primary_key=True),
    Column("currency", String(16), nullable=False),
    Column("ts", DateTime(timezone=True), nullable=False),
    Column("instrument_name", String(64), nullable=False),
    Column("expiry", DateTime(timezone=True), nullable=False),
    Column("strike", Float, nullable=False),
    Column("option_type", String(1), nullable=False),
    # option premium in the base currency, per contract
    Column("price", Float, nullable=False),
    # contracts traded (1 contract = 1 coin on Deribit options)
    Column("amount", Float, nullable=False),
    # taker side
    Column("direction", String(4), nullable=False),
    # trade IV as a fraction, matching contract.mark_iv
    Column("iv", Float),
    Column("index_price", Float),
    Column("block_trade_id", String(64)),
    # Deribit's marker: maker/taker/both were liquidations
    Column("liquidation", String(2)),
    CheckConstraint("option_type in ('C', 'P')", name="ck_trade_option_type"),
    CheckConstraint("direction in ('buy', 'sell')", name="ck_trade_direction"),
    CheckConstraint("strike > 0", name="ck_trade_strike_positive"),
)

# the flow window scans read (currency, ts >= start); ts alone serves the retention sweep
Index("ix_trade_currency_ts", trade.c.currency, trade.c.ts)
Index("ix_trade_ts", trade.c.ts)

# settled-expiry expected-move outcomes: a lazily-filled cache of archive replays,
# so each settled expiry's book is restored at most once
expiry_outcome = Table(
    "expiry_outcome",
    metadata,
    Column("currency", String(16), nullable=False),
    Column("expiry", DateTime(timezone=True), nullable=False),
    # the archived snapshot the implied move was read from (nearest expiry - 1d)
    Column("reference_as_of", DateTime(timezone=True), nullable=False),
    Column("spot_ref", Float, nullable=False),
    # implied +-1 sigma move in USD at the reference; NULL when the curve did not span it
    Column("em_implied", Float),
    # Deribit delivery price
    Column("settlement", Float, nullable=False),
    Column("realized_move", Float, nullable=False),
    PrimaryKeyConstraint("currency", "expiry"),
)

# same reason as ix_snapshot_as_of: the sweep deletes on expiry alone, and the primary
# key leads with currency so it cannot serve that
Index("ix_expiry_outcome_expiry", expiry_outcome.c.expiry)

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
