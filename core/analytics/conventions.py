"""Conventions shared across the analytics builders and the Deribit parsers."""

from __future__ import annotations

YEAR_DAYS = 365.25
TRADING_DAYS_PER_YEAR = 365.0

# Deribit instrument names carry the expiry date only; every option settles at 08:00 UTC
EXPIRY_DATE_FORMAT = "%d%b%y"
SETTLEMENT_HOUR_UTC = 8

# upstream timestamps are epoch milliseconds
DAY_MS = 86_400_000
