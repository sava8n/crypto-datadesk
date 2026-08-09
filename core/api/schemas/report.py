"""Response models for the report routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from data.report.schema import ReportPayload


class ReportListItem(BaseModel):
    id: int
    generated_at: datetime
    headline: str


class ReportListResponse(BaseModel):
    reports: list[ReportListItem]


class ReportDetail(BaseModel):
    id: int
    generated_at: datetime
    # computed from the schedule, feeds the dashboard's "next weekly note" row
    next_report_at: datetime
    payload: ReportPayload
