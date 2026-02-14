"""
Tests for SLD Geometry Overrides API (RUN #3H §3 + RUN #3I §I2).

Covers:
- GET /sld-overrides (empty initial state)
- PUT /sld-overrides (save + deterministic hash)
- POST /sld-overrides/validate (with known node/block ids)
- POST /sld-overrides/reset (back to empty)
- hash stability and determinism
- error handling (invalid scope/operation)
- RUN #3I §I2: file-backed persistence
"""

import json
import os
import tempfile

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.sld_overrides import (
    _overrides_store,
    _save_overrides,
    _get_overrides,
    clear_overrides_cache,
)
from domain.geometry_overrides import (
    GeometryOverrideItemV1,
    OverrideOperationV1,
    OverrideScopeV1,
    ProjectGeometryOverridesV1,
    canonicalize_overrides,
    compute_overrides_hash,
)


@pytest.fixture(autouse=True)
def clear_store():
    """Clear in-memory store before each test."""
    clear_overrides_cache()
    yield
    clear_overrides_cache()


@pytest.fixture
def client():
    return TestClient(app)


# =============================================================================
# GET /sld-overrides
# =============================================================================


class TestGetOverrides:
    def test_get_empty_overrides(self, client: TestClient):
        resp = client.get("/api/study-cases/case-1/sld-overrides")
        assert resp.status_code == 200
        data = resp.json()
        assert data["overrides_version"] == "1.0"
        assert data["study_case_id"] == "case-1"
        assert data["items"] == []
        assert len(data["overrides_hash"]) == 64

    def test_get_returns_saved_overrides(self, client: TestClient):
        # Save first
        client.put(
            "/api/study-cases/case-1/sld-overrides",
            json={
                "snapshot_hash": "snap-abc",
                "items": [
                    {
                        "element_id": "node-1",
                        "scope": "NODE",
                        "operation": "MOVE_DELTA",
                        "payload": {"dx": 40, "dy": -20},
                    }
                ],
            },
        )
        # Get
        resp = client.get("/api/study-cases/case-1/sld-overrides")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["element_id"] == "node-1"


# =============================================================================
# PUT /sld-overrides
# =============================================================================


class TestPutOverrides:
    def test_save_and_get_back(self, client: TestClient):
        body = {
            "snapshot_hash": "snap-123",
            "items": [
                {
                    "element_id": "node-1",
                    "scope": "NODE",
                    "operation": "MOVE_DELTA",
                    "payload": {"dx": 20, "dy": 0},
                },
                {
                    "element_id": "station-GPZ",
                    "scope": "BLOCK",
                    "operation": "MOVE_DELTA",
                    "payload": {"dx": 60, "dy": -40},
                },
            ],
        }
        resp = client.put("/api/study-cases/case-1/sld-overrides", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["overrides_version"] == "1.0"
        assert data["study_case_id"] == "case-1"
        assert data["snapshot_hash"] == "snap-123"
        assert len(data["items"]) == 2
        assert len(data["overrides_hash"]) == 64

    def test_save_returns_canonical_order(self, client: TestClient):
        body = {
            "snapshot_hash": "snap",
            "items": [
                {"element_id": "z-node", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 0, "dy": 0}},
                {"element_id": "a-block", "scope": "BLOCK", "operation": "MOVE_DELTA", "payload": {"dx": 0, "dy": 0}},
            ],
        }
        resp = client.put("/api/study-cases/case-1/sld-overrides", json=body)
        data = resp.json()
        # Items sorted by element_id
        assert data["items"][0]["element_id"] == "a-block"
        assert data["items"][1]["element_id"] == "z-node"

    def test_hash_deterministic_across_saves(self, client: TestClient):
        body = {
            "snapshot_hash": "snap",
            "items": [
                {"element_id": "node-1", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 40, "dy": 20}},
            ],
        }
        r1 = client.put("/api/study-cases/case-1/sld-overrides", json=body)
        h1 = r1.json()["overrides_hash"]

        # Save again (same data)
        r2 = client.put("/api/study-cases/case-1/sld-overrides", json=body)
        h2 = r2.json()["overrides_hash"]

        assert h1 == h2

    def test_hash_permutation_invariant(self, client: TestClient):
        items_a = [
            {"element_id": "node-1", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 10, "dy": 20}},
            {"element_id": "node-2", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 30, "dy": 40}},
        ]
        items_b = list(reversed(items_a))

        r1 = client.put("/api/study-cases/case-1/sld-overrides", json={"snapshot_hash": "s", "items": items_a})
        r2 = client.put("/api/study-cases/case-2/sld-overrides", json={"snapshot_hash": "s", "items": items_b})

        assert r1.json()["overrides_hash"] == r2.json()["overrides_hash"]

    def test_invalid_scope_returns_422(self, client: TestClient):
        body = {
            "snapshot_hash": "snap",
            "items": [
                {"element_id": "n", "scope": "INVALID", "operation": "MOVE_DELTA", "payload": {"dx": 0, "dy": 0}},
            ],
        }
        resp = client.put("/api/study-cases/case-1/sld-overrides", json=body)
        assert resp.status_code == 422

    def test_invalid_operation_returns_422(self, client: TestClient):
        body = {
            "snapshot_hash": "snap",
            "items": [
                {"element_id": "n", "scope": "NODE", "operation": "INVALID_OP", "payload": {}},
            ],
        }
        resp = client.put("/api/study-cases/case-1/sld-overrides", json=body)
        assert resp.status_code == 422


