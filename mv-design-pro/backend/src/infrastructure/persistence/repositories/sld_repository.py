from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from infrastructure.persistence.models import SldDiagramORM


class SldRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def save(
        self,
        *,
        project_id: UUID,
        name: str,
        payload: dict,
        sld_id: UUID | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> UUID:
        sld_id = sld_id or uuid4()
        created_at = created_at or datetime.now(timezone.utc)
        updated_at = updated_at or created_at
        self._session.add(
            SldDiagramORM(
                id=sld_id,
                project_id=project_id,
                name=name,
                sld_jsonb=payload,
                created_at=created_at,
                updated_at=updated_at,
            )
        )
        self._session.commit()
        return sld_id

    def list_by_project(self, project_id: UUID) -> list[dict]:
        stmt = select(SldDiagramORM).where(SldDiagramORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            {
                "id": row.id,
                "project_id": row.project_id,
                "name": row.name,
                "payload": row.sld_jsonb,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in rows
        ]
