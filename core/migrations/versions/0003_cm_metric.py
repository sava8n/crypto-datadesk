"""Constant-maturity tenor grid per snapshot.

Revision ID: 0003
Revises: 0002
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cm_metric",
        sa.Column("snapshot_id", sa.BigInteger(), nullable=False),
        sa.Column("tenor_days", sa.Float(), nullable=False),
        sa.Column("atm_iv", sa.Float(), nullable=True),
        sa.Column("rr25", sa.Float(), nullable=True),
        sa.Column("bf25", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshot.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("snapshot_id", "tenor_days"),
        sa.CheckConstraint("tenor_days > 0", name="ck_cm_metric_tenor_positive"),
    )


def downgrade() -> None:
    op.drop_table("cm_metric")
