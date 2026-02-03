from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from domain.models import Project
from infrastructure.persistence.models import (
    ProjectORM,
    StudyCaseORM,
    OperatingCaseORM,
    AnalysisRunORM,
)


class ProjectRepository:
    """
    Data access layer for projects.

    Supports soft delete: deleted_at IS NULL = active projects.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, project: Project, *, commit: bool = True) -> ProjectORM:
        """Add a new project to the database."""
        orm = ProjectORM(
            id=project.id,
            name=project.name,
            description=project.description,
            schema_version=project.schema_version,
            mode=project.mode,
            voltage_level_kv=project.voltage_level_kv,
            frequency_hz=project.frequency_hz,
            pcc_node_id=project.pcc_node_id,
            pcc_description=project.pcc_description,
            owner_id=project.owner_id,
            active_network_snapshot_id=project.active_network_snapshot_id,
            sources_jsonb=[],
            created_at=project.created_at,
            updated_at=project.updated_at,
            deleted_at=None,
        )
        self._session.add(orm)
        if commit:
            self._session.commit()
        return orm

    def get(self, project_id: UUID) -> Project | None:
        """Get an active project by ID (soft delete aware)."""
        stmt = select(ProjectORM).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        result = self._session.execute(stmt).scalar_one_or_none()
        if result is None:
            return None
        return self._orm_to_domain(result)

    def get_orm(self, project_id: UUID) -> ProjectORM | None:
        """Get raw ORM object (for API responses with from_attributes)."""
        stmt = select(ProjectORM).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[Project]:
        """List all active projects (soft delete aware)."""
        stmt = (
            select(ProjectORM)
            .where(ProjectORM.deleted_at.is_(None))
            .order_by(ProjectORM.created_at.desc())
        )
        rows = self._session.execute(stmt).scalars().all()
        return [self._orm_to_domain(row) for row in rows]

    def list_all_orm(self) -> list[ProjectORM]:
        """List all active projects as ORM objects (for API responses)."""
        stmt = (
            select(ProjectORM)
            .where(ProjectORM.deleted_at.is_(None))
            .order_by(ProjectORM.created_at.desc())
        )
        return list(self._session.execute(stmt).scalars().all())

    def update(self, project: Project, *, commit: bool = True) -> None:
        """Update an existing project."""
        stmt = select(ProjectORM).where(
            ProjectORM.id == project.id,
            ProjectORM.deleted_at.is_(None),
        )
        row = self._session.execute(stmt).scalar_one()
        row.name = project.name
        row.description = project.description
        row.schema_version = project.schema_version
        row.mode = project.mode
        row.voltage_level_kv = project.voltage_level_kv
        row.frequency_hz = project.frequency_hz
        row.pcc_node_id = project.pcc_node_id
        row.pcc_description = project.pcc_description
        row.owner_id = project.owner_id
        row.active_network_snapshot_id = project.active_network_snapshot_id
        row.updated_at = project.updated_at
        if commit:
            self._session.commit()

    def delete(self, project_id: UUID, *, commit: bool = True) -> None:
        """Hard delete a project (use soft_delete for normal operations)."""
        stmt = select(ProjectORM).where(ProjectORM.id == project_id)
        row = self._session.execute(stmt).scalar_one()
        self._session.delete(row)
        if commit:
            self._session.commit()

    def soft_delete(self, project_id: UUID, *, commit: bool = True) -> bool:
        """
        Soft delete a project by setting deleted_at timestamp.

        Returns True if project was deleted, False if not found.
        """
        stmt = select(ProjectORM).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return False
        row.deleted_at = datetime.now(timezone.utc)
        if commit:
            self._session.commit()
        return True

    def has_dependencies(self, project_id: UUID) -> bool:
        """
        Check if project has dependencies (study cases, operating cases, analysis runs).

        Returns True if project has active dependent objects.
        """
        # Check study cases
        study_case_count = (
            self._session.execute(
                select(func.count())
                .select_from(StudyCaseORM)
                .where(StudyCaseORM.project_id == project_id)
            )
            .scalar_one()
        )
        if study_case_count > 0:
            return True

        # Check operating cases
        operating_case_count = (
            self._session.execute(
                select(func.count())
                .select_from(OperatingCaseORM)
                .where(OperatingCaseORM.project_id == project_id)
            )
            .scalar_one()
        )
        if operating_case_count > 0:
            return True

        # Check analysis runs
        analysis_run_count = (
            self._session.execute(
                select(func.count())
                .select_from(AnalysisRunORM)
                .where(AnalysisRunORM.project_id == project_id)
            )
            .scalar_one()
        )
        if analysis_run_count > 0:
            return True

        return False

    def get_pcc(self, project_id: UUID) -> UUID | None:
        """Get PCC node ID for a project."""
        stmt = select(ProjectORM.pcc_node_id).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def set_pcc(self, project_id: UUID, node_id: UUID | None, *, commit: bool = True) -> None:
        """Set PCC node ID for a project."""
        stmt = select(ProjectORM).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        row = self._session.execute(stmt).scalar_one()
        row.pcc_node_id = node_id
        if commit:
            self._session.commit()

    def get_sources(self, project_id: UUID) -> list[dict]:
        """Get sources JSON for a project."""
        stmt = select(ProjectORM.sources_jsonb).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        result = self._session.execute(stmt).scalar_one_or_none()
        return list(result or [])

    def set_sources(
        self, project_id: UUID, sources: list[dict], *, commit: bool = True
    ) -> None:
        """Set sources JSON for a project."""
        stmt = select(ProjectORM).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        row = self._session.execute(stmt).scalar_one()
        row.sources_jsonb = sources
        if commit:
            self._session.commit()

    # P10a: Active network snapshot management
    def get_active_snapshot_id(self, project_id: UUID) -> str | None:
        """P10a: Get the active network snapshot ID for a project."""
        stmt = select(ProjectORM.active_network_snapshot_id).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def set_active_snapshot_id(
        self, project_id: UUID, snapshot_id: str | None, *, commit: bool = True
    ) -> None:
        """P10a: Set the active network snapshot ID for a project."""
        stmt = select(ProjectORM).where(
            ProjectORM.id == project_id,
            ProjectORM.deleted_at.is_(None),
        )
        row = self._session.execute(stmt).scalar_one()
        row.active_network_snapshot_id = snapshot_id
        if commit:
            self._session.commit()

    def _orm_to_domain(self, orm: ProjectORM) -> Project:
        """Convert ORM object to domain model."""
        return Project(
            id=orm.id,
            name=orm.name,
            description=orm.description,
            schema_version=orm.schema_version,
            mode=orm.mode,
            voltage_level_kv=float(orm.voltage_level_kv),
            frequency_hz=float(orm.frequency_hz),
            pcc_node_id=orm.pcc_node_id,
            pcc_description=orm.pcc_description,
            owner_id=orm.owner_id,
            active_network_snapshot_id=orm.active_network_snapshot_id,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
            deleted_at=orm.deleted_at,
        )
