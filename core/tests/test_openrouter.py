"""OpenRouter API client."""

from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest

from config import settings
from data.clients import openrouter
from data.clients.openrouter import OpenRouterError


class _Events:
    """Stand-in for the SDK's EventStream: a context manager over canned events."""

    def __init__(self, events):
        self._events = events

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def __iter__(self):
        return iter(self._events)


class _Client:
    """Stand-in for the SDK client capturing constructor and send kwargs."""

    init_kwargs: dict
    seen: dict
    outcome: object

    def __init__(self, **kwargs):
        type(self).init_kwargs = kwargs

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    @property
    def responses(self):
        return self

    def send(self, **kwargs):
        type(self).seen = kwargs
        if isinstance(type(self).outcome, Exception):
            raise type(self).outcome
        return _Events(type(self).outcome)


@pytest.fixture
def respond(monkeypatch):
    """Point the client at a stub SDK yielding the given events; returns the seen kwargs."""
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(openrouter, "OpenRouter", _Client)

    def set_outcome(events_or_error):
        _Client.outcome = events_or_error
        _Client.seen = {}
        return _Client

    return set_outcome


def _completed(content="{}", usage=SimpleNamespace(input_tokens=100, output_tokens=8200, cost=0.041)):
    return SimpleNamespace(
        type="response.completed",
        response=SimpleNamespace(output_text=content, output=None, usage=usage),
    )


def _in_progress():
    return SimpleNamespace(type="response.in_progress")


def test_complete_unwraps_content_and_usage(respond):
    stub = respond([_in_progress(), _completed('{"headline": "x"}')])
    completion = openrouter.complete("some/model", "the prompt")
    assert completion.content == '{"headline": "x"}'
    assert completion.prompt_tokens == 100
    assert completion.completion_tokens == 8200
    assert completion.cost_usd == pytest.approx(0.041)
    assert stub.seen["model"] == "some/model"
    assert stub.seen["input"] == "the prompt"
    assert stub.seen["stream"] is True
    # the read ceiling must cover deep research
    assert stub.seen["timeout_ms"] == int(settings.openrouter_read_timeout * 1000)
    assert stub.init_kwargs["api_key"] == "test-key"
    assert stub.init_kwargs["server_url"] == settings.openrouter_api_url


def test_request_carries_reasoning_effort(respond):
    stub = respond([_completed()])
    openrouter.complete("some/model", "p")
    assert stub.seen["reasoning"] == {"effort": settings.report_reasoning_effort}


def test_empty_reasoning_effort_omits_the_param(respond, monkeypatch):
    monkeypatch.setattr(settings, "report_reasoning_effort", "")
    stub = respond([_completed()])
    openrouter.complete("some/model", "p")
    assert "reasoning" not in stub.seen


def test_json_mode_requests_json_output(respond):
    stub = respond([_completed()])
    openrouter.complete("some/model", "p")
    assert stub.seen["text"] == {"format": {"type": "json_object"}}


def test_disabled_json_mode_omits_the_param(respond, monkeypatch):
    monkeypatch.setattr(settings, "report_json_mode", False)
    stub = respond([_completed()])
    openrouter.complete("some/model", "p")
    assert "text" not in stub.seen


def test_web_tools_are_requested(respond):
    stub = respond([_completed()])
    openrouter.complete("some/model", "p")
    assert stub.seen["tools"] == [
        {"type": "openrouter:web_search"},
        {"type": "openrouter:web_fetch"},
    ]


def test_disabled_web_tools_omit_the_param(respond, monkeypatch):
    monkeypatch.setattr(settings, "report_web_tools", False)
    stub = respond([_completed()])
    openrouter.complete("some/model", "p")
    assert "tools" not in stub.seen


def test_missing_usage_yields_none_fields(respond):
    respond([_completed("hi", usage=None)])
    completion = openrouter.complete("some/model", "p")
    assert completion.prompt_tokens is None
    assert completion.completion_tokens is None
    assert completion.cost_usd is None


def test_output_items_back_up_a_missing_output_text(respond):
    part = SimpleNamespace(text='{"a": 1}')
    item = SimpleNamespace(content=[part])
    respond(
        [
            SimpleNamespace(
                type="response.completed",
                response=SimpleNamespace(output_text=None, output=[item], usage=None),
            )
        ]
    )
    assert openrouter.complete("some/model", "p").content == '{"a": 1}'


def test_completed_without_any_text_becomes_openrouter_error(respond):
    respond([_completed(content=None)])
    with pytest.raises(OpenRouterError):
        openrouter.complete("some/model", "p")


def test_failed_event_becomes_openrouter_error(respond):
    respond(
        [
            SimpleNamespace(
                type="response.failed",
                response=SimpleNamespace(error=SimpleNamespace(message="provider crashed")),
            )
        ]
    )
    with pytest.raises(OpenRouterError, match="provider crashed"):
        openrouter.complete("some/model", "p")


def test_error_event_becomes_openrouter_error(respond):
    respond([SimpleNamespace(type="error", message="overloaded")])
    with pytest.raises(OpenRouterError, match="overloaded"):
        openrouter.complete("some/model", "p")


def test_stream_without_completion_becomes_openrouter_error(respond):
    respond([_in_progress()])
    with pytest.raises(OpenRouterError, match="without a completed response"):
        openrouter.complete("some/model", "p")


def test_transport_failure_becomes_openrouter_error(respond):
    respond(httpx.ConnectError("no route to host"))
    with pytest.raises(OpenRouterError):
        openrouter.complete("some/model", "p")


def test_missing_api_key_raises_before_any_request(respond, monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    stub = respond([_completed()])
    with pytest.raises(OpenRouterError):
        openrouter.complete("some/model", "p")
    assert stub.seen == {}
