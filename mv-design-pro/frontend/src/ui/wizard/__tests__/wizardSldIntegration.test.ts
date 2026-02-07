/**
 * Testy integracji Wizard ↔ SLD — getStepForElement, computeWizardStateWithTopology
 *
 * Weryfikacja: klik elementu SLD → poprawny krok kreatora.
 * BINDING: deterministyczne mapowanie.
 */

import { describe, it, expect } from 'vitest';
import {
  getStepForElement,
  computeWizardStateWithTopology,
} from '../wizardStateMachine';
import type { EnergyNetworkModel } from '../../../types/enm';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeFullENM(): EnergyNetworkModel {
  return {
    header: {
      enm_version: '1.0', name: 'Test GPZ', description: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      revision: 1, hash_sha256: '', defaults: { frequency_hz: 50, unit_system: 'SI' },
    },
    buses: [
      { id: '1', ref_id: 'bus_sn_gpz', name: 'Szyna SN GPZ', tags: ['source'], meta: {}, voltage_kv: 15, phase_system: '3ph' },
      { id: '2', ref_id: 'bus_sn_1', name: 'Szyna SN S1', tags: [], meta: {}, voltage_kv: 15, phase_system: '3ph' },
      { id: '3', ref_id: 'bus_nn_1', name: 'Szyna nn S1', tags: [], meta: {}, voltage_kv: 0.4, phase_system: '3ph' },
    ],
    sources: [
      { id: '10', ref_id: 'src_grid', name: 'Sieć', tags: [], meta: {}, bus_ref: 'bus_sn_gpz', model: 'short_circuit_power', sk3_mva: 4000 },
    ],
    branches: [
      {
        id: '20', ref_id: 'line_gpz_s1', name: 'Linia GPZ→S1', tags: [], meta: {},
        type: 'line_overhead' as const, from_bus_ref: 'bus_sn_gpz', to_bus_ref: 'bus_sn_1',
        status: 'closed' as const, length_km: 5, r_ohm_per_km: 0.249, x_ohm_per_km: 0.362,
      },
      {
        id: '21', ref_id: 'sw_coupler', name: 'Sprzęgło', tags: [], meta: {},
        type: 'bus_coupler' as const, from_bus_ref: 'bus_sn_gpz', to_bus_ref: 'bus_sn_1',
        status: 'closed' as const,
      },
    ],
    transformers: [
      {
        id: '30', ref_id: 'trafo_1', name: 'T1', tags: [], meta: {},
        hv_bus_ref: 'bus_sn_1', lv_bus_ref: 'bus_nn_1',
        sn_mva: 0.63, uhv_kv: 15, ulv_kv: 0.4, uk_percent: 4.5, pk_kw: 6.5,
      },
    ],
    loads: [
      { id: '40', ref_id: 'load_1', name: 'Odbiór 1', tags: [], meta: {}, bus_ref: 'bus_nn_1', p_mw: 0.3, q_mvar: 0.15, model: 'pq' as const },
    ],
    generators: [
      { id: '50', ref_id: 'gen_pv', name: 'PV 500kW', tags: [], meta: {}, bus_ref: 'bus_nn_1', p_mw: 0.5 },
    ],
    substations: [
      { id: '60', ref_id: 'sub_gpz', name: 'GPZ', tags: [], meta: {}, station_type: 'gpz' as const, bus_refs: ['bus_sn_gpz'], transformer_refs: [] },
      { id: '61', ref_id: 'sub_1', name: 'Stacja 1', tags: [], meta: {}, station_type: 'mv_lv' as const, bus_refs: ['bus_sn_1', 'bus_nn_1'], transformer_refs: ['trafo_1'] },
    ],
    bays: [
      { id: '70', ref_id: 'bay_in_1', name: 'Pole IN S1', tags: [], meta: {}, bay_role: 'IN' as const, substation_ref: 'sub_1', bus_ref: 'bus_sn_1', equipment_refs: [] },
    ],
    junctions: [
      { id: '80', ref_id: 'junc_t1', name: 'Węzeł T1', tags: [], meta: {}, connected_branch_refs: ['line_gpz_s1', 'line_gpz_s1', 'line_gpz_s1'], junction_type: 'T_node' as const },
    ],
    corridors: [
      { id: '90', ref_id: 'corr_a', name: 'Magistrala A', tags: [], meta: {}, corridor_type: 'radial' as const, ordered_segment_refs: ['line_gpz_s1'] },
    ],
  };
}

// ---------------------------------------------------------------------------
// getStepForElement
// ---------------------------------------------------------------------------

