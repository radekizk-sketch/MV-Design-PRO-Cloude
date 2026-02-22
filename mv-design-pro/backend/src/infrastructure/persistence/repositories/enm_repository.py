"""
ENM Repository — persistent storage for EnergyNetworkModel.

Replaces in-memory _enm_store dict in api/enm.py.
One ENM per case_id (unique constraint).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from infrastructure.persistence.models import ENMModelORM


class ENMRepository:
    """Repository for EnergyNetworkModel persistence."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_case_id(self, case_id: str) -> dict[str, Any] | None:
        """Get ENM JSON for a case. Returns None if not found."""
        stmt = select(ENMModelORM).where(ENMModelORM.case_id == case_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return {
            "id": row.id,
            "case_id": row.case_id,
            "enm_json": row.enm_json,
            "revision": row.revision,
            "hash_sha256": row.hash_sha256,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }

    def upsert(
        self,
        case_id: str,
        enm_json: dict[str, Any],
        revision: int,
        hash_sha256: str,
        *,
        commit: bool = True,
    ) -> ENMModelORM:
        """Insert or update ENM for a case."""
        stmt = select(ENMModelORM).where(ENMModelORM.case_id == case_id)
        row = self._session.execute(stmt).scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if row is None:
            row = ENMModelORM(
                id=uuid4(),
                case_id=case_id,
                enm_json=enm_json,
                revision=revision,
                hash_sha256=hash_sha256,
                created_at=now,
                updated_at=now,
            )
            self._session.add(row)
        else:
            row.enm_json = enm_json
            row.revision = revision
            row.hash_sha256 = hash_sha256
            row.updated_at = now

        if commit:
            self._session.commit()
        return row

    def delete_by_case_id(self, case_id: str, *, commit: bool = True) -> bool:
        """Delete ENM for a case. Returns True if deleted."""
        stmt = select(ENMModelORM).where(ENMModelORM.case_id == case_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return False
        self._session.delete(row)
        if commit:
            self._session.commit()
        return True
