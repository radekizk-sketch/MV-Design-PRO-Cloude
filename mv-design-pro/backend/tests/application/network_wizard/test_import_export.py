from __future__ import annotations

import json
import sys
from pathlib import Path

# Add backend/src to path for imports
backend_src = Path(__file__).parents[2] / "src"
sys.path.insert(0, str(backend_src))

from application.network_wizard import NetworkWizardService
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory

DATA_PATH = Path(__file__).parent / "data" / "golden_network.json"


def _build_service() -> NetworkWizardService:
    engine = create_engine_from_url("sqlite+pysqlite:///:memory:")
    init_db(engine)
    session_factory = create_session_factory(engine)
    return NetworkWizardService(build_uow_factory(session_factory))


def test_import_export_roundtrip_and_determinism() -> None:
    service = _build_service()
    project = service.create_project("Import")

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    report = service.import_network(project.id, payload)

    assert report.validation is not None
    assert report.validation.is_valid

    export_first = service.export_network(project.id)
    export_second = service.export_network(project.id)

    assert json.dumps(export_first, sort_keys=True) == json.dumps(export_second, sort_keys=True)
