from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import UUID, uuid4

import pytest

# Add backend/src to path for imports
backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.analysis_run import AnalysisRunService
from application.network_wizard import NetworkWizardService
from application.network_wizard.dtos import (
    BranchPayload,
    LoadPayload,
    NodePayload,
    SourcePayload,
)
from domain.project_design_mode import ProjectDesignMode
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_services() -> tuple[NetworkWizardService, AnalysisRunService]:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    uow_factory = build_uow_factory(session_factory)
    return NetworkWizardService(uow_factory), AnalysisRunService(uow_factory)


def _create_basic_network(
    wizard: NetworkWizardService, project_id: UUID
) -> tuple[dict, dict]:
    slack_node = wizard.add_node(
        project_id,
        NodePayload(
            name="Slack",
            node_type="SLACK",
            base_kv=15.0,
            attrs={
                "voltage_magnitude_pu": 1.0,
                "voltage_angle_rad": 0.0,
            },
        ),
    )
    pq_node = wizard.add_node(
        project_id,
        NodePayload(
            name="Load",
            node_type="PQ",
            base_kv=15.0,
            attrs={
                "active_power_mw": 5.0,
                "reactive_power_mvar": 2.0,
            },
        ),
    )
    wizard.add_branch(
        project_id,
        BranchPayload(
            name="Line-1",
            branch_type="LINE",
            from_node_id=slack_node["id"],
            to_node_id=pq_node["id"],
            params={
                "r_ohm_per_km": 0.1,
                "x_ohm_per_km": 0.2,
                "b_us_per_km": 1.0,
                "length_km": 1.0,
            },
        ),
    )
    return slack_node, pq_node


def _add_grid_source(
    wizard: NetworkWizardService, project_id: UUID, node_id: UUID
) -> None:
    wizard.add_source(
        project_id,
        SourcePayload(
            name="Grid",
            node_id=node_id,
            source_type="GRID",
            payload={"name": "Grid", "grid_supply": True, "u_pu": 1.0},
        ),
    )


def test_analysis_run_lifecycle_pf() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("PF")
    slack_node, pq_node = _create_basic_network(wizard, project.id)
    wizard.set_pcc(project.id, slack_node["id"])
    wizard.add_load(
        project.id,
        LoadPayload(
            name="Load",
            node_id=pq_node["id"],
            payload={"name": "Load", "p_mw": 1.0, "q_mvar": 0.5},
        ),
    )
    case = wizard.create_operating_case(
        project.id,
        "Normal",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.SN_NETWORK.value,
        },
    )

    run = service.create_power_flow_run(project.id, case.id)
    executed = service.execute_run(run.id)

    assert executed.status == "FINISHED"
    assert executed.started_at is not None
    assert executed.finished_at is not None

    repeat = service.create_power_flow_run(project.id, case.id)
    assert repeat.id == run.id


def test_analysis_run_lifecycle_sc() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("SC")
    slack_node, _ = _create_basic_network(wizard, project.id)
    wizard.set_pcc(project.id, slack_node["id"])
    _add_grid_source(wizard, project.id, slack_node["id"])
    case = wizard.create_operating_case(
        project.id,
        "Normal",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.SN_NETWORK.value,
        },
    )

    fault_spec = {"fault_type": "3F", "node_id": str(slack_node["id"])}
    run = service.create_short_circuit_run(project.id, case.id, fault_spec)
    executed = service.execute_run(run.id)

    results = service.get_results(run.id)

    assert executed.status == "FINISHED"
    assert executed.result_summary
    assert results


def test_validation_missing_slack() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("Missing Slack")
    wizard.add_node(
        project.id,
        NodePayload(
            name="PQ",
            node_type="PQ",
            base_kv=15.0,
            attrs={"active_power_mw": 1.0, "reactive_power_mvar": 0.5},
        ),
    )
    case = wizard.create_operating_case(
        project.id,
        "Normal",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.SN_NETWORK.value,
        },
    )

    run = service.create_power_flow_run(project.id, case.id)
    executed = service.execute_run(run.id)

    assert executed.status == "FAILED"
    assert executed.error_message


def test_validation_missing_pcc() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("Missing PCC")
    slack_node, _ = _create_basic_network(wizard, project.id)
    _add_grid_source(wizard, project.id, slack_node["id"])
    case = wizard.create_operating_case(
        project.id,
        "Normal",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.SN_NETWORK.value,
        },
    )

    fault_spec = {"fault_type": "3F", "node_id": str(slack_node["id"])}
    run = service.create_short_circuit_run(project.id, case.id, fault_spec)
    executed = service.execute_run(run.id)

    assert executed.status == "FAILED"
    assert executed.error_message