describe('getStepForElement', () => {
  const enm = makeFullENM();

  it('szyna źródłowa → K2', () => {
    const result = getStepForElement(enm, 'bus_sn_gpz');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K2');
    expect(result!.elementType).toBe('bus');
  });

  it('szyna zwykła → K3', () => {
    const result = getStepForElement(enm, 'bus_sn_1');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K3');
  });

  it('źródło → K2', () => {
    const result = getStepForElement(enm, 'src_grid');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K2');
    expect(result!.elementType).toBe('source');
  });

  it('linia napowietrzna → K4', () => {
    const result = getStepForElement(enm, 'line_gpz_s1');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K4');
    expect(result!.elementType).toBe('branch');
  });

  it('łącznik (bus_coupler) → K3', () => {
    const result = getStepForElement(enm, 'sw_coupler');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K3');
    expect(result!.elementType).toBe('switch');
  });

  it('transformator → K5', () => {
    const result = getStepForElement(enm, 'trafo_1');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K5');
    expect(result!.elementType).toBe('transformer');
  });

  it('odbiór → K6', () => {
    const result = getStepForElement(enm, 'load_1');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K6');
    expect(result!.elementType).toBe('load');
  });

  it('generator → K6', () => {
    const result = getStepForElement(enm, 'gen_pv');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K6');
    expect(result!.elementType).toBe('generator');
  });

  it('stacja → K3', () => {
    const result = getStepForElement(enm, 'sub_gpz');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K3');
    expect(result!.elementType).toBe('substation');
  });

  it('pole (bay) → K3', () => {
    const result = getStepForElement(enm, 'bay_in_1');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K3');
    expect(result!.elementType).toBe('bay');
  });

  it('węzeł T → K4', () => {
    const result = getStepForElement(enm, 'junc_t1');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K4');
    expect(result!.elementType).toBe('junction');
  });

  it('magistrala → K4', () => {
    const result = getStepForElement(enm, 'corr_a');
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('K4');
    expect(result!.elementType).toBe('corridor');
  });

  it('nieznany element → null', () => {
    const result = getStepForElement(enm, 'nieistniejacy_ref');
    expect(result).toBeNull();
  });

  it('determinizm: ten sam ref_id → identyczny wynik', () => {
    const r1 = getStepForElement(enm, 'trafo_1');
    const r2 = getStepForElement(enm, 'trafo_1');
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// computeWizardStateWithTopology
// ---------------------------------------------------------------------------

describe('computeWizardStateWithTopology', () => {
  it('zwraca topologyReadiness z pełną topologią', () => {
    const enm = makeFullENM();
    const state = computeWizardStateWithTopology(enm);

    expect(state.topologyReadiness.hasSubstations).toBe(true);
    expect(state.topologyReadiness.hasBays).toBe(true);
    expect(state.topologyReadiness.hasJunctions).toBe(true);
    expect(state.topologyReadiness.hasCorridors).toBe(true);
    expect(state.topologyReadiness.completionPercent).toBe(100);
  });

  it('zwraca extendedElementCounts', () => {
    const enm = makeFullENM();
    const state = computeWizardStateWithTopology(enm);

    expect(state.extendedElementCounts.substations).toBe(2);
    expect(state.extendedElementCounts.bays).toBe(1);
    expect(state.extendedElementCounts.junctions).toBe(1);
    expect(state.extendedElementCounts.corridors).toBe(1);
    expect(state.extendedElementCounts.buses).toBe(3);
  });

  it('pusta topologia → 0% completion', () => {
    const enm = makeFullENM();
    enm.substations = [];
    enm.bays = [];
    enm.junctions = [];
    enm.corridors = [];

    const state = computeWizardStateWithTopology(enm);
    expect(state.topologyReadiness.completionPercent).toBe(0);
    expect(state.topologyReadiness.hasSubstations).toBe(false);
  });

  it('częściowa topologia → proporcjonalny %', () => {
    const enm = makeFullENM();
    enm.junctions = [];
    enm.corridors = [];

    const state = computeWizardStateWithTopology(enm);
    // 2 z 4 kategorii → 50%
    expect(state.topologyReadiness.completionPercent).toBe(50);
  });

  it('zachowuje bazowy WizardState', () => {
    const enm = makeFullENM();
    const state = computeWizardStateWithTopology(enm);

    // Powinien zachować standardowe pola z computeWizardState
    expect(state.steps.length).toBe(10);
    expect(state.readinessMatrix).toBeDefined();
    expect(state.elementCounts.buses).toBe(3);
  });
});
