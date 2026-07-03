"""Deribit option-quote preparation for volatility analytics.

Parses raw book summaries, applies quote/expiry quality filters and
computes Black-76 deltas, producing the filtered OTM quote table.
"""

from __future__ import annotations

import logging
from math import erf, sqrt

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

DELTA_LIMIT = 0.5  # keep only OTM options (|delta| <= 0.5)

MIN_TTE_DAYS = 7  # keep weeklies for short-term context; drop sub-week dailies
MAX_TTE_DAYS = 365  # cap at ~1Y — covers all liquid Deribit expiries

MIN_MARK_PRICE_BTC = 0.0005  # price floor — near-zero marks have unreliable mark_iv

MIN_MARK_IV = 0.05
MAX_MARK_IV = 5.00

# Parsed + filtered OTM quotes, shared by the surface (delta-keyed) and curves
# (strike-keyed) builders. Each downstream builder projects the columns it needs.
PREPARED_COLUMNS = ["expiry", "tte_years", "strike", "delta", "mark_iv", "option_type"]

_SQRT2 = sqrt(2.0)
_erf = np.vectorize(erf, otypes=[float])


def norm_cdf(x: np.ndarray) -> np.ndarray:
    return 0.5 * (1.0 + _erf(x / _SQRT2))


def black76_delta(
    forward: np.ndarray,
    strike: np.ndarray,
    tte_years: np.ndarray,
    sigma: np.ndarray,
    is_call: np.ndarray,
) -> np.ndarray:
    """Forward (Black-76) delta; NaN where inputs are invalid."""
    valid = (forward > 0) & (strike > 0) & (tte_years > 0) & (sigma > 0)
    with np.errstate(divide="ignore", invalid="ignore"):
        d1 = (np.log(forward / strike) + 0.5 * sigma * sigma * tte_years) / (
            sigma * np.sqrt(tte_years)
        )
    call_delta = norm_cdf(d1)
    delta = np.where(is_call, call_delta, call_delta - 1.0)
    return np.where(valid, delta, np.nan)


def _empty_prepared() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "expiry": pd.Series([], dtype="datetime64[ns, UTC]"),
            "tte_years": pd.Series([], dtype="float64"),
            "strike": pd.Series([], dtype="float64"),
            "delta": pd.Series([], dtype="float64"),
            "mark_iv": pd.Series([], dtype="float64"),
            "option_type": pd.Series([], dtype="object"),
        }
    )


def prepare_quotes(summaries: list[dict], spot: float) -> pd.DataFrame:
    """
    Returns one row per surviving OTM quote with the columns in
    ``PREPARED_COLUMNS`` (both ``strike`` and ``delta`` are retained).
    """
    n_raw = len(summaries)
    logger.info("prepareing quotes, %d raw instruments, spot=%.2f", n_raw, spot)
    if not summaries:
        logger.warning("no summaries were provided to build IVs")
        return _empty_prepared()

    df = pd.DataFrame(summaries)
    parts = df["instrument_name"].str.split("-", expand=True)
    df["expiry"] = pd.to_datetime(parts[1], format="%d%b%y", utc=True) + pd.Timedelta(hours=8)
    df["strike"] = parts[2].astype(float)
    df["option_type"] = parts[3]

    now = pd.Timestamp.now(tz="UTC")
    df["tte_years"] = (df["expiry"] - now).dt.total_seconds() / (365.25 * 24 * 3600)

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
        return _empty_prepared()

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

    n_pre_otm = len(df)
    df = df[df["delta"].abs() <= DELTA_LIMIT]
    logger.debug("OTM filter: kept %d/%d rows (|delta|<=%.2f)", len(df), n_pre_otm, DELTA_LIMIT)

    prepared = df[PREPARED_COLUMNS].reset_index(drop=True)
    logger.info(
        "prepared %d raw instruments -> %d OTM rows across %d expiries",
        n_raw,
        len(prepared),
        prepared["expiry"].nunique(),
    )
    return prepared
