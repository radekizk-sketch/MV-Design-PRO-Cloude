"""
Diff rewizji ENM — porównanie techniczne dwóch snapshotów (v4.2).

Porównuje na poziomie encji i parametrów.
Deterministyczny wynik (sortowanie po ID).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from network_model.core.snapshot import NetworkSnapshot, _graph_to_dict


class DiffChangeType:
    ADDED = "ADDED"
    REMOVED = "REMOVED"
    MODIFIED = "MODIFIED"


@dataclass(frozen=True)
class FieldChange:
    """Zmiana wartości pojedynczego pola."""

    field_name: str
    old_value: Any
    new_value: Any

    def to_dict(self) -> dict[str, Any]:
        return {
            "field_name": self.field_name,
            "old_value": self.old_value,
            "new_value": self.new_value,
        }


@dataclass(frozen=True)
class EntityChange:
    """Zmiana na poziomie encji (dodanie/usunięcie/modyfikacja)."""

    entity_type: str  # "node" | "branch" | "switch" | "inverter_source"
    entity_id: str
    entity_name: str
    change_type: str  # ADDED | REMOVED | MODIFIED
    field_changes: tuple[FieldChange, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "change_type": self.change_type,
            "field_changes": [fc.to_dict() for fc in self.field_changes],
        }


@dataclass(frozen=True)
class EnmDiffReport:
    """Raport porównania dwóch rewizji ENM."""

    from_snapshot_id: str
    to_snapshot_id: str
    from_fingerprint: str
    to_fingerprint: str
    is_identical: bool
    changes: tuple[EntityChange, ...] = field(default_factory=tuple)
    summary: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "from_snapshot_id": self.from_snapshot_id,
            "to_snapshot_id": self.to_snapshot_id,
            "from_fingerprint": self.from_fingerprint,
            "to_fingerprint": self.to_fingerprint,
            "is_identical": self.is_identical,
            "changes": [c.to_dict() for c in self.changes],
            "summary": dict(self.summary),
        }


def compute_enm_diff(
    snapshot_a: NetworkSnapshot,
    snapshot_b: NetworkSnapshot,
) -> EnmDiffReport:
    """
    Porównaj dwie rewizje ENM (techniczny diff).

    Args:
        snapshot_a: Starszy snapshot ("from").
        snapshot_b: Nowszy snapshot ("to").

    Returns:
        EnmDiffReport z listą zmian.
    """
    dict_a = _graph_to_dict(snapshot_a.graph)
    dict_b = _graph_to_dict(snapshot_b.graph)

    changes: list[EntityChange] = []

    # Compare each entity category
    _ENTITY_CATEGORIES = [
        ("node", "nodes"),
        ("branch", "branches"),
        ("switch", "switches"),
        ("inverter_source", "inverter_sources"),
    ]

    for entity_type, dict_key in _ENTITY_CATEGORIES:
        list_a = {item["id"]: item for item in dict_a.get(dict_key, [])}
        list_b = {item["id"]: item for item in dict_b.get(dict_key, [])}

        all_ids = sorted(set(list_a.keys()) | set(list_b.keys()))

        for entity_id in all_ids:
            in_a = entity_id in list_a
            in_b = entity_id in list_b

            if in_a and not in_b:
                changes.append(
                    EntityChange(
                        entity_type=entity_type,
                        entity_id=entity_id,
                        entity_name=list_a[entity_id].get("name", ""),
                        change_type=DiffChangeType.REMOVED,
                    )
                )
            elif not in_a and in_b:
                changes.append(
                    EntityChange(
                        entity_type=entity_type,
                        entity_id=entity_id,
                        entity_name=list_b[entity_id].get("name", ""),
                        change_type=DiffChangeType.ADDED,
                    )
                )
            else:
                item_a = list_a[entity_id]
                item_b = list_b[entity_id]
                field_changes = _diff_dicts(item_a, item_b)
                if field_changes:
                    changes.append(
                        EntityChange(
                            entity_type=entity_type,
                            entity_id=entity_id,
                            entity_name=item_b.get("name", ""),
                            change_type=DiffChangeType.MODIFIED,
                            field_changes=tuple(field_changes),
                        )
                    )

    # Sort changes deterministically
    changes.sort(key=lambda c: (c.entity_type, c.change_type, c.entity_id))

    # Build summary
    summary = {
        "added": sum(1 for c in changes if c.change_type == DiffChangeType.ADDED),
        "removed": sum(1 for c in changes if c.change_type == DiffChangeType.REMOVED),
        "modified": sum(1 for c in changes if c.change_type == DiffChangeType.MODIFIED),
        "total": len(changes),
    }

    return EnmDiffReport(
        from_snapshot_id=snapshot_a.meta.snapshot_id,
        to_snapshot_id=snapshot_b.meta.snapshot_id,
        from_fingerprint=snapshot_a.fingerprint,
        to_fingerprint=snapshot_b.fingerprint,
        is_identical=len(changes) == 0,
        changes=tuple(changes),
        summary=summary,
    )


def _diff_dicts(a: dict, b: dict) -> list[FieldChange]:
    """Compare two dicts and return field-level changes."""
    changes: list[FieldChange] = []
    all_keys = sorted(set(a.keys()) | set(b.keys()))
    for key in all_keys:
        if key == "id":
            continue  # Skip ID field (always same for compared entities)
        val_a = a.get(key)
        val_b = b.get(key)
        if val_a != val_b:
            changes.append(
                FieldChange(
                    field_name=key,
                    old_value=val_a,
                    new_value=val_b,
                )
            )
    return changes
