"""The currency dependency: normalizes case, rejects anything not configured."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from api.deps import currency


def test_currency_normalizes_case():
    assert currency("btc") == "BTC"


def test_currency_rejects_unsupported():
    with pytest.raises(HTTPException) as exc:
        currency("xyz")
    assert exc.value.status_code == 422
