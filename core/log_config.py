"""Logging configuration."""

from __future__ import annotations

import logging
import sys

_LOG_FORMAT = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: str = "INFO") -> None:
    """Attach a stdout handler to the root logger at ``level``.

    Called after uvicorn has already configured its own loggers, so
    application logs (which propagate to the root logger) become
    visible with a consistent format.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    # the openrouter SDK's transport logs every request at INFO; keep it to warnings
    logging.getLogger("httpx").setLevel(logging.WARNING)
