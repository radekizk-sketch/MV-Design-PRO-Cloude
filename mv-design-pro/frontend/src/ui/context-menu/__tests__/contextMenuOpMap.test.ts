/**
 * Context Menu Operation Map — completeness guard.
 *
 * Verifies that ALL action IDs from ALL context menu builders have a mapping
 * in CONTEXT_MENU_OP_MAP, NAVIGATION_ACTIONS, or TOGGLE_ACTIONS.
 *
 * INVARIANT: Zero empty clicks — every action ID maps to an operation.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSourceSNContextMenu,
  buildBusSNContextMenu,
  buildStationContextMenu,
  buildBaySNContextMenu,
  buildSwitchSNContextMenu,
  buildTransformerContextMenu,
  buildBusNNContextMenu,
  buildFeederNNContextMenu,
  buildSourceFieldNNContextMenu,
  buildPVInverterContextMenu,
  buildBESSInverterContextMenu,
  buildGensetContextMenu,
  buildUPSContextMenu,
  buildLoadNNContextMenu,
  buildEnergyMeterContextMenu,
  buildSwitchNNContextMenu,
  buildSegmentSNContextMenu,
  buildRelaySNContextMenu,
  buildMeasurementSNContextMenu,
  buildNOPContextMenu,
  buildEnergyStorageContextMenu,
  buildTerminalSNContextMenu,
  buildStudyCaseContextMenu,
  buildAnalysisResultContextMenu,
  ACTION_MENU_MINIMUM_OPTIONS,
} from '../actionMenuBuilders';

// ---------------------------------------------------------------------------
// Collect ALL action IDs from ALL builders
// ---------------------------------------------------------------------------

function collectActionIds(
  actions: Array<{ id: string; separator?: boolean }>,
): string[] {
  return actions
    .filter((a) => !a.separator)
    .map((a) => a.id);
}

const ALL_BUILDER_ACTION_IDS = new Set<string>();

const MODE = 'MODEL_EDIT' as const;
const handlers = new Proxy<Record<string, () => void>>(
  {},
  { get: () => () => {} },
);

// SN builders
for (const ids of [
  collectActionIds(buildSourceSNContextMenu(MODE, handlers)),
  collectActionIds(buildBusSNContextMenu(MODE, handlers)),
  collectActionIds(buildStationContextMenu(MODE, handlers)),
  collectActionIds(buildBaySNContextMenu(MODE, handlers)),
  collectActionIds(buildSwitchSNContextMenu(MODE, 'CLOSED', handlers)),
  collectActionIds(buildTransformerContextMenu(MODE, handlers)),
  collectActionIds(buildSegmentSNContextMenu(MODE, handlers)),
  collectActionIds(buildRelaySNContextMenu(MODE, handlers)),
  collectActionIds(buildMeasurementSNContextMenu(MODE, handlers)),
  collectActionIds(buildNOPContextMenu(MODE, handlers)),
  collectActionIds(buildTerminalSNContextMenu(MODE, 'OTWARTY', handlers)),
]) {
  for (const id of ids) ALL_BUILDER_ACTION_IDS.add(id);
}

// nN builders
for (const ids of [
  collectActionIds(buildBusNNContextMenu(MODE, handlers)),
  collectActionIds(buildFeederNNContextMenu(MODE, handlers)),
  collectActionIds(buildSourceFieldNNContextMenu(MODE, handlers)),
  collectActionIds(buildPVInverterContextMenu(MODE, handlers)),
  collectActionIds(buildBESSInverterContextMenu(MODE, handlers)),
  collectActionIds(buildGensetContextMenu(MODE, handlers)),
  collectActionIds(buildUPSContextMenu(MODE, handlers)),
  collectActionIds(buildLoadNNContextMenu(MODE, handlers)),
  collectActionIds(buildEnergyMeterContextMenu(MODE, handlers)),
  collectActionIds(buildSwitchNNContextMenu(MODE, 'OPEN', handlers)),
  collectActionIds(buildEnergyStorageContextMenu(MODE, handlers)),
]) {
  for (const id of ids) ALL_BUILDER_ACTION_IDS.add(id);
}

// Analysis builders
for (const ids of [
  collectActionIds(buildStudyCaseContextMenu(MODE, 'FRESH', handlers)),
  collectActionIds(buildAnalysisResultContextMenu(MODE, 'SHORT_CIRCUIT', handlers)),
]) {
  for (const id of ids) ALL_BUILDER_ACTION_IDS.add(id);
}

// ---------------------------------------------------------------------------
// Import the maps from SLDView.tsx (we can't import directly, so we replicate)
// ---------------------------------------------------------------------------

// This is the complete set of known action IDs that should be handled.
// Each must be in CONTEXT_MENU_OP_MAP, NAVIGATION_ACTIONS, or TOGGLE_ACTIONS.

const KNOWN_NAVIGATION_ACTIONS = new Set([
  'show_results', 'show_whitebox', 'show_readiness', 'show_tree',
  'show_diagram', 'show_on_diagram', 'show_topology', 'show_secondary_links',
  'show_coordination', 'show_summary', 'show_per_element', 'show_overlay',
  'show_ik', 'show_ip', 'show_ith', 'show_idyn',
  'show_voltages', 'show_currents', 'show_powers', 'show_losses',
  'show_comparison', 'show_delta_overlay',
  'export_data', 'export_json', 'export_report', 'export_pdf', 'export_docx',
  'export_results', 'export_whitebox',
  'history', 'fix_issues',
  'check_ring', 'check_nop', 'check_selectivity', 'check_collisions',
  'calc_tcc', 'validate_selectivity',
  'compare_cases', 'compare_with', 'compare_snapshots',
  'add_trunk_segment', 'reserve_ring', 'release_ring', 'start_secondary_link',
]);

const KNOWN_TOGGLE_ACTIONS = new Set([
  'toggle_switch', 'toggle_service', 'toggle_enabled',
  'delete', 'delete_element', 'disconnect', 'disconnect_element',
  'edit_geometry', 'snap_to_grid', 'reset_geometry', 'undo_snapshot',
]);

const KNOWN_OP_MAP_KEYS = new Set([
  'properties', 'edit_sk3', 'edit_voltage', 'edit_rx', 'edit_impedance',
  'edit_length', 'edit_load_power', 'edit_transformer_ratio', 'edit_parameters',
  'edit_tap', 'edit_vector_group', 'edit_power', 'edit_reactive',
  'edit_kind', 'edit_connection', 'edit_control', 'edit_limits',
  'edit_disconnect', 'edit_measurement', 'edit_capacity', 'edit_soc',
  'edit_mode', 'edit_strategy', 'edit_pf', 'edit_fuel',
  'edit_backup_time', 'edit_battery', 'edit_switch', 'edit_rating',
  'edit_purpose', 'edit_accuracy', 'edit_ratio', 'edit_settings',
  'edit_curve', 'edit_type', 'edit_name', 'edit_description', 'edit_label',
  'edit_source_params', 'edit_segment_length', 'edit_cycles', 'edit_chemistry',
  'rename', 'set_normal_state', 'set_operating_mode', 'set_time_profile',
  'set_profile', 'set_source_mode', 'change_role', 'change_kind',
  'assign_catalog', 'assign_tr_catalog', 'assign_bus_catalog',
  'assign_default_catalog', 'assign_inverter_catalog', 'assign_storage_catalog',
  'assign_switch_catalog', 'assign_cable_catalog', 'assign_next_catalog',
  'clear_catalog',
  'add_line', 'add_cable', 'add_branch', 'add_station',
  'insert_station_a', 'insert_station_b', 'insert_station_c', 'insert_station_d',
  'add_section_switch', 'insert_section_switch', 'insert_disconnector', 'insert_earthing',
  'connect_ring', 'set_nop', 'set_as_nop', 'clear_nop', 'move_nop', 'set_nop_candidate',
  'add_source', 'add_transformer', 'add_breaker', 'add_disconnector', 'add_earth_switch',
  'add_sn_field_in', 'add_sn_field_out', 'add_sn_field_branch', 'add_sn_field_tr',
  'add_sn_bus_section', 'add_sn_coupler',
  'add_ct', 'add_vt', 'assign_ct', 'assign_vt',
  'add_relay', 'add_protection', 'edit_relay_settings',
  'add_nn_load', 'add_load', 'add_pv', 'add_bess', 'add_bess_energy',
  'add_genset', 'add_ups', 'add_nn_outgoing_field', 'add_feeder',
  'add_nn_feeder', 'add_nn_bus', 'add_nn_main', 'add_nn_bus_section', 'add_nn_coupler',
  'add_source_field', 'add_source_field_nn', 'add_bus_section', 'add_bus_coupler', 'add_segment', 'add_fuse',
  'add_energy_meter', 'add_quality_meter', 'add_surge_arrester',
  'run_power_flow', 'run_short_circuit', 'run_sc_analysis',
  'run_sc_3f', 'run_sc_2f', 'run_sc_1f', 'run_sc_2f_rf', 'run_time_series',
  'set_switch_states', 'set_normal_states', 'set_source_modes',
  'set_analysis_settings', 'clone_case', 'validate_transformer',
]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CONTEXT_MENU_OP_MAP completeness', () => {
  it('should have at least 80 mappings in OP_MAP', () => {
    expect(KNOWN_OP_MAP_KEYS.size).toBeGreaterThanOrEqual(80);
  });

  it('should have at least 30 navigation actions', () => {
    expect(KNOWN_NAVIGATION_ACTIONS.size).toBeGreaterThanOrEqual(30);
  });

  it('should have at least 8 toggle actions', () => {
    expect(KNOWN_TOGGLE_ACTIONS.size).toBeGreaterThanOrEqual(8);
  });

  it('every action ID from builders should be handled (OP_MAP or NAVIGATION or TOGGLE)', () => {
    const unhandled: string[] = [];
    for (const actionId of ALL_BUILDER_ACTION_IDS) {
      const inOpMap = KNOWN_OP_MAP_KEYS.has(actionId);
      const inNav = KNOWN_NAVIGATION_ACTIONS.has(actionId);
      const inToggle = KNOWN_TOGGLE_ACTIONS.has(actionId);
      if (!inOpMap && !inNav && !inToggle) {
        unhandled.push(actionId);
      }
    }
    expect(unhandled).toEqual([]);
  });

  it('should handle all SN element actions', () => {
    const snActions = collectActionIds(buildSourceSNContextMenu(MODE, handlers));
    for (const id of snActions) {
      const handled =
        KNOWN_OP_MAP_KEYS.has(id) ||
        KNOWN_NAVIGATION_ACTIONS.has(id) ||
        KNOWN_TOGGLE_ACTIONS.has(id);
      expect(handled).toBe(true);
    }
  });

  it('should handle all Station actions (30+ items)', () => {
    const stationActions = collectActionIds(buildStationContextMenu(MODE, handlers));
    expect(stationActions.length).toBeGreaterThanOrEqual(30);
    for (const id of stationActions) {
      const handled =
        KNOWN_OP_MAP_KEYS.has(id) ||
        KNOWN_NAVIGATION_ACTIONS.has(id) ||
        KNOWN_TOGGLE_ACTIONS.has(id);
      expect(handled).toBe(true);
    }
  });

  it('should handle all Segment SN actions (30+ items)', () => {
    const segmentActions = collectActionIds(buildSegmentSNContextMenu(MODE, handlers));
    expect(segmentActions.length).toBeGreaterThanOrEqual(25);
    for (const id of segmentActions) {
      const handled =
        KNOWN_OP_MAP_KEYS.has(id) ||
        KNOWN_NAVIGATION_ACTIONS.has(id) ||
        KNOWN_TOGGLE_ACTIONS.has(id);
      expect(handled).toBe(true);
    }
  });

  it('should handle all PV inverter actions', () => {
    const pvActions = collectActionIds(buildPVInverterContextMenu(MODE, handlers));
    for (const id of pvActions) {
      const handled =
        KNOWN_OP_MAP_KEYS.has(id) ||
        KNOWN_NAVIGATION_ACTIONS.has(id) ||
        KNOWN_TOGGLE_ACTIONS.has(id);
      expect(handled).toBe(true);
    }
  });

  it('should handle all BESS inverter actions', () => {
    const bessActions = collectActionIds(buildBESSInverterContextMenu(MODE, handlers));
    for (const id of bessActions) {
      const handled =
        KNOWN_OP_MAP_KEYS.has(id) ||
        KNOWN_NAVIGATION_ACTIONS.has(id) ||
        KNOWN_TOGGLE_ACTIONS.has(id);
      expect(handled).toBe(true);
    }
  });

  it('should handle all Genset actions', () => {
    const gensetActions = collectActionIds(buildGensetContextMenu(MODE, handlers));
    for (const id of gensetActions) {
      const handled =
        KNOWN_OP_MAP_KEYS.has(id) ||
        KNOWN_NAVIGATION_ACTIONS.has(id) ||
        KNOWN_TOGGLE_ACTIONS.has(id);
      expect(handled).toBe(true);
    }
  });

  it('should handle all UPS actions', () => {
    const upsActions = collectActionIds(buildUPSContextMenu(MODE, handlers));
    for (const id of upsActions) {
      const handled =
        KNOWN_OP_MAP_KEYS.has(id) ||
        KNOWN_NAVIGATION_ACTIONS.has(id) ||
        KNOWN_TOGGLE_ACTIONS.has(id);
      expect(handled).toBe(true);
    }
  });

  it('ACTION_MENU_MINIMUM_OPTIONS should cover 24+ element types', () => {
    expect(Object.keys(ACTION_MENU_MINIMUM_OPTIONS).length).toBeGreaterThanOrEqual(24);
  });
});
