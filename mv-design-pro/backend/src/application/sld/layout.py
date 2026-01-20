from __future__ import annotations

from collections import defaultdict, deque
from typing import Iterable
from uuid import UUID


def build_deterministic_layout(
    *,
    nodes: Iterable[dict],
    branches: Iterable[dict],
    pcc_node_id: UUID | None,
    step_x: float = 240.0,
    step_y: float = 140.0,
) -> tuple[dict[UUID, tuple[float, float]], dict[UUID, list[dict]]]:
    node_ids = sorted({UUID(str(node["id"])) for node in nodes}, key=lambda item: str(item))
    adjacency: dict[UUID, list[UUID]] = defaultdict(list)
    for branch in branches:
        from_id = UUID(str(branch["from_node_id"]))
        to_id = UUID(str(branch["to_node_id"]))
        adjacency[from_id].append(to_id)
        adjacency[to_id].append(from_id)
    for neighbors in adjacency.values():
        neighbors.sort(key=lambda item: str(item))

    start_id = pcc_node_id or (node_ids[0] if node_ids else None)
    levels: dict[UUID, int] = {}
    if start_id is not None:
        queue: deque[UUID] = deque([start_id])
        levels[start_id] = 0
        while queue:
            current = queue.popleft()
            for neighbor in adjacency.get(current, []):
                if neighbor in levels:
                    continue
                levels[neighbor] = levels[current] + 1
                queue.append(neighbor)

    max_level = max(levels.values(), default=0)
    for node_id in node_ids:
        if node_id not in levels:
            max_level += 1
            levels[node_id] = max_level

    level_groups: dict[int, list[UUID]] = defaultdict(list)
    for node_id, level in levels.items():
        level_groups[level].append(node_id)
    for nodes_in_level in level_groups.values():
        nodes_in_level.sort(key=lambda item: str(item))

    positions: dict[UUID, tuple[float, float]] = {}
    for level in sorted(level_groups.keys()):
        nodes_in_level = level_groups[level]
        for index, node_id in enumerate(nodes_in_level):
            x = float(level * step_x)
            y = float(index * step_y)
            positions[node_id] = (x, y)

    routing: dict[UUID, list[dict]] = {}
    for branch in branches:
        branch_id = UUID(str(branch["id"]))
        from_id = UUID(str(branch["from_node_id"]))
        to_id = UUID(str(branch["to_node_id"]))
        from_pos = positions.get(from_id, (0.0, 0.0))
        to_pos = positions.get(to_id, (0.0, 0.0))
        routing[branch_id] = [
            {"x": float(from_pos[0]), "y": float(from_pos[1])},
            {"x": float(to_pos[0]), "y": float(to_pos[1])},
        ]

    return positions, routing
