"""Derived scalar columns on snapshot.

Revision ID: 0002
Revises: 0001
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

COLUMNS = (
    "iv7",
    "rr25_7",
    "bf25_7",
    "rr25_30",
    "bf25_30",
    "oi_total_calls",
    "oi_total_puts",
    "max_pain_front",
    "gex_net_total",
)


def upgrade() -> None:
    for name in COLUMNS:
        op.add_column("snapshot", sa.Column(name, sa.Float(), nullable=True))


def downgrade() -> None:
    for name in reversed(COLUMNS):
        op.drop_column("snapshot", name)
