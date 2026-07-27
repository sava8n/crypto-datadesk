"""Initial archive schema.

Revision ID: 0001
Revises:
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "snapshot",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("currency", sa.String(length=16), nullable=False),
        sa.Column("as_of", sa.DateTime(timezone=True), nullable=False),
        sa.Column("spot", sa.Float(), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("iv30", sa.Float(), nullable=True),
        sa.Column("rv30", sa.Float(), nullable=True),
        sa.Column("dvol", sa.Float(), nullable=True),
        sa.Column("dvol_rank", sa.Float(), nullable=True),
        sa.Column("gex_flip", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("currency", "as_of", name="uq_snapshot_currency_as_of"),
        sa.CheckConstraint("spot > 0", name="ck_snapshot_spot_positive"),
    )
    op.create_index("ix_snapshot_as_of", "snapshot", ["as_of"])

    op.create_table(
        "contract",
        sa.Column("snapshot_id", sa.BigInteger(), nullable=False),
        sa.Column("instrument_name", sa.String(length=64), nullable=False),
        sa.Column("expiry", sa.DateTime(timezone=True), nullable=False),
        sa.Column("strike", sa.Float(), nullable=False),
        sa.Column("option_type", sa.String(length=1), nullable=False),
        sa.Column("tte_years", sa.Float(), nullable=True),
        sa.Column("forward", sa.Float(), nullable=True),
        sa.Column("mark_iv", sa.Float(), nullable=True),
        sa.Column("mark_price", sa.Float(), nullable=True),
        sa.Column("bid_price", sa.Float(), nullable=True),
        sa.Column("ask_price", sa.Float(), nullable=True),
        sa.Column("open_interest", sa.Float(), nullable=True),
        sa.Column("volume", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshot.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("snapshot_id", "expiry", "strike", "option_type"),
        sa.CheckConstraint("option_type in ('C', 'P')", name="ck_contract_option_type"),
        sa.CheckConstraint("strike > 0", name="ck_contract_strike_positive"),
    )
    op.create_index(
        "ix_contract_expiry_strike",
        "contract",
        ["expiry", "strike", "option_type", "snapshot_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_contract_expiry_strike", table_name="contract")
    op.drop_table("contract")
    op.drop_index("ix_snapshot_as_of", table_name="snapshot")
    op.drop_table("snapshot")
