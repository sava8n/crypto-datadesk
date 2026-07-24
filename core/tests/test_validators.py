"""Request validators: the currency validator rejects with HTTP 422."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from shared.currency import validate_currency


def test_validate_currency_normalizes_case():
    assert validate_currency("btc") == "BTC"


def test_validate_currency_rejects_unsupported():
    with pytest.raises(HTTPException) as exc:
        validate_currency("xyz")
    assert exc.value.status_code == 422
