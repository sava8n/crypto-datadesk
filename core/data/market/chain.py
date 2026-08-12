"""Deribit option-chain preparation for options analytics.

``prepare_contracts`` parses the book summary into a typed frame without dropping
anything; ``prepare_otm_quotes`` and ``prepare_oi_chain`` are filters over that
frame. Parsing once and filtering on read keeps the unfiltered chain available to
the persistence layer.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from analytics.black76 import black76_delta
from analytics.conventions import EXPIRY_DATE_FORMAT, SETTLEMENT_HOUR_UTC, YEAR_DAYS
from analytics.frames import as_declared_dtypes, empty_frame

logger = logging.getLogger(__name__)

# Quote-quality thresholds: a mark outside these is not a price anyone would trade on.
# Domain rules, not deployment knobs - if one ever needs to vary it becomes a parameter.
MIN_MARK_IV = 0.05
MAX_MARK_IV = 5.00
MIN_MARK_PRICE = 0.0005

CONTRACT_COLUMNS = [
    "instrument_name",
    "expiry",
    "tte_years",
    "strike",
    "option_type",
    "forward",
    "mark_iv",
    "mark_price",
    "bid_price",
    "ask_price",
    "open_interest",
    "volume",
]


def empty_contracts() -> pd.DataFrame:
    """A correctly-typed empty contracts frame."""
    return empty_frame(CONTRACT_COLUMNS)


def _parse_instrument_fields(book: pd.DataFrame) -> pd.DataFrame:
    """Add ``expiry``, ``strike``, ``option_type`` and ``tte_years`` columns.

    Parses Deribit's ``<CURRENCY>-<DDMMMYY>-<STRIKE>-<C|P>`` ``instrument_name``.
    Unparseable strikes become ``NaN`` for the caller to drop.
    """
    parts = book["instrument_name"].str.split("-", expand=True)
    book["expiry"] = pd.to_datetime(parts[1], format=EXPIRY_DATE_FORMAT, utc=True) + pd.Timedelta(
        hours=SETTLEMENT_HOUR_UTC
    )
    book["strike"] = pd.to_numeric(parts[2], errors="coerce")
    book["option_type"] = parts[3]

    now = pd.Timestamp.now(tz="UTC")
    book["tte_years"] = (book["expiry"] - now).dt.total_seconds() / (YEAR_DAYS * 24 * 3600)
    return book


def prepare_contracts(summaries: list[dict]) -> pd.DataFrame:
    """The whole book as one typed frame, one row per instrument.

    Applies no quality, moneyness or open-interest filter - only rows with an
    unparseable expiry or strike are dropped, since those cannot identify a contract.
    ``mark_iv`` is rescaled from Deribit percent to a fraction; ``forward`` is the
    per-instrument ``underlying_price`` with no spot fallback. Missing numeric fields
    stay ``NaN``.
    """
    n_raw = len(summaries)
    if not summaries:
        logger.warning("no summaries were provided to prepare contracts")
        return empty_frame(CONTRACT_COLUMNS)

    book = pd.DataFrame(summaries)
    book = _parse_instrument_fields(book)

    book["mark_iv"] = pd.to_numeric(book.get("mark_iv", np.nan), errors="coerce") / 100.0
    for col in ("mark_price", "bid_price", "ask_price", "open_interest", "volume"):
        book[col] = pd.to_numeric(book.get(col, np.nan), errors="coerce")
    book["forward"] = pd.to_numeric(book.get("underlying_price", np.nan), errors="coerce")

    book = book.dropna(subset=["expiry", "strike", "option_type"])
    if book.empty:
        logger.warning("no instruments survived parsing of %d summaries", n_raw)
        return empty_frame(CONTRACT_COLUMNS)

    prepared = as_declared_dtypes(book[CONTRACT_COLUMNS]).reset_index(drop=True)
    logger.info(
        "parsed %d raw instruments -> %d contracts across %d expiries",
        n_raw,
        len(prepared),
        prepared["expiry"].nunique(),
    )
    return prepared


OTM_QUOTE_COLUMNS = [
    "expiry",
    "tte_years",
    "strike",
    "delta",
    "forward",
    "mark_iv",
    "option_type",
]


def prepare_otm_quotes(contracts: pd.DataFrame, spot: float) -> pd.DataFrame:
    """OTM quotes with a usable mark, one row per surviving contract.

    Keeps ``MIN_MARK_IV <= mark_iv <= MAX_MARK_IV``, ``mark_price >= MIN_MARK_PRICE``
    and a positive bid (no-bid books have unreliable ``mark_iv``), then the OTM leg
    only (calls K>=F, puts K<F). ``forward`` falls back to ``spot`` where the
    per-instrument value is missing.
    """
    n_raw = len(contracts)
    logger.info("preparing OTM quotes from %d contracts, spot=%.2f", n_raw, spot)
    if contracts.empty:
        return empty_frame(OTM_QUOTE_COLUMNS)

    quotes = contracts.copy()
    n_no_forward = int(quotes["forward"].isna().sum())
    quotes["forward"] = quotes["forward"].fillna(spot)
    if n_no_forward:
        logger.debug(
            "%d/%d rows missing underlying_price, using spot as forward", n_no_forward, n_raw
        )

    quotes = quotes.dropna(subset=["mark_iv", "mark_price"])
    logger.debug("kept %d/%d rows (dropped unparseable mark_iv/mark_price)", len(quotes), n_raw)

    n_pre_quality = len(quotes)
    quotes = quotes[
        (quotes["mark_iv"] >= MIN_MARK_IV)
        & (quotes["mark_iv"] <= MAX_MARK_IV)
        & (quotes["mark_price"] >= MIN_MARK_PRICE)
        # no-bid books have unreliable mark_iv
        & (quotes["bid_price"] > 0)
    ].copy()
    logger.debug(
        "quality filters, kept %d/%d rows (mark_iv %.2f-%.2f, mark_price>=%.4f, bid>0)",
        len(quotes),
        n_pre_quality,
        MIN_MARK_IV,
        MAX_MARK_IV,
        MIN_MARK_PRICE,
    )
    if quotes.empty:
        logger.warning("no rows survived quote/expiry filters")
        return empty_frame(OTM_QUOTE_COLUMNS)

    n_pre_otm = len(quotes)
    is_call = quotes["option_type"] == "C"
    quotes = quotes[
        (is_call & (quotes["strike"] >= quotes["forward"]))
        | (~is_call & (quotes["strike"] < quotes["forward"]))
    ].copy()
    logger.debug("OTM filter: kept %d/%d rows (puts K<F, calls K>=F)", len(quotes), n_pre_otm)

    quotes["delta"] = black76_delta(
        quotes["forward"].to_numpy(dtype=float),
        quotes["strike"].to_numpy(dtype=float),
        quotes["tte_years"].to_numpy(dtype=float),
        quotes["mark_iv"].to_numpy(dtype=float),
        (quotes["option_type"] == "C").to_numpy(),
    )
    n_pre_delta = len(quotes)
    quotes = quotes.dropna(subset=["delta"])
    if len(quotes) != n_pre_delta:
        logger.debug("dropped %d rows with undefined Black-76 delta", n_pre_delta - len(quotes))

    prepared = as_declared_dtypes(quotes[OTM_QUOTE_COLUMNS]).reset_index(drop=True)
    logger.info(
        "prepared %d contracts -> %d OTM rows across %d expiries",
        n_raw,
        len(prepared),
        prepared["expiry"].nunique(),
    )
    return prepared


OI_CHAIN_COLUMNS = [
    "expiry",
    "tte_years",
    "strike",
    "forward",
    "option_type",
    "open_interest",
    "volume",
]


def prepare_oi_chain(contracts: pd.DataFrame, spot: float) -> pd.DataFrame:
    """Full option chain with open interest, one row per contract.

    Keeps every contract (ITM *and* OTM) across all expiries - open interest does not
    depend on a reliable ``mark_iv`` - dropping only non-positive open interest.
    ``forward`` falls back to ``spot`` and is used for ITM/OTM classification
    downstream; ``volume`` is the 24h traded total in contracts.
    """
    n_raw = len(contracts)
    logger.info("preparing OI chain from %d contracts, spot=%.2f", n_raw, spot)
    if contracts.empty:
        return empty_frame(OI_CHAIN_COLUMNS)

    chain = contracts.copy()
    n_no_forward = int(chain["forward"].isna().sum())
    chain["forward"] = chain["forward"].fillna(spot)
    if n_no_forward:
        logger.debug(
            "%d/%d rows missing underlying_price, using spot as forward", n_no_forward, n_raw
        )

    chain["volume"] = chain["volume"].fillna(0.0)

    # NaN open interest compares false, so unknown and zero are dropped alike
    chain = chain[chain["open_interest"] > 0].copy()
    if chain.empty:
        logger.warning("no contracts with positive open interest")
        return empty_frame(OI_CHAIN_COLUMNS)

    prepared = as_declared_dtypes(chain[OI_CHAIN_COLUMNS]).reset_index(drop=True)
    logger.info(
        "prepared %d contracts -> %d OI contracts across %d expiries",
        n_raw,
        len(prepared),
        prepared["expiry"].nunique(),
    )
    return prepared
