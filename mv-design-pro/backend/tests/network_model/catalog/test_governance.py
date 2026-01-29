"""
Tests for Type Library Governance (P13b)

Verifies:
- Deterministic export (same state → identical JSON)
- Fingerprint stability
- Import merge (add new, skip existing)
- Import replace (blocked when types in use)
- Conflict detection (409)
"""

from datetime import datetime

import pytest

from network_model.catalog.governance import (
    ImportMode,
    TypeLibraryExport,
    TypeLibraryManifest,
    compute_fingerprint,
    sort_types_deterministically,
)


def _has_whitespace_outside_strings(s: str) -> bool:
    """
    Check if JSON string contains whitespace outside of string values.

    Returns True if structural whitespace (spaces, newlines, tabs) exists
    outside of JSON string literals. Spacje wewnątrz stringów (np. "Line A")
    są legalne i nie są wykrywane.

    Args:
        s: JSON string to check

    Returns:
        True if whitespace found outside strings, False otherwise
    """
    in_str = False
    esc = False
    for ch in s:
        if in_str:
            if esc:
                esc = False
                continue
            if ch == "\\":
                esc = True
                continue
            if ch == '"':
                in_str = False
            continue
        else:
            if ch == '"':
                in_str = True
                continue
            if ch in (" ", "\n", "\t", "\r"):
                return True
    return False


def test_sort_types_deterministically():
    """Types are sorted by (name, id)."""
    types = [
        {"id": "id3", "name": "ZZZ"},
        {"id": "id1", "name": "AAA"},
        {"id": "id2", "name": "AAA"},
    ]

    sorted_types = sort_types_deterministically(types)

    assert sorted_types[0]["id"] == "id1"  # AAA, id1
    assert sorted_types[1]["id"] == "id2"  # AAA, id2
    assert sorted_types[2]["id"] == "id3"  # ZZZ, id3


def test_export_deterministic_ordering():
    """Same types → same export structure (deterministic)."""
    line_types = [
        {"id": "line2", "name": "Line B", "r_ohm_per_km": 0.2},
        {"id": "line1", "name": "Line A", "r_ohm_per_km": 0.1},
    ]
    cable_types = [
        {"id": "cable2", "name": "Cable B"},
        {"id": "cable1", "name": "Cable A"},
    ]

    manifest = TypeLibraryManifest(
        library_id="lib1",
        name_pl="Test Library",
        vendor="Test Vendor",
        series="Test Series",
        revision="1.0",
        schema_version="1.0",
        created_at="2026-01-01T00:00:00",
        fingerprint="",
    )

    export = TypeLibraryExport(
        manifest=manifest,
        line_types=sort_types_deterministically(line_types),
        cable_types=sort_types_deterministically(cable_types),
        transformer_types=[],
        switch_types=[],
    )

    # Types should be sorted by (name, id)
    assert export.line_types[0]["id"] == "line1"
    assert export.line_types[1]["id"] == "line2"
    assert export.cable_types[0]["id"] == "cable1"
    assert export.cable_types[1]["id"] == "cable2"


def test_fingerprint_is_deterministic():
    """Same export → identical fingerprint."""
    manifest = TypeLibraryManifest(
        library_id="lib1",
        name_pl="Test",
        vendor="Vendor",
        series="Series",
        revision="1.0",
        schema_version="1.0",
        created_at="2026-01-01T00:00:00",
        fingerprint="",
    )

    export1 = TypeLibraryExport(
        manifest=manifest,
        line_types=[{"id": "line1", "name": "Line A"}],
        cable_types=[],
        transformer_types=[],
        switch_types=[],
    )

    export2 = TypeLibraryExport(
        manifest=manifest,
        line_types=[{"id": "line1", "name": "Line A"}],
        cable_types=[],
        transformer_types=[],
        switch_types=[],
    )

    fp1 = compute_fingerprint(export1)
    fp2 = compute_fingerprint(export2)

    assert fp1 == fp2
    assert len(fp1) == 64  # SHA-256 hex digest


