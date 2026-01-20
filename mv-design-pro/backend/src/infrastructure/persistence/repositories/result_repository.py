from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from infrastructure.persistence.models import StudyResultORM


class ResultRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add_result(
        self,
        *,
        run_id: UUID,
        project_id: UUID,
        result_type: str,
        payload: dict,
        result_id: UUID | None = None,
        created_at: datetime | None = None,
    ) -> UUID:
        result_id = result_id or uuid4()
        created_at = created_at or datetime.now(timezone.utc)
        self._session.add(
            StudyResultORM(
                id=result_id,
                run_id=run_id,
                project_id=project_id,
                result_type=result_type,
                result_jsonb=payload,
                created_at=created_at,
            )
        )
        self._session.commit()
        return result_id

    def list_results(self, run_id: UUID) -> list[dict]:
        stmt = (
            select(StudyResultORM)
            .where(StudyResultORM.run_id == run_id)
            .order_by(StudyResultORM.created_at, StudyResultORM.id)
        )
        rows = self._session.execute(stmt).scalars().all()
        return [
            {
                "id": row.id,
                "run_id": row.run_id,
                "project_id": row.project_id,
                "result_type": row.result_type,
                "payload": row.result_jsonb,
                "created_at": row.created_at,
            }
            for row in rows
        ]
