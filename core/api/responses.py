"""Turning frames into response payloads."""

from __future__ import annotations

from functools import cache

import pandas as pd
from pydantic import BaseModel, TypeAdapter

from data.market.state import MarketState


@cache
def _adapter(model: type[BaseModel]) -> TypeAdapter:
    """One validator per model, built once - compiling the schema per request is the cost."""
    return TypeAdapter(list[model])


def points[M: BaseModel](frame: pd.DataFrame, model: type[M]) -> list[M]:
    """Validate every row of ``frame`` into ``model``.

    The model performs the projection: pydantic ignores columns it does not declare, so
    a frame carrying extras needs no pre-slicing. Values need no casting either -
    ``np.float64`` subclasses ``float`` and ``pd.Timestamp`` subclasses ``datetime``.
    """
    return _adapter(model).validate_python(frame.to_dict("records"))


def envelope(ccy: str, state: MarketState) -> dict:
    """The ``MarketEnvelope`` fields, ready to splat into a response model."""
    return {"currency": ccy, "spot": state.spot, "as_of": state.as_of}