# =============================================================================
# POST /sld-overrides/validate
# =============================================================================


class TestValidateOverrides:
    def test_valid_overrides(self, client: TestClient):
        body = {
            "snapshot_hash": "snap",
            "items": [
                {"element_id": "node-1", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 20, "dy": 0}},
            ],
            "known_node_ids": ["node-1", "node-2"],
            "known_block_ids": [],
        }
        resp = client.post("/api/study-cases/case-1/sld-overrides/validate", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["errors"] == []

    def test_invalid_element_id(self, client: TestClient):
        body = {
            "snapshot_hash": "snap",
            "items": [
                {"element_id": "unknown", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 0, "dy": 0}},
            ],
            "known_node_ids": ["node-1"],
            "known_block_ids": [],
        }
        resp = client.post("/api/study-cases/case-1/sld-overrides/validate", json=body)
        data = resp.json()
        assert data["valid"] is False
        assert data["errors"][0]["code"] == "geometry.override_invalid_element"


# =============================================================================
# POST /sld-overrides/reset
# =============================================================================


class TestResetOverrides:
    def test_reset_clears_overrides(self, client: TestClient):
        # Save some overrides
        client.put(
            "/api/study-cases/case-1/sld-overrides",
            json={
                "snapshot_hash": "snap",
                "items": [
                    {"element_id": "node-1", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 20, "dy": 0}},
                ],
            },
        )

        # Reset
        resp = client.post("/api/study-cases/case-1/sld-overrides/reset")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []

        # Verify GET also returns empty
        resp2 = client.get("/api/study-cases/case-1/sld-overrides")
        assert resp2.json()["items"] == []


# =============================================================================
# Hash stability
# =============================================================================


class TestHashStability:
    def test_hash_50x_stable_through_api(self, client: TestClient):
        body = {
            "snapshot_hash": "snap-stable",
            "items": [
                {"element_id": "node-1", "scope": "NODE", "operation": "MOVE_DELTA", "payload": {"dx": 40, "dy": -20}},
                {"element_id": "station-GPZ", "scope": "BLOCK", "operation": "MOVE_DELTA", "payload": {"dx": 60, "dy": 0}},
            ],
        }

        hashes = set()
        for _ in range(50):
            resp = client.put(f"/api/study-cases/case-{_}/sld-overrides", json=body)
            hashes.add(resp.json()["overrides_hash"])

        assert len(hashes) == 1, f"Expected 1 unique hash, got {len(hashes)}"


# =============================================================================
# RUN #3I §I2: File-backed persistence
# =============================================================================


