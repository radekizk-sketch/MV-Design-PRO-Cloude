"""Tests for FaultScenario Repository — CRUD + duplicate hash check."""

from uuid import uuid4

import pytest

from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.repositories.fault_scenario_repository import (
    FaultScenarioRepository,
)


@pytest.fixture()
def session(tmp_path):
    db_path = tmp_path / "test_fs.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    factory = create_session_factory(engine)
    s = factory()
    yield s
    s.close()
    engine.dispose()


@pytest.fixture()
def repo(session):
    return FaultScenarioRepository(session)


class TestFaultScenarioRepository:
    def test_add_and_get(self, repo):
        sid = uuid4()
        case_id = uuid4()
        repo.add(
            scenario_id=sid,
            study_case_id=case_id,
            name="Zwarcie 3F na szynie A",
            fault_type="SC_3F",
            config_json={"c_factor": 1.1, "location": {"element_ref": "bus-1"}},
            content_hash="abc123def456",
        )
        result = repo.get(sid)
        assert result is not None
        assert result["name"] == "Zwarcie 3F na szynie A"
        assert result["fault_type"] == "SC_3F"
        assert result["content_hash"] == "abc123def456"

    def test_get_nonexistent_returns_none(self, repo):
        assert repo.get(uuid4()) is None

    def test_list_by_case_empty(self, repo):
        assert repo.list_by_case(uuid4()) == []

    def test_list_by_case_sorted(self, repo):
        case_id = uuid4()
        repo.add(uuid4(), case_id, "SC 1F", "SC_1F", {}, "h1")
        repo.add(uuid4(), case_id, "SC 3F", "SC_3F", {}, "h2")
        repo.add(uuid4(), case_id, "SC 2F", "SC_2F", {}, "h3")

        results = repo.list_by_case(case_id)
        assert len(results) == 3
        # Sorted by fault_type then name
        types = [r["fault_type"] for r in results]
        assert types == ["SC_1F", "SC_2F", "SC_3F"]

    def test_update(self, repo):
        sid = uuid4()
        repo.add(sid, uuid4(), "Original", "SC_3F", {}, "h1")

        updated = repo.update(sid, name="Updated Name", content_hash="h2")
        assert updated is True

        result = repo.get(sid)
        assert result["name"] == "Updated Name"
        assert result["content_hash"] == "h2"

    def test_update_nonexistent_returns_false(self, repo):
        assert repo.update(uuid4(), name="X") is False

    def test_delete(self, repo):
        sid = uuid4()
        repo.add(sid, uuid4(), "To Delete", "SC_3F", {}, "h1")
        assert repo.delete(sid) is True
        assert repo.get(sid) is None

    def test_delete_nonexistent_returns_false(self, repo):
        assert repo.delete(uuid4()) is False

    def test_has_duplicate_hash(self, repo):
        case_id = uuid4()
        repo.add(uuid4(), case_id, "S1", "SC_3F", {}, "same_hash")

        assert repo.has_duplicate_hash(case_id, "same_hash") is True
        assert repo.has_duplicate_hash(case_id, "different_hash") is False

    def test_has_duplicate_hash_excludes_self(self, repo):
        case_id = uuid4()
        sid = uuid4()
        repo.add(sid, case_id, "S1", "SC_3F", {}, "hash1")

        # When excluding own ID, no duplicate
        assert repo.has_duplicate_hash(case_id, "hash1", exclude_id=sid) is False

    def test_different_cases_no_cross_contamination(self, repo):
        case_a = uuid4()
        case_b = uuid4()
        repo.add(uuid4(), case_a, "S-A", "SC_3F", {}, "ha")
        repo.add(uuid4(), case_b, "S-B", "SC_1F", {}, "hb")

        list_a = repo.list_by_case(case_a)
        list_b = repo.list_by_case(case_b)
        assert len(list_a) == 1
        assert len(list_b) == 1
        assert list_a[0]["name"] == "S-A"
        assert list_b[0]["name"] == "S-B"
