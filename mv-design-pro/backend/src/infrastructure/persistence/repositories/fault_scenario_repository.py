"""
FaultScenario Repository — persistent storage for fault scenarios.

Replaces in-memory _scenarios dict in application/fault_scenario_service.py.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from infrastructure.persistence.models import FaultScenarioORM


class FaultScenarioRepository:
    """Repository for FaultScenario persistence."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(
        self,
        scenario_id: UUID,
        study_case_id: UUID,
        name: str,
        fault_type: str,
        config_json: dict[str, Any],
        content_hash: str,
        *,
        commit: bool = True,
    ) -> FaultScenarioORM:
        """Persist a new fault scenario."""
        now = datetime.now(timezone.utc)
        row = FaultScenarioORM(
            id=scenario_id,
            study_case_id=study_case_id,
            name=name,
            fault_type=fault_type,
            config_json=config_json,
            content_hash=content_hash,
            created_at=now,
            updated_at=now,
        )
        self._session.add(row)
        if commit:
            self._session.commit()
        return row

    def get(self, scenario_id: UUID) -> dict[str, Any] | None:
        """Get a fault scenario by ID. Returns None if not found."""
        stmt = select(FaultScenarioORM).where(FaultScenarioORM.id == scenario_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return self._orm_to_dict(row)

    def list_by_case(self, study_case_id: UUID) -> list[dict[str, Any]]:
        """List all fault scenarios for a study case, sorted by (fault_type, name)."""
        stmt = (
            select(FaultScenarioORM)
            .where(FaultScenarioORM.study_case_id == study_case_id)
            .order_by(FaultScenarioORM.fault_type, FaultScenarioORM.name)
        )
        rows = self._session.execute(stmt).scalars().all()
        return [self._orm_to_dict(row) for row in rows]

    def update(
        self,
        scenario_id: UUID,
        *,
        name: str | None = None,
        fault_type: str | None = None,
        config_json: dict[str, Any] | None = None,
        content_hash: str | None = None,
        commit: bool = True,
    ) -> bool:
        """Update a fault scenario. Returns True if found and updated."""
        stmt = select(FaultScenarioORM).where(FaultScenarioORM.id == scenario_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return False

        if name is not None:
            row.name = name
        if fault_type is not None:
            row.fault_type = fault_type
        if config_json is not None:
            row.config_json = config_json
        if content_hash is not None:
            row.content_hash = content_hash
        row.updated_at = datetime.now(timezone.utc)

        if commit:
            self._session.commit()
        return True

    def delete(self, scenario_id: UUID, *, commit: bool = True) -> bool:
        """Delete a fault scenario. Returns True if deleted."""
        stmt = select(FaultScenarioORM).where(FaultScenarioORM.id == scenario_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return False
        self._session.delete(row)
        if commit:
            self._session.commit()
        return True

    def has_duplicate_hash(
        self, study_case_id: UUID, content_hash: str, exclude_id: UUID | None = None
    ) -> bool:
        """Check if a scenario with the same content_hash exists for the case."""
        stmt = select(FaultScenarioORM).where(
            FaultScenarioORM.study_case_id == study_case_id,
            FaultScenarioORM.content_hash == content_hash,
        )
        if exclude_id is not None:
            stmt = stmt.where(FaultScenarioORM.id != exclude_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        return row is not None

    def _orm_to_dict(self, row: FaultScenarioORM) -> dict[str, Any]:
        return {
            "id": row.id,
            "study_case_id": row.study_case_id,
            "name": row.name,
            "fault_type": row.fault_type,
            "config_json": row.config_json,
            "content_hash": row.content_hash,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
