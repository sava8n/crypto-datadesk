"""OpenRouter chat-completions client."""

from __future__ import annotations

import logging
import time
from typing import NamedTuple

import certifi
import requests

from config import settings

logger = logging.getLogger(__name__)


class OpenRouterError(RuntimeError):
    """Raised when an OpenRouter request fails or returns an unexpected payload."""


def _build_session() -> requests.Session:
    # no retry adapter: completions are expensive POSTs, never retried automatically
    session = requests.Session()
    session.verify = certifi.where()
    return session


_SESSION = _build_session()


class Completion(NamedTuple):
    content: str
    prompt_tokens: int | None
    completion_tokens: int | None
    cost_usd: float | None


def _usage_int(usage: dict, key: str) -> int | None:
    value = usage.get(key)
    return int(value) if value is not None else None


def complete(model: str, prompt: str) -> Completion:
    """One non-streaming completion for ``prompt``, with provider-reported usage.

    Transport failure, bad status and a malformed body all raise ``OpenRouterError``,
    so callers need catch nothing else.
    """
    if not settings.openrouter_api_key:
        raise OpenRouterError("openrouter_api_key is not configured")

    body: dict = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "usage": {"include": True},
    }
    if settings.report_reasoning_effort:
        body["reasoning"] = {"effort": settings.report_reasoning_effort}

    start = time.perf_counter()
    try:
        resp = _SESSION.post(
            f"{settings.openrouter_api_url}/chat/completions",
            json=body,
            headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            timeout=(settings.http_connect_timeout, settings.openrouter_read_timeout),
        )
        resp.raise_for_status()
        payload = resp.json()
        content = payload["choices"][0]["message"]["content"]
        usage = payload.get("usage") or {}
        completion = Completion(
            content=content,
            prompt_tokens=_usage_int(usage, "prompt_tokens"),
            completion_tokens=_usage_int(usage, "completion_tokens"),
            cost_usd=float(usage["cost"]) if usage.get("cost") is not None else None,
        )
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning("OpenRouter completion with %s failed: %s", model, exc)
        raise OpenRouterError(f"OpenRouter completion with {model} failed: {exc}") from exc
    logger.info("completed %s in %.0f ms", model, (time.perf_counter() - start) * 1000)
    return completion
