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

from config import settings
from shared.black76 import black76_delta

logger = logging.getLogger(__name__)

MIN_MARK_IV = 0.05
MAX_MARK_IV = 5.00

CONTRACT_COLUMNS = [
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

_CONTRACT_DTYPES = {
    "expiry": "datetime64[ns, UTC]",
    "tte_years": "float64",
    "strike": "float64",
    "option_type": "object",
    "forward": "float64",
    "mark_iv": "float64",
    "mark_price": "float64",
    "bid_price": "float64",
    "ask_price": "float64",
    "open_interest": "float64",
    "volume": "float64",
}


def _empty(columns: list[str]) -> pd.DataFrame:
    return pd.DataFrame(
        {c: pd.Series([], dtype=_CONTRACT_DTYPES.get(c, "float64")) for c in columns}
    )


def empty_contracts() -> pd.DataFrame:
    """A correctly-typed empty contracts frame."""
    return _empty(CONTRACT_COLUMNS)


def _parse_instrument_fields(df: pd.DataFrame) -> pd.DataFrame:
    """Add ``expiry``, ``strike``, ``option_type`` and ``tte_years`` columns.

    Parses Deribit's ``<CURRENCY>-<DDMMMYY>-<STRIKE>-<C|P>`` ``instrument_name`` (expiries
    settle at 08:00 UTC). Unparseable strikes become ``NaN`` for the caller to drop.
    """
    parts = df["instrument_name"].str.split("-", expand=True)
    df["expiry"] = pd.to_datetime(parts[1], format="%d%b%y", utc=True) + pd.Timedelta(hours=8)
    df["strike"] = pd.to_numeric(parts[2], errors="coerce")
    df["option_type"] = parts[3]

    now = pd.Timestamp.now(tz="UTC")
    df["tte_years"] = (df["expiry"] - now).dt.total_seconds() / (365.25 * 24 * 3600)
    return df


def prepare_contracts(summaries: list[dict]) -> pd.DataFrame:
    """The whole book as one typed frame, one row per instrument.

    Applies no quality, moneyness or open-interest filter — only rows with an
    unparseable expiry or strike are dropped, since those cannot identify a contract.
    ``mark_iv`` is rescaled from Deribit percent to a fraction; ``forward`` is the
    per-instrument ``underlying_price`` with no spot fallback. Missing numeric fields
    stay ``NaN``.
    """
    n_raw = len(summaries)
    if not summaries:
        logger.warning("no summaries were provided to prepare contracts")
        return _empty(CONTRACT_COLUMNS)

    df = pd.DataFrame(summaries)
    df = _parse_instrument_fields(df)

    df["mark_iv"] = pd.to_numeric(df.get("mark_iv", np.nan), errors="coerce") / 100.0
    for col in ("mark_price", "bid_price", "ask_price", "open_interest", "volume"):
        df[col] = pd.to_numeric(df.get(col, np.nan), errors="coerce")
    df["forward"] = pd.to_numeric(df.get("underlying_price", np.nan), errors="coerce")

    df = df.dropna(subset=["expiry", "strike", "option_type"])
    if df.empty:
        logger.warning("no instruments survived parsing of %d summaries", n_raw)
        return _empty(CONTRACT_COLUMNS)

    prepared = df[CONTRACT_COLUMNS].reset_index(drop=True)
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


def _empty_otm_quotes() -> pd.DataFrame:
    return _empty(OTM_QUOTE_COLUMNS)


def prepare_otm_quotes(contracts: pd.DataFrame, spot: float) -> pd.DataFrame:
    """OTM quotes with a usable mark, one row per surviving contract.

    Keeps ``MIN_MARK_IV <= mark_iv <= MAX_MARK_IV``, ``mark_price >= min_mark_price``
    and a positive bid (no-bid books have unreliable ``mark_iv``), then the OTM leg
    only (calls K>=F, puts K<F). ``forward`` falls back to ``spot`` where the
    per-instrument value is missing.
    """
    n_raw = len(contracts)
    logger.info("preparing OTM quotes from %d contracts, spot=%.2f", n_raw, spot)
    if contracts.empty:
        return _empty_otm_quotes()

    df = contracts.copy()
    n_no_forward = int(df["forward"].isna().sum())
    df["forward"] = df["forward"].fillna(spot)
    if n_no_forward:
        logger.debug("%d/%d rows missing underlying_price, using spot as forward", n_no_forward, n_raw)

    df = df.dropna(subset=["mark_iv", "mark_price"])
    logger.debug("kept %d/%d rows (dropped unparseable mark_iv/mark_price)", len(df), n_raw)

    n_pre_quality = len(df)
    df = df[
        (df["mark_iv"] >= MIN_MARK_IV)
        & (df["mark_iv"] <= MAX_MARK_IV)
        & (df["mark_price"] >= settings.min_mark_price)
        # no-bid books have unreliable mark_iv
        & (df["bid_price"] > 0)
    ].copy()
    logger.debug(
        "quality filters, kept %d/%d rows (mark_iv %.2f-%.2f, mark_price>=%.4f, bid>0)",
        len(df),
        n_pre_quality,
        MIN_MARK_IV,
        MAX_MARK_IV,
        settings.min_mark_price,
    )
    if df.empty:
        logger.warning("no rows survived quote/expiry filters")
        return _empty_otm_quotes()

    n_pre_otm = len(df)
    is_call = df["option_type"] == "C"
    df = df[
        (is_call & (df["strike"] >= df["forward"]))
        | (~is_call & (df["strike"] < df["forward"]))
    ].copy()
    logger.debug("OTM filter: kept %d/%d rows (puts K<F, calls K>=F)", len(df), n_pre_otm)

    df["delta"] = black76_delta(
        df["forward"].to_numpy(dtype=float),
        df["strike"].to_numpy(dtype=float),
        df["tte_years"].to_numpy(dtype=float),
        df["mark_iv"].to_numpy(dtype=float),
        (df["option_type"] == "C").to_numpy(),
    )
    n_pre_delta = len(df)
    df = df.dropna(subset=["delta"])
    if len(df) != n_pre_delta:
        logger.debug("dropped %d rows with undefined Black-76 delta", n_pre_delta - len(df))

    prepared = df[OTM_QUOTE_COLUMNS].reset_index(drop=True)
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


def _empty_oi_chain() -> pd.DataFrame:
    return _empty(OI_CHAIN_COLUMNS)


def prepare_oi_chain(contracts: pd.DataFrame, spot: float) -> pd.DataFrame:
    """Full option chain with open interest, one row per contract.

    Keeps every contract (ITM *and* OTM) across all expiries — open interest does not
    depend on a reliable ``mark_iv`` — dropping only non-positive open interest.
    ``forward`` falls back to ``spot`` and is used for ITM/OTM classification
    downstream; ``volume`` is the 24h traded total in contracts.
    """
    n_raw = len(contracts)
    logger.info("preparing OI chain from %d contracts, spot=%.2f", n_raw, spot)
    if contracts.empty:
        return _empty_oi_chain()

    df = contracts.copy()
    n_no_forward = int(df["forward"].isna().sum())
    df["forward"] = df["forward"].fillna(spot)
    if n_no_forward:
        logger.debug("%d/%d rows missing underlying_price, using spot as forward", n_no_forward, n_raw)

    df["volume"] = df["volume"].fillna(0.0)

    # NaN open interest compares false, so unknown and zero are dropped alike
    df = df[df["open_interest"] > 0].copy()
    if df.empty:
        logger.warning("no contracts with positive open interest")
        return _empty_oi_chain()

    prepared = df[OI_CHAIN_COLUMNS].reset_index(drop=True)
    logger.info(
        "prepared %d contracts -> %d OI contracts across %d expiries",
        n_raw,
        len(prepared),
        prepared["expiry"].nunique(),
    )
    return prepared
