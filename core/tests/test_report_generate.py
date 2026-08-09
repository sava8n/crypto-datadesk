"""Report generation: prompt rendering, JSON extraction, the fixture path."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from config import settings
from data.report import generate

NOW = datetime(2026, 8, 9, 8, 0, tzinfo=UTC)


def test_render_prompt_substitutes_the_date():
    prompt = generate.render_prompt(NOW)
    assert "{{CURRENT_DATE}}" not in prompt
    assert "2026-08-09" in prompt


def test_render_prompt_substitutes_prior_reports():
    prompt = generate.render_prompt(NOW, "PRIOR CONTEXT HERE")
    assert "{{PREVIOUS_REPORTS}}" not in prompt
    assert "PRIOR CONTEXT HERE" in prompt


def test_render_prompt_leaves_the_placeholder_empty_on_first_run():
    assert "{{PREVIOUS_REPORTS}}" not in generate.render_prompt(NOW)


def _prior(date_str, headline):
    return {
        "generated_at": datetime.fromisoformat(f"{date_str}T08:00:00+00:00"),
        "payload": {
            "headline": headline,
            "standfirst": "the standfirst",
            "body_md": f"body of {headline}",
            "references": [
                {"id": 1, "title": "Source", "url": "https://x.test/a", "note": "n", "role": "citation"}
            ],
            "calendar": [
                {"date": date_str, "time_utc": None, "title": "stale", "note": "n", "importance": "low"}
            ],
        },
    }


def test_render_previous_carries_refs_but_no_calendar():
    text = generate.render_previous(_prior("2026-08-02", "prior regime call"))
    assert "2026-08-02" in text
    assert "prior regime call" in text
    assert "https://x.test/a" in text
    assert "stale" not in text


def test_render_previous_is_empty_without_a_prior():
    assert generate.render_previous(None) == ""


def test_extract_json_takes_a_bare_object():
    assert generate.extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_strips_markdown_fences():
    assert generate.extract_json('```json\n{"a": 1}\n```') == {"a": 1}


def test_extract_json_ignores_surrounding_prose():
    assert generate.extract_json('Here is the report:\n{"a": {"b": 2}}\nDone.') == {"a": {"b": 2}}


def test_extract_json_ignores_trailing_data_with_braces():
    assert generate.extract_json('{"a": 1}\nsee section {3} above.}') == {"a": 1}


def test_extract_json_skips_non_json_braces_before_the_object():
    assert generate.extract_json('{not json} then {"a": 1}') == {"a": 1}


def test_extract_json_without_an_object_raises():
    with pytest.raises(ValueError):
        generate.extract_json("no json here")


def test_fixture_generation_stores_a_validated_row(monkeypatch):
    monkeypatch.setattr(settings, "report_source", "fixture")
    stored = {}

    def capture(row):
        stored.update(row)
        return 7

    monkeypatch.setattr(generate.storage, "insert_report", capture)

    assert generate.generate(NOW) == 7
    assert stored["generated_at"] == NOW
    assert stored["source"] == "fixture"
    assert stored["model"] == settings.report_model
    assert stored["prompt_tokens"] is None
    assert stored["completion_tokens"] is None
    assert stored["cost_usd"] is None
    assert stored["payload"]["headline"]
    # JSONB-ready: dates already serialized to strings
    assert all(isinstance(event["date"], str) for event in stored["payload"]["calendar"])


def test_openrouter_generation_uses_the_rendered_prompt(monkeypatch):
    monkeypatch.setattr(settings, "report_source", "openrouter")
    asked = {}

    def fake_complete(model, prompt):
        asked["model"], asked["prompt"] = model, prompt
        return generate.openrouter.Completion(
            generate.FIXTURE_PATH.read_text(), 100, 8200, 0.041
        )

    monkeypatch.setattr(generate.openrouter, "complete", fake_complete)
    monkeypatch.setattr(generate.storage, "latest_payload", lambda: None)
    monkeypatch.setattr(generate.storage, "insert_report", lambda row: 1)

    generate.generate(NOW)
    assert asked["model"] == settings.report_model
    assert "2026-08-09" in asked["prompt"]


def test_openrouter_generation_feeds_prior_reports_into_the_prompt(monkeypatch):
    monkeypatch.setattr(settings, "report_source", "openrouter")
    asked = {}

    def fake_complete(model, prompt):
        asked["prompt"] = prompt
        return generate.openrouter.Completion(generate.FIXTURE_PATH.read_text(), None, None, None)

    monkeypatch.setattr(generate.openrouter, "complete", fake_complete)
    monkeypatch.setattr(
        generate.storage, "latest_payload", lambda: _prior("2026-08-02", "prior regime call")
    )
    monkeypatch.setattr(generate.storage, "insert_report", lambda row: 1)

    generate.generate(NOW)
    assert "prior regime call" in asked["prompt"]
    assert "{{PREVIOUS_REPORTS}}" not in asked["prompt"]


def test_an_unknown_source_raises(monkeypatch):
    monkeypatch.setattr(settings, "report_source", "psychic")
    with pytest.raises(ValueError):
        generate.generate(NOW)
