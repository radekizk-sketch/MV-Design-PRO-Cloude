from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from domain.analysis_run import AnalysisRun
from infrastructure.persistence.models import AnalysisRunORM


class AnalysisRunRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, run: AnalysisRun, *, commit: bool = True) -> AnalysisRun:
        self._session.add(
            AnalysisRunORM(
                id=run.id,
                project_id=run.project_id,
                case_id=run.case_id,
                analysis_type=run.analysis_type,
                status=run.status,
                input_snapshot_jsonb=run.input_snapshot_json,
                result_summary_jsonb=run.result_summary_json,
                error_message=run.error_message,
                created_at=run.created_at,
                updated_at=run.updated_at,
            )
        )
        if commit:
            self._session.commit()
        return run

    def get(self, run_id: UUID) -> AnalysisRun | None:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return self._from_row(row)

    def list(
        self, project_id: UUID, analysis_type: str | None = None
    ) -> list[AnalysisRun]:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.project_id == project_id)
        if analysis_type:
            stmt = stmt.where(AnalysisRunORM.analysis_type == analysis_type)
        rows = self._session.execute(stmt).scalars().all()
        return [self._from_row(row) for row in rows]

    def update_status(
        self,
        run_id: UUID,
        status: str,
        *,
        result_summary: dict | None = None,
        error: str | None = None,
        commit: bool = True,
    ) -> AnalysisRun:
        stmt = select(AnalysisRunORM).where(AnalysisRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            raise ValueError(f"AnalysisRun {run_id} not found")
        row.status = status
        row.updated_at = datetime.now(timezone.utc)
        if result_summary is not None:
            row.result_summary_jsonb = result_summary
        if error is not None:
            row.error_message = error
        if commit:
            self._session.commit()
        return self._from_row(row)

    @staticmethod
    def _from_row(row: AnalysisRunORM) -> AnalysisRun:
        return AnalysisRun(
            id=row.id,
            project_id=row.project_id,
            case_id=row.case_id,
            analysis_type=row.analysis_type,
            status=row.status,
            input_snapshot_json=row.input_snapshot_jsonb,
            result_summary_json=row.result_summary_jsonb,
            error_message=row.error_message,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
