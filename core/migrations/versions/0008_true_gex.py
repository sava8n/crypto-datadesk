"""Tape coverage column for the gex scalars.

Revision ID: 0008
Revises: 0007
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("snapshot", sa.Column("oi_explained_fraction", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("snapshot", "oi_explained_fraction")
