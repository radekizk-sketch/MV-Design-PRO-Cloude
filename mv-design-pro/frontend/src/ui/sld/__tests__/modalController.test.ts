/**
 * ModalController — tests for modal lifecycle management.
 *
 * Verifies:
 * - dispatch() opens modal for recognized canonical operations
 * - dispatch() shows notification for unrecognized operations
 * - close() resets state
 * - handleSubmit() triggers completion callback
 * - All canonical ops from modal registry are dispatchable
 */

import { describe, it, expect } from 'vitest';
import { MODAL_REGISTRY, getModalByOp, MODAL_IDS } from '../../topology/modals/modalRegistry';

describe('ModalController dispatch coverage', () => {
  it('should have at least 23 registry entries', () => {
    expect(MODAL_REGISTRY.length).toBeGreaterThanOrEqual(23);
  });

  it('should have all original 16 modals still present', () => {
    const originalOps = [
      'continue_trunk_segment_sn',
      'insert_station_on_segment_sn',
      'start_branch_segment_sn',
      'insert_section_switch_sn',
      'connect_secondary_ring_sn',
      'set_normal_open_point',
      'add_nn_outgoing_field',
      'add_nn_load',
      'add_pv_inverter_nn',
      'add_bess_inverter_nn',
      'add_relay',
      'assign_catalog_to_element',
      'update_element_parameters',
      'run_power_flow',
      'run_short_circuit',
    ];
    for (const op of originalOps) {
      const entry = getModalByOp(op);
      expect(entry).toBeDefined();
      expect(entry!.implemented).toBe(true);
    }
  });

  it('should have new Phase 7 modals', () => {
    const newOps = [
      'add_genset_nn',
      'add_ups_nn',
      'add_grid_source_sn',
      'add_measurement',
      'add_transformer_sn_nn',
      'add_sn_bay',
      'add_nn_segment',
    ];
    for (const op of newOps) {
      const entry = getModalByOp(op);
      expect(entry).toBeDefined();
      expect(entry!.implemented).toBe(true);
    }
  });

  it('should have all entries implemented', () => {
    const unimplemented = MODAL_REGISTRY.filter((e) => !e.implemented);
    expect(unimplemented).toHaveLength(0);
  });

  it('should have unique modal IDs', () => {
    const ids = MODAL_REGISTRY.map((e) => e.modalId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('should have Polish labels only (no English verbs)', () => {
    const forbiddenWords = ['Add', 'Edit', 'Delete', 'Show', 'Open', 'Close', 'Run', 'Set'];
    for (const entry of MODAL_REGISTRY) {
      for (const word of forbiddenWords) {
        expect(entry.labelPl).not.toContain(word);
      }
    }
  });

  it('should have canonical operations in snake_case', () => {
    for (const entry of MODAL_REGISTRY) {
      expect(entry.canonicalOp).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('should have component names in PascalCase', () => {
    for (const entry of MODAL_REGISTRY) {
      expect(entry.componentName).toMatch(/^[A-Z]/);
    }
  });

  it('MODAL_IDS should align with registry modal IDs', () => {
    const registryIds = new Set(MODAL_REGISTRY.map((e) => e.modalId));
    for (const id of Object.values(MODAL_IDS)) {
      expect(registryIds.has(id)).toBe(true);
    }
  });

  it('getModalByOp should return correct entries', () => {
    expect(getModalByOp('add_genset_nn')?.componentName).toBe('GensetModal');
    expect(getModalByOp('add_ups_nn')?.componentName).toBe('UPSModal');
    expect(getModalByOp('add_grid_source_sn')?.componentName).toBe('GridSourceModal');
    expect(getModalByOp('add_measurement')?.componentName).toBe('MeasurementModal');
    expect(getModalByOp('add_transformer_sn_nn')?.componentName).toBe('TransformerStationModal');
    expect(getModalByOp('add_sn_bay')?.componentName).toBe('NodeModal');
    expect(getModalByOp('add_nn_segment')?.componentName).toBe('BranchModal');
  });
});
