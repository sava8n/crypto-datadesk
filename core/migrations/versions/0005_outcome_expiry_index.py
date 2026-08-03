"""Index expiry_outcome.expiry for the retention sweep.

The sweep deletes on ``expiry`` alone; the primary key ``(currency, expiry)`` leads with
``currency`` and cannot serve that scan. Mirrors ``ix_snapshot_as_of``.

Revision ID: 0005
Revises: 0004
"""

from __future__ import annotations

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_expiry_outcome_expiry", "expiry_outcome", ["expiry"])


def downgrade() -> None:
    op.drop_index("ix_expiry_outcome_expiry", table_name="expiry_outcome")
