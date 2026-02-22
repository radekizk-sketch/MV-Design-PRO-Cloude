"""
BatchJob Repository — persistent storage for batch execution jobs.

Replaces in-memory _batches dict in application/batch_execution_service.py.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from infrastructure.persistence.models import BatchJobORM


class BatchJobRepository:
    """Repository for BatchJob persistence."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(
        self,
        batch_id: UUID,
        study_case_id: UUID,
        analysis_type: str,
        jobs_json: dict[str, Any],
        *,
        commit: bool = True,
    ) -> BatchJobORM:
        """Persist a new batch job in PENDING status."""
        now = datetime.now(timezone.utc)
        row = BatchJobORM(
            id=batch_id,
            study_case_id=study_case_id,
            analysis_type=analysis_type,
            status="PENDING",
            jobs_json=jobs_json,
            created_at=now,
        )
        self._session.add(row)
        if commit:
            self._session.commit()
        return row

    def get(self, batch_id: UUID) -> dict[str, Any] | None:
        """Get a batch job by ID. Returns None if not found."""
        stmt = select(BatchJobORM).where(BatchJobORM.id == batch_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return self._orm_to_dict(row)

    def list_by_case(self, study_case_id: UUID) -> list[dict[str, Any]]:
        """List all batch jobs for a study case, newest first."""
        stmt = (
            select(BatchJobORM)
            .where(BatchJobORM.study_case_id == study_case_id)
            .order_by(BatchJobORM.created_at.desc())
        )
        rows = self._session.execute(stmt).scalars().all()
        return [self._orm_to_dict(row) for row in rows]

    def update_status(
        self,
        batch_id: UUID,
        status: str,
        *,
        jobs_json: dict[str, Any] | None = None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        commit: bool = True,
    ) -> bool:
        """Update batch job status and optional fields. Returns True if found."""
        stmt = select(BatchJobORM).where(BatchJobORM.id == batch_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return False

        row.status = status
        if jobs_json is not None:
            row.jobs_json = jobs_json
        if started_at is not None:
            row.started_at = started_at
        if finished_at is not None:
            row.finished_at = finished_at

        if commit:
            self._session.commit()
        return True

    def delete(self, batch_id: UUID, *, commit: bool = True) -> bool:
        """Delete a batch job. Returns True if deleted."""
        stmt = select(BatchJobORM).where(BatchJobORM.id == batch_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return False
        self._session.delete(row)
        if commit:
            self._session.commit()
        return True

    def _orm_to_dict(self, row: BatchJobORM) -> dict[str, Any]:
        return {
            "id": row.id,
            "study_case_id": row.study_case_id,
            "analysis_type": row.analysis_type,
            "status": row.status,
            "jobs_json": row.jobs_json,
            "started_at": row.started_at.isoformat() if row.started_at else None,
            "finished_at": row.finished_at.isoformat() if row.finished_at else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