class TestFilePersistence:
    """File-backed persistence tests (RUN #3I §I2)."""

    def test_save_and_load_from_file(self):
        """Save overrides, clear cache, load from file."""
        import api.sld_overrides as mod

        with tempfile.TemporaryDirectory() as tmpdir:
            old_dir = mod._STORAGE_DIR
            try:
                mod._STORAGE_DIR = mod._Path(tmpdir)

                overrides = ProjectGeometryOverridesV1(
                    study_case_id="case-file-1",
                    snapshot_hash="snap-f1",
                    items=(
                        GeometryOverrideItemV1(
                            element_id="node-1",
                            scope=OverrideScopeV1.NODE,
                            operation=OverrideOperationV1.MOVE_DELTA,
                            payload={"dx": 40, "dy": -20},
                        ),
                    ),
                )
                canonical = canonicalize_overrides(overrides)
                _save_overrides("case-file-1", canonical)

                # Clear cache — force read from file
                clear_overrides_cache()

                loaded = _get_overrides("case-file-1")
                assert loaded.study_case_id == "case-file-1"
                assert len(loaded.items) == 1
                assert loaded.items[0].element_id == "node-1"
                assert loaded.items[0].payload == {"dx": 40, "dy": -20}
            finally:
                mod._STORAGE_DIR = old_dir

    def test_file_hash_stable_after_roundtrip(self):
        """Hash stays the same after file save → cache clear → file load."""
        import api.sld_overrides as mod

        with tempfile.TemporaryDirectory() as tmpdir:
            old_dir = mod._STORAGE_DIR
            try:
                mod._STORAGE_DIR = mod._Path(tmpdir)

                items = tuple(
                    GeometryOverrideItemV1(
                        element_id=f"elem-{i}",
                        scope=OverrideScopeV1.NODE,
                        operation=OverrideOperationV1.MOVE_DELTA,
                        payload={"dx": i * 10, "dy": -i * 5},
                    )
                    for i in range(10)
                )
                overrides = ProjectGeometryOverridesV1(
                    study_case_id="case-hash-rt",
                    snapshot_hash="snap-hash-rt",
                    items=items,
                )
                canonical = canonicalize_overrides(overrides)
                hash_before = compute_overrides_hash(canonical)
                _save_overrides("case-hash-rt", canonical)

                # Clear + reload
                clear_overrides_cache()
                loaded = _get_overrides("case-hash-rt")
                hash_after = compute_overrides_hash(loaded)
                assert hash_before == hash_after
            finally:
                mod._STORAGE_DIR = old_dir

    def test_file_json_is_valid(self):
        """Saved file must be valid JSON and contain expected keys."""
        import api.sld_overrides as mod

        with tempfile.TemporaryDirectory() as tmpdir:
            old_dir = mod._STORAGE_DIR
            try:
                mod._STORAGE_DIR = mod._Path(tmpdir)

                overrides = ProjectGeometryOverridesV1(
                    study_case_id="case-json-check",
                    snapshot_hash="snap-json",
                    items=(
                        GeometryOverrideItemV1(
                            element_id="block-1",
                            scope=OverrideScopeV1.BLOCK,
                            operation=OverrideOperationV1.MOVE_DELTA,
                            payload={"dx": 20, "dy": 0},
                        ),
                    ),
                )
                _save_overrides("case-json-check", overrides)

                # Read raw JSON
                file_path = mod._Path(tmpdir) / "overrides_case-json-check.json"
                assert file_path.exists()
                data = json.loads(file_path.read_text(encoding="utf-8"))
                assert data["overrides_version"] == "1.0"
                assert data["study_case_id"] == "case-json-check"
                assert len(data["items"]) == 1
                assert data["items"][0]["element_id"] == "block-1"
            finally:
                mod._STORAGE_DIR = old_dir

    def test_no_storage_dir_means_memory_only(self):
        """Without SLD_OVERRIDES_DIR, overrides stay in memory only."""
        import api.sld_overrides as mod

        old_dir = mod._STORAGE_DIR
        try:
            mod._STORAGE_DIR = None

            overrides = ProjectGeometryOverridesV1(
                study_case_id="case-mem",
                snapshot_hash="snap-mem",
                items=(
                    GeometryOverrideItemV1(
                        element_id="node-mem",
                        scope=OverrideScopeV1.NODE,
                        operation=OverrideOperationV1.MOVE_DELTA,
                        payload={"dx": 10, "dy": 10},
                    ),
                ),
            )
            _save_overrides("case-mem", overrides)

            # In memory — present
            loaded = _get_overrides("case-mem")
            assert len(loaded.items) == 1

            # Clear cache → gone (no file)
            clear_overrides_cache()
            loaded2 = _get_overrides("case-mem")
            assert len(loaded2.items) == 0
        finally:
            mod._STORAGE_DIR = old_dir

    def test_50x_hash_stable_through_file_persistence(self):
        """50× save → clear → load → hash must be stable."""
        import api.sld_overrides as mod

        with tempfile.TemporaryDirectory() as tmpdir:
            old_dir = mod._STORAGE_DIR
            try:
                mod._STORAGE_DIR = mod._Path(tmpdir)

                overrides = ProjectGeometryOverridesV1(
                    study_case_id="case-50x",
                    snapshot_hash="snap-50x",
                    items=tuple(
                        GeometryOverrideItemV1(
                            element_id=f"n-{i}",
                            scope=OverrideScopeV1.NODE,
                            operation=OverrideOperationV1.MOVE_DELTA,
                            payload={"dx": i, "dy": -i},
                        )
                        for i in range(20)
                    ),
                )
                canonical = canonicalize_overrides(overrides)
                ref_hash = compute_overrides_hash(canonical)

                for iteration in range(50):
                    _save_overrides("case-50x", canonical)
                    clear_overrides_cache()
                    loaded = _get_overrides("case-50x")
                    h = compute_overrides_hash(loaded)
                    assert h == ref_hash, f"Iteration {iteration}: hash mismatch"
            finally:
                mod._STORAGE_DIR = old_dir

    def test_case_id_sanitization(self):
        """Case IDs with special chars are sanitized for filenames."""
        import api.sld_overrides as mod

        with tempfile.TemporaryDirectory() as tmpdir:
            old_dir = mod._STORAGE_DIR
            try:
                mod._STORAGE_DIR = mod._Path(tmpdir)

                weird_id = "case/with spaces&special!chars"
                overrides = ProjectGeometryOverridesV1(
                    study_case_id=weird_id,
                    snapshot_hash="snap-san",
                )
                _save_overrides(weird_id, overrides)

                clear_overrides_cache()
                loaded = _get_overrides(weird_id)
                assert loaded.study_case_id == weird_id
            finally:
                mod._STORAGE_DIR = old_dir


