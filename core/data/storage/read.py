"""Reading archived chains back into the frames the domain builders expect."""

from __future__ import annotations

import pandas as pd
from sqlalchemy import select

from data.market.chain import CONTRACT_COLUMNS, as_declared_dtypes, empty_contracts
from data.storage import db, schema


def _typed(frame: pd.DataFrame) -> pd.DataFrame:
    """Restore the dtypes ``prepare_contracts`` produces, so filters can be re-applied."""
    if frame.empty:
        return empty_contracts()
    return as_declared_dtypes(frame[CONTRACT_COLUMNS]).reset_index(drop=True)


def load_contracts(snapshot_id: int) -> pd.DataFrame:
    """The stored book for one snapshot, in ``CONTRACT_COLUMNS`` order.

    Feeding this through ``prepare_otm_quotes`` / ``prepare_oi_chain`` reproduces the
    frames the service served at capture time.
    """
    stmt = (
        select(*(schema.contract.c[column] for column in CONTRACT_COLUMNS))
        .where(schema.contract.c.snapshot_id == snapshot_id)
        .order_by(schema.contract.c.expiry, schema.contract.c.strike, schema.contract.c.option_type)
    )
    with db.connection() as conn:
        result = conn.execute(stmt).fetchall()
    return _typed(pd.DataFrame(result, columns=CONTRACT_COLUMNS))
