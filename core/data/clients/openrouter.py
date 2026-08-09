"""OpenRouter Responses API client, via the official SDK.

Generations are streamed: the many-minute research call stays observable, and an
upstream failure arrives as an explicit event.
"""

from __future__ import annotations

import logging
import time
from typing import NamedTuple

import httpx
from openrouter import OpenRouter
from openrouter.errors import NoResponseError
from openrouter.errors import OpenRouterError as SDKError

from config import settings

logger = logging.getLogger(__name__)


class OpenRouterError(RuntimeError):
    """Raised when an OpenRouter request fails or returns an unexpected payload."""


class Completion(NamedTuple):
    content: str
    prompt_tokens: int | None
    completion_tokens: int | None
    cost_usd: float | None


def _request(model: str, prompt: str) -> dict:
    request: dict = {
        "model": model,
        "input": prompt,
        "stream": True,
        # per-read ceiling; keep-alive events flow far more often than this
        "timeout_ms": int(settings.openrouter_read_timeout * 1000),
    }
    if settings.report_reasoning_effort:
        request["reasoning"] = {"effort": settings.report_reasoning_effort}
    if settings.report_json_mode:
        request["text"] = {"format": {"type": "json_object"}}
    if settings.report_web_tools:
        # server tools: OpenRouter runs the search/fetch loop itself and returns the
        # finished response, so no tool handling is needed here
        request["tools"] = [
            {"type": "openrouter:web_search"},
            {"type": "openrouter:web_fetch"},
        ]
    return request


def _describe(item) -> str:
    kind = str(getattr(item, "type", "item"))
    action = getattr(item, "action", None)
    detail = getattr(action, "query", None) or getattr(action, "url", None)
    return f"{kind} ({detail})" if detail else kind


def _drain(events) -> tuple[object, dict]:
    """The completed response and tool-use stats from the event stream; any other outcome raises."""
    stats = {"events": 0, "searches": 0, "fetches": 0}
    with events:
        for event in events:
            stats["events"] += 1
            kind = getattr(event, "type", "")
            if kind == "response.completed":
                return event.response, stats
            if kind in ("response.failed", "response.incomplete"):
                error = getattr(getattr(event, "response", None), "error", None)
                detail = getattr(error, "message", None) or kind
                raise OpenRouterError(f"generation did not complete: {detail}")
            if kind == "error":
                raise OpenRouterError(f"stream error: {getattr(event, 'message', 'unknown')}")
            if kind == "response.output_item.added":
                item = getattr(event, "item", None)
                item_type = str(getattr(item, "type", ""))
                if "web_search" in item_type:
                    stats["searches"] += 1
                elif "web_fetch" in item_type:
                    stats["fetches"] += 1
                logger.debug("progress: %s", _describe(item))
    raise OpenRouterError(f"stream ended without a completed response after {stats['events']} events")


def _output_text(result) -> str:
    if getattr(result, "output_text", None):
        return result.output_text
    parts = []
    for item in getattr(result, "output", None) or []:
        for part in getattr(item, "content", None) or []:
            text = getattr(part, "text", None)
            if text:
                parts.append(text)
    if not parts:
        raise OpenRouterError("completed response carried no output text")
    return "".join(parts)


def _usage_of(result) -> tuple[int | None, int | None, float | None]:
    # unset SDK fields hold a sentinel, not None, so filter by type instead
    usage = getattr(result, "usage", None)
    prompt = getattr(usage, "input_tokens", None)
    completion = getattr(usage, "output_tokens", None)
    cost = getattr(usage, "cost", None)
    return (
        int(prompt) if isinstance(prompt, int) else None,
        int(completion) if isinstance(completion, int) else None,
        float(cost) if isinstance(cost, (int, float)) else None,
    )


def complete(model: str, prompt: str) -> Completion:
    """One streamed generation for ``prompt``, with provider-reported usage.

    Transport failure, stream errors and a malformed result all raise
    ``OpenRouterError``, so callers need catch nothing else.
    """
    if not settings.openrouter_api_key:
        raise OpenRouterError("openrouter_api_key is not configured")

    start = time.perf_counter()
    logger.debug(
        "requesting %s (reasoning=%s, json_mode=%s, web_tools=%s)",
        model,
        settings.report_reasoning_effort or "off",
        settings.report_json_mode,
        settings.report_web_tools,
    )
    try:
        with OpenRouter(
            api_key=settings.openrouter_api_key,
            server_url=settings.openrouter_api_url,
        ) as client:
            result, stats = _drain(client.responses.send(**_request(model, prompt)))
        completion = Completion(_output_text(result), *_usage_of(result))
    except OpenRouterError as exc:
        logger.warning("completion with %s failed: %s", model, exc)
        raise
    except (SDKError, NoResponseError, httpx.HTTPError, ValueError, TypeError) as exc:
        logger.warning("completion with %s failed: %s", model, exc)
        raise OpenRouterError(f"OpenRouter completion with {model} failed: {exc}") from exc
    logger.info(
        "completed %s in %.0f s (%d searches, %d fetches)",
        model,
        time.perf_counter() - start,
        stats["searches"],
        stats["fetches"],
    )
    return completion
