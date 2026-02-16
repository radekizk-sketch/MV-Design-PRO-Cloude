"""
Tests for canonical operation names, alias mapping, and contract utilities.

BINDING — Dodatek C §1–§3 + Dodatek D §7–§8
"""

from __future__ import annotations

import json
import random
import string
from typing import Any

import pytest


# ---------------------------------------------------------------------------
# Import the module under test
# ---------------------------------------------------------------------------
# The canonical_ops module is self-contained (no heavy dependencies).
# We use importlib to bypass the wizard_actions __init__.py which imports
# service.py and pulls in the full dependency chain (networkx, etc.).
import importlib.util
import sys
from pathlib import Path

_MODULE_PATH = Path(__file__).resolve().parent.parent / "src" / "application" / "wizard_actions" / "canonical_ops.py"

try:
    _spec = importlib.util.spec_from_file_location(
        "application.wizard_actions.canonical_ops",
        str(_MODULE_PATH),
    )
    assert _spec is not None and _spec.loader is not None
    _mod = importlib.util.module_from_spec(_spec)
    sys.modules[_spec.name] = _mod
    _spec.loader.exec_module(_mod)

    CANONICAL_OP_NAMES = _mod.CANONICAL_OP_NAMES
    ALIAS_NAMES = _mod.ALIAS_NAMES
    STATION_INSERTION_EVENT_ORDER = _mod.STATION_INSERTION_EVENT_ORDER
    VALIDATION_RULES = _mod.VALIDATION_RULES
    CanonicalOp = _mod.CanonicalOp
    InsertAt = _mod.InsertAt
    InsertAtMode = _mod.InsertAtMode
    AnchorValue = _mod.AnchorValue
    StationInsertionEvent = _mod.StationInsertionEvent
    ValidationLevel = _mod.ValidationLevel
    resolve_op_name = _mod.resolve_op_name
    is_canonical = _mod.is_canonical
    is_alias = _mod.is_alias
    resolve_insert_at_from_ui = _mod.resolve_insert_at_from_ui
    canonicalize_json = _mod.canonicalize_json
    compute_idempotency_key = _mod.compute_idempotency_key
    compute_deterministic_id = _mod.compute_deterministic_id
    get_validation_rules_sorted = _mod.get_validation_rules_sorted

    HAS_MODULE = True
except (ImportError, FileNotFoundError, AssertionError):
    HAS_MODULE = False

pytestmark = pytest.mark.skipif(not HAS_MODULE, reason="canonical_ops module not found")


# ===========================================================================
# §1 — Canonical Operation Names
# ===========================================================================


class TestCanonicalOpNames:
    """Verify the canonical operation name registry."""

    def test_canonical_names_completeness(self) -> None:
        """All 9 canonical operations must be registered."""
        expected = {
            "add_grid_source_sn",
            "continue_trunk_segment_sn",
            "insert_station_on_segment_sn",
            "start_branch_segment_sn",
            "connect_secondary_ring_sn",
            "set_normal_open_point",
            "add_transformer_sn_nn",
            "assign_catalog_to_element",
            "update_element_parameters",
        }
        assert CANONICAL_OP_NAMES == expected
        assert len(CANONICAL_OP_NAMES) == 9

    def test_enum_matches_names(self) -> None:
        """CanonicalOp enum values must match the CANONICAL_OP_NAMES set."""
        enum_values = {op.value for op in CanonicalOp}
        assert enum_values == CANONICAL_OP_NAMES

    def test_canonical_names_are_lowercase_snake_case(self) -> None:
        """All canonical names must be lowercase snake_case."""
        import re
        pattern = re.compile(r"^[a-z][a-z0-9_]*$")
        for name in CANONICAL_OP_NAMES:
            assert pattern.match(name), f"'{name}' is not lowercase snake_case"


