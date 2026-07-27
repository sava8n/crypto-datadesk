"""Engine, connections and schema bootstrap.

The engine is built on first use rather than at import, so the module stays
importable when persistence is disabled or the database is unreachable.
"""

from __future__ import annotations

import logging
import threading
from contextlib import AbstractContextManager
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from config import settings

logger = logging.getLogger(__name__)

_engine: Engine | None = None
# the recorder, the retention sweep and the health route each reach this from a
# different thread, so building it is guarded rather than check-then-set
_engine_lock = threading.Lock()


def engine() -> Engine:
    """Process-wide engine for ``settings.db_dsn``."""
    global _engine
    with _engine_lock:
        if _engine is None:
            _engine = create_engine(settings.db_dsn, pool_pre_ping=True)
        return _engine


def connection() -> AbstractContextManager[Connection]:
    """A connection inside a transaction: commits on success, rolls back on error."""
    return engine().begin()


def init_schema() -> None:
    """Bring the archive up to the latest migration."""
    from alembic import command
    from alembic.config import Config

    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    command.upgrade(config, "head")
    logger.info("archive schema at head")


def is_available() -> bool:
    """True when the database answers a trivial query.

    Catches everything: ``create_engine`` runs inside the try, and a bad DSN or a
    missing driver raises ``ArgumentError``/``ModuleNotFoundError`` rather than a
    ``SQLAlchemyError``. The health route promises it never fails.
    """
    try:
        with engine().connect() as conn:
            conn.execute(text("select 1"))
        return True
    except Exception as exc:
        logger.warning("database unavailable: %s", exc)
        return False


def dispose() -> None:
    """Close pooled connections."""
    global _engine
    with _engine_lock:
        if _engine is not None:
            _engine.dispose()
            _engine = None
