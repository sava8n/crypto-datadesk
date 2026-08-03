"""Trade tape and settled-expiry outcomes.

Revision ID: 0004
Revises: 0003
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trade",
        sa.Column("trade_id", sa.String(length=64), nullable=False),
        sa.Column("currency", sa.String(length=16), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("instrument_name", sa.String(length=64), nullable=False),
        sa.Column("expiry", sa.DateTime(timezone=True), nullable=False),
        sa.Column("strike", sa.Float(), nullable=False),
        sa.Column("option_type", sa.String(length=1), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("direction", sa.String(length=4), nullable=False),
        sa.Column("iv", sa.Float(), nullable=True),
        sa.Column("index_price", sa.Float(), nullable=True),
        sa.Column("block_trade_id", sa.String(length=64), nullable=True),
        sa.Column("liquidation", sa.String(length=2), nullable=True),
        sa.PrimaryKeyConstraint("trade_id"),
        sa.CheckConstraint("option_type in ('C', 'P')", name="ck_trade_option_type"),
        sa.CheckConstraint("direction in ('buy', 'sell')", name="ck_trade_direction"),
        sa.CheckConstraint("strike > 0", name="ck_trade_strike_positive"),
    )
    op.create_index("ix_trade_currency_ts", "trade", ["currency", "ts"])
    op.create_index("ix_trade_ts", "trade", ["ts"])

    op.create_table(
        "expiry_outcome",
        sa.Column("currency", sa.String(length=16), nullable=False),
        sa.Column("expiry", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reference_as_of", sa.DateTime(timezone=True), nullable=False),
        sa.Column("spot_ref", sa.Float(), nullable=False),
        sa.Column("em_implied", sa.Float(), nullable=True),
        sa.Column("settlement", sa.Float(), nullable=False),
        sa.Column("realized_move", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("currency", "expiry"),
    )


def downgrade() -> None:
    op.drop_table("expiry_outcome")
    op.drop_index("ix_trade_ts", table_name="trade")
    op.drop_index("ix_trade_currency_ts", table_name="trade")
    op.drop_table("trade")