class TestAliasResolution:
    """Verify alias → canonical resolution."""

    @pytest.mark.parametrize(
        "alias,expected_canonical",
        [
            ("add_trunk_segment_sn", "continue_trunk_segment_sn"),
            ("insert_station_on_trunk_segment_sn", "insert_station_on_segment_sn"),
            ("insert_station_on_trunk_segment", "insert_station_on_segment_sn"),
            ("add_branch_segment_sn", "start_branch_segment_sn"),
            ("start_branch_from_port", "start_branch_segment_sn"),
            ("connect_ring_sn", "connect_secondary_ring_sn"),
            ("connect_secondary_ring", "connect_secondary_ring_sn"),
        ],
    )
    def test_alias_resolution(self, alias: str, expected_canonical: str) -> None:
        """Each alias must resolve to the correct canonical name."""
        assert resolve_op_name(alias) == expected_canonical

    def test_canonical_names_resolve_to_themselves(self) -> None:
        """Canonical names passed to resolve_op_name return unchanged."""
        for name in CANONICAL_OP_NAMES:
            assert resolve_op_name(name) == name

    def test_unknown_alias_rejected(self) -> None:
        """Unknown operation names must raise ValueError."""
        with pytest.raises(ValueError, match="Unknown operation name"):
            resolve_op_name("nonexistent_operation")

    def test_is_canonical(self) -> None:
        for name in CANONICAL_OP_NAMES:
            assert is_canonical(name) is True
        for alias in ALIAS_NAMES:
            assert is_canonical(alias) is False

    def test_is_alias(self) -> None:
        for alias in ALIAS_NAMES:
            assert is_alias(alias) is True
        for name in CANONICAL_OP_NAMES:
            assert is_alias(name) is False

    def test_no_overlap_canonical_and_alias(self) -> None:
        """Canonical names and aliases must be disjoint sets."""
        assert CANONICAL_OP_NAMES.isdisjoint(ALIAS_NAMES)


# ===========================================================================
# §2 — insert_at Canonical Definition
# ===========================================================================


class TestInsertAt:
    """Verify canonical insert_at and UI label mapping."""

    def test_insert_at_ratio_mapping(self) -> None:
        """UI label SRODEK maps to RATIO 0.5."""
        result = resolve_insert_at_from_ui("SRODEK")
        assert result.mode == InsertAtMode.RATIO
        assert result.value == 0.5

    def test_insert_at_srodek_odcinka_mapping(self) -> None:
        """UI label SRODEK_ODCINKA also maps to RATIO 0.5."""
        result = resolve_insert_at_from_ui("SRODEK_ODCINKA")
        assert result.mode == InsertAtMode.RATIO
        assert result.value == 0.5

    def test_insert_at_fraction_mapping(self) -> None:
        """UI label FRACTION with explicit value."""
        result = resolve_insert_at_from_ui("FRACTION", 0.3)
        assert result.mode == InsertAtMode.RATIO
        assert result.value == 0.3

    def test_insert_at_distance_mapping(self) -> None:
        """UI label ODLEGLOSC_OD_POCZATKU maps to distance mode."""
        result = resolve_insert_at_from_ui("ODLEGLOSC_OD_POCZATKU", 200.0)
        assert result.mode == InsertAtMode.ODLEGLOSC_OD_POCZATKU_M
        assert result.value == 200.0

    def test_insert_at_anchor_mapping(self) -> None:
        """ANCHOR mode with dict value creates AnchorValue."""
        result = resolve_insert_at_from_ui(
            "ANCHOR", {"anchor_id": "node-42", "offset_m": 15.5}
        )
        assert result.mode == InsertAtMode.ANCHOR
        assert isinstance(result.value, AnchorValue)
        assert result.value.anchor_id == "node-42"
        assert result.value.offset_m == 15.5

    def test_insert_at_unknown_label_rejected(self) -> None:
        """Unknown UI label raises ValueError."""
        with pytest.raises(ValueError, match="Unknown insert_at UI label"):
            resolve_insert_at_from_ui("UNKNOWN_LABEL")

    def test_insert_at_missing_value_rejected(self) -> None:
        """Labels requiring explicit value raise ValueError if not provided."""
        with pytest.raises(ValueError, match="requires an explicit value"):
            resolve_insert_at_from_ui("FRACTION")

    def test_ratio_out_of_range_rejected(self) -> None:
        """RATIO value outside [0, 1] raises ValueError."""
        with pytest.raises(ValueError, match="RATIO value must be in"):
            InsertAt(mode=InsertAtMode.RATIO, value=1.5)

    def test_negative_distance_rejected(self) -> None:
        """Negative distance raises ValueError."""
        with pytest.raises(ValueError, match="must be >= 0"):
            InsertAt(mode=InsertAtMode.ODLEGLOSC_OD_POCZATKU_M, value=-10.0)

    def test_insert_at_to_dict(self) -> None:
        """InsertAt.to_dict() produces canonical dict."""
        ia = InsertAt(mode=InsertAtMode.RATIO, value=0.5)
        d = ia.to_dict()
        assert d == {"mode": "RATIO", "value": 0.5}

    def test_insert_at_anchor_to_dict(self) -> None:
        """InsertAt with AnchorValue produces nested dict."""
        ia = InsertAt(
            mode=InsertAtMode.ANCHOR,
            value=AnchorValue(anchor_id="a1", offset_m=10.0),
        )
        d = ia.to_dict()
        assert d == {
            "mode": "ANCHOR",
            "value": {"anchor_id": "a1", "offset_m": 10.0},
        }


