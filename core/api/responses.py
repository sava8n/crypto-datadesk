"""Turning frames into response payloads."""

from __future__ import annotations

from datetime import datetime
from functools import cache

import pandas as pd
from pydantic import BaseModel, TypeAdapter

from api.schemas.base import MarketEnvelope, SpanEnvelope
from data.market.state import MarketState


@cache
def _adapter(model: type[BaseModel]) -> TypeAdapter:
    """One validator per model, built once - compiling the schema per request is the cost."""
    return TypeAdapter(list[model])


def points[M: BaseModel](frame: pd.DataFrame, model: type[M]) -> list[M]:
    """Validate every row of ``frame`` into ``model``.

    The model performs the projection: pydantic ignores columns it does not declare, so a
    frame carrying extras needs no pre-slicing.
    """
    return _adapter(model).validate_python(frame.to_dict("records"))


def records[M: BaseModel](rows: list[dict], model: type[M]) -> list[M]:
    """Validate mapping rows into ``model`` - the from-storage twin of ``points``."""
    return _adapter(model).validate_python(rows)


def market[M: MarketEnvelope](model: type[M], ccy: str, state: MarketState, **fields) -> M:
    """Build ``model``, filling the ``MarketEnvelope`` fields from ``state``."""
    return model(currency=ccy, spot=state.spot, as_of=state.as_of, **fields)


def spanned[M: SpanEnvelope](
    model: type[M], ccy: str, start: datetime, end: datetime, **fields
) -> M:
    """Build ``model``, filling the ``SpanEnvelope`` fields from the queried interval."""
    return model(currency=ccy, start=start, end=end, **fields)
