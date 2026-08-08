"""One report generation: source the raw text, validate it, store it."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from config import settings
from data.clients import openrouter
from data.report.schema import ReportPayload
from data.storage import report as storage

logger = logging.getLogger(__name__)

_DIR = Path(__file__).resolve().parent
PROMPT_PATH = _DIR / "prompt.md"
FIXTURE_PATH = _DIR / "fixture.json"


def render_prompt(now: datetime) -> str:
    """The system prompt with ``{{CURRENT_DATE}}`` substituted."""
    return PROMPT_PATH.read_text().replace("{{CURRENT_DATE}}", now.date().isoformat())


def extract_json(text: str) -> dict:
    """The one JSON object in ``text``, tolerating fences and stray prose around it."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in model output")
    return json.loads(text[start : end + 1])


def generate(now: datetime) -> int:
    """Produce and store the report for ``now``; returns the stored id."""
    if settings.report_source == "fixture":
        completion = openrouter.Completion(FIXTURE_PATH.read_text(), None, None, None)
    elif settings.report_source == "openrouter":
        completion = openrouter.complete(settings.report_model, render_prompt(now))
    else:
        raise ValueError(f"unknown report_source: {settings.report_source!r}")

    payload = ReportPayload.model_validate(extract_json(completion.content))
    report_id = storage.insert_report(
        {
            "generated_at": now,
            "model": settings.report_model,
            "source": settings.report_source,
            "prompt_tokens": completion.prompt_tokens,
            "completion_tokens": completion.completion_tokens,
            "cost_usd": completion.cost_usd,
            # mode="json" turns dates into strings psycopg can send as JSONB
            "payload": payload.model_dump(mode="json"),
        }
    )
    logger.info(
        "stored report %d from %s (%s tokens, cost %s)",
        report_id,
        settings.report_source,
        completion.completion_tokens,
        completion.cost_usd,
    )
    return report_id
