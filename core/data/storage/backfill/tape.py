"""One-shot backfill of the trade tape from Deribit's history host.

Run from ``core/``: ``python -m data.storage.backfill.tape [--days 365] [--from-ts ISO]``.
Pages ascending from ``now - days`` up to the live tape's earliest print (or now on an
empty tape); the primary key deduplicates the overlap, so re-runs and resumes are safe.
"""

from __future__ import annotations

import argparse
import logging
from datetime import UTC, datetime, timedelta

from config import settings
from data.clients import deribit
from data.storage import flow, tape

logger = logging.getLogger(__name__)

PROGRESS_EVERY_PAGES = 50


def backfill_currency(currency: str, start: datetime) -> int:
    """Fetch and archive prints in ``[start, earliest live print]``; returns rows written."""
    end = flow.tape_start(currency) or datetime.now(UTC)
    if end <= start:
        logger.info("tape for %s already reaches back to %s, nothing to do", currency, start)
        return 0

    start_ms = int(start.timestamp() * 1000)
    end_ms = int(end.timestamp() * 1000)
    written = 0
    pages = 0

    while True:
        page = deribit.fetch_option_trades(
            currency, start_ms, end_ms, api_url=settings.deribit_history_api_url
        )
        trades = page.get("trades", [])
        written += tape._insert(tape.trade_rows(trades, currency))
        pages += 1
        if pages % PROGRESS_EVERY_PAGES == 0 and trades:
            reached = datetime.fromtimestamp(int(trades[-1]["timestamp"]) / 1000.0, tz=UTC)
            logger.info("%s: %d prints written, reached %s", currency, written, reached)
        if not page.get("has_more") or not trades:
            break
        last_ms = int(trades[-1]["timestamp"])
        # a page of same-millisecond prints cannot advance the cursor; step past it
        # rather than loop (dedup already stored that millisecond's prints)
        start_ms = last_ms if last_ms > start_ms else start_ms + 1

    logger.info("backfilled %d prints for %s over %d pages", written, currency, pages)
    return written


def main() -> None:
    logging.basicConfig(level=settings.log_level)
    # one line per page drowns the progress log
    logging.getLogger("data.clients.deribit").setLevel(logging.WARNING)

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=365, help="how far back to fetch")
    parser.add_argument(
        "--from-ts",
        type=datetime.fromisoformat,
        default=None,
        metavar="ISO",
        help="resume from this timestamp (UTC) instead of now - days",
    )
    args = parser.parse_args()

    start = args.from_ts or datetime.now(UTC) - timedelta(days=args.days)
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)
    for currency in settings.supported_currency_list:
        backfill_currency(currency, start)


if __name__ == "__main__":
    main()
