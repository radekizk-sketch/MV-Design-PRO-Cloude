"""
Tests for solver_input.provenance module.

Validates SHA-256 hashing determinism, SourceKind enum, ProvenanceEntry
immutability, and provenance summary aggregation.
"""

from __future__ import annotations

import pytest

from solver_input.provenance import (
    SourceKind,
    SourceRef,
    ProvenanceEntry,
    ProvenanceSummary,
    compute_value_hash,
    build_provenance_summary,
)


# ---------------------------------------------------------------------------
# compute_value_hash
# ---------------------------------------------------------------------------


class TestComputeValueHash:
    def test_consistent_sha256_same_input(self):
        """Same input must always produce the same hash (determinism)."""
        value = {"r_ohm_per_km": 0.161, "x_ohm_per_km": 0.190}
        hash1 = compute_value_hash(value)
        hash2 = compute_value_hash(value)
        assert hash1 == hash2

    def test_consistent_for_scalar(self):
        h1 = compute_value_hash(42.0)
        h2 = compute_value_hash(42.0)
        assert h1 == h2

    def test_different_for_different_inputs(self):
        hash_a = compute_value_hash({"field": 1.0})
        hash_b = compute_value_hash({"field": 2.0})
        assert hash_a != hash_b

    def test_hash_is_16_chars(self):
        """Hash is truncated to first 16 hex chars of SHA-256."""
        h = compute_value_hash("test_value")
        assert len(h) == 16
        # Should be valid hex string
        int(h, 16)

    def test_order_independent_dict_keys(self):
        """JSON sort_keys=True ensures key ordering does not affect hash."""
        h1 = compute_value_hash({"b": 2, "a": 1})
        h2 = compute_value_hash({"a": 1, "b": 2})
        assert h1 == h2

    def test_different_types_different_hash(self):
        h_int = compute_value_hash(1)
        h_str = compute_value_hash("1")
        assert h_int != h_str


# ---------------------------------------------------------------------------
# SourceKind enum
# ---------------------------------------------------------------------------


class TestSourceKind:
    def test_catalog_value(self):
        assert SourceKind.CATALOG.value == "CATALOG"

    def test_override_value(self):
        assert SourceKind.OVERRIDE.value == "OVERRIDE"

    def test_derived_value(self):
        assert SourceKind.DERIVED.value == "DERIVED"

    def test_default_forbidden_value(self):
        assert SourceKind.DEFAULT_FORBIDDEN.value == "DEFAULT_FORBIDDEN"

    def test_all_expected_values(self):
        expected = {"CATALOG", "OVERRIDE", "DERIVED", "DEFAULT_FORBIDDEN"}
        actual = {sk.value for sk in SourceKind}
        assert actual == expected


# ---------------------------------------------------------------------------
# ProvenanceEntry (frozen dataclass)
# ---------------------------------------------------------------------------


class TestProvenanceEntry:
    def test_create_entry(self):
        entry = ProvenanceEntry(
            element_ref="line_1",
            field_path="branches[0].r_ohm_per_km",
            source_kind=SourceKind.CATALOG,
            source_ref=SourceRef(catalog_ref="cable_YAKXS_120"),
            value_hash="abc123",
            unit="ohm/km",
            note="From catalog",
        )
        assert entry.element_ref == "line_1"
        assert entry.field_path == "branches[0].r_ohm_per_km"
        assert entry.source_kind == SourceKind.CATALOG
        assert entry.source_ref.catalog_ref == "cable_YAKXS_120"
        assert entry.value_hash == "abc123"
        assert entry.unit == "ohm/km"
        assert entry.note == "From catalog"

    def test_is_frozen(self):
        entry = ProvenanceEntry(
            element_ref="line_1",
            field_path="branches[0].r_ohm_per_km",
            source_kind=SourceKind.CATALOG,
        )
        with pytest.raises(AttributeError):
            entry.element_ref = "changed"  # type: ignore[misc]

    def test_to_dict(self):
        entry = ProvenanceEntry(
            element_ref="trafo_1",
            field_path="transformers[0].uk_percent",
            source_kind=SourceKind.OVERRIDE,
            source_ref=SourceRef(override_reason="Manual adjustment"),
            value_hash="def456",
            unit="%",
        )
        d = entry.to_dict()
        assert d["element_ref"] == "trafo_1"
        assert d["source_kind"] == "OVERRIDE"
        assert d["source_ref"]["override_reason"] == "Manual adjustment"
        assert d["value_hash"] == "def456"
        assert d["unit"] == "%"

    def test_to_dict_omits_none_optional_fields(self):
        entry = ProvenanceEntry(
            element_ref="line_1",
            field_path="branches[0].r_ohm_per_km",
            source_kind=SourceKind.CATALOG,
        )
        d = entry.to_dict()
        assert "unit" not in d
        assert "note" not in d


