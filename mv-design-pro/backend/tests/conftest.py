from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

# Add backend/src to path for imports
backend_src = Path(__file__).parents[1] / "src"
sys.path.insert(0, str(backend_src))

from api.dependencies import get_uow_factory
from api.main import app
from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.unit_of_work import build_uow_factory


@pytest.fixture()
def db_engine(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session_factory(db_engine):
    return create_session_factory(db_engine)


@pytest.fixture()
def uow_factory(db_session_factory):
    return build_uow_factory(db_session_factory)


@pytest.fixture()
def app_client(uow_factory):
    def _override_get_uow_factory(_request: Request):
        return uow_factory

    app.dependency_overrides[get_uow_factory] = _override_get_uow_factory
    app.state.uow_factory = uow_factory
    client = TestClient(app)
    try:
        yield client
    finally:
        app.dependency_overrides.pop(get_uow_factory, None)
        app.state.uow_factory = None
        client.close()
