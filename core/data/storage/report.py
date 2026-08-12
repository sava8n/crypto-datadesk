"""Reads and writes for the ``market_report`` archive."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, insert, select

from data.storage import db, schema
from data.storage.errors import StorageUnavailable


def insert_report(row: dict) -> int:
    """Store one report row and return its id."""
    try:
        with db.connection() as conn:
            stmt = insert(schema.market_report).values(row).returning(schema.market_report.c.id)
            return conn.execute(stmt).scalar_one()
    except Exception as exc:
        raise StorageUnavailable("archive unavailable") from exc


def latest_generated_at() -> datetime | None:
    """When the most recent report was generated, or ``None`` on an empty archive."""
    stmt = select(func.max(schema.market_report.c.generated_at))
    return db.scalars(stmt, "report latest")[0]


def latest_payload() -> dict | None:
    """The newest ``generated_at`` + ``payload`` row - prompt context for generation."""
    c = schema.market_report.c
    stmt = select(c.generated_at, c.payload).order_by(c.generated_at.desc(), c.id.desc()).limit(1)
    found = db.rows(stmt, "report context")
    return found[0] if found else None


def list_reports(limit: int) -> list[dict]:
    """Report listing metadata, newest first - headlines only, never full payloads."""
    c = schema.market_report.c
    stmt = (
        select(c.id, c.generated_at, c.payload["headline"].astext.label("headline"))
        .order_by(c.generated_at.desc(), c.id.desc())
        .limit(limit)
    )
    return db.rows(stmt, "report list")


def get_report(report_id: int) -> dict | None:
    """One full report row, or ``None`` when the id is unknown."""
    stmt = select(schema.market_report).where(schema.market_report.c.id == report_id)
    found = db.rows(stmt, "report")
    return found[0] if found else None
