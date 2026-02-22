"""Tests for BatchJob Repository — CRUD + status transitions."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from infrastructure.persistence.db import create_engine_from_url, create_session_factory, init_db
from infrastructure.persistence.repositories.batch_job_repository import BatchJobRepository


@pytest.fixture()
def session(tmp_path):
    db_path = tmp_path / "test_batch.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    factory = create_session_factory(engine)
    s = factory()
    yield s
    s.close()
    engine.dispose()


@pytest.fixture()
def repo(session):
    return BatchJobRepository(session)


class TestBatchJobRepository:
    def test_add_and_get(self, repo):
        bid = uuid4()
        case_id = uuid4()
        jobs = {"scenario_ids": [str(uuid4())], "analysis_type": "SC_3F"}
        repo.add(bid, case_id, "SC_3F", jobs)

        result = repo.get(bid)
        assert result is not None
        assert result["status"] == "PENDING"
        assert result["analysis_type"] == "SC_3F"

    def test_get_nonexistent_returns_none(self, repo):
        assert repo.get(uuid4()) is None

    def test_list_by_case_newest_first(self, repo):
        case_id = uuid4()
        b1 = uuid4()
        b2 = uuid4()
        repo.add(b1, case_id, "SC_3F", {"order": 1})
        repo.add(b2, case_id, "LF", {"order": 2})

        results = repo.list_by_case(case_id)
        assert len(results) == 2
        # Newest first (b2 created after b1)
        assert results[0]["jobs_json"]["order"] == 2
        assert results[1]["jobs_json"]["order"] == 1

    def test_update_status_to_running(self, repo):
        bid = uuid4()
        repo.add(bid, uuid4(), "SC_3F", {})

        now = datetime.now(timezone.utc)
        assert repo.update_status(bid, "RUNNING", started_at=now) is True

        result = repo.get(bid)
        assert result["status"] == "RUNNING"
        assert result["started_at"] is not None

    def test_update_status_to_done(self, repo):
        bid = uuid4()
        repo.add(bid, uuid4(), "SC_3F", {})

        now = datetime.now(timezone.utc)
        repo.update_status(bid, "RUNNING", started_at=now)
        repo.update_status(
            bid,
            "DONE",
            jobs_json={"run_ids": ["r1", "r2"]},
            finished_at=now,
        )

        result = repo.get(bid)
        assert result["status"] == "DONE"
        assert result["finished_at"] is not None
        assert result["jobs_json"]["run_ids"] == ["r1", "r2"]

    def test_update_status_nonexistent_returns_false(self, repo):
        assert repo.update_status(uuid4(), "RUNNING") is False

    def test_delete(self, repo):
        bid = uuid4()
        repo.add(bid, uuid4(), "SC_3F", {})
        assert repo.delete(bid) is True
        assert repo.get(bid) is None

    def test_delete_nonexistent_returns_false(self, repo):
        assert repo.delete(uuid4()) is False

    def test_list_by_case_empty(self, repo):
        assert repo.list_by_case(uuid4()) == []

    def test_different_cases_isolated(self, repo):
        ca = uuid4()
        cb = uuid4()
        repo.add(uuid4(), ca, "SC_3F", {"case": "A"})
        repo.add(uuid4(), cb, "LF", {"case": "B"})

        assert len(repo.list_by_case(ca)) == 1
        assert len(repo.list_by_case(cb)) == 1
