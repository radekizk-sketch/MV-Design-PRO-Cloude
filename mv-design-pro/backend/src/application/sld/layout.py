from __future__ import annotations

from collections import deque
from typing import Iterable
from uuid import UUID, uuid4, uuid5

from domain.sld import SldAnnotation, SldBranchSymbol, SldDiagram, SldNodeSymbol


_SLD_NAMESPACE = UUID("f2b2f02b-6c7b-4c4b-bae9-8f52a2b8b68f")


def build_auto_layout_diagram(
    *,
    project_id: UUID,
    name: str,
    nodes: Iterable[dict],
    branches: Iterable[dict],
    pcc_node_id: UUID | None,
    diagram_id: UUID | None = None,
    x_spacing: float = 200.0,
    y_spacing: float = 120.0,
    annotations: Iterable[dict] | None = None,
) -> SldDiagram:
    node_ids = [node["id"] for node in nodes]
    adjacency = {node_id: set() for node_id in node_ids}
    for branch in branches:
        if not branch.get("in_service", True):
            continue
        from_node_id = branch["from_node_id"]
        to_node_id = branch["to_node_id"]
        if from_node_id in adjacency and to_node_id in adjacency:
            adjacency[from_node_id].add(to_node_id)
            adjacency[to_node_id].add(from_node_id)

    positions = _layout_positions(
        adjacency, node_ids, pcc_node_id, x_spacing=x_spacing, y_spacing=y_spacing
    )

    node_symbols = []
    for node_id in _sorted_ids(node_ids):
        x, y = positions.get(node_id, (0.0, 0.0))
        node_symbols.append(
            SldNodeSymbol(
                id=_symbol_uuid("node", node_id),
                node_id=node_id,
                x=x,
                y=y,
                label=_label_for_node(node_id, nodes),
                is_pcc=node_id == pcc_node_id,
            )
        )

    branch_symbols = []
    branch_list = list(branches)
    branch_list.sort(key=lambda item: str(item["id"]))
    for branch in branch_list:
        from_node_id = branch["from_node_id"]
        to_node_id = branch["to_node_id"]
        from_pos = positions.get(from_node_id, (0.0, 0.0))
        to_pos = positions.get(to_node_id, (0.0, 0.0))
        branch_symbols.append(
            SldBranchSymbol(
                id=_symbol_uuid("branch", branch["id"]),
                branch_id=branch["id"],
                from_node_id=from_node_id,
                to_node_id=to_node_id,
                points=(from_pos, to_pos),
            )
        )

    annotation_symbols = []
    if annotations:
        for annotation in annotations:
            annotation_id = annotation.get("id") or uuid5(
                _SLD_NAMESPACE, f"annotation:{annotation.get('text','')}:{annotation.get('x')}:{annotation.get('y')}"
            )
            annotation_symbols.append(
                SldAnnotation(
                    id=UUID(str(annotation_id)),
                    text=str(annotation.get("text", "")),
                    x=float(annotation.get("x", 0.0)),
                    y=float(annotation.get("y", 0.0)),
                )
            )

    return SldDiagram(
        id=diagram_id or uuid4(),
        project_id=project_id,
        name=name,
        nodes=tuple(node_symbols),
        branches=tuple(branch_symbols),
        annotations=tuple(annotation_symbols),
        pcc_node_id=pcc_node_id,
        dirty_flag=False,
    )


def _layout_positions(
    adjacency: dict[UUID, set[UUID]],
    node_ids: Iterable[UUID],
    pcc_node_id: UUID | None,
    *,
    x_spacing: float,
    y_spacing: float,
) -> dict[UUID, tuple[float, float]]:
    ordered_ids = list(_sorted_ids(node_ids))
    visited: set[UUID] = set()
    components: list[dict[UUID, int]] = []

    if pcc_node_id in adjacency:
        components.append(_bfs_levels(adjacency, pcc_node_id, visited))

    for node_id in ordered_ids:
        if node_id not in visited:
            components.append(_bfs_levels(adjacency, node_id, visited))

    positions: dict[UUID, tuple[float, float]] = {}
    current_offset = 0.0
    for levels in components:
        if not levels:
            continue
        level_map: dict[int, list[UUID]] = {}
        for node_id, level in levels.items():
            level_map.setdefault(level, []).append(node_id)
        max_count = max(len(nodes) for nodes in level_map.values())
        for level in sorted(level_map):
            level_nodes = sorted(level_map[level], key=lambda item: str(item))
            for index, node_id in enumerate(level_nodes):
                positions[node_id] = (
                    level * x_spacing,
                    current_offset + index * y_spacing,
                )
        current_offset += max_count * y_spacing + y_spacing
    return positions


def _bfs_levels(
    adjacency: dict[UUID, set[UUID]],
    start_node: UUID,
    visited: set[UUID],
) -> dict[UUID, int]:
    levels: dict[UUID, int] = {start_node: 0}
    queue: deque[UUID] = deque([start_node])
    visited.add(start_node)

    while queue:
        current = queue.popleft()
        neighbors = sorted(adjacency.get(current, set()), key=lambda item: str(item))
        for neighbor in neighbors:
            if neighbor in visited:
                continue
            visited.add(neighbor)
            levels[neighbor] = levels[current] + 1
            queue.append(neighbor)
    return levels


def _sorted_ids(node_ids: Iterable[UUID]) -> list[UUID]:
    return sorted(node_ids, key=lambda item: str(item))


def _label_for_node(node_id: UUID, nodes: Iterable[dict]) -> str | None:
    for node in nodes:
        if node.get("id") == node_id:
            return node.get("name")
    return None


def _symbol_uuid(prefix: str, entity_id: UUID) -> UUID:
    return uuid5(_SLD_NAMESPACE, f"{prefix}:{entity_id}")
