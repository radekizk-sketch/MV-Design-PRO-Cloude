"""
Canonical operation names, alias mapping, and contract utilities.

BINDING CONTRACT — Dodatek C §1–§3
All topology operations MUST use canonical names defined here.
Aliases are resolved in this module ONLY — no duplicated semantics.
"""

from __future__ import annotations

import hashlib
import json
import math
import unicodedata
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Final, Mapping, Sequence


# ---------------------------------------------------------------------------
# §1 — Canonical Operation Names
# ---------------------------------------------------------------------------

class CanonicalOp(str, Enum):
    """All canonical topology operation names (API level)."""
    ADD_GRID_SOURCE_SN = "add_grid_source_sn"
    CONTINUE_TRUNK_SEGMENT_SN = "continue_trunk_segment_sn"
    INSERT_STATION_ON_SEGMENT_SN = "insert_station_on_segment_sn"
    START_BRANCH_SEGMENT_SN = "start_branch_segment_sn"
    CONNECT_SECONDARY_RING_SN = "connect_secondary_ring_sn"
    SET_NORMAL_OPEN_POINT = "set_normal_open_point"
    ADD_TRANSFORMER_SN_NN = "add_transformer_sn_nn"
    ASSIGN_CATALOG_TO_ELEMENT = "assign_catalog_to_element"
    UPDATE_ELEMENT_PARAMETERS = "update_element_parameters"


CANONICAL_OP_NAMES: Final[frozenset[str]] = frozenset(op.value for op in CanonicalOp)

# Alias → Canonical mapping (ONE place, no duplication)
_ALIAS_MAP: Final[dict[str, str]] = {
    # continue_trunk_segment_sn aliases
    "add_trunk_segment_sn": CanonicalOp.CONTINUE_TRUNK_SEGMENT_SN.value,
    # insert_station_on_segment_sn aliases
    "insert_station_on_trunk_segment_sn": CanonicalOp.INSERT_STATION_ON_SEGMENT_SN.value,
    "insert_station_on_trunk_segment": CanonicalOp.INSERT_STATION_ON_SEGMENT_SN.value,
    # start_branch_segment_sn aliases
    "add_branch_segment_sn": CanonicalOp.START_BRANCH_SEGMENT_SN.value,
    "start_branch_from_port": CanonicalOp.START_BRANCH_SEGMENT_SN.value,
    # connect_secondary_ring_sn aliases
    "connect_ring_sn": CanonicalOp.CONNECT_SECONDARY_RING_SN.value,
    "connect_secondary_ring": CanonicalOp.CONNECT_SECONDARY_RING_SN.value,
}

ALIAS_NAMES: Final[frozenset[str]] = frozenset(_ALIAS_MAP.keys())


def resolve_op_name(name: str) -> str:
    """Resolve an operation name to its canonical form.

    Accepts both canonical names and known aliases.
    Raises ValueError for unknown names.
    """
    if name in CANONICAL_OP_NAMES:
        return name
    if name in _ALIAS_MAP:
        return _ALIAS_MAP[name]
    raise ValueError(
        f"Unknown operation name: '{name}'. "
        f"Canonical: {sorted(CANONICAL_OP_NAMES)}. "
        f"Aliases: {sorted(ALIAS_NAMES)}."
    )


def is_canonical(name: str) -> bool:
    """Check if an operation name is in canonical form."""
    return name in CANONICAL_OP_NAMES


def is_alias(name: str) -> bool:
    """Check if an operation name is a known alias."""
    return name in _ALIAS_MAP


# ---------------------------------------------------------------------------
# §2 — Canonical insert_at Definition
# ---------------------------------------------------------------------------

class InsertAtMode(str, Enum):
    """Canonical insert_at modes."""
    RATIO = "RATIO"
    ODLEGLOSC_OD_POCZATKU_M = "ODLEGLOSC_OD_POCZATKU_M"
    ANCHOR = "ANCHOR"


@dataclass(frozen=True)
class AnchorValue:
    """Anchor-based insertion value."""
    anchor_id: str
    offset_m: float