# ===========================================================================
# §3 — JSON Canonicalization (Determinism, Idempotency)
# ===========================================================================


class TestJsonCanonicalization:
    """Verify deterministic JSON canonicalization."""

    def test_json_canonicalization_sorted_keys(self) -> None:
        """Keys must be sorted in canonical JSON."""
        payload = {"z": 1, "a": 2, "m": 3}
        result = canonicalize_json(payload)
        assert result == '{"a":2,"m":3,"z":1}'

    def test_json_canonicalization_no_spaces(self) -> None:
        """No spaces in canonical JSON."""
        payload = {"key": "value"}
        result = canonicalize_json(payload)
        assert " " not in result

    def test_json_canonicalization_determinism_100x(self) -> None:
        """100 repetitions produce identical output."""
        payload = {
            "trunk_id": "trunk-001",
            "fraction": 0.333333,
            "nested": {"b": 2, "a": 1},
            "list": [3, 1, 2],
        }
        first = canonicalize_json(payload)
        for _ in range(100):
            assert canonicalize_json(payload) == first

    def test_json_canonicalization_permutations_50x(self) -> None:
        """50 random key permutations produce identical canonical JSON."""
        keys = list("abcdefghij")
        base = {k: i for i, k in enumerate(keys)}
        canonical = canonicalize_json(base)
        for _ in range(50):
            shuffled_keys = keys.copy()
            random.shuffle(shuffled_keys)
            permuted = {k: base[k] for k in shuffled_keys}
            assert canonicalize_json(permuted) == canonical

    def test_number_quantization(self) -> None:
        """Float quantization to 1e-6 quantum."""
        payload = {"val": 0.3333335}
        result = canonicalize_json(payload)
        parsed = json.loads(result)
        # Should be quantized to nearest 1e-6
        assert abs(parsed["val"] - 0.333334) < 1e-6

    def test_unicode_nfc_normalization(self) -> None:
        """Strings are NFC normalized and trimmed."""
        payload = {"key": "  hello  "}
        result = canonicalize_json(payload)
        parsed = json.loads(result)
        assert parsed["key"] == "hello"

    def test_nan_rejected(self) -> None:
        """NaN values raise ValueError."""
        with pytest.raises(ValueError, match="Cannot canonicalize"):
            canonicalize_json({"val": float("nan")})

    def test_inf_rejected(self) -> None:
        """Infinity values raise ValueError."""
        with pytest.raises(ValueError, match="Cannot canonicalize"):
            canonicalize_json({"val": float("inf")})


class TestIdempotencyKey:
    """Verify deterministic idempotency key generation."""

    def test_idempotency_key_stability(self) -> None:
        """Same input produces same idempotency key."""
        payload = {
            "trunk_ref": {"trunk_id": "t1"},
            "segment": {"dlugosc_m": 100.0},
        }
        key1 = compute_idempotency_key(payload)
        key2 = compute_idempotency_key(payload)
        assert key1 == key2
        assert len(key1) == 32  # hex32

    def test_idempotency_key_excludes_ui_fields(self) -> None:
        """UI-only fields don't affect idempotency key."""
        base = {"trunk_ref": {"trunk_id": "t1"}}
        with_ui = {
            **base,
            "pozycja_widokowa": {"x": 100, "y": 200, "unit": "PX"},
            "ui": {"click_id": "click-123", "timestamp_utc": "2026-01-01T00:00:00Z"},
        }
        assert compute_idempotency_key(base) == compute_idempotency_key(with_ui)

    def test_idempotency_key_different_for_different_inputs(self) -> None:
        """Different domain inputs produce different keys."""
        payload_a = {"trunk_ref": {"trunk_id": "t1"}}
        payload_b = {"trunk_ref": {"trunk_id": "t2"}}
        assert compute_idempotency_key(payload_a) != compute_idempotency_key(payload_b)

    def test_idempotency_key_hex_format(self) -> None:
        """Key is 32-char hex string."""
        import re
        key = compute_idempotency_key({"x": 1})
        assert re.match(r"^[0-9a-f]{32}$", key)


