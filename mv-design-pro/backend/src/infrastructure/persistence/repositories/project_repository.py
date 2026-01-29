from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from domain.models import Project
from infrastructure.persistence.models import ProjectORM


class ProjectRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, project: Project, *, commit: bool = True) -> None:
        self._session.add(
            ProjectORM(
                id=project.id,
                name=project.name,
                description=project.description,
                schema_version=project.schema_version,
                active_network_snapshot_id=project.active_network_snapshot_id,  # P10a
                pcc_node_id=None,
                sources_jsonb=[],
                created_at=project.created_at,
                updated_at=project.updated_at,
            )
        )
        if commit:
            self._session.commit()

    def get(self, project_id: UUID) -> Project | None:
        stmt = select(ProjectORM).where(ProjectORM.id == project_id)
        result = self._session.execute(stmt).scalar_one_or_none()
        if result is None:
            return None
        return Project(
            id=result.id,
            name=result.name,
            description=result.description,
            schema_version=result.schema_version,
            active_network_snapshot_id=result.active_network_snapshot_id,  # P10a
            created_at=result.created_at,
            updated_at=result.updated_at,
        )

    def list_all(self) -> list[Project]:
        stmt = select(ProjectORM).order_by(ProjectORM.created_at)
        rows = self._session.execute(stmt).scalars().all()
        return [
            Project(
                id=row.id,
                name=row.name,
                description=row.description,
                schema_version=row.schema_version,
                active_network_snapshot_id=row.active_network_snapshot_id,  # P10a
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

    def update(self, project: Project, *, commit: bool = True) -> None:
        stmt = select(ProjectORM).where(ProjectORM.id == project.id)
        row = self._session.execute(stmt).scalar_one()
        row.name = project.name
        row.description = project.description
        row.schema_version = project.schema_version
        row.active_network_snapshot_id = project.active_network_snapshot_id  # P10a
        row.updated_at = project.updated_at
        if commit:
            self._session.commit()

    def delete(self, project_id: UUID, *, commit: bool = True) -> None:
        stmt = select(ProjectORM).where(ProjectORM.id == project_id)
        row = self._session.execute(stmt).scalar_one()
        self._session.delete(row)
        if commit:
            self._session.commit()

    def get_pcc(self, project_id: UUID) -> UUID | None:
        stmt = select(ProjectORM.pcc_node_id).where(ProjectORM.id == project_id)
        return self._session.execute(stmt).scalar_one_or_none()

    def set_pcc(self, project_id: UUID, node_id: UUID | None, *, commit: bool = True) -> None:
        stmt = select(ProjectORM).where(ProjectORM.id == project_id)
        row = self._session.execute(stmt).scalar_one()
        row.pcc_node_id = node_id
        if commit:
            self._session.commit()

    def get_sources(self, project_id: UUID) -> list[dict]:
        stmt = select(ProjectORM.sources_jsonb).where(ProjectORM.id == project_id)
        result = self._session.execute(stmt).scalar_one_or_none()
        return list(result or [])

    def set_sources(
        self, project_id: UUID, sources: list[dict], *, commit: bool = True
    ) -> None:
        stmt = select(ProjectORM).where(ProjectORM.id == project_id)
        row = self._session.execute(stmt).scalar_one()
        row.sources_jsonb = sources
        if commit:
            self._session.commit()

    # P10a: Active network snapshot management
    def get_active_snapshot_id(self, project_id: UUID) -> str | None:
        """P10a: Get the active network snapshot ID for a project."""
        stmt = select(ProjectORM.active_network_snapshot_id).where(ProjectORM.id == project_id)
        return self._session.execute(stmt).scalar_one_or_none()

    def set_active_snapshot_id(
        self, project_id: UUID, snapshot_id: str | None, *, commit: bool = True
    ) -> None:
        """P10a: Set the active network snapshot ID for a project."""
        stmt = select(ProjectORM).where(ProjectORM.id == project_id)
        row = self._session.execute(stmt).scalar_one()
        row.active_network_snapshot_id = snapshot_id
        if commit:
            self._session.commit()
