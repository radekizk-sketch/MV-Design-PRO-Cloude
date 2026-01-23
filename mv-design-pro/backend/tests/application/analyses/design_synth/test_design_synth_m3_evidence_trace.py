from __future__ import annotations

import copy
import sys
from pathlib import Path
from uuid import UUID

# Add backend/src to path for imports
backend_src = Path(__file__).parents[4] / "src"
sys.path.insert(0, str(backend_src))

from application.analyses.design_synth.pipeline import run_connection_study
from application.analyses.design_synth.service import DesignSynthService
from application.network_wizard import NetworkWizardService
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_uow_factory() -> tuple[callable, NetworkWizardService, DesignSynthService]:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    uow_factory = build_uow_factory(session_factory)
    return uow_factory, NetworkWizardService(uow_factory), DesignSynthService(uow_factory)


def _create_case(wizard: NetworkWizardService) -> UUID:
    project = wizard.create_project("DesignSynth")
    case = wizard.create_operating_case(project.id, "Case", {"base_mva": 100.0})
    return case.id


def _scrub_evidence(evidence_json: dict) -> dict:
    scrubbed = copy.deepcopy(evidence_json)
    scrubbed.get("meta", {}).pop("created_at_utc", None)
    outputs = scrubbed.get("outputs", {})
    outputs.pop("design_spec_id", None)
    outputs.pop("design_proposal_id", None)
    refs = scrubbed.get("refs", {})
    for artifact in refs.get("artifact_refs", []):
        artifact.pop("id", None)
    return scrubbed


def test_design_synth_m3_evidence_trace_deterministic() -> None:
    uow_factory, wizard, service = _build_uow_factory()
    case_id = _create_case(wizard)

    spec_payload = {
        "pcc": {"id": "PCC-1", "voltage_kv": 15.0, "grid_supply": True},
        "constraints": {"voltage_drop_max_pct": 3.0},
        "assumptions": {"ambient_temp_c": 25},
    }

    first = run_connection_study(
        case_id,
        "snap-1",
        spec_payload,
        uow_factory=uow_factory,
    )
    second = run_connection_study(
        case_id,
        "snap-1",
        spec_payload,
        uow_factory=uow_factory,
    )

    first_evidence = service.get_evidence(first.design_evidence_id).evidence_json
    second_evidence = service.get_evidence(second.design_evidence_id).evidence_json

    for evidence_json in (first_evidence, second_evidence):
        assert set(evidence_json.keys()) == {
            "inputs",
            "transformations",
            "outputs",
            "refs",
            "meta",
        }
        assert evidence_json["inputs"]["pcc"]["id"] == "PCC-1"
        assert evidence_json["meta"]["schema_version"] == "M3"
        assert evidence_json["outputs"]["report_fingerprint"]

    assert (
        first_evidence["outputs"]["report_fingerprint"]
        == second_evidence["outputs"]["report_fingerprint"]
    )

    expected_step_names = [
        "normalize_spec",
        "generate_proposal",
        "build_report",
        "persist_artifacts",
    ]
    assert [step["name"] for step in first_evidence["transformations"]] == expected_step_names

    scrubbed_first = _scrub_evidence(first_evidence)
    scrubbed_second = _scrub_evidence(second_evidence)
    assert scrubbed_first["transformations"] == scrubbed_second["transformations"]
