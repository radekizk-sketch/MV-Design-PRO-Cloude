/**
 * wizardStateMachine — testy deterministyczne
 *
 * Weryfikacja: ten sam ENM → identyczny WizardState.
 * BINDING: bez nazw kodowych.
 */

import { describe, it, expect } from 'vitest';
import { computeWizardState, getStepStatusColor, getOverallStatusLabel } from '../wizardStateMachine';
import type { EnergyNetworkModel } from '../../../types/enm';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEmptyENM(): EnergyNetworkModel {
  return {
    header: {
      enm_version: '1.0', name: '', description: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      revision: 0, hash_sha256: '', defaults: { frequency_hz: 50, unit_system: 'SI' },
    },
    buses: [], branches: [], transformers: [], sources: [], loads: [], generators: [],
  };
}

function makeMinimalENM(): EnergyNetworkModel {
  return {
    ...makeEmptyENM(),
    header: { ...makeEmptyENM().header, name: 'GPZ Test' },
    buses: [
      { id: '1', ref_id: 'bus_sn_main', name: 'Szyna SN', tags: ['source'], meta: {}, voltage_kv: 15, phase_system: '3ph' },
    ],
    sources: [
      { id: '2', ref_id: 'src_grid', name: 'Sieć', tags: [], meta: {}, bus_ref: 'bus_sn_main', model: 'short_circuit_power', sk3_mva: 250, rx_ratio: 0.1 },
    ],
  };
}

function makeCompleteENM(): EnergyNetworkModel {
  return {
    ...makeMinimalENM(),
    buses: [
      { id: '1', ref_id: 'bus_sn_main', name: 'Szyna SN', tags: ['source'], meta: {}, voltage_kv: 15, phase_system: '3ph' },
      { id: '3', ref_id: 'bus_sn_2', name: 'Szyna SN 2', tags: [], meta: {}, voltage_kv: 15, phase_system: '3ph' },
    ],
    branches: [
      { id: '4', ref_id: 'line_L01', name: 'Linia L1', tags: [], meta: {}, type: 'line_overhead' as const, from_bus_ref: 'bus_sn_main', to_bus_ref: 'bus_sn_2', status: 'closed' as const, length_km: 5, r_ohm_per_km: 0.443, x_ohm_per_km: 0.34 },
    ],
    loads: [
      { id: '5', ref_id: 'load_1', name: 'Odbior 1', tags: [], meta: {}, bus_ref: 'bus_sn_2', p_mw: 1, q_mvar: 0.3, model: 'pq' as const },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeWizardState', () => {
  it('returns blocked state for empty ENM (K1 no name blocker)', () => {
    const state = computeWizardState(makeEmptyENM());
    expect(state.overallStatus).toBe('blocked');
    expect(state.steps).toHaveLength(10);
    expect(state.elementCounts.buses).toBe(0);
  });

  it('detects K1 blocker when name is missing', () => {
    const state = computeWizardState(makeEmptyENM());
    const k1 = state.steps.find(s => s.stepId === 'K1');
    expect(k1?.status).toBe('error');
    expect(k1?.issues.some(i => i.code === 'K1_NO_NAME')).toBe(true);
  });

  it('reports K2 complete with source bus + source', () => {
    const state = computeWizardState(makeMinimalENM());
    const k2 = state.steps.find(s => s.stepId === 'K2');
    expect(k2?.status).toBe('complete');
    expect(k2?.completionPercent).toBe(100);
  });

  it('reports K2 blocker when no source bus', () => {
    const enm = { ...makeEmptyENM(), header: { ...makeEmptyENM().header, name: 'Test' } };
    const state = computeWizardState(enm);
    const k2 = state.steps.find(s => s.stepId === 'K2');
    expect(k2?.status).toBe('error');
    expect(k2?.issues.some(i => i.code === 'K2_NO_SOURCE_BUS')).toBe(true);
  });

  it('computes readiness matrix correctly for complete model', () => {
    const state = computeWizardState(makeCompleteENM());
    expect(state.readinessMatrix.shortCircuit3F.available).toBe(true);
    expect(state.readinessMatrix.loadFlow.available).toBe(true);
  });

  it('reports SC 1F unavailable without Z0 data', () => {
    const state = computeWizardState(makeCompleteENM());
    expect(state.readinessMatrix.shortCircuit1F.available).toBe(false);
    expect(state.readinessMatrix.shortCircuit1F.missingRequirements.length).toBeGreaterThan(0);
  });

  it('is deterministic — same ENM produces identical state', () => {
    const enm = makeCompleteENM();
    const state1 = computeWizardState(enm);
    const state2 = computeWizardState(enm);
    expect(JSON.stringify(state1)).toBe(JSON.stringify(state2));
  });

  it('counts elements correctly', () => {
    const state = computeWizardState(makeCompleteENM());
    expect(state.elementCounts.buses).toBe(2);
    expect(state.elementCounts.sources).toBe(1);
    expect(state.elementCounts.branches).toBe(1);
    expect(state.elementCounts.loads).toBe(1);
  });

  it('marks overall status as ready for complete model', () => {
    const state = computeWizardState(makeCompleteENM());
    expect(state.overallStatus).toBe('ready');
  });

  it('detects dangling branch references', () => {
    const enm = makeCompleteENM();
    enm.branches[0] = { ...enm.branches[0], to_bus_ref: 'nonexistent' };
    const state = computeWizardState(enm);
    const k4 = state.steps.find(s => s.stepId === 'K4');
    expect(k4?.status).toBe('error');
    expect(k4?.issues.some(i => i.code === 'K4_DANGLING_TO')).toBe(true);
  });
});

describe('getStepStatusColor', () => {
  it('returns green for complete', () => {
    expect(getStepStatusColor('complete')).toBe('#22c55e');
  });

  it('returns red for error', () => {
    expect(getStepStatusColor('error')).toBe('#ef4444');
  });
});

describe('getOverallStatusLabel', () => {
  it('returns Polish labels', () => {
    expect(getOverallStatusLabel('ready')).toContain('Gotowy');
    expect(getOverallStatusLabel('blocked')).toContain('Bloker');
    expect(getOverallStatusLabel('empty')).toContain('Pust');
  });
});