@dataclass(frozen=True)
class InsertAt:
    """Canonical insert_at definition.

    Exactly ONE interpretation per mode:
    - RATIO: value is float 0..1
    - ODLEGLOSC_OD_POCZATKU_M: value is float >= 0
    - ANCHOR: value is AnchorValue
    """
    mode: InsertAtMode
    value: float | AnchorValue

    def __post_init__(self) -> None:
        if self.mode == InsertAtMode.RATIO:
            if not isinstance(self.value, (int, float)):
                raise TypeError("RATIO mode requires numeric value")
            if not (0.0 <= float(self.value) <= 1.0):
                raise ValueError("RATIO value must be in [0, 1]")
        elif self.mode == InsertAtMode.ODLEGLOSC_OD_POCZATKU_M:
            if not isinstance(self.value, (int, float)):
                raise TypeError("ODLEGLOSC_OD_POCZATKU_M mode requires numeric value")
            if float(self.value) < 0.0:
                raise ValueError("ODLEGLOSC_OD_POCZATKU_M value must be >= 0")
        elif self.mode == InsertAtMode.ANCHOR:
            if not isinstance(self.value, AnchorValue):
                raise TypeError("ANCHOR mode requires AnchorValue")

    def to_dict(self) -> dict[str, Any]:
        if isinstance(self.value, AnchorValue):
            return {
                "mode": self.mode.value,
                "value": {"anchor_id": self.value.anchor_id, "offset_m": self.value.offset_m},
            }
        return {"mode": self.mode.value, "value": self.value}


# UI label → canonical insert_at mapping
_UI_LABEL_MAP: Final[dict[str, tuple[InsertAtMode, Any]]] = {
    "SRODEK": (InsertAtMode.RATIO, 0.5),
    "SRODEK_ODCINKA": (InsertAtMode.RATIO, 0.5),
    "PODZIAL_WSPOLCZYNNIKIEM": (InsertAtMode.RATIO, None),  # value from UI
    "FRACTION": (InsertAtMode.RATIO, None),
    "ODLEGLOSC_OD_POCZATKU": (InsertAtMode.ODLEGLOSC_OD_POCZATKU_M, None),
    "ANCHOR": (InsertAtMode.ANCHOR, None),
}

UI_INSERT_AT_LABELS: Final[frozenset[str]] = frozenset(_UI_LABEL_MAP.keys())


def resolve_insert_at_from_ui(label: str, value: Any = None) -> InsertAt:
    """Resolve a UI label to canonical InsertAt.

    For labels with fixed values (SRODEK → 0.5), the value parameter is ignored.
    For labels requiring a value (FRACTION, ODLEGLOSC_OD_POCZATKU, ANCHOR),
    the value parameter is required.
    """
    if label not in _UI_LABEL_MAP:
        raise ValueError(
            f"Unknown insert_at UI label: '{label}'. "
            f"Known labels: {sorted(UI_INSERT_AT_LABELS)}."
        )
    mode, fixed_value = _UI_LABEL_MAP[label]
    resolved_value = fixed_value if fixed_value is not None else value
    if resolved_value is None:
        raise ValueError(f"UI label '{label}' requires an explicit value.")
    if mode == InsertAtMode.ANCHOR and isinstance(resolved_value, dict):
        resolved_value = AnchorValue(
            anchor_id=resolved_value["anchor_id"],
            offset_m=resolved_value["offset_m"],
        )
    return InsertAt(mode=mode, value=resolved_value)


# ---------------------------------------------------------------------------
# §3 — JSON Canonicalization (Determinism, Idempotency)
# ---------------------------------------------------------------------------

NUMERIC_QUANTUM: Final[float] = 1e-6
ROUNDING_MODE: Final[str] = "HALF_EVEN"


def _quantize_number(value: float, quantum: float = NUMERIC_QUANTUM) -> float:
    """Quantize a float to the specified quantum using banker's rounding."""
    if quantum <= 0:
        raise ValueError("quantum must be > 0")
    # Round to nearest quantum using HALF_EVEN
    scaled = value / quantum
    rounded = round(scaled)  # Python's round() uses banker's rounding
    return rounded * quantum


