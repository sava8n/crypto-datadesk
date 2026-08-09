"""OpenRouter API client."""

from __future__ import annotations

import pytest
import requests

from config import settings
from data.clients import openrouter
from data.clients.openrouter import OpenRouterError


class _Response:
    def __init__(self, payload, status_error=None):
        self._payload = payload
        self._status_error = status_error

    def raise_for_status(self):
        if self._status_error:
            raise self._status_error

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


@pytest.fixture
def respond(monkeypatch):
    """Make the shared session return one canned response and record the request."""
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    seen = {}

    def stub(url, json=None, headers=None, timeout=None):
        seen["url"] = url
        seen["json"] = json
        seen["headers"] = headers
        seen["timeout"] = timeout
        return stub.response

    monkeypatch.setattr(openrouter._SESSION, "post", stub)

    def set_response(payload, status_error=None):
        stub.response = _Response(payload, status_error)
        return seen

    return set_response


def _completion_payload(content="{}"):
    return {
        "choices": [{"message": {"content": content}}],
        "usage": {"prompt_tokens": 100, "completion_tokens": 8200, "cost": 0.041},
    }


def test_complete_unwraps_content_and_usage(respond):
    seen = respond(_completion_payload('{"headline": "x"}'))
    completion = openrouter.complete("some/model", "the prompt")
    assert completion.content == '{"headline": "x"}'
    assert completion.prompt_tokens == 100
    assert completion.completion_tokens == 8200
    assert completion.cost_usd == pytest.approx(0.041)
    assert seen["json"]["model"] == "some/model"
    assert seen["json"]["messages"] == [{"role": "user", "content": "the prompt"}]
    assert seen["json"]["usage"] == {"include": True}
    assert seen["headers"]["Authorization"] == "Bearer test-key"
    # a connect timeout is a reachability check, the read timeout must cover deep research
    assert isinstance(seen["timeout"], tuple)


def test_request_carries_reasoning_effort(respond):
    seen = respond(_completion_payload())
    openrouter.complete("some/model", "p")
    assert seen["json"]["reasoning"] == {"effort": settings.report_reasoning_effort}


def test_empty_reasoning_effort_omits_the_param(respond, monkeypatch):
    monkeypatch.setattr(settings, "report_reasoning_effort", "")
    seen = respond(_completion_payload())
    openrouter.complete("some/model", "p")
    assert "reasoning" not in seen["json"]


def test_json_mode_requests_json_and_healing(respond):
    seen = respond(_completion_payload())
    openrouter.complete("some/model", "p")
    assert seen["json"]["response_format"] == {"type": "json_object"}
    assert seen["json"]["plugins"] == [{"id": "response-healing"}]


def test_disabled_json_mode_omits_both_params(respond, monkeypatch):
    monkeypatch.setattr(settings, "report_json_mode", False)
    seen = respond(_completion_payload())
    openrouter.complete("some/model", "p")
    assert "response_format" not in seen["json"]
    assert "plugins" not in seen["json"]


def test_web_tools_are_requested(respond):
    seen = respond(_completion_payload())
    openrouter.complete("some/model", "p")
    assert seen["json"]["tools"] == [
        {"type": "openrouter:web_search"},
        {"type": "openrouter:web_fetch"},
    ]


def test_disabled_web_tools_omit_the_param(respond, monkeypatch):
    monkeypatch.setattr(settings, "report_web_tools", False)
    seen = respond(_completion_payload())
    openrouter.complete("some/model", "p")
    assert "tools" not in seen["json"]


def test_missing_usage_yields_none_fields(respond):
    respond({"choices": [{"message": {"content": "hi"}}]})
    completion = openrouter.complete("some/model", "p")
    assert completion.prompt_tokens is None
    assert completion.completion_tokens is None
    assert completion.cost_usd is None


def test_missing_choices_becomes_openrouter_error(respond):
    respond({"error": {"message": "no output"}})
    with pytest.raises(OpenRouterError):
        openrouter.complete("some/model", "p")


def test_bad_status_becomes_openrouter_error(respond):
    respond({}, status_error=requests.HTTPError("402 Payment Required"))
    with pytest.raises(OpenRouterError):
        openrouter.complete("some/model", "p")


def test_transport_failure_becomes_openrouter_error(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")

    def boom(*_args, **_kwargs):
        raise requests.ConnectionError("no route to host")

    monkeypatch.setattr(openrouter._SESSION, "post", boom)
    with pytest.raises(OpenRouterError):
        openrouter.complete("some/model", "p")


def test_missing_api_key_raises_before_any_request(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "")

    def unexpected(*_args, **_kwargs):
        raise AssertionError("no request should be made without a key")

    monkeypatch.setattr(openrouter._SESSION, "post", unexpected)
    with pytest.raises(OpenRouterError):
        openrouter.complete("some/model", "p")
