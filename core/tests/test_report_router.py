"""The report routes, served from patched storage."""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from data.report import generate, scheduler
from data.storage import report as storage
from data.storage.errors import StorageUnavailable

GENERATED_AT = datetime(2026, 8, 9, 8, 0, tzinfo=UTC)
NEXT_AT = datetime(2026, 8, 16, 8, 0, tzinfo=UTC)


@pytest.fixture
def stored_report(monkeypatch):
    row = {
        "id": 1,
        "generated_at": GENERATED_AT,
        "model": "perplexity/sonar-deep-research",
        "source": "fixture",
        "prompt_tokens": None,
        "completion_tokens": None,
        "cost_usd": None,
        "payload": json.loads(generate.FIXTURE_PATH.read_text()),
    }
    monkeypatch.setattr(storage, "list_reports", lambda limit: [_listing(row)][:limit])
    monkeypatch.setattr(storage, "get_report", lambda rid: row if rid == row["id"] else None)
    monkeypatch.setattr(scheduler, "next_run", lambda now: NEXT_AT)
    return row


def _listing(row):
    return {
        "id": row["id"],
        "generated_at": row["generated_at"],
        "headline": row["payload"]["headline"],
    }


def test_listing_carries_metadata_only(client, stored_report):
    body = client.get("/api/report/weekly").json()

    assert len(body["reports"]) == 1
    item = body["reports"][0]
    assert item["id"] == 1
    assert item["headline"] == stored_report["payload"]["headline"]
    assert "payload" not in item


def test_listing_limit_is_bounded(client, stored_report):
    assert client.get("/api/report/weekly", params={"limit": 0}).status_code == 422
    assert client.get("/api/report/weekly", params={"limit": 521}).status_code == 422
    assert client.get("/api/report/weekly", params={"limit": 1}).status_code == 200


def test_detail_carries_the_full_payload_and_schedule(client, stored_report):
    body = client.get("/api/report/weekly/1").json()

    assert body["payload"] == stored_report["payload"]
    assert body["next_report_at"].startswith("2026-08-16T08:00:00")
    assert set(body) == {"id", "generated_at", "next_report_at", "payload"}


def test_an_unknown_report_is_404(client, stored_report):
    assert client.get("/api/report/weekly/999").status_code == 404


def test_a_dead_archive_is_503(client, monkeypatch):
    def down(limit):
        raise StorageUnavailable("archive unavailable")

    monkeypatch.setattr(storage, "list_reports", down)
    assert client.get("/api/report/weekly").status_code == 503
