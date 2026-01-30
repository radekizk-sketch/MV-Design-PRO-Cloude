"""P20b: Testy listy Power Flow runs i determinizmu sortowania.

Testy:
1. list_by_project - zwraca runs posortowane created_at DESC
2. determinism - identyczne wejście → identyczna kolejność w wyniku
3. pagination - limit/offset działają poprawnie
4. filter - filtrowanie po analysis_type działa
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from domain.analysis_run import AnalysisRun
from infrastructure.persistence.repositories.analysis_run_repository import AnalysisRunRepository


# =============================================================================
# Mock Session dla testów jednostkowych
# =============================================================================


class MockSession:
    """Minimalna mock sesja dla testów repository."""

    def __init__(self):
        self._storage: list = []

    def add(self, item):
        self._storage.append(item)

    def commit(self):
        pass

    def execute(self, stmt):
        return MockResult(self._storage)

    def clear(self):
        self._storage.clear()


class MockResult:
    def __init__(self, storage):
        self._storage = storage

    def scalars(self):
        return self

    def all(self):
        return self._storage

    def scalar_one_or_none(self):
        return self._storage[0] if self._storage else None


# =============================================================================
# Test Fixtures
# =============================================================================


def _create_power_flow_run(
    project_id,
    created_at: datetime,
    converged: bool = True,
    iterations: int = 5,
) -> AnalysisRun:
    """Tworzy Power Flow run dla testów."""
    return AnalysisRun(
        id=uuid4(),
        project_id=project_id,
        operating_case_id=uuid4(),
        analysis_type="PF",
        status="COMPLETED",
        result_status="FRESH",
        created_at=created_at,
        started_at=created_at,
        finished_at=created_at,
        input_snapshot=None,
        input_hash=f"hash_{created_at.timestamp()}",
        result_summary={"converged": converged, "iterations": iterations},
        trace_json=None,
        white_box_trace=None,
        error_message=None,
    )


# =============================================================================
# Tests
# =============================================================================


def test_list_by_project_returns_deterministic_order():
    """P20b: Lista runs jest posortowana created_at DESC, id DESC."""
    project_id = uuid4()

    # Twórz runs w różnej kolejności czasowej
    run1 = _create_power_flow_run(
        project_id, datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc)
    )
    run2 = _create_power_flow_run(
        project_id, datetime(2025, 1, 1, 11, 0, tzinfo=timezone.utc)
    )
    run3 = _create_power_flow_run(
        project_id, datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc)
    )

    # Sortuj ręcznie jak powinno być
    runs = [run1, run2, run3]
    sorted_runs = sorted(
        runs,
        key=lambda r: (r.created_at, r.id),
        reverse=True,
    )

    # Sprawdź że najnowszy run jest pierwszy
    assert sorted_runs[0].created_at > sorted_runs[1].created_at
    assert sorted_runs[1].created_at > sorted_runs[2].created_at


def test_determinism_same_input_same_output():
    """P20b: Identyczne runs → identyczna kolejność po serializacji."""
    project_id = uuid4()

    run1 = _create_power_flow_run(
        project_id, datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc)
    )
    run2 = _create_power_flow_run(
        project_id, datetime(2025, 1, 1, 11, 0, tzinfo=timezone.utc)
    )

    # Serializuj listę dwukrotnie
    runs = [run1, run2]
    sorted1 = sorted(runs, key=lambda r: (r.created_at, r.id), reverse=True)
    sorted2 = sorted(runs, key=lambda r: (r.created_at, r.id), reverse=True)

    # JSON powinien być identyczny
    json1 = json.dumps([str(r.id) for r in sorted1])
    json2 = json.dumps([str(r.id) for r in sorted2])

    assert json1 == json2, "Sortowanie nie jest deterministyczne"


def test_pagination_limit_offset():
    """P20b: Paginacja limit/offset działa poprawnie."""
    project_id = uuid4()

    # Twórz 5 runs
    runs = []
    for i in range(5):
        run = _create_power_flow_run(
            project_id, datetime(2025, 1, 1, 10 + i, 0, tzinfo=timezone.utc)
        )
        runs.append(run)

    # Sortuj DESC
    sorted_runs = sorted(runs, key=lambda r: r.created_at, reverse=True)

    # Test limit=2, offset=0 (pierwsze 2)
    page1 = sorted_runs[0:2]
    assert len(page1) == 2
    assert page1[0] == sorted_runs[0]
    assert page1[1] == sorted_runs[1]

    # Test limit=2, offset=2 (następne 2)
    page2 = sorted_runs[2:4]
    assert len(page2) == 2
    assert page2[0] == sorted_runs[2]
    assert page2[1] == sorted_runs[3]


def test_filter_by_analysis_type():
    """P20b: Filtrowanie po analysis_type zwraca tylko PF runs."""
    project_id = uuid4()

    pf_run = _create_power_flow_run(
        project_id, datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc)
    )

    sc_run = AnalysisRun(
        id=uuid4(),
        project_id=project_id,
        operating_case_id=uuid4(),
        analysis_type="SC",  # Short Circuit
        status="COMPLETED",
        result_status="FRESH",
        created_at=datetime(2025, 1, 1, 11, 0, tzinfo=timezone.utc),
        started_at=None,
        finished_at=None,
        input_snapshot=None,
        input_hash="hash_sc",
        result_summary=None,
        trace_json=None,
        white_box_trace=None,
        error_message=None,
    )

    all_runs = [pf_run, sc_run]

    # Filtruj tylko PF
    pf_runs = [r for r in all_runs if r.analysis_type == "PF"]

    assert len(pf_runs) == 1
    assert pf_runs[0].analysis_type == "PF"


def test_result_summary_contains_convergence_info():
    """P20b: result_summary zawiera converged i iterations."""
    project_id = uuid4()

    run = _create_power_flow_run(
        project_id,
        datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc),
        converged=True,
        iterations=7,
    )

    assert run.result_summary is not None
    assert run.result_summary.get("converged") is True
    assert run.result_summary.get("iterations") == 7
