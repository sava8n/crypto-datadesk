"""Engine, connections and schema bootstrap.

The engine is built on first use rather than at import, so the module stays
importable when persistence is disabled or the database is unreachable.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.exc import SQLAlchemyError

from config import settings
from storage.schema import metadata

logger = logging.getLogger(__name__)

_engine: Engine | None = None


def engine() -> Engine:
    """Process-wide engine for ``settings.db_dsn``."""
    global _engine
    if _engine is None:
        _engine = create_engine(settings.db_dsn, pool_pre_ping=True)
    return _engine


@contextmanager
def connection() -> Iterator[Connection]:
    """A connection inside a transaction: commits on success, rolls back on error."""
    with engine().begin() as conn:
        yield conn


def init_schema() -> None:
    """Create any missing tables and indexes."""
    metadata.create_all(engine())
    logger.info("archive schema ready")


def is_available() -> bool:
    """True when the database answers a trivial query."""
    try:
        with engine().connect() as conn:
            conn.execute(text("select 1"))
        return True
    except SQLAlchemyError as exc:
        logger.warning("database unavailable: %s", exc)
        return False


def dispose() -> None:
    """Close pooled connections."""
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None
