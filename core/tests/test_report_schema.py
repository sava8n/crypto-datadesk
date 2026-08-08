"""The report payload contract, proven against the bundled real model output."""

from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

from data.report import generate
from data.report.schema import CalendarEvent, Reference, ReportPayload


@pytest.fixture(scope="module")
def fixture_payload() -> dict:
    return json.loads(generate.FIXTURE_PATH.read_text())


def test_the_bundled_fixture_validates(fixture_payload):
    """Load-bearing: the fixture is a real deep-research response, style flaws included."""
    payload = ReportPayload.model_validate(fixture_payload)
    assert payload.headline
    assert payload.body_md
    assert len(payload.references) >= 1
    assert len(payload.calendar) >= 1


def test_json_dump_round_trips(fixture_payload):
    """mode="json" must leave only JSONB-storable values - dates become strings."""
    dumped = ReportPayload.model_validate(fixture_payload).model_dump(mode="json")
    assert json.loads(json.dumps(dumped)) == dumped
    assert all(isinstance(event["date"], str) for event in dumped["calendar"])


def test_a_null_time_utc_means_all_day():
    event = CalendarEvent.model_validate(
        {"date": "2026-08-09", "time_utc": None, "title": "t", "note": "n", "importance": "med"}
    )
    assert event.time_utc is None


def test_an_unknown_importance_is_rejected():
    with pytest.raises(ValidationError):
        CalendarEvent.model_validate(
            {"date": "2026-08-09", "title": "t", "note": "n", "importance": "critical"}
        )


def test_an_unknown_reference_role_is_rejected():
    with pytest.raises(ValidationError):
        Reference.model_validate(
            {"id": 1, "title": "t", "url": "https://x", "note": "n", "role": "advert"}
        )


def test_no_cosmetic_caps_are_enforced():
    """The prompt's length limits are style guidance; an overrun must not void a paid call."""
    payload = ReportPayload.model_validate(
        {
            "headline": "h" * 500,
            "standfirst": "s" * 2000,
            "body_md": "short",
            "references": [],
            "calendar": [],
        }
    )
    assert len(payload.headline) == 500
