"""
Type Library Governance (P13b)

Implements PowerFactory-grade type library management:
- Versioning and metadata (vendor/series/revision)
- Deterministic export (canonical JSON with fingerprint)
- Safe import with conflict detection (merge/replace modes)
- Hard compatibility rules for type_ref (no mass migrations)

Canonical reference: SYSTEM_SPEC.md § 4 (Catalog), POWERFACTORY_COMPLIANCE.md CT-*
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from .types import CableType, LineType, SwitchEquipmentType, TransformerType


class ImportMode(Enum):
    """Import mode for type library."""

    MERGE = "merge"  # Add new types, skip existing (safe default)
    REPLACE = "replace"  # Replace library (blocked if types are in use)


@dataclass(frozen=True)
class TypeLibraryManifest:
    """
    Type library manifest for governance and versioning.

    PowerFactory-aligned metadata for type library management.
    Contains versioning info, vendor/series/revision, and deterministic fingerprint.

    Attributes:
        library_id: Stable library identifier (UUID).
        name_pl: Polish name of the library.
        vendor: Vendor/manufacturer name.
        series: Product series/line.
        revision: Revision string or int.
        schema_version: Schema version for future compatibility.
        created_at: ISO 8601 timestamp of creation.
        fingerprint: SHA-256 hash of canonical JSON export.
        description_pl: Optional Polish description.
    """

    library_id: str
    name_pl: str
    vendor: str
    series: str
    revision: str
    schema_version: str
    created_at: str
    fingerprint: str
    description_pl: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary (canonical order)."""
        return {
            "library_id": self.library_id,
            "name_pl": self.name_pl,
            "vendor": self.vendor,
            "series": self.series,
            "revision": self.revision,
            "schema_version": self.schema_version,
            "created_at": self.created_at,
            "fingerprint": self.fingerprint,
            "description_pl": self.description_pl,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TypeLibraryManifest:
        """Create from dictionary."""
        return cls(
            library_id=str(data.get("library_id", str(uuid4()))),
            name_pl=str(data.get("name_pl", "")),
            vendor=str(data.get("vendor", "")),
            series=str(data.get("series", "")),
            revision=str(data.get("revision", "")),
            schema_version=str(data.get("schema_version", "1.0")),
            created_at=str(data.get("created_at", datetime.utcnow().isoformat())),
            fingerprint=str(data.get("fingerprint", "")),
            description_pl=str(data.get("description_pl", "")),
        )


@dataclass(frozen=True)
class TypeLibraryExport:
    """
    Type library export structure.

    Contains manifest and all type records.
    Deterministically serialized (canonical JSON with sorted keys).

    Attributes:
        manifest: Library metadata.
        line_types: List of line types (deterministic order).
        cable_types: List of cable types (deterministic order).
        transformer_types: List of transformer types (deterministic order).
        switch_types: List of switch equipment types (deterministic order).
    """

    manifest: TypeLibraryManifest
    line_types: list[dict[str, Any]]
    cable_types: list[dict[str, Any]]
    transformer_types: list[dict[str, Any]]
    switch_types: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary (canonical order)."""
        return {
            "manifest": self.manifest.to_dict(),
            "line_types": self.line_types,
            "cable_types": self.cable_types,
            "transformer_types": self.transformer_types,
            "switch_types": self.switch_types,
        }

    def to_canonical_json(self) -> str:
        """
        Export to canonical JSON.

        Deterministic serialization:
        - Sorted keys at all levels
        - No whitespace
        - Stable ordering of lists (name → id)

        Returns:
            Canonical JSON string.
        """
        return json.dumps(self.to_dict(), sort_keys=True, separators=(",", ":"))

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TypeLibraryExport:
        """Create from dictionary."""
        return cls(
            manifest=TypeLibraryManifest.from_dict(data.get("manifest", {})),
            line_types=list(data.get("line_types", [])),
            cable_types=list(data.get("cable_types", [])),
            transformer_types=list(data.get("transformer_types", [])),
            switch_types=list(data.get("switch_types", [])),
        )


@dataclass
class ImportConflict:
    """
    Conflict detected during import.

    Attributes:
        type_id: Conflicting type ID.
        type_category: Type category (LINE/CABLE/TRANSFORMER/SWITCH).
        reason: Conflict reason (e.g., "already exists with different parameters").
    """

    type_id: str
    type_category: str
    reason: str


@dataclass
class ImportReport:
    """
    Report of import operation.

    Attributes:
        mode: Import mode used (MERGE or REPLACE).
        added: List of added type IDs (deterministic order).
        skipped: List of skipped type IDs (deterministic order).
        conflicts: List of conflicts encountered.
        success: True if import succeeded without conflicts.
    """

    mode: ImportMode
    added: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    conflicts: list[ImportConflict] = field(default_factory=list)
    success: bool = True

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "mode": self.mode.value,
            "added": sorted(self.added),
            "skipped": sorted(self.skipped),
            "conflicts": [
                {"type_id": c.type_id, "type_category": c.type_category, "reason": c.reason}
                for c in self.conflicts
            ],
            "success": self.success,
        }


def compute_fingerprint(export: TypeLibraryExport) -> str:
    """
    Compute SHA-256 fingerprint of canonical JSON export.

    Deterministic hash based on canonical JSON serialization.

    Args:
        export: Type library export to fingerprint.

    Returns:
        SHA-256 hex digest (64 characters).
    """
    canonical_json = export.to_canonical_json()
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def sort_types_deterministically(types: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Sort type records deterministically (name → id).

    Args:
        types: List of type dictionaries.

    Returns:
        Sorted list.
    """
    return sorted(types, key=lambda t: (str(t.get("name", "")), str(t.get("id", ""))))
