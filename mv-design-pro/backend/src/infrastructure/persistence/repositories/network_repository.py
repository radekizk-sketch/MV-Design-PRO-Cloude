from __future__ import annotations

from typing import Iterable
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from infrastructure.persistence.models import NetworkBranchORM, NetworkNodeORM


class NetworkRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def replace_nodes(self, project_id: UUID, nodes: Iterable[dict]) -> None:
        self._session.execute(delete(NetworkNodeORM).where(NetworkNodeORM.project_id == project_id))
        for node in nodes:
            self._session.add(
                NetworkNodeORM(
                    id=node["id"],
                    project_id=project_id,
                    name=node["name"],
                    node_type=node["node_type"],
                    base_kv=node["base_kv"],
                    attrs_jsonb=node.get("attrs", {}),
                )
            )
        self._session.commit()

    def replace_branches(self, project_id: UUID, branches: Iterable[dict]) -> None:
        self._session.execute(
            delete(NetworkBranchORM).where(NetworkBranchORM.project_id == project_id)
        )
        for branch in branches:
            self._session.add(
                NetworkBranchORM(
                    id=branch["id"],
                    project_id=project_id,
                    name=branch["name"],
                    branch_type=branch["branch_type"],
                    from_node_id=branch["from_node_id"],
                    to_node_id=branch["to_node_id"],
                    in_service=branch.get("in_service", True),
                    params_jsonb=branch.get("params", {}),
                )
            )
        self._session.commit()

    def list_nodes(self, project_id: UUID) -> list[dict]:
        stmt = select(NetworkNodeORM).where(NetworkNodeORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            {
                "id": row.id,
                "project_id": row.project_id,
                "name": row.name,
                "node_type": row.node_type,
                "base_kv": row.base_kv,
                "attrs": row.attrs_jsonb,
            }
            for row in rows
        ]

    def list_branches(self, project_id: UUID) -> list[dict]:
        stmt = select(NetworkBranchORM).where(NetworkBranchORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            {
                "id": row.id,
                "project_id": row.project_id,
                "name": row.name,
                "branch_type": row.branch_type,
                "from_node_id": row.from_node_id,
                "to_node_id": row.to_node_id,
                "in_service": row.in_service,
                "params": row.params_jsonb,
            }
            for row in rows
        ]
