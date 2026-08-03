"""Archive the 7-day realized vol alongside iv7.

``iv7`` has been archived since 0002 but ``rv7`` only ever existed on the live stats
route, so the history series could pair ``iv7`` with ``rv30`` but never with ``rv7``.
Backfill cannot restore it - realized vol needs the candle history, which the archive
does not keep - so the column stays NULL for captures predating this migration.

Revision ID: 0006
Revises: 0005
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("snapshot", sa.Column("rv7", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("snapshot", "rv7")
