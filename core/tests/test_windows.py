"""The duration-token vocabulary shared by the windowed routes."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import get_args

import pytest

from api.windows import SPANS, ArchiveWindow, RecentWindow, duration, span

ALL_TOKENS = sorted(set(get_args(RecentWindow)) | set(get_args(ArchiveWindow)))


def test_every_token_a_route_accepts_has_a_span():
    """The aliases are what routes validate against; SPANS is what resolves them."""
    assert set(ALL_TOKENS) <= SPANS.keys()


@pytest.mark.parametrize("token", ALL_TOKENS)
def test_durations_are_positive(token):
    assert duration(token) > timedelta(0)


def test_tokens_order_by_length():
    """Reading order is duration order, so a wider token never resolves shorter."""
    archive = [duration(t) for t in get_args(ArchiveWindow)]
    assert archive == sorted(archive)


def test_span_ends_where_asked_and_starts_a_duration_back():
    ending = datetime(2026, 8, 3, 12, tzinfo=UTC)

    result = span("7d", ending=ending)

    assert result.end == ending
    assert result.start == ending - timedelta(days=7)


def test_recent_and_archive_agree_where_they_overlap():
    assert duration("7d") == SPANS["7d"]
    assert "7d" in get_args(RecentWindow) and "7d" in get_args(ArchiveWindow)
