from __future__ import annotations

import sys
from pathlib import Path
import importlib.util

import pytest

# Add backend/src to path for imports
backend_src = Path(__file__).parents[1] / "src"
sys.path.insert(0, str(backend_src))

_MISSING_DEPS = {
    name for name in ("sqlalchemy", "numpy", "networkx")
    if importlib.util.find_spec(name) is None
}


def pytest_ignore_collect(collection_path, config):
    if not _MISSING_DEPS:
        return False
    path_str = str(collection_path)
    if "tests/proof_engine" in path_str:
        return False
    return True

@pytest.fixture()
def db_engine(tmp_path):
    if importlib.util.find_spec("sqlalchemy") is None:
        pytest.skip("SQLAlchemy not available in test environment.")

    from infrastructure.persistence.db import (
        create_engine_from_url,
        create_session_factory,
        init_db,
    )

    db_path = tmp_path / "test.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session_factory(db_engine):
    from infrastructure.persistence.db import create_session_factory

    return create_session_factory(db_engine)


@pytest.fixture()
def uow_factory(db_session_factory):
    from infrastructure.persistence.unit_of_work import build_uow_factory

    return build_uow_factory(db_session_factory)