def _normalize_value(value: Any, quantum: float = NUMERIC_QUANTUM) -> Any:
    """Recursively normalize a value for canonical JSON."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            raise ValueError(f"Cannot canonicalize {value}")
        return _quantize_number(value, quantum)
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        # NFC normalization, trim
        return unicodedata.normalize("NFC", value.strip())
    if isinstance(value, dict):
        return {
            unicodedata.normalize("NFC", str(k).strip()): _normalize_value(v, quantum)
            for k, v in sorted(value.items(), key=lambda kv: str(kv[0]))
        }
    if isinstance(value, (list, tuple)):
        return [_normalize_value(item, quantum) for item in value]
    return value


def canonicalize_json(payload: Any, quantum: float = NUMERIC_QUANTUM) -> str:
    """Produce canonical JSON: sorted keys, no spaces, quantized numbers.

    Guarantees: same logical input → identical string output.
    """
    normalized = _normalize_value(payload, quantum)
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_idempotency_key(payload: dict[str, Any], quantum: float = NUMERIC_QUANTUM) -> str:
    """Compute a deterministic idempotency key from payload.

    Uses SHA-256 of canonical JSON, returns hex32 (first 16 bytes).
    Excludes UI-only fields (click_id, timestamp, world_point in PX).
    """
    # Strip UI-only fields before hashing
    hashable = _strip_ui_fields(payload)
    canonical = canonicalize_json(hashable, quantum)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return digest[:32]  # first 16 bytes = 32 hex chars


def _strip_ui_fields(payload: dict[str, Any]) -> dict[str, Any]:
    """Remove UI-only fields that don't affect domain semantics."""
    result = {}
    for k, v in payload.items():
        if k in ("pozycja_widokowa", "ui"):
            continue
        if isinstance(v, dict):
            # Recurse but skip nested ui/click fields
            stripped = {
                sk: sv for sk, sv in v.items()
                if sk not in ("click_id", "timestamp_utc")
            }
            result[k] = _strip_ui_fields(stripped) if stripped else stripped
        else:
            result[k] = v
    return result


def compute_deterministic_id(
    *seed_parts: str,
    prefix: str = "",
) -> str:
    """Compute a deterministic element ID from seed parts.

    Applies: NFC normalization, trim, lower-case, stable separators.
    Returns: prefix + sha256 hex32.
    """
    normalized_parts = []
    for part in seed_parts:
        norm = unicodedata.normalize("NFC", part.strip().lower())
        normalized_parts.append(norm)
    seed_text = "|".join(normalized_parts)
    digest = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()
    return f"{prefix}{digest[:32]}"


# ---------------------------------------------------------------------------
# §D.7 — Domain Event Types (insert_station_on_segment_sn)
# ---------------------------------------------------------------------------

class StationInsertionEvent(str, Enum):
    """Domain event types for insert_station_on_segment_sn, in deterministic order."""
    SEGMENT_SPLIT = "SEGMENT_SPLIT"
    CUT_NODE_CREATED = "CUT_NODE_CREATED"
    STATION_CREATED = "STATION_CREATED"
    PORTS_CREATED = "PORTS_CREATED"
    FIELDS_CREATED_SN = "FIELDS_CREATED_SN"
    DEVICES_CREATED_SN = "DEVICES_CREATED_SN"
    TR_CREATED = "TR_CREATED"
    BUS_NN_CREATED = "BUS_NN_CREATED"
    FIELDS_CREATED_NN = "FIELDS_CREATED_NN"
    DEVICES_CREATED_NN = "DEVICES_CREATED_NN"
    RECONNECTED_GRAPH = "RECONNECTED_GRAPH"
    LOGICAL_VIEWS_UPDATED = "LOGICAL_VIEWS_UPDATED"


STATION_INSERTION_EVENT_ORDER: Final[tuple[str, ...]] = tuple(
    e.value for e in StationInsertionEvent
)


