from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from api.main import app
from application.proof_engine.proof_generator import ProofGenerator, SC3FInput
from domain.analysis_run import AnalysisRun
from domain.models import OperatingCase, Project
from domain.project_design_mode import ProjectDesignMode
from infrastructure.persistence.db import (
    create_engine_from_url,
    create_session_factory,
    init_db,
)
from infrastructure.persistence.repositories import (
    AnalysisRunRepository,
    CaseRepository,
    ProjectRepository,
    ResultRepository,
)
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_sc3f_proof():
    test_input = SC3FInput(
        project_name="Test Project",
        case_name="Test Case SC3F",
        fault_node_id="B2",
        fault_type="THREE_PHASE",
        run_timestamp=datetime(2026, 1, 27, 10, 30, 0),
        solver_version="1.0.0-test",
        c_factor=1.10,
        u_n_kv=15.0,
        z_thevenin_ohm=complex(0.749, 3.419),
        ikss_ka=2.722,
        ip_ka=5.882,
        ith_ka=2.722,
        sk_mva=70.7,
        kappa=1.528,
        rx_ratio=0.219,
        tk_s=1.0,
        m_factor=1.0,
        n_factor=0.0,
    )
    return ProofGenerator.generate_sc3f_proof(test_input)


def _prepare_api_client(tmp_path):
    db_path = tmp_path / "proof_pack_api.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    session_factory = create_session_factory(engine)
    app.state.uow_factory = build_uow_factory(session_factory)

    session = session_factory()
    project_id = uuid4()
    ProjectRepository(session).add(Project(id=project_id, name="Project"))

    operating_case_id = uuid4()
    CaseRepository(session).add_operating_case(
        OperatingCase(
            id=operating_case_id,
            project_id=project_id,
            name="Base",
            case_payload={"base_mva": 100.0, "active_snapshot_id": str(uuid4())},
            project_design_mode=ProjectDesignMode.SN_NETWORK,
        )
    )

    run_id = uuid4()
    now = datetime.now(timezone.utc)
    run = AnalysisRun(
        id=run_id,
        project_id=project_id,
        operating_case_id=operating_case_id,
        analysis_type="short_circuit_sn",
        status="FINISHED",
        created_at=now,
        finished_at=now,
        input_snapshot={"snapshot_id": "snapshot-123"},
        input_hash="hash-sc",
        result_summary={"status": "FINISHED"},
    )
    AnalysisRunRepository(session).create(run)

    proof = _build_sc3f_proof()
    ResultRepository(session).add_result(
        run_id=run_id,
        project_id=project_id,
        result_type="proof_document",
        payload=proof.to_dict(),
    )

    missing_run_id = uuid4()
    run_missing = AnalysisRun(
        id=missing_run_id,
        project_id=project_id,
        operating_case_id=operating_case_id,
        analysis_type="short_circuit_sn",
        status="FINISHED",
        created_at=now,
        finished_at=now,
        input_snapshot={"snapshot_id": "snapshot-456"},
        input_hash="hash-missing",
        result_summary={"status": "FINISHED"},
    )
    AnalysisRunRepository(session).create(run_missing)
    session.close()

    return TestClient(app), {
        "project_id": project_id,
        "case_id": operating_case_id,
        "run_id": run_id,
        "missing_run_id": missing_run_id,
    }


def test_proof_pack_api_returns_zip(tmp_path):
    client, data = _prepare_api_client(tmp_path)
    response = client.get(
        f"/api/proof/{data['project_id']}/{data['case_id']}/{data['run_id']}/pack"
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        names = set(zf.namelist())
    assert "proof_pack/manifest.json" in names
    assert "proof_pack/proof.json" in names
    assert "proof_pack/proof.tex" in names


def test_proof_pack_api_404_when_missing(tmp_path):
    client, data = _prepare_api_client(tmp_path)

    response = client.get(
        f"/api/proof/{data['project_id']}/{data['case_id']}/{data['missing_run_id']}/pack"
    )
    assert response.status_code == 404
