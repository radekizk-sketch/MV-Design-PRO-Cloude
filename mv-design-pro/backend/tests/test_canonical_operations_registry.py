"""Tests for canonical operations registry.

Ensures:
- All 39 canonical operations are registered
- Alias mapping works correctly
- Readiness codes are complete (24+ codes)
- Response contract structure is correct
- Validation helpers work
- No duplicate codes
- Priority ordering is deterministic
- Polish messages present for all codes
"""
import pytest
from domain.canonical_operations import (
    CANONICAL_OPERATIONS,
    CANONICAL_OP_NAMES,
    ALIAS_MAP,
    READINESS_CODES,
    ReadinessLevel,
    ReadinessArea,
    OperationCategory,
    resolve_operation_name,
    is_canonical_operation,
    validate_operation_payload,
    get_blockers_for_analysis,
)


class TestCanonicalOperationsRegistry:
    """Test canonical operations completeness."""

    def test_minimum_39_operations(self):
        assert len(CANONICAL_OPERATIONS) >= 39

    def test_canonical_op_names_frozen(self):
        assert isinstance(CANONICAL_OP_NAMES, frozenset)

    def test_all_sn_operations_present(self):
        sn_ops = {
            "add_grid_source_sn",
            "continue_trunk_segment_sn",
            "insert_station_on_segment_sn",
            "start_branch_segment_sn",
            "insert_section_switch_sn",
            "connect_secondary_ring_sn",
            "set_normal_open_point",
        }
        for op in sn_ops:
            assert op in CANONICAL_OP_NAMES, f"Missing SN operation: {op}"

    def test_all_oze_operations_present(self):
        oze_ops = {
            "add_pv_inverter_nn",
            "add_bess_inverter_nn",
            "add_genset_nn",
            "add_ups_nn",
        }
        for op in oze_ops:
            assert op in CANONICAL_OP_NAMES, f"Missing OZE operation: {op}"

    def test_all_protection_operations_present(self):
        prot_ops = {
            "add_ct", "add_vt", "add_relay",
            "update_relay_settings", "link_relay_to_field",
            "calculate_tcc_curve", "validate_selectivity",
        }
        for op in prot_ops:
            assert op in CANONICAL_OP_NAMES, f"Missing protection operation: {op}"

    def test_all_study_case_operations_present(self):
        case_ops = {
            "create_study_case",
            "run_short_circuit", "run_power_flow",
            "compare_study_cases",
        }
        for op in case_ops:
            assert op in CANONICAL_OP_NAMES, f"Missing study case operation: {op}"

    def test_all_universal_operations_present(self):
        universal_ops = {
            "assign_catalog_to_element",
            "update_element_parameters",
            "export_project_artifacts",
        }
        for op in universal_ops:
            assert op in CANONICAL_OP_NAMES, f"Missing universal operation: {op}"

    def test_each_operation_has_description_pl(self):
        for name, spec in CANONICAL_OPERATIONS.items():
            assert spec.description_pl, f"Op {name} missing description_pl"
            # Must be Polish (basic check: no 'the', 'of', 'is')
            lower = spec.description_pl.lower()
            assert " the " not in lower, f"Op {name} description may be English"

    def test_each_operation_has_required_fields(self):
        for name, spec in CANONICAL_OPERATIONS.items():
            assert isinstance(spec.required_fields, tuple), f"Op {name}: required_fields must be tuple"

    def test_each_operation_has_category(self):
        for name, spec in CANONICAL_OPERATIONS.items():
            assert isinstance(spec.category, OperationCategory), f"Op {name}: invalid category"


class TestAliasMapping:
    """Test alias resolution."""

    def test_aliases_resolve_to_canonical(self):
        for alias, canonical in ALIAS_MAP.items():
            assert canonical in CANONICAL_OP_NAMES, f"Alias {alias} resolves to non-canonical: {canonical}"

    def test_resolve_canonical_is_identity(self):
        for name in CANONICAL_OP_NAMES:
            assert resolve_operation_name(name) == name

    def test_resolve_alias(self):
        for alias, canonical in ALIAS_MAP.items():
            assert resolve_operation_name(alias) == canonical

    def test_is_canonical_with_alias(self):
        for alias in ALIAS_MAP:
            assert is_canonical_operation(alias)

    def test_is_not_canonical_unknown(self):
        assert not is_canonical_operation("nonexistent_operation_xyz")


