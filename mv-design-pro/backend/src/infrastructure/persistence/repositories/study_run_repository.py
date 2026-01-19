from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from domain.models import StudyRun
from infrastructure.persistence.models import StudyRunORM


class StudyRunRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, run: StudyRun) -> None:
        self._session.add(
            StudyRunORM(
                id=run.id,
                project_id=run.project_id,
                case_id=run.case_id,
                analysis_type=run.analysis_type,
                input_hash=run.input_hash,
                status=run.status,
                started_at=run.started_at,
                finished_at=run.finished_at,
            )
        )
        self._session.commit()

    def get(self, run_id: UUID) -> StudyRun | None:
        stmt = select(StudyRunORM).where(StudyRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return StudyRun(
            id=row.id,
            project_id=row.project_id,
            case_id=row.case_id,
            analysis_type=row.analysis_type,
            input_hash=row.input_hash,
            status=row.status,
            started_at=row.started_at,
            finished_at=row.finished_at,
        )

    def update_status(self, run_id: UUID, status: str, finished_at: datetime | None = None) -> None:
        stmt = select(StudyRunORM).where(StudyRunORM.id == run_id)
        row = self._session.execute(stmt).scalar_one()
        row.status = status
        row.finished_at = finished_at
        self._session.commit()

    def list_by_project(self, project_id: UUID) -> list[StudyRun]:
        stmt = select(StudyRunORM).where(StudyRunORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            StudyRun(
                id=row.id,
                project_id=row.project_id,
                case_id=row.case_id,
                analysis_type=row.analysis_type,
                input_hash=row.input_hash,
                status=row.status,
                started_at=row.started_at,
                finished_at=row.finished_at,
            )
            for row in rows
        ]
