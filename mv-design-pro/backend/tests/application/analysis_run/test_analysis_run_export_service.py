from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

import pytest

backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.analysis_run import AnalysisRunExportService
from domain.analysis_run import AnalysisRun
from domain.models import OperatingCase, Project
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.repositories import (
    AnalysisRunRepository,
    CaseRepository,
    ProjectRepository,
    ResultRepository,
    SldRepository,
)
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_export_service() -> tuple[AnalysisRunExportService, dict[str, UUID]]:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    uow_factory = build_uow_factory(session_factory)

    session = session_factory()
    project_id = uuid4()
    project = Project(id=project_id, name="Export Project")
    ProjectRepository(session).add(project)

    case_id = uuid4()
    case = OperatingCase(
        id=case_id,
        project_id=project_id,
        name="Base",
        case_payload={"base_mva": 100.0},
    )
    CaseRepository(session).add_operating_case(case)

    now = datetime.now(timezone.utc)
    run_id = uuid4()
    node_id = uuid4()
    node_id_str = str(node_id)
    run = AnalysisRun(
        id=run_id,
        project_id=project_id,
        operating_case_id=case_id,
        analysis_type="SC",
        status="FINISHED",
        created_at=now,
        started_at=now,
        finished_at=now,
        input_snapshot={"fault_spec": {"node_id": node_id_str}},
        input_hash="hash-sc",
        result_summary={"status": "FINISHED", "pcc_node_id": str(uuid4())},
        white_box_trace=[
            {"key": "step_a", "title": "Step A", "notes": "ok"},
            {"key": "step_b", "title": "Step B", "notes": None, "metrics": {"k": 1}},
        ],
    )
    AnalysisRunRepository(session).create(run)

    ResultRepository(session).add_result(
        run_id=run_id,
        project_id=project_id,
        result_type="short_circuit",
        payload={"fault_node_id": node_id_str, "ikss_a": 12.5},
    )

    sld_payload = {
        "nodes": [{"node_id": node_id_str, "x": 0.0, "y": 0.0}],
        "branches": [],
        "annotations": [],
    }
    SldRepository(session).save(project_id=project_id, name="Main", payload=sld_payload)
    session.close()

    service = AnalysisRunExportService(uow_factory)
    return service, {"run_id": run_id}


def test_export_bundle_is_deterministic() -> None:
    service, data = _build_export_service()
    first = service.export_run_bundle(data["run_id"])
    second = service.export_run_bundle(data["run_id"])
    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)


def test_export_uses_persisted_data_only(monkeypatch: pytest.MonkeyPatch) -> None:
    service, data = _build_export_service()

    def _boom(*args, **kwargs):
        raise AssertionError("Solver should not be called")

    monkeypatch.setattr("analysis.power_flow.solver.PowerFlowSolver.solve", _boom, raising=True)
    monkeypatch.setattr(
        "network_model.solvers.short_circuit_iec60909.ShortCircuitIEC60909Solver.compute_3ph_short_circuit",
        _boom,
        raising=True,
    )

    bundle = service.export_run_bundle(data["run_id"])
    assert bundle["run"]["id"] == str(data["run_id"])