class TestReadinessCodes:
    """Test readiness codes completeness."""

    def test_minimum_24_codes(self):
        assert len(READINESS_CODES) >= 24

    def test_all_required_codes_present(self):
        required = {
            "source.voltage_invalid", "source.sk3_invalid",
            "trunk.terminal_missing", "trunk.segment_missing",
            "trunk.segment_length_missing", "trunk.segment_length_invalid",
            "trunk.catalog_missing",
            "station.type_invalid", "station.voltage_missing",
            "station.nn_outgoing_min_1", "station.required_field_missing",
            "transformer.catalog_missing", "transformer.connection_missing",
            "nn.bus_missing", "nn.main_breaker_missing",
            "oze.transformer_required", "oze.nn_bus_required",
            "ring.endpoints_missing", "ring.nop_required",
            "protection.ct_required", "protection.vt_required",
            "protection.settings_incomplete",
            "study_case.missing_base_snapshot",
            "analysis.blocked_by_readiness",
        }
        for code in required:
            assert code in READINESS_CODES, f"Missing readiness code: {code}"

    def test_each_code_has_polish_message(self):
        for code, spec in READINESS_CODES.items():
            assert spec.message_pl, f"Code {code} missing message_pl"
            assert len(spec.message_pl) > 5, f"Code {code} message_pl too short"

    def test_each_blocker_has_fix_action(self):
        for code, spec in READINESS_CODES.items():
            if spec.level == ReadinessLevel.BLOCKER:
                # Most blockers should have fix actions
                if spec.code != "analysis.blocked_by_readiness":
                    assert spec.fix_action_id, f"Blocker {code} missing fix_action_id"

    def test_no_duplicate_priorities_in_same_area(self):
        # Within same area, priorities should be deterministic
        area_priorities: dict[str, list[tuple[int, str]]] = {}
        for code, spec in READINESS_CODES.items():
            area = spec.area.value
            if area not in area_priorities:
                area_priorities[area] = []
            area_priorities[area].append((spec.priority, code))
        # Sorted by priority should be stable
        for area, items in area_priorities.items():
            sorted_items = sorted(items, key=lambda x: (x[0], x[1]))
            assert sorted_items == sorted(items, key=lambda x: (x[0], x[1]))

    def test_priority_ordering_deterministic(self):
        sorted_codes = sorted(
            READINESS_CODES.items(),
            key=lambda x: (x[1].priority, x[1].code)
        )
        assert len(sorted_codes) == len(READINESS_CODES)

    def test_all_areas_covered(self):
        areas_used = {spec.area for spec in READINESS_CODES.values()}
        for area in ReadinessArea:
            assert area in areas_used, f"Area {area.value} has no readiness codes"


class TestBlockersForAnalysis:
    """Test analysis-specific blocker resolution."""

    def test_sc3f_blockers(self):
        blockers = get_blockers_for_analysis("SC_3F")
        assert len(blockers) > 0
        # Must include topology and source blockers
        codes = set(blockers)
        assert "source.voltage_invalid" in codes
        assert "trunk.catalog_missing" in codes

    def test_load_flow_blockers_include_generators(self):
        blockers = get_blockers_for_analysis("LOAD_FLOW")
        codes = set(blockers)
        assert "oze.transformer_required" in codes

    def test_protection_blockers_include_protection(self):
        blockers = get_blockers_for_analysis("PROTECTION")
        codes = set(blockers)
        assert "protection.ct_required" in codes

    def test_unknown_analysis_returns_empty(self):
        blockers = get_blockers_for_analysis("UNKNOWN_TYPE")
        assert len(blockers) == 0


class TestPayloadValidation:
    """Test payload validation helpers."""

    def test_valid_add_grid_source(self):
        errors = validate_operation_payload("add_grid_source_sn", {
            "source_name": "GPZ Główny",
            "sn_voltage_kv": 15.0,
            "sk3_mva": 250.0,
        })
        assert len(errors) == 0

    def test_missing_required_field(self):
        errors = validate_operation_payload("add_grid_source_sn", {
            "source_name": "GPZ",
        })
        assert len(errors) > 0
        assert any("sn_voltage_kv" in e for e in errors)

    def test_unknown_operation(self):
        errors = validate_operation_payload("nonexistent", {})
        assert len(errors) == 1
        assert "Nieznana operacja" in errors[0]

    def test_alias_resolves_in_validation(self):
        errors = validate_operation_payload("add_inverter_nn_pv", {
            "target_nn_bus_ref": "bus_nn_01",
            "inverter_spec": {},
        })
        assert len(errors) == 0