class TestDeterministicId:
    """Verify deterministic element ID generation."""

    def test_deterministic_id_stability(self) -> None:
        """Same seeds produce same ID."""
        id1 = compute_deterministic_id("trunk-001", "seg-001", "0.5", prefix="st-")
        id2 = compute_deterministic_id("trunk-001", "seg-001", "0.5", prefix="st-")
        assert id1 == id2

    def test_deterministic_id_case_insensitive(self) -> None:
        """IDs are case-insensitive (lower-case normalization)."""
        id1 = compute_deterministic_id("Trunk-001", "SEG-001")
        id2 = compute_deterministic_id("trunk-001", "seg-001")
        assert id1 == id2

    def test_deterministic_id_trim(self) -> None:
        """Leading/trailing spaces are trimmed."""
        id1 = compute_deterministic_id("  trunk-001  ")
        id2 = compute_deterministic_id("trunk-001")
        assert id1 == id2

    def test_deterministic_id_prefix(self) -> None:
        """Prefix is prepended to the hash."""
        result = compute_deterministic_id("seed", prefix="node-")
        assert result.startswith("node-")
        assert len(result) == 5 + 32  # "node-" + 32 hex


# ===========================================================================
# §D.7 — Domain Events
# ===========================================================================


class TestDomainEvents:
    """Verify domain event types and ordering."""

    def test_domain_events_count(self) -> None:
        """Exactly 12 event types for station insertion."""
        assert len(STATION_INSERTION_EVENT_ORDER) == 12

    def test_domain_events_order(self) -> None:
        """Events are in the specified deterministic order."""
        expected = (
            "SEGMENT_SPLIT",
            "CUT_NODE_CREATED",
            "STATION_CREATED",
            "PORTS_CREATED",
            "FIELDS_CREATED_SN",
            "DEVICES_CREATED_SN",
            "TR_CREATED",
            "BUS_NN_CREATED",
            "FIELDS_CREATED_NN",
            "DEVICES_CREATED_NN",
            "RECONNECTED_GRAPH",
            "LOGICAL_VIEWS_UPDATED",
        )
        assert STATION_INSERTION_EVENT_ORDER == expected

    def test_enum_matches_tuple(self) -> None:
        """StationInsertionEvent enum matches the order tuple."""
        enum_values = tuple(e.value for e in StationInsertionEvent)
        assert enum_values == STATION_INSERTION_EVENT_ORDER

    def test_no_duplicate_events(self) -> None:
        """No duplicate event types."""
        assert len(set(STATION_INSERTION_EVENT_ORDER)) == len(STATION_INSERTION_EVENT_ORDER)


# ===========================================================================
# §D.8 — Validation Rules
# ===========================================================================


class TestValidationRules:
    """Verify validation codes and rules."""

    def test_validation_codes_completeness(self) -> None:
        """All 10 W-ISS codes must be present."""
        codes = {r.code for r in VALIDATION_RULES}
        expected = {f"W-ISS-{i:03d}" for i in range(1, 11)}
        assert codes == expected

    def test_validation_priority_order(self) -> None:
        """get_validation_rules_sorted returns rules by ascending priority."""
        sorted_rules = get_validation_rules_sorted()
        priorities = [r.priority for r in sorted_rules]
        assert priorities == sorted(priorities)

    def test_validation_levels_valid(self) -> None:
        """All rules use valid validation levels."""
        for rule in VALIDATION_RULES:
            assert rule.level in (ValidationLevel.BLOKUJACE, ValidationLevel.OSTRZEZENIE)

    def test_blocking_rules_have_lower_priority(self) -> None:
        """BLOKUJACE rules generally have lower priority numbers (= higher importance)."""
        blocking = [r for r in VALIDATION_RULES if r.level == ValidationLevel.BLOKUJACE]
        warning = [r for r in VALIDATION_RULES if r.level == ValidationLevel.OSTRZEZENIE]
        if blocking and warning:
            max_blocking_priority = max(r.priority for r in blocking)
            min_warning_priority = min(r.priority for r in warning)
            assert max_blocking_priority < min_warning_priority

    def test_no_duplicate_codes(self) -> None:
        """No duplicate validation codes."""
        codes = [r.code for r in VALIDATION_RULES]
        assert len(set(codes)) == len(codes)

    def test_no_duplicate_priorities(self) -> None:
        """No duplicate priority values."""
        priorities = [r.priority for r in VALIDATION_RULES]
        assert len(set(priorities)) == len(priorities)

    def test_fix_actions_non_empty(self) -> None:
        """All rules have non-empty fix action fields."""
        for rule in VALIDATION_RULES:
            assert rule.fix_action_code, f"{rule.code} missing fix_action_code"
            assert rule.fix_target, f"{rule.code} missing fix_target"
            assert rule.fix_navigation, f"{rule.code} missing fix_navigation"