def test_failed_run_sets_status(monkeypatch: pytest.MonkeyPatch) -> None:
    wizard, service = _build_services()
    project = wizard.create_project("Solver Failure")
    slack_node, pq_node = _create_basic_network(wizard, project.id)
    wizard.set_pcc(project.id, slack_node["id"])
    wizard.add_load(
        project.id,
        LoadPayload(
            name="Load",
            node_id=pq_node["id"],
            payload={"name": "Load", "p_mw": 1.0, "q_mvar": 0.5},
        ),
    )
    case = wizard.create_operating_case(
        project.id,
        "Normal",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.SN_NETWORK.value,
        },
    )

    run = service.create_power_flow_run(project.id, case.id)

    def _boom(self, pf_input):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "analysis.power_flow.solver.PowerFlowSolver.solve", _boom, raising=True
    )

    executed = service.execute_run(run.id)

    assert executed.status == "FAILED"
    assert executed.finished_at is not None
    assert "boom" in (executed.error_message or "")


def test_short_circuit_blocked_in_nn_mode() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("Gate NN")
    slack_node, _ = _create_basic_network(wizard, project.id)
    wizard.set_pcc(project.id, slack_node["id"])
    _add_grid_source(wizard, project.id, slack_node["id"])
    case = wizard.create_operating_case(
        project.id,
        "NN Case",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.NN_NETWORK.value,
        },
    )

    fault_spec = {"fault_type": "3F", "node_id": str(slack_node["id"])}
    run = service.create_short_circuit_run(project.id, case.id, fault_spec)
    executed = service.execute_run(run.id)

    assert executed.status == "FAILED"
    payload = json.loads(executed.error_message or "{}")
    assert payload["errors"][0]["code"] == "project_design_mode.forbidden"


def test_fault_loop_blocked_in_sn_mode() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("Gate SN")
    slack_node, _ = _create_basic_network(wizard, project.id)
    wizard.set_pcc(project.id, slack_node["id"])
    _add_grid_source(wizard, project.id, slack_node["id"])
    case = wizard.create_operating_case(
        project.id,
        "SN Case",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.SN_NETWORK.value,
        },
    )

    run = service.create_fault_loop_run(project.id, case.id)
    executed = service.execute_run(run.id)

    assert executed.status == "FAILED"
    payload = json.loads(executed.error_message or "{}")
    assert payload["errors"][0]["code"] == "project_design_mode.forbidden"


def test_missing_project_design_mode_fails() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("Missing Mode")
    slack_node, _ = _create_basic_network(wizard, project.id)
    wizard.set_pcc(project.id, slack_node["id"])
    _add_grid_source(wizard, project.id, slack_node["id"])
    case = wizard.create_operating_case(
        project.id,
        "Missing Mode Case",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
        },
    )

    fault_spec = {"fault_type": "3F", "node_id": str(slack_node["id"])}
    run = service.create_short_circuit_run(project.id, case.id, fault_spec)
    executed = service.execute_run(run.id)

    assert executed.status == "FAILED"
    payload = json.loads(executed.error_message or "{}")
    assert payload["errors"][0]["code"] == "project_design_mode.missing"


def test_short_circuit_results_are_deterministic() -> None:
    wizard, service = _build_services()
    project = wizard.create_project("Determinism")
    slack_node, _ = _create_basic_network(wizard, project.id)
    wizard.set_pcc(project.id, slack_node["id"])
    _add_grid_source(wizard, project.id, slack_node["id"])
    case = wizard.create_operating_case(
        project.id,
        "Determinism Case",
        {
            "base_mva": 100.0,
            "active_snapshot_id": str(uuid4()),
            "project_design_mode": ProjectDesignMode.SN_NETWORK.value,
        },
    )

    fault_spec = {"fault_type": "3F", "node_id": str(slack_node["id"])}
    run = service.create_short_circuit_run(project.id, case.id, fault_spec)
    first = service.execute_run(run.id)
    first_results = service.get_results(run.id)
    second = service.execute_run(run.id)
    second_results = service.get_results(run.id)

    assert first.status == "FINISHED"
    assert second.status == "FINISHED"
    assert first_results == second_results