@dataclass(frozen=True)
class DomainEvent:
    """A single domain event in the deterministic sequence."""
    event_seq: int
    event_type: str
    element_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_seq": self.event_seq,
            "event_type": self.event_type,
            "element_id": self.element_id,
        }


# ---------------------------------------------------------------------------
# §D.8 — Validation Codes
# ---------------------------------------------------------------------------

class ValidationLevel(str, Enum):
    BLOKUJACE = "BLOKUJACE"
    OSTRZEZENIE = "OSTRZEZENIE"


@dataclass(frozen=True)
class ValidationRule:
    """A validation rule with fix action."""
    code: str
    level: ValidationLevel
    condition_pl: str
    fix_action_code: str
    fix_target: str
    fix_navigation: str
    priority: int


VALIDATION_RULES: Final[tuple[ValidationRule, ...]] = (
    ValidationRule(
        code="W-ISS-001",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="Brak trunk_id w payload",
        fix_action_code="FOCUS_FIELD",
        fix_target="trunk_ref.trunk_id",
        fix_navigation="Kreator/K4",
        priority=1,
    ),
    ValidationRule(
        code="W-ISS-002",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="segment_target.cut.fraction_0_1 poza zakresem [0, 1]",
        fix_action_code="RESET_VALUE",
        fix_target="segment_target.cut.fraction_0_1",
        fix_navigation="Kreator/K4/cut",
        priority=2,
    ),
    ValidationRule(
        code="W-ISS-003",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="Brak station_type w station_spec",
        fix_action_code="FOCUS_FIELD",
        fix_target="station_spec.station_type",
        fix_navigation="Kreator/K4",
        priority=3,
    ),
    ValidationRule(
        code="W-ISS-004",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="catalog_ref jest null i brak parametry_jawne",
        fix_action_code="OPEN_PANEL",
        fix_target="catalog_bindings",
        fix_navigation="Kreator/K5/CatalogBrowser",
        priority=4,
    ),
    ValidationRule(
        code="W-ISS-005",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="nn_voltage_kv <= 0 lub brak",
        fix_action_code="FOCUS_FIELD",
        fix_target="nn_block_spec.nn_voltage_kv",
        fix_navigation="Kreator/K5",
        priority=5,
    ),
    ValidationRule(
        code="W-ISS-006",
        level=ValidationLevel.OSTRZEZENIE,
        condition_pl="pozycja_widokowa jest null",
        fix_action_code="AUTO_CALCULATE",
        fix_target="pozycja_widokowa",
        fix_navigation="SLD",
        priority=10,
    ),
    ValidationRule(
        code="W-ISS-007",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="Duplikat idempotency_key w sesji",
        fix_action_code="REGENERATE",
        fix_target="meta.idempotency_key",
        fix_navigation="meta",
        priority=6,
    ),
    ValidationRule(
        code="W-ISS-008",
        level=ValidationLevel.OSTRZEZENIE,
        condition_pl="segment_length.value null przy mode != WORLD_POINT",
        fix_action_code="FOCUS_FIELD",
        fix_target="segment_target.segment_length.value",
        fix_navigation="Kreator/K4",
        priority=11,
    ),
    ValidationRule(
        code="W-ISS-009",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="Punkt cięcia pokrywa się z istniejącym węzłem (w progu snap)",
        fix_action_code="APPLY_POLICY",
        fix_target="segment_target.cut",
        fix_navigation="Kreator/K4",
        priority=7,
    ),
    ValidationRule(
        code="W-ISS-010",
        level=ValidationLevel.BLOKUJACE,
        condition_pl="port_plan nie zawiera wymaganych portów dla station_type",
        fix_action_code="ADD_PORTS",
        fix_target="station_spec.port_plan",
        fix_navigation="Kreator/K4",
        priority=8,
    ),
)


def get_validation_rules_sorted() -> list[ValidationRule]:
    """Return validation rules sorted by priority (ascending)."""
    return sorted(VALIDATION_RULES, key=lambda r: r.priority)
