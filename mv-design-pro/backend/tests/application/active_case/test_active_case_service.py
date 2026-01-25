from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

import pytest

# Add backend/src to path for imports
backend_src = Path(__file__).parents[3] / "src"
sys.path.insert(0, str(backend_src))

from application.active_case import ActiveCaseNotSetError, ActiveCaseService
from application.analysis_run import AnalysisRunService
from application.network_wizard import NetworkWizardService
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_services() -> tuple[NetworkWizardService, AnalysisRunService, ActiveCaseService]:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    uow_factory = build_uow_factory(session_factory)
    return (
        NetworkWizardService(uow_factory),
        AnalysisRunService(uow_factory),
        ActiveCaseService(uow_factory),
    )


def test_first_case_auto_sets_active_case() -> None:
    wizard, _analysis, active_cases = _build_services()
    project = wizard.create_project("Active Case Auto")
    case = wizard.create_operating_case(
        project.id,
        "Base",
        {"base_mva": 100.0, "active_snapshot_id": str(uuid4())},
    )

    assert active_cases.get_active_case_id(project.id) == case.id


def test_calculate_requires_active_case() -> None:
    wizard, analysis, _active_cases = _build_services()
    project = wizard.create_project("Active Case Missing")

    with pytest.raises(ActiveCaseNotSetError):
        analysis.create_power_flow_run(project.id)


def test_set_active_case_drives_analysis_context() -> None:
    wizard, analysis, active_cases = _build_services()
    project = wizard.create_project("Active Case Switch")
    wizard.create_operating_case(
        project.id,
        "Case A",
        {"base_mva": 100.0, "active_snapshot_id": str(uuid4())},
    )
    case_b = wizard.create_operating_case(
        project.id,
        "Case B",
        {"base_mva": 75.0, "active_snapshot_id": str(uuid4())},
    )

    active_cases.set_active_case(project.id, case_b.id)
    run = analysis.create_power_flow_run(project.id)

    assert run.operating_case_id == case_b.id
    assert run.input_snapshot["base_mva"] == 75.0
