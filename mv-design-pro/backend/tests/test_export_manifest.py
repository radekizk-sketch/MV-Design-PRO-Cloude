"""
Tests for ExportManifestV1 domain model (RUN #3I §I1).

Covers:
- build_export_manifest determinism (50×)
- overrides_hash presence / absence
- readiness_status in canonical hash
- content_hash stability
- element_id sort/dedup
- spec_version = 1.2
"""

import pytest

from src.domain.export_manifest import (
    ExportManifestV1,
    build_export_manifest,
)


# =============================================================================
# Basic construction
# =============================================================================


class TestBuildExportManifest:
    def test_returns_frozen_dataclass(self):
        m = build_export_manifest(
            snapshot_hash="snap_abc",
            layout_hash="layout_xyz",
            element_ids=["bus_1"],
            analysis_types=["SC_3F"],
        )
        assert isinstance(m, ExportManifestV1)
        with pytest.raises(AttributeError):
            m.snapshot_hash = "new"  # type: ignore[misc]

    def test_spec_version_is_1_2(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=[],
            analysis_types=[],
        )
        assert m.spec_version == "1.2"

    def test_element_ids_sorted_and_deduped(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["c", "a", "b", "a", "c"],
            analysis_types=[],
        )
        assert m.element_ids == ("a", "b", "c")

    def test_analysis_types_sorted(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=[],
            analysis_types=["SC_3F", "LOAD_FLOW", "PROTECTION"],
        )
        assert m.analysis_types == ("LOAD_FLOW", "PROTECTION", "SC_3F")

    def test_run_hash_null_by_default(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=[],
            analysis_types=[],
        )
        assert m.run_hash is None

    def test_readiness_status_defaults_to_unknown(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=[],
            analysis_types=[],
        )
        assert m.readiness_status == "UNKNOWN"

    def test_created_at_is_iso_format(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=[],
            analysis_types=[],
        )
        assert "T" in m.created_at
        assert len(m.created_at) > 10


# =============================================================================
# Content hash determinism
# =============================================================================


class TestContentHash:
    def test_content_hash_is_sha256(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["bus_1"],
            analysis_types=["SC_3F"],
        )
        assert len(m.content_hash) == 64
        assert all(c in "0123456789abcdef" for c in m.content_hash)

    def test_same_input_same_hash(self):
        params = dict(
            snapshot_hash="snap_abc",
            layout_hash="layout_xyz",
            element_ids=["bus_2", "bus_1"],
            analysis_types=["LOAD_FLOW", "SC_3F"],
        )
        m1 = build_export_manifest(**params)
        m2 = build_export_manifest(**params)
        assert m1.content_hash == m2.content_hash

    def test_element_order_invariant(self):
        m1 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["a", "b", "c"],
            analysis_types=[],
        )
        m2 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["c", "b", "a"],
            analysis_types=[],
        )
        assert m1.content_hash == m2.content_hash

    def test_different_snapshot_different_hash(self):
        m1 = build_export_manifest(
            snapshot_hash="snap_a",
            layout_hash="layout",
            element_ids=["bus_1"],
            analysis_types=[],
        )
        m2 = build_export_manifest(
            snapshot_hash="snap_b",
            layout_hash="layout",
            element_ids=["bus_1"],
            analysis_types=[],
        )
        assert m1.content_hash != m2.content_hash

    def test_different_layout_different_hash(self):
        m1 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout_a",
            element_ids=["bus_1"],
            analysis_types=[],
        )
        m2 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout_b",
            element_ids=["bus_1"],
            analysis_types=[],
        )
        assert m1.content_hash != m2.content_hash

    def test_50x_stable(self):
        ref = build_export_manifest(
            snapshot_hash="snap_stable",
            layout_hash="layout_stable",
            element_ids=[f"elem_{i}" for i in range(50)],
            analysis_types=["SC_3F", "LOAD_FLOW"],
        )
        for _ in range(50):
            m = build_export_manifest(
                snapshot_hash="snap_stable",
                layout_hash="layout_stable",
                element_ids=[f"elem_{i}" for i in range(50)],
                analysis_types=["SC_3F", "LOAD_FLOW"],
            )
            assert m.content_hash == ref.content_hash


# =============================================================================
# Overrides fields (RUN #3H / #3I)
# =============================================================================


class TestOverridesFields:
    def test_overrides_hash_present_when_provided(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=[],
            analysis_types=[],
            overrides_hash="abc123",
            overrides_version="1.0",
        )
        assert m.overrides_hash == "abc123"
        assert m.overrides_version == "1.0"

    def test_overrides_hash_null_by_default(self):
        m = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=[],
            analysis_types=[],
        )
        assert m.overrides_hash is None
        assert m.overrides_version is None

    def test_overrides_hash_changes_content_hash(self):
        m1 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["bus_1"],
            analysis_types=[],
        )
        m2 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["bus_1"],
            analysis_types=[],
            overrides_hash="overrides_abc",
        )
        assert m1.content_hash != m2.content_hash

    def test_different_readiness_different_hash(self):
        m1 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["bus_1"],
            analysis_types=[],
            readiness_status="READY",
        )
        m2 = build_export_manifest(
            snapshot_hash="snap",
            layout_hash="layout",
            element_ids=["bus_1"],
            analysis_types=[],
            readiness_status="BLOCKED",
        )
        assert m1.content_hash != m2.content_hash


# =============================================================================
# E2E pipeline determinism (RUN #3I)
# =============================================================================


class TestE2EPipeline:
    def test_full_pipeline_with_overrides_50x_stable(self):
        """
        Symulacja pelnego E2E:
        Snapshot → Layout → Overrides → Manifest
        50× ten sam input → identyczny content_hash.
        """
        params = dict(
            snapshot_hash="snap_e2e",
            layout_hash="layout_e2e",
            run_hash="run_e2e",
            element_ids=["bus_gpz", "bus_sn_st01", "bus_nn_st01", "load_01"],
            analysis_types=["SC_3F", "LOAD_FLOW"],
            readiness_status="READY",
            overrides_hash="overrides_e2e_hash",
            overrides_version="1.0",
        )
        ref = build_export_manifest(**params)
        for _ in range(50):
            m = build_export_manifest(**params)
            assert m.content_hash == ref.content_hash
            assert m.overrides_hash == "overrides_e2e_hash"
            assert m.overrides_version == "1.0"
            assert m.spec_version == "1.2"
