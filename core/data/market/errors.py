"""Errors the market layer raises."""

from __future__ import annotations


class UpstreamError(RuntimeError):
    """Upstream data could not be fetched and no state fresh enough to serve remains."""
