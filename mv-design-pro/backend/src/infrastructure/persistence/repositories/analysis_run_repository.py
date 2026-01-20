from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from domain.analysis_run import AnalysisRun
from infrastructure.persistence.models import AnalysisRunORM
from infrastructure.persistence.time_utils import ensure_utc


class AnalysisRunRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, run: AnalysisRun) -> None:
        self._session.add(
            AnalysisRunORM(
                id=run.id,
                project_id=run.project_id,
                case_id=run.case_id,
                analysis_type=run.analysis_type,
                status=run.status,
                input_snapshot_jsonb=run.input_snapshot_json,
                input_hash=run.input_hash,
                result_summary_jsonb=run.result_summary_json,
                error_message=run.error_message,
                created_at=ensure_utc(run.created_at),
                updated_at=ensure_utc(run.updated_at),
                finished_at=ensure_utc(run.finished_at),
            )
        )
        self._session.commit()

    def get(self, run_id: UUID) -> AnalysisRun | None:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return AnalysisRun(
            id=row.id,
            project_id=row.project_id,
            case_id=row.case_id,
            analysis_type=row.analysis_type,
            status=row.status,
            input_snapshot_json=row.input_snapshot_jsonb,
            input_hash=row.input_hash,
            result_summary_json=row.result_summary_jsonb,
            error_message=row.error_message,
            created_at=ensure_utc(row.created_at),
            updated_at=ensure_utc(row.updated_at),
            finished_at=ensure_utc(row.finished_at),
        )

    def list_by_project(
        self, project_id: UUID, analysis_type: str | None = None
    ) -> list[AnalysisRun]:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.project_id == project_id)
        if analysis_type:
            stmt = stmt.where(AnalysisRunORM.analysis_type == analysis_type)
        stmt = stmt.order_by(AnalysisRunORM.created_at, AnalysisRunORM.id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            AnalysisRun(
                id=row.id,
                project_id=row.project_id,
                case_id=row.case_id,
                analysis_type=row.analysis_type,
                status=row.status,
                input_snapshot_json=row.input_snapshot_jsonb,
                input_hash=row.input_hash,
                result_summary_json=row.result_summary_jsonb,
                error_message=row.error_message,
                created_at=ensure_utc(row.created_at),
                updated_at=ensure_utc(row.updated_at),
                finished_at=ensure_utc(row.finished_at),
            )
            for row in rows
        ]

    def update(self, run: AnalysisRun) -> None:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.id == run.id)
        row = self._session.execute(stmt).scalar_one()
        row.project_id = run.project_id
        row.case_id = run.case_id
        row.analysis_type = run.analysis_type
        row.status = run.status
        row.input_snapshot_jsonb = run.input_snapshot_json
        row.input_hash = run.input_hash
        row.result_summary_jsonb = run.result_summary_json
        row.error_message = run.error_message
        row.created_at = ensure_utc(run.created_at)
        row.updated_at = ensure_utc(run.updated_at)
        row.finished_at = ensure_utc(run.finished_at)
        self._session.commit()

    def update_status(
        self,
        run_id: UUID,
        status: str,
        *,
        result_summary: dict | None = None,
        error_message: str | None = None,
        finished_at: datetime | None = None,
    ) -> None:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one()
        row.status = status
        row.result_summary_jsonb = result_summary
        row.error_message = error_message
        row.finished_at = ensure_utc(finished_at)
        row.updated_at = ensure_utc(datetime.now(timezone.utc))
        self._session.commit()
