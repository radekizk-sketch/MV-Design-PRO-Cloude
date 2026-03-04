from __future__ import annotations

from uuid import uuid4

from application.execution_engine.load_flow_run_input import (
    LoadFlowBranchInput,
    LoadFlowLoadInput,
    LoadFlowNodeInput,
    LoadFlowRunInput,
)
from application.execution_engine.service import ExecutionEngineService
from domain.execution import ExecutionAnalysisType
from domain.study_case import StudyCaseConfig, new_study_case


def _engine_with_case() -> tuple[ExecutionEngineService, str]:
    engine = ExecutionEngineService()
    case = new_study_case(project_id=uuid4(), name="LF execution", config=StudyCaseConfig())
    engine.register_study_case(case)
    return engine, case.id


def _radial_input() -> LoadFlowRunInput:
    return LoadFlowRunInput(
        base_mva=100.0,
        slack_node_id="slack",
        slack_u_pu=1.0,
        slack_angle_rad=0.0,
        nodes=(
            LoadFlowNodeInput("slack", "SLACK", 15.0),
            LoadFlowNodeInput("n1", "PQ", 15.0),
            LoadFlowNodeInput("n2", "PQ", 15.0),
        ),
        branches=(
            LoadFlowBranchInput("l1", "slack", "n1", 0.08, 0.32, 3.0, 5.0),
            LoadFlowBranchInput("l2", "n1", "n2", 0.08, 0.32, 3.0, 5.0),
        ),
        loads=(
            LoadFlowLoadInput("n1", -2.0, -0.8),
            LoadFlowLoadInput("n2", -1.5, -0.6),
        ),
    )


def _ring_input() -> LoadFlowRunInput:
    return LoadFlowRunInput(
        base_mva=100.0,
        slack_node_id="slack",
        slack_u_pu=1.0,
        slack_angle_rad=0.0,
        nodes=(
            LoadFlowNodeInput("slack", "SLACK", 15.0),
            LoadFlowNodeInput("r1", "PQ", 15.0),
            LoadFlowNodeInput("r2", "PQ", 15.0),
            LoadFlowNodeInput("r3", "PQ", 15.0),
        ),
        branches=(
            LoadFlowBranchInput("lr1", "slack", "r1", 0.08, 0.32, 3.0, 5.0),
            LoadFlowBranchInput("lr2", "r1", "r2", 0.08, 0.32, 3.0, 5.0),
            LoadFlowBranchInput("lr3", "r2", "r3", 0.08, 0.32, 3.0, 5.0),
            LoadFlowBranchInput("lr4", "r3", "slack", 0.08, 0.32, 3.0, 5.0),
        ),
        loads=(
            LoadFlowLoadInput("r1", -1.0, -0.4),
            LoadFlowLoadInput("r2", -1.2, -0.5),
            LoadFlowLoadInput("r3", -0.9, -0.4),
        ),
    )


def test_execute_run_load_flow_radial() -> None:
    engine, case_id = _engine_with_case()
    run = engine.create_run(
        study_case_id=case_id,
        analysis_type=ExecutionAnalysisType.LOAD_FLOW,
        solver_input=_radial_input().canonical_dict(),
    )

    done, result = engine.execute_run_load_flow(
        run.id,
        load_flow_input=_radial_input(),
        readiness_snapshot={"ready": True},
        validation_snapshot={"valid": True},
    )

    assert done.status.value == "DONE"
    assert result.global_results["convergence_status"] == "CONVERGED"
    assert "sld_overlay" in result.global_results
    assert len(result.element_results) >= 5


def test_execute_run_load_flow_ring_deterministic_signature() -> None:
    engine_a, case_a = _engine_with_case()
    lf_input = _ring_input()
    run_a = engine_a.create_run(
        study_case_id=case_a,
        analysis_type=ExecutionAnalysisType.LOAD_FLOW,
        solver_input=lf_input.canonical_dict(),
    )
    _, rs_a = engine_a.execute_run_load_flow(
        run_a.id,
        load_flow_input=lf_input,
        readiness_snapshot={"ready": True},
        validation_snapshot={"valid": True},
    )

    engine_b, case_b = _engine_with_case()
    run_b = engine_b.create_run(
        study_case_id=case_b,
        analysis_type=ExecutionAnalysisType.LOAD_FLOW,
        solver_input=lf_input.canonical_dict(),
    )
    _, rs_b = engine_b.execute_run_load_flow(
        run_b.id,
        load_flow_input=lf_input,
        readiness_snapshot={"ready": True},
        validation_snapshot={"valid": True},
    )

    assert rs_a.global_results["snapshot_hash"] == rs_b.global_results["snapshot_hash"]
    assert rs_a.global_results["totals"] == rs_b.global_results["totals"]
