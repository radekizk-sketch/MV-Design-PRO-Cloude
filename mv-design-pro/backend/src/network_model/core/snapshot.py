"""
Snapshot metadata and serialization helpers for NetworkGraph.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable
from uuid import uuid4

from .branch import Branch
from .graph import NetworkGraph
from .inverter import InverterSource
from .node import Node


@dataclass(frozen=True)
class SnapshotMeta:
    """
    Backend-owned metadata for a domain snapshot.
    """

    snapshot_id: str
    parent_snapshot_id: str | None
    created_at: str
    schema_version: str | None = None

    @classmethod
    def create(
        cls,
        *,
        snapshot_id: str | None = None,
        parent_snapshot_id: str | None = None,
        created_at: str | None = None,
        schema_version: str | None = None,
    ) -> "SnapshotMeta":
        minted_snapshot_id = snapshot_id or str(uuid4())
        timestamp = created_at or datetime.now(timezone.utc).isoformat()
        return cls(
            snapshot_id=minted_snapshot_id,
            parent_snapshot_id=parent_snapshot_id,
            created_at=timestamp,
            schema_version=schema_version,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "snapshot_id": self.snapshot_id,
            "parent_snapshot_id": self.parent_snapshot_id,
            "created_at": self.created_at,
            "schema_version": self.schema_version,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SnapshotMeta":
        return cls(
            snapshot_id=str(data["snapshot_id"]),
            parent_snapshot_id=data.get("parent_snapshot_id"),
            created_at=str(data["created_at"]),
            schema_version=data.get("schema_version"),
        )


@dataclass(frozen=True)
class NetworkSnapshot:
    """
    Immutable view of a network graph snapshot with lineage metadata.
    """

    meta: SnapshotMeta
    graph: NetworkGraph

    def to_dict(self) -> dict[str, Any]:
        return {
            "meta": self.meta.to_dict(),
            "graph": _graph_to_dict(self.graph),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NetworkSnapshot":
        meta_data = data.get("meta")
        if meta_data is None:
            meta_data = {
                "snapshot_id": data.get("snapshot_id"),
                "parent_snapshot_id": data.get("parent_snapshot_id"),
                "created_at": data.get("created_at"),
                "schema_version": data.get("schema_version"),
            }
        meta = SnapshotMeta.from_dict(meta_data)
        graph = _graph_from_dict(data.get("graph", data))
        return cls(meta=meta, graph=graph)


def create_network_snapshot(
    graph: NetworkGraph,
    *,
    parent_snapshot: NetworkSnapshot | None = None,
    parent_snapshot_id: str | None = None,
    snapshot_id: str | None = None,
    created_at: str | None = None,
    schema_version: str | None = None,
) -> NetworkSnapshot:
    parent_id = parent_snapshot_id
    if parent_id is None and parent_snapshot is not None:
        parent_id = parent_snapshot.meta.snapshot_id
    meta = SnapshotMeta.create(
        snapshot_id=snapshot_id,
        parent_snapshot_id=parent_id,
        created_at=created_at,
        schema_version=schema_version,
    )
    return NetworkSnapshot(meta=meta, graph=graph)


def _graph_to_dict(graph: NetworkGraph) -> dict[str, Any]:
    nodes = _sorted_by_id(graph.nodes.values())
    branches = _sorted_by_id(graph.branches.values())
    inverters = _sorted_by_id(graph.inverter_sources.values())
    return {
        "nodes": [node.to_dict() for node in nodes],
        "branches": [branch.to_dict() for branch in branches],
        "inverter_sources": [source.to_dict() for source in inverters],
        "pcc_node_id": graph.pcc_node_id,
    }


def _graph_from_dict(data: dict[str, Any]) -> NetworkGraph:
    graph = NetworkGraph()
    graph.pcc_node_id = data.get("pcc_node_id")
    for node_data in data.get("nodes", []):
        graph.add_node(Node.from_dict(node_data))
    for branch_data in data.get("branches", []):
        graph.add_branch(Branch.from_dict(branch_data))
    for source_data in data.get("inverter_sources", []):
        graph.add_inverter_source(InverterSource.from_dict(source_data))
    return graph


def _sorted_by_id(values: Iterable[Any]) -> list[Any]:
    return sorted(values, key=lambda item: item.id)
