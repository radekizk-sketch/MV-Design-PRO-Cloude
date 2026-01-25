from __future__ import annotations

import sys
from pathlib import Path

backend_src = Path(__file__).parents[1] / "src"
sys.path.insert(0, str(backend_src))

from network_model.core import Bus, Node, NodeType


def test_bus_alias_maps_to_node() -> None:
    assert Bus is Node


def test_bus_from_dict_accepts_bus_type() -> None:
    bus = Bus.from_dict(
        {
            "name": "Bus-1",
            "bus_type": "PQ",
            "voltage_level": 15.0,
            "active_power": 1.0,
            "reactive_power": 0.5,
        }
    )

    assert isinstance(bus, Node)
    assert bus.node_type == NodeType.PQ
    assert bus.to_dict()["node_type"] == "PQ"
