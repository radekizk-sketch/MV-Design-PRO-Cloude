from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID, uuid4

backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.sld.layout import build_auto_layout_diagram


def _node_payload(node_id: UUID, name: str) -> dict:
    return {
        "id": node_id,
        "name": name,
        "node_type": "PQ",
        "base_kv": 15.0,
        "attrs": {},
    }


def _branch_payload(branch_id: UUID, from_id: UUID, to_id: UUID) -> dict:
    return {
        "id": branch_id,
        "name": "L",
        "branch_type": "LINE",
        "from_node_id": from_id,
        "to_node_id": to_id,
        "in_service": True,
        "params": {},
    }


def test_layout_is_deterministic() -> None:
    project_id = uuid4()
    node_a = uuid4()
    node_b = uuid4()
    node_c = uuid4()
    branch_ab = uuid4()
    branch_bc = uuid4()

    nodes_order_a = [_node_payload(node_a, "A"), _node_payload(node_b, "B"), _node_payload(node_c, "C")]
    nodes_order_b = [_node_payload(node_c, "C"), _node_payload(node_b, "B"), _node_payload(node_a, "A")]
    branches = [
        _branch_payload(branch_ab, node_a, node_b),
        _branch_payload(branch_bc, node_b, node_c),
    ]

    diagram_first = build_auto_layout_diagram(
        project_id=project_id,
        name="Main",
        nodes=nodes_order_a,
        branches=branches,
        pcc_node_id=node_a,
    )
    diagram_second = build_auto_layout_diagram(
        project_id=project_id,
        name="Main",
        nodes=nodes_order_b,
        branches=reversed(branches),
        pcc_node_id=node_a,
    )

    assert diagram_first.to_payload() == diagram_second.to_payload()
