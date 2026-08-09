"""Report routes: market overview note."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query

from api.responses import records
from api.schemas.report import ReportDetail, ReportListItem, ReportListResponse
from data.report import scheduler
from data.storage import report as storage

router = APIRouter(prefix="/report", tags=["report"])


@router.get("/weekly")
def get_reports(limit: int = Query(52, ge=1, le=520)) -> ReportListResponse:
    """Stored weekly reports, newest first - listing metadata only."""
    return ReportListResponse(reports=records(storage.list_reports(limit), ReportListItem))


@router.get("/weekly/{report_id}")
def get_report(report_id: int) -> ReportDetail:
    """One stored report with its full payload."""
    row = storage.get_report(report_id)
    if row is None:
        raise HTTPException(status_code=404, detail="no such report")
    return ReportDetail(**row, next_report_at=scheduler.next_run(datetime.now(UTC)))
