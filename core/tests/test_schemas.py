"""Invariants over the response models themselves, not any one route."""

from __future__ import annotations

import importlib
import inspect
import pkgutil

import pytest
from pydantic import BaseModel

import api.schemas
from api.schemas.base import CurrencyEnvelope
from api.schemas.health import HealthResponse


def _response_models() -> list[type[BaseModel]]:
    found = []
    for module in pkgutil.iter_modules(api.schemas.__path__):
        loaded = importlib.import_module(f"api.schemas.{module.name}")
        for _, obj in inspect.getmembers(loaded, inspect.isclass):
            if issubclass(obj, BaseModel) and obj.__name__.endswith("Response"):
                found.append(obj)
    return sorted(set(found), key=lambda m: m.__name__)


def test_every_response_is_discovered():
    assert len(_response_models()) >= 15


@pytest.mark.parametrize("model", _response_models(), ids=lambda m: m.__name__)
def test_responses_are_currency_scoped(model):
    """Health is the one route that is not about a book; everything else says which."""
    if model is HealthResponse:
        pytest.skip("health is not currency-scoped")
    assert issubclass(model, CurrencyEnvelope), (
        f"{model.__name__} declares its own currency instead of extending CurrencyEnvelope"
    )
