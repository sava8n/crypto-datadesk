"""Domain errors for the archive read path."""

from __future__ import annotations


class StorageUnavailable(Exception):
    """The archive could not be reached; history routes cannot serve without it."""
