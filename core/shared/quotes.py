"""Deribit option-chain preparation for options analytics."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from shared.black76 import black76_delta

logger = logging.getLogger(__name__)

MIN_TTE_DAYS = 7 # keep weeklies for short-term context; drop sub-week dailies
MAX_TTE_DAYS = 365 # cap at ~1Y — covers all liquid Deribit expiries

MIN_MARK_PRICE_BTC = 0.0005 # price floor — near-zero marks have unreliable mark_iv

MIN_MARK_IV = 0.05
MAX_MARK_IV = 5.00

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
    return pd.DataFrame(
        {
            "expiry": pd.Series([], dtype="datetime64[ns, UTC]"),
            "tte_years": pd.Series([], dtype="float64"),
            "strike": pd.Series([], dtype="float64"),
            "delta": pd.Series([], dtype="float64"),
            "forward": pd.Series([], dtype="float64"),
            "mark_iv": pd.Series([], dtype="float64"),
            "option_type": pd.Series([], dtype="object"),
        }
    )


def _parse_instrument_fields(df: pd.DataFrame) -> pd.DataFrame:
    """Add ``expiry``, ``strike``, ``option_type`` and ``tte_years`` columns.

    Parses Deribit's ``BTC-<DDMMMYY>-<STRIKE>-<C|P>`` ``instrument_name`` (expiries
    settle at 08:00 UTC). Unparseable strikes become ``NaN`` for the caller to drop.
    Shared by ``prepare_otm_quotes`` (OTM IV/greeks) and ``prepare_oi_chain`` (full chain).
    """
    parts = df["instrument_name"].str.split("-", expand=True)
    df["expiry"] = pd.to_datetime(parts[1], format="%d%b%y", utc=True) + pd.Timedelta(hours=8)
    df["strike"] = pd.to_numeric(parts[2], errors="coerce")
    df["option_type"] = parts[3]

    now = pd.Timestamp.now(tz="UTC")
    df["tte_years"] = (df["expiry"] - now).dt.total_seconds() / (365.25 * 24 * 3600)
    return df


def prepare_otm_quotes(summaries: list[dict], spot: float) -> pd.DataFrame:
    """
    Returns one row per surviving OTM quote with the columns in
    ``OTM_QUOTE_COLUMNS`` (``strike``, ``delta`` and ``forward`` are all retained).
    """
    n_raw = len(summaries)
    logger.info("preparing OTM quotes, %d raw instruments, spot=%.2f", n_raw, spot)
    if not summaries:
        logger.warning("no summaries were provided to prepare OTM quotes")
        return _empty_otm_quotes()

    df = pd.DataFrame(summaries)
    df = _parse_instrument_fields(df)

    df["mark_iv"] = pd.to_numeric(df["mark_iv"], errors="coerce") / 100.0
    df["mark_price"] = pd.to_numeric(df["mark_price"], errors="coerce")
    df["bid_price"] = pd.to_numeric(df.get("bid_price", np.nan), errors="coerce")

    # use the per-instrument forward for moneyness, falling back to spot.
    df["forward"] = pd.to_numeric(df.get("underlying_price", np.nan), errors="coerce")
    n_no_forward = int(df["forward"].isna().sum())
    df["forward"] = df["forward"].fillna(spot)
    if n_no_forward:
        logger.debug("%d/%d rows missing underlying_price, using spot as forward", n_no_forward, n_raw)

    df = df.dropna(subset=["mark_iv", "mark_price"])
    logger.debug("parsed marks, kept %d/%d rows (dropped unparseable mark_iv/mark_price)", len(df), n_raw)

    n_pre_quality = len(df)
    df = df[
        (df["mark_iv"] >= MIN_MARK_IV)
        & (df["mark_iv"] <= MAX_MARK_IV)
        & (df["tte_years"] >= MIN_TTE_DAYS / 365.25)
        & (df["tte_years"] <= MAX_TTE_DAYS / 365.25)
        & (df["mark_price"] >= MIN_MARK_PRICE_BTC)
        # no-bid books have unreliable mark_iv
        & (df["bid_price"] > 0)
    ].copy()
    logger.debug(
        "quality filters, kept %d/%d rows (mark_iv %.2f-%.2f, tte %d-%dd, mark_price>=%.4f BTC, bid>0)",
        len(df),
        n_pre_quality,
        MIN_MARK_IV,
        MAX_MARK_IV,
        MIN_TTE_DAYS,
        MAX_TTE_DAYS,
        MIN_MARK_PRICE_BTC,
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
        "prepared %d raw instruments -> %d OTM rows across %d expiries",
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
]


def _empty_oi_chain() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "expiry": pd.Series([], dtype="datetime64[ns, UTC]"),
            "tte_years": pd.Series([], dtype="float64"),
            "strike": pd.Series([], dtype="float64"),
            "forward": pd.Series([], dtype="float64"),
            "option_type": pd.Series([], dtype="object"),
            "open_interest": pd.Series([], dtype="float64"),
        }
    )


def prepare_oi_chain(summaries: list[dict], spot: float) -> pd.DataFrame:
    """Full option chain with open interest, one row per contract.

    Keeps every contract (ITM *and* OTM) across all expiries and carries
    ``open_interest`` (contracts). No IV/price/tte quality filters are applied —
    open interest does not depend on a reliable ``mark_iv`` — so deep-ITM and
    illiquid but OI-bearing contracts are retained. Rows with an unparseable
    strike/expiry or non-positive open interest are dropped. ``forward`` is the
    per-instrument ``underlying_price`` used for ITM/OTM classification downstream,
    falling back to ``spot``.
    """
    n_raw = len(summaries)
    logger.info("preparing OI chain, %d raw instruments, spot=%.2f", n_raw, spot)
    if not summaries:
        logger.warning("no summaries were provided to build open interest")
        return _empty_oi_chain()

    df = pd.DataFrame(summaries)
    df = _parse_instrument_fields(df)

    # assign the column first so `.fillna` works even if the key is absent upstream.
    df["open_interest"] = pd.to_numeric(df.get("open_interest", np.nan), errors="coerce")
    df["open_interest"] = df["open_interest"].fillna(0.0)

    # per-instrument forward for moneyness, falling back to spot.
    df["forward"] = pd.to_numeric(df.get("underlying_price", np.nan), errors="coerce")
    n_no_forward = int(df["forward"].isna().sum())
    df["forward"] = df["forward"].fillna(spot)
    if n_no_forward:
        logger.debug("%d/%d rows missing underlying_price, using spot as forward", n_no_forward, n_raw)

    df = df.dropna(subset=["expiry", "strike"])
    df = df[df["open_interest"] > 0].copy()
    if df.empty:
        logger.warning("no contracts with positive open interest")
        return _empty_oi_chain()

    prepared = df[OI_CHAIN_COLUMNS].reset_index(drop=True)
    logger.info(
        "prepared %d raw instruments -> %d OI contracts across %d expiries",
        n_raw,
        len(prepared),
        prepared["expiry"].nunique(),
    )
    return prepared
