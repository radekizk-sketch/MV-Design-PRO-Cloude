from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from domain.analysis_run import AnalysisRun
from infrastructure.persistence.models import AnalysisRunORM
from infrastructure.persistence.time_utils import ensure_utc


class AnalysisRunRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, run: AnalysisRun) -> None:
        self._session.add(
            AnalysisRunORM(
                id=run.id,
                project_id=run.project_id,
                operating_case_id=run.operating_case_id,
                analysis_type=run.analysis_type,
                status=run.status,
                created_at=ensure_utc(run.created_at),
                started_at=ensure_utc(run.started_at),
                finished_at=ensure_utc(run.finished_at),
                input_snapshot=run.input_snapshot,
                input_hash=run.input_hash,
                result_summary=run.result_summary,
                error_message=run.error_message,
            )
        )
        self._session.commit()

    def get(self, run_id: UUID) -> AnalysisRun | None:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        return self._to_domain(row) if row else None

    def list_by_project(
        self, project_id: UUID, filters: dict[str, Any] | None = None
    ) -> list[AnalysisRun]:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.project_id == project_id)
        filters = filters or {}
        if analysis_type := filters.get("analysis_type"):
            stmt = stmt.where(AnalysisRunORM.analysis_type == analysis_type)
        if status := filters.get("status"):
            stmt = stmt.where(AnalysisRunORM.status == status)
        if operating_case_id := filters.get("operating_case_id"):
            stmt = stmt.where(AnalysisRunORM.operating_case_id == operating_case_id)
        rows = self._session.execute(stmt).scalars().all()
        return [self._to_domain(row) for row in rows]

    def get_by_deterministic_key(
        self,
        project_id: UUID,
        operating_case_id: UUID,
        analysis_type: str,
        input_hash: str,
    ) -> AnalysisRun | None:
        stmt = (
            select(AnalysisRunORM)
            .where(AnalysisRunORM.project_id == project_id)
            .where(AnalysisRunORM.operating_case_id == operating_case_id)
            .where(AnalysisRunORM.analysis_type == analysis_type)
            .where(AnalysisRunORM.input_hash == input_hash)
        )
        row = self._session.execute(stmt).scalar_one_or_none()
        return self._to_domain(row) if row else None

    def update_status(
        self,
        run_id: UUID,
        status: str,
        *,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        error_message: str | None = None,
        result_summary: dict | None = None,
    ) -> AnalysisRun:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one()
        row.status = status
        if started_at is not None:
            row.started_at = ensure_utc(started_at)
        if finished_at is not None:
            row.finished_at = ensure_utc(finished_at)
        if error_message is not None or status == "FAILED":
            row.error_message = error_message
        if result_summary is not None:
            row.result_summary = result_summary
        self._session.commit()
        return self._to_domain(row)

    def _to_domain(self, row: AnalysisRunORM) -> AnalysisRun:
        return AnalysisRun(
            id=row.id,
            project_id=row.project_id,
            operating_case_id=row.operating_case_id,
            analysis_type=row.analysis_type,
            status=row.status,
            created_at=ensure_utc(row.created_at),
            started_at=ensure_utc(row.started_at),
            finished_at=ensure_utc(row.finished_at),
            input_snapshot=row.input_snapshot,
            input_hash=row.input_hash,
            result_summary=row.result_summary,
            error_message=row.error_message,
        )
