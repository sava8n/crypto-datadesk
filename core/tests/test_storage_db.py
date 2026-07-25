"""Archive round trip against a real PostgreSQL.

Skipped unless ``DATADESK_SERVICE_TEST_DB_DSN`` names a database the suite may create
and drop tables in.
"""

from __future__ import annotations

import os

import pytest

pytest.importorskip("sqlalchemy")

DSN = os.environ.get("DATADESK_SERVICE_TEST_DB_DSN")
pytestmark = pytest.mark.skipif(
    not DSN, reason="set DATADESK_SERVICE_TEST_DB_DSN to exercise the archive"
)

from datetime import datetime, timedelta, timezone  # noqa: E402

from pandas.testing import assert_frame_equal  # noqa: E402
from sqlalchemy import func, select  # noqa: E402

from shared.quotes import prepare_oi_chain, prepare_otm_quotes  # noqa: E402

_SORT = ["expiry", "strike", "option_type"]


@pytest.fixture
def archive(monkeypatch):
    from config import settings
    from storage import db, schema

    monkeypatch.setattr(settings, "db_dsn", DSN)
    db.dispose()  # drop any engine bound to the default DSN
    schema.metadata.drop_all(db.engine())
    db.init_schema()
    yield
    schema.metadata.drop_all(db.engine())
    db.dispose()


def _at(state, as_of):
    """The same market state stamped at a different time."""
    from market.state import MarketState

    return MarketState(
        as_of=as_of,
        spot=state.spot,
        contracts=state.contracts,
        spot_candles=state.spot_candles,
        dvol_candles=state.dvol_candles,
    )


def _count(table):
    from storage import db

    with db.connection() as conn:
        return conn.execute(select(func.count()).select_from(table)).scalar_one()


def _sorted(frame):
    return frame.sort_values(_SORT).reset_index(drop=True)


def test_round_trip_reproduces_the_served_frames(archive, market_state):
    """The point of the archive: stored contracts re-filter into what was served."""
    from storage import read, snapshots

    snapshot_id = snapshots.record(market_state, "BTC")
    stored = read.load_contracts(snapshot_id)

    assert_frame_equal(_sorted(stored), _sorted(market_state.contracts))
    assert_frame_equal(
        _sorted(prepare_otm_quotes(stored, market_state.spot)),
        _sorted(market_state.otm_quotes),
    )
    assert_frame_equal(
        _sorted(prepare_oi_chain(stored, market_state.spot)),
        _sorted(market_state.oi_chain),
    )


def test_record_stores_summary_scalars(archive, market_state):
    from storage import db, schema, snapshots

    snapshot_id = snapshots.record(market_state, "BTC")
    with db.connection() as conn:
        row = conn.execute(
            select(schema.snapshot_summary).where(
                schema.snapshot_summary.c.snapshot_id == snapshot_id
            )
        ).one()

    assert row.iv30 == pytest.approx(market_state.iv30)
    assert row.gex_flip == pytest.approx(market_state.gex_flip)


def test_record_is_idempotent(archive, market_state):
    from storage import schema, snapshots

    assert snapshots.record(market_state, "BTC") is not None
    assert snapshots.record(market_state, "BTC") is None
    assert _count(schema.snapshot) == 1
    assert _count(schema.contract) == len(market_state.contracts)


def test_prune_drops_aged_snapshots_whole(archive, market_state):
    from storage import retention, schema, snapshots

    now = datetime.now(timezone.utc)
    snapshots.record(_at(market_state, now - timedelta(days=400)), "BTC")
    kept = snapshots.record(_at(market_state, now - timedelta(days=10)), "BTC")

    contracts, snaps = retention.prune()

    assert snaps == 1
    assert contracts == len(market_state.contracts)
    assert _count(schema.snapshot) == 1
    # the survivor keeps its chain and its summary
    assert _count(schema.contract) == len(market_state.contracts)
    assert _count(schema.snapshot_summary) == 1

    from storage import read

    assert len(read.load_contracts(kept)) == len(market_state.contracts)


def test_prune_keeps_everything_inside_the_window(archive, market_state):
    from storage import retention, schema

    from storage import snapshots

    snapshots.record(_at(market_state, datetime.now(timezone.utc)), "BTC")
    assert retention.prune() == (0, 0)
    assert _count(schema.snapshot) == 1
