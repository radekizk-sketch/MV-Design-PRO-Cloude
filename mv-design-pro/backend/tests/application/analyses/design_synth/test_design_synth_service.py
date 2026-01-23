from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

# Add backend/src to path for imports
backend_src = Path(__file__).parents[4] / "src"
sys.path.insert(0, str(backend_src))

from application.analyses.design_synth import DesignSynthService
from application.network_wizard import NetworkWizardService
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


def _build_services() -> tuple[NetworkWizardService, DesignSynthService]:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    uow_factory = build_uow_factory(session_factory)
    return NetworkWizardService(uow_factory), DesignSynthService(uow_factory)


def _create_case(wizard: NetworkWizardService) -> UUID:
    project = wizard.create_project("DesignSynth")
    case = wizard.create_operating_case(project.id, "Case", {"base_mva": 100.0})
    return case.id


def test_design_synth_service_roundtrip() -> None:
    wizard, service = _build_services()
    case_id = _create_case(wizard)

    spec_id = service.create_spec(case_id, "snap-1", {"scope": "connection"})
    spec = service.get_spec(spec_id)

    assert spec.case_id == case_id
    assert spec.base_snapshot_id == "snap-1"

    specs = service.list_specs(case_id)
    assert len(specs) == 1

    proposal_id = service.create_proposal(case_id, "snap-1", {"proposal": "draft"})
    proposal = service.get_proposal(proposal_id)
    assert proposal.status == "DRAFT"

    evidence_id = service.create_evidence(case_id, "snap-1", {"runs": ["run-1"]})
    evidence = service.get_evidence(evidence_id)
    assert evidence.snapshot_id == "snap-1"