# ---------------------------------------------------------------------------
# SourceRef
# ---------------------------------------------------------------------------


class TestSourceRef:
    def test_is_frozen(self):
        ref = SourceRef(catalog_ref="test")
        with pytest.raises(AttributeError):
            ref.catalog_ref = "changed"  # type: ignore[misc]

    def test_to_dict_includes_only_non_none(self):
        ref = SourceRef(catalog_ref="cable_1", catalog_path="cables/YAKXS_120")
        d = ref.to_dict()
        assert d == {"catalog_ref": "cable_1", "catalog_path": "cables/YAKXS_120"}
        assert "override_reason" not in d
        assert "derivation_rule" not in d


# ---------------------------------------------------------------------------
# build_provenance_summary
# ---------------------------------------------------------------------------


class TestBuildProvenanceSummary:
    def test_correctly_counts_by_source_kind(self):
        entries = [
            ProvenanceEntry(
                element_ref="line_1",
                field_path="branches[0].r_ohm_per_km",
                source_kind=SourceKind.CATALOG,
                source_ref=SourceRef(catalog_ref="cable_A"),
            ),
            ProvenanceEntry(
                element_ref="line_1",
                field_path="branches[0].x_ohm_per_km",
                source_kind=SourceKind.CATALOG,
                source_ref=SourceRef(catalog_ref="cable_A"),
            ),
            ProvenanceEntry(
                element_ref="line_2",
                field_path="branches[1].r_ohm_per_km",
                source_kind=SourceKind.CATALOG,
                source_ref=SourceRef(catalog_ref="cable_B"),
            ),
            ProvenanceEntry(
                element_ref="trafo_1",
                field_path="transformers[0].uk_percent",
                source_kind=SourceKind.OVERRIDE,
            ),
            ProvenanceEntry(
                element_ref="line_1",
                field_path="branches[0].b_us_per_km",
                source_kind=SourceKind.DERIVED,
            ),
            ProvenanceEntry(
                element_ref="line_1",
                field_path="branches[0].rated_current_a",
                source_kind=SourceKind.DERIVED,
            ),
        ]
        summary = build_provenance_summary(entries)

        # Two unique catalog_refs: cable_A and cable_B
        assert set(summary.catalog_refs_used) == {"cable_A", "cable_B"}
        assert summary.catalog_refs_used == tuple(sorted({"cable_A", "cable_B"}))

        # One override element_ref: trafo_1
        assert summary.overrides_used_count == 1
        assert summary.overrides_used_refs == ("trafo_1",)

        # Two DERIVED entries
        assert summary.derived_fields_count == 2

    def test_empty_entries(self):
        summary = build_provenance_summary([])
        assert summary.catalog_refs_used == ()
        assert summary.overrides_used_count == 0
        assert summary.overrides_used_refs == ()
        assert summary.derived_fields_count == 0

    def test_summary_is_frozen(self):
        summary = ProvenanceSummary()
        with pytest.raises(AttributeError):
            summary.overrides_used_count = 5  # type: ignore[misc]

    def test_summary_to_dict(self):
        summary = ProvenanceSummary(
            catalog_refs_used=("ref_a", "ref_b"),
            overrides_used_count=1,
            overrides_used_refs=("elem_1",),
            derived_fields_count=3,
        )
        d = summary.to_dict()
        assert d["catalog_refs_used"] == ["ref_a", "ref_b"]
        assert d["overrides_used_count"] == 1
        assert d["overrides_used_refs"] == ["elem_1"]
        assert d["derived_fields_count"] == 3