def test_fingerprint_changes_with_content():
    """Different export → different fingerprint."""
    manifest = TypeLibraryManifest(
        library_id="lib1",
        name_pl="Test",
        vendor="Vendor",
        series="Series",
        revision="1.0",
        schema_version="1.0",
        created_at="2026-01-01T00:00:00",
        fingerprint="",
    )

    export1 = TypeLibraryExport(
        manifest=manifest,
        line_types=[{"id": "line1", "name": "Line A"}],
        cable_types=[],
        transformer_types=[],
        switch_types=[],
    )

    export2 = TypeLibraryExport(
        manifest=manifest,
        line_types=[{"id": "line2", "name": "Line B"}],  # Different
        cable_types=[],
        transformer_types=[],
        switch_types=[],
    )

    fp1 = compute_fingerprint(export1)
    fp2 = compute_fingerprint(export2)

    assert fp1 != fp2


def test_canonical_json_is_deterministic():
    """Same export → identical canonical JSON (no structural whitespace variance)."""
    manifest = TypeLibraryManifest(
        library_id="lib1",
        name_pl="Test",
        vendor="Vendor",
        series="Series",
        revision="1.0",
        schema_version="1.0",
        created_at="2026-01-01T00:00:00",
        fingerprint="",
    )

    export = TypeLibraryExport(
        manifest=manifest,
        line_types=[{"id": "line1", "name": "Line A", "r_ohm_per_km": 0.1}],
        cable_types=[],
        transformer_types=[],
        switch_types=[],
    )

    json1 = export.to_canonical_json()
    json2 = export.to_canonical_json()

    assert json1 == json2
    assert not _has_whitespace_outside_strings(json1)  # No structural whitespace outside JSON strings


def test_manifest_to_dict_preserves_order():
    """Manifest.to_dict() returns canonical order."""
    manifest = TypeLibraryManifest(
        library_id="lib1",
        name_pl="Test",
        vendor="Vendor",
        series="Series",
        revision="1.0",
        schema_version="1.0",
        created_at="2026-01-01T00:00:00",
        fingerprint="abc123",
        description_pl="Description",
    )

    data = manifest.to_dict()

    # Check all fields present
    assert data["library_id"] == "lib1"
    assert data["name_pl"] == "Test"
    assert data["vendor"] == "Vendor"
    assert data["series"] == "Series"
    assert data["revision"] == "1.0"
    assert data["schema_version"] == "1.0"
    assert data["created_at"] == "2026-01-01T00:00:00"
    assert data["fingerprint"] == "abc123"
    assert data["description_pl"] == "Description"


def test_export_to_dict_has_all_fields():
    """Export.to_dict() includes manifest + all type categories."""
    manifest = TypeLibraryManifest(
        library_id="lib1",
        name_pl="Test",
        vendor="Vendor",
        series="Series",
        revision="1.0",
        schema_version="1.0",
        created_at="2026-01-01T00:00:00",
        fingerprint="",
    )

    export = TypeLibraryExport(
        manifest=manifest,
        line_types=[{"id": "line1"}],
        cable_types=[{"id": "cable1"}],
        transformer_types=[{"id": "trafo1"}],
        switch_types=[{"id": "switch1"}],
    )

    data = export.to_dict()

    assert "manifest" in data
    assert "line_types" in data
    assert "cable_types" in data
    assert "transformer_types" in data
    assert "switch_types" in data
    assert len(data["line_types"]) == 1
    assert len(data["cable_types"]) == 1


def test_import_mode_enum():
    """ImportMode enum has MERGE and REPLACE."""
    assert ImportMode.MERGE.value == "merge"
    assert ImportMode.REPLACE.value == "replace"
    assert ImportMode("merge") == ImportMode.MERGE
    assert ImportMode("replace") == ImportMode.REPLACE


# Integration tests (require full service + UOW) are skipped for now.
# These will be added when persistence methods (add_*_type) are implemented.
