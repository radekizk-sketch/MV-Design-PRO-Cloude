from __future__ import annotations

import sys
from pathlib import Path

backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.network_wizard.exporters.json_exporter import export_network_payload
from application.network_wizard.importers.json_importer import parse_network_payload


def test_parse_network_payload_accepts_bus_alias() -> None:
    payload = {
        "project": {"name": "Bus Import"},
        "buses": [
            {
                "id": "bus-1",
                "name": "Bus 1",
                "bus_type": "PQ",
                "base_kv": 15.0,
                "attrs": {"active_power": 1.0, "reactive_power": 0.5},
            }
        ],
    }

    parsed = parse_network_payload(payload)

    assert parsed["nodes"][0]["node_type"] == "PQ"
    assert parsed["nodes"][0]["name"] == "Bus 1"


def test_export_network_payload_emits_buses_alias() -> None:
    payload = export_network_payload(
        project={"id": "proj-1"},
        nodes=[
            {
                "id": "node-1",
                "name": "Bus 1",
                "node_type": "PQ",
                "base_kv": 15.0,
                "attrs": {"active_power": 1.0, "reactive_power": 0.5},
            }
        ],
        branches=[],
        operating_cases=[],
        study_cases=[],
        connection_node_id=None,
        sources=[],
        loads=[],
        grounding={},
        limits={},
        line_types=[],
        cable_types=[],
        transformer_types=[],
        inverter_types=[],
        switching_states=[],
        schema_version="1.0",
    )

    assert "buses" in payload
    assert payload["buses"][0]["bus_type"] == "PQ"
    assert "node_type" not in payload["buses"][0]
