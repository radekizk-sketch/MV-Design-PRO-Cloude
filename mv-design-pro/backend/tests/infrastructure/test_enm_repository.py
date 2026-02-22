"""Tests for ENM Repository — CRUD + version conflict."""

from uuid import uuid4

import pytest

from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.repositories.enm_repository import ENMRepository


@pytest.fixture()
def session(tmp_path):
    db_path = tmp_path / "test_enm.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    factory = create_session_factory(engine)
    s = factory()
    yield s
    s.close()
    engine.dispose()


@pytest.fixture()
def repo(session):
    return ENMRepository(session)


class TestENMRepository:
    def test_get_nonexistent_returns_none(self, repo):
        result = repo.get_by_case_id("nonexistent-case")
        assert result is None

    def test_upsert_creates_new_entry(self, repo):
        enm_json = {"header": {"name": "Test Model", "revision": 1}, "buses": []}
        row = repo.upsert(
            case_id="case-001",
            enm_json=enm_json,
            revision=1,
            hash_sha256="abc123",
        )
        assert row.case_id == "case-001"
        assert row.revision == 1

    def test_upsert_then_get(self, repo):
        enm_json = {"header": {"name": "Test"}, "buses": [{"id": "b1"}]}
        repo.upsert(
            case_id="case-002",
            enm_json=enm_json,
            revision=1,
            hash_sha256="hash1",
        )
        result = repo.get_by_case_id("case-002")
        assert result is not None
        assert result["case_id"] == "case-002"
        assert result["revision"] == 1
        assert result["hash_sha256"] == "hash1"
        assert result["enm_json"]["buses"][0]["id"] == "b1"

    def test_upsert_updates_existing(self, repo):
        enm_json_v1 = {"header": {"name": "V1"}, "buses": []}
        repo.upsert(case_id="case-003", enm_json=enm_json_v1, revision=1, hash_sha256="h1")

        enm_json_v2 = {"header": {"name": "V2"}, "buses": [{"id": "b1"}]}
        repo.upsert(case_id="case-003", enm_json=enm_json_v2, revision=2, hash_sha256="h2")

        result = repo.get_by_case_id("case-003")
        assert result["revision"] == 2
        assert result["hash_sha256"] == "h2"
        assert result["enm_json"]["header"]["name"] == "V2"

    def test_delete_existing(self, repo):
        repo.upsert(case_id="case-del", enm_json={}, revision=1, hash_sha256="x")
        assert repo.delete_by_case_id("case-del") is True
        assert repo.get_by_case_id("case-del") is None

    def test_delete_nonexistent_returns_false(self, repo):
        assert repo.delete_by_case_id("no-such-case") is False

    def test_unique_case_id(self, repo):
        """Two upserts with same case_id update, not duplicate."""
        repo.upsert(case_id="unique-case", enm_json={"v": 1}, revision=1, hash_sha256="a")
        repo.upsert(case_id="unique-case", enm_json={"v": 2}, revision=2, hash_sha256="b")
        result = repo.get_by_case_id("unique-case")
        assert result["revision"] == 2

    def test_multiple_cases_independent(self, repo):
        repo.upsert(case_id="c1", enm_json={"n": "first"}, revision=1, hash_sha256="h1")
        repo.upsert(case_id="c2", enm_json={"n": "second"}, revision=1, hash_sha256="h2")

        r1 = repo.get_by_case_id("c1")
        r2 = repo.get_by_case_id("c2")
        assert r1["enm_json"]["n"] == "first"
        assert r2["enm_json"]["n"] == "second"
