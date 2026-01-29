from __future__ import annotations

import pytest

pytest.importorskip("fastapi")

from fastapi import Request
from fastapi.testclient import TestClient

from api.dependencies import get_uow_factory
from api.main import app


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
