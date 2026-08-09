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

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "weekly-market-overview.md"


def render_previous(row: dict | None) -> str:
    """``{{PREVIOUS_REPORTS}}`` text from the newest stored report, "" on first run.

    References are included so the model can re-verify prior sources; the calendar is
    not - a past event list carries nothing the drift analysis needs.
    """
    if row is None:
        return ""
    payload = row["payload"]
    refs = "\n".join(
        f"[{ref['id']}] {ref['title']} - {ref['url']}" for ref in payload["references"]
    )
    return (
        f"--- PRIOR REPORT · {row['generated_at'].date().isoformat()} ---\n"
        f"HEADLINE: {payload['headline']}\n"
        f"STANDFIRST: {payload['standfirst']}\n\n"
        f"{payload['body_md']}\n\n"
        f"REFERENCES:\n{refs}"
    )


def render_prompt(now: datetime, previous: str = "") -> str:
    """The system prompt with the date and prior-report placeholders substituted."""
    return (
        PROMPT_PATH.read_text()
        .replace("{{CURRENT_DATE}}", now.date().isoformat())
        .replace("{{PREVIOUS_REPORTS}}", previous)
    )


def extract_json(text: str) -> dict:
    """The first complete JSON object in ``text``, tolerating fences and prose around it."""
    decoder = json.JSONDecoder()
    idx = text.find("{")
    while idx != -1:
        try:
            obj = decoder.raw_decode(text, idx)[0]
        except ValueError:
            obj = None
        if isinstance(obj, dict):
            return obj
        idx = text.find("{", idx + 1)
    raise ValueError("no JSON object in model output")


def generate(now: datetime) -> int:
    """Produce and store the report for ``now``; returns the stored id."""
    previous = render_previous(storage.latest_payload())
    logger.info(
        "generating report with %s, %s",
        settings.report_model,
        "with prior report context" if previous else "no prior report",
    )
    completion = openrouter.complete(settings.report_model, render_prompt(now, previous))

    payload = ReportPayload.model_validate(extract_json(completion.content))
    report_id = storage.insert_report(
        {
            "generated_at": now,
            "model": settings.report_model,
            "prompt_tokens": completion.prompt_tokens,
            "completion_tokens": completion.completion_tokens,
            "cost_usd": completion.cost_usd,
            # mode="json" turns dates into strings psycopg can send as JSONB
            "payload": payload.model_dump(mode="json"),
        }
    )
    logger.info(
        "stored report %d (%s tokens, cost %s)",
        report_id,
        completion.completion_tokens,
        completion.cost_usd,
    )
    return report_id