class TestApiFilePersistence:
    """API-level file persistence tests (RUN #3I §I2)."""

    def test_api_save_load_through_file(self, client: TestClient):
        """Save via PUT, clear cache, GET reads from file."""
        import api.sld_overrides as mod

        with tempfile.TemporaryDirectory() as tmpdir:
            old_dir = mod._STORAGE_DIR
            try:
                mod._STORAGE_DIR = mod._Path(tmpdir)

                body = {
                    "snapshot_hash": "snap-api-file",
                    "items": [
                        {
                            "element_id": "node-api-1",
                            "scope": "NODE",
                            "operation": "MOVE_DELTA",
                            "payload": {"dx": 100, "dy": -50},
                        }
                    ],
                }
                resp_put = client.put(
                    "/api/study-cases/case-api-file/sld-overrides", json=body
                )
                assert resp_put.status_code == 200
                hash_put = resp_put.json()["overrides_hash"]

                # Clear cache to force file read
                clear_overrides_cache()

                resp_get = client.get(
                    "/api/study-cases/case-api-file/sld-overrides"
                )
                assert resp_get.status_code == 200
                data = resp_get.json()
                assert len(data["items"]) == 1
                assert data["items"][0]["element_id"] == "node-api-1"
                assert data["overrides_hash"] == hash_put
            finally:
                mod._STORAGE_DIR = old_dir

    def test_api_reset_deletes_from_cache_but_not_file(self, client: TestClient):
        """Reset clears cache; file still exists (but contents reset)."""
        import api.sld_overrides as mod

        with tempfile.TemporaryDirectory() as tmpdir:
            old_dir = mod._STORAGE_DIR
            try:
                mod._STORAGE_DIR = mod._Path(tmpdir)

                body = {
                    "snapshot_hash": "snap-reset-file",
                    "items": [
                        {
                            "element_id": "node-r",
                            "scope": "NODE",
                            "operation": "MOVE_DELTA",
                            "payload": {"dx": 20, "dy": 0},
                        }
                    ],
                }
                client.put(
                    "/api/study-cases/case-reset-file/sld-overrides", json=body
                )

                # Reset
                resp = client.post(
                    "/api/study-cases/case-reset-file/sld-overrides/reset"
                )
                assert resp.status_code == 200
                assert resp.json()["items"] == []

                # File exists (reset state saved)
                file_path = mod._Path(tmpdir) / "overrides_case-reset-file.json"
                assert file_path.exists()

                # Reload from file → empty
                clear_overrides_cache()
                resp_get = client.get(
                    "/api/study-cases/case-reset-file/sld-overrides"
                )
                assert resp_get.json()["items"] == []
            finally:
                mod._STORAGE_DIR = old_dir
