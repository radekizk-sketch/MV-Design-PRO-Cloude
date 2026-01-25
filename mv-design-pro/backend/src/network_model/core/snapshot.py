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
from .switch import Switch


@dataclass(frozen=True)
class SnapshotMeta:
    """
    Backend-owned metadata for a domain snapshot.
    """

    snapshot_id: str
    parent_snapshot_id: str | None
    created_at: str
    schema_version: str | None = None
    network_model_id: str | None = None

    @classmethod
    def create(
        cls,
        *,
        snapshot_id: str | None = None,
        parent_snapshot_id: str | None = None,
        created_at: str | None = None,
        schema_version: str | None = None,
        network_model_id: str | None = None,
    ) -> "SnapshotMeta":
        minted_snapshot_id = snapshot_id or str(uuid4())
        timestamp = created_at or datetime.now(timezone.utc).isoformat()
        return cls(
            snapshot_id=minted_snapshot_id,
            parent_snapshot_id=parent_snapshot_id,
            created_at=timestamp,
            schema_version=schema_version,
            network_model_id=network_model_id,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "snapshot_id": self.snapshot_id,
            "parent_snapshot_id": self.parent_snapshot_id,
            "created_at": self.created_at,
            "schema_version": self.schema_version,
            "network_model_id": self.network_model_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SnapshotMeta":
        return cls(
            snapshot_id=str(data["snapshot_id"]),
            parent_snapshot_id=data.get("parent_snapshot_id"),
            created_at=str(data["created_at"]),
            schema_version=data.get("schema_version"),
            network_model_id=data.get("network_model_id"),
        )


@dataclass(frozen=True)
class NetworkSnapshot:
    """
    Immutable view of a network graph snapshot with lineage metadata.

    Notes:
        NetworkSnapshot is a read-only projection of a single NetworkModel.
        The associated NetworkModel identity is stored in SnapshotMeta.
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
                "network_model_id": data.get("network_model_id"),
            }
        meta = SnapshotMeta.from_dict(meta_data)
        graph = _graph_from_dict(data.get("graph", data))
        graph.network_model_id = meta.network_model_id
        return cls(meta=meta, graph=graph)


def create_network_snapshot(
    graph: NetworkGraph,
    *,
    parent_snapshot: NetworkSnapshot | None = None,
    parent_snapshot_id: str | None = None,
    snapshot_id: str | None = None,
    created_at: str | None = None,
    schema_version: str | None = None,
    network_model_id: str | None = None,
) -> NetworkSnapshot:
    parent_id = parent_snapshot_id
    if parent_id is None and parent_snapshot is not None:
        parent_id = parent_snapshot.meta.snapshot_id
    resolved_model_id = network_model_id
    if resolved_model_id is None and parent_snapshot is not None:
        resolved_model_id = parent_snapshot.meta.network_model_id
    if resolved_model_id is None:
        resolved_model_id = graph.network_model_id
    if resolved_model_id is None:
        raise ValueError("NetworkModel id is required to create a snapshot.")
    graph.network_model_id = resolved_model_id
    meta = SnapshotMeta.create(
        snapshot_id=snapshot_id,
        parent_snapshot_id=parent_id,
        created_at=created_at,
        schema_version=schema_version,
        network_model_id=resolved_model_id,
    )
    return NetworkSnapshot(meta=meta, graph=graph)


def _graph_to_dict(graph: NetworkGraph) -> dict[str, Any]:
    nodes = _sorted_by_id(graph.nodes.values())
    branches = _sorted_by_id(graph.branches.values())
    inverters = _sorted_by_id(graph.inverter_sources.values())
    switches = _sorted_by_id(graph.switches.values())
    return {
        "nodes": [node.to_dict() for node in nodes],
        "branches": [branch.to_dict() for branch in branches],
        "inverter_sources": [source.to_dict() for source in inverters],
        "switches": [switch.to_dict() for switch in switches],
    }


def _graph_from_dict(data: dict[str, Any]) -> NetworkGraph:
    graph = NetworkGraph()
    for node_data in data.get("nodes", []):
        graph.add_node(Node.from_dict(node_data))
    for branch_data in data.get("branches", []):
        graph.add_branch(Branch.from_dict(branch_data))
    for source_data in data.get("inverter_sources", []):
        graph.add_inverter_source(InverterSource.from_dict(source_data))
    for switch_data in data.get("switches", []):
        graph.add_switch(Switch.from_dict(switch_data))
    return graph


def _sorted_by_id(values: Iterable[Any]) -> list[Any]:
    return sorted(values, key=lambda item: item.id)
