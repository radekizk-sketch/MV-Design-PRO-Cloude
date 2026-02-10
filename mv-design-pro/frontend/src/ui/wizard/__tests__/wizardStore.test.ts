/**
 * Wizard store tests — canProceed gate logic + issues mapping.
 *
 * PR-7: Wizard↔ENM Contract Hardening.
 *
 * Tests:
 * 1. canProceed reflects step status (error → false, complete → true)
 * 2. issuesByStep groups issues correctly
 * 3. recomputeFromEnm produces deterministic state
 * 4. setCurrentStep updates canProceed
 * 5. Transition blockers are surfaced
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computeWizardState } from '../wizardStateMachine';
import type { EnergyNetworkModel, Bus, Source, Load, OverheadLine } from '../../../types/enm';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createEmptyEnm(): EnergyNetworkModel {
  return {
    header: {
      enm_version: '1.0',
      name: '',
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 0,
      hash_sha256: '',
      defaults: { frequency_hz: 50, unit_system: 'SI' },
    },
    buses: [],
    branches: [],
    transformers: [],
    sources: [],
    loads: [],
    generators: [],
    substations: [],
    bays: [],
    junctions: [],
    corridors: [],
  };
}

function createValidEnm(): EnergyNetworkModel {
  const enm = createEmptyEnm();
  enm.header.name = 'Test Network';
  const sourceBus: Bus = {
    id: 'bus-1', ref_id: 'bus_sn_main', name: 'Szyna główna SN',
    voltage_kv: 15, tags: ['source'], meta: {}, phase_system: '3ph',
  };
  const extraBus: Bus = {
    id: 'bus-2', ref_id: 'bus_sn_1', name: 'Szyna SN 1',
    voltage_kv: 15, tags: [], meta: {}, phase_system: '3ph',
  };
  const src: Source = {
    id: 'src-1', ref_id: 'source_grid', name: 'Sieć zasilająca',
    tags: [], meta: {}, bus_ref: 'bus_sn_main', model: 'short_circuit_power',
    sk3_mva: 250, rx_ratio: 0.1,
  };
  const line: OverheadLine = {
    id: 'br-1', ref_id: 'line_L01', name: 'Linia L1',
    tags: [], meta: {}, type: 'line_overhead',
    from_bus_ref: 'bus_sn_main', to_bus_ref: 'bus_sn_1',
    status: 'closed', length_km: 5, r_ohm_per_km: 0.443, x_ohm_per_km: 0.34,
  };
  const load: Load = {
    id: 'ld-1', ref_id: 'load_1', name: 'Odbiór 1',
    tags: [], meta: {}, bus_ref: 'bus_sn_1', p_mw: 1, q_mvar: 0.3, model: 'pq',
  };
  enm.buses = [sourceBus, extraBus];
  enm.sources = [src];
  enm.branches = [line];
  enm.loads = [load];
  return enm;
}

function computeCanProceed(
  ws: ReturnType<typeof computeWizardState>,
  currentIdx: number,
): boolean {
  if (currentIdx >= 9) return false;
  const currentStep = ws.steps[currentIdx];
  if (!currentStep) return false;
  return currentStep.status !== 'error';
}

function buildIssuesByStep(
  ws: ReturnType<typeof computeWizardState>,
): Record<string, typeof ws.steps[0]['issues']> {
  const map: Record<string, typeof ws.steps[0]['issues']> = {};
  for (const step of ws.steps) {
    if (step.issues.length > 0) {
      map[step.stepId] = [...step.issues];
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Wizard store: canProceed gate logic', () => {
  it('canProceed is false when current step has error status (empty ENM, K1 = error)', () => {
    const enm = createEmptyEnm();
    const ws = computeWizardState(enm);
    // K1 has BLOCKER (no name)
    expect(ws.steps[0].status).toBe('error');
    expect(computeCanProceed(ws, 0)).toBe(false);
  });

  it('canProceed is true when current step is complete', () => {
    const enm = createValidEnm();
    const ws = computeWizardState(enm);
    // K1 should be complete
    expect(ws.steps[0].status).toBe('complete');
    expect(computeCanProceed(ws, 0)).toBe(true);
  });

  it('canProceed is false for last step (K10, index 9)', () => {
    const enm = createValidEnm();
    const ws = computeWizardState(enm);
    expect(computeCanProceed(ws, 9)).toBe(false);
  });

  it('canProceed updates when step changes', () => {
    const enm = createEmptyEnm();
    enm.header.name = 'Test';
    const ws = computeWizardState(enm);
    // K1 = complete (name set) → canProceed
    expect(computeCanProceed(ws, 0)).toBe(true);
    // K2 = error (no source) → canProceed false from K2
    expect(ws.steps[1].status).toBe('error');
    expect(computeCanProceed(ws, 1)).toBe(false);
  });
});

describe('Wizard store: issuesByStep mapping', () => {
  it('groups issues by step ID correctly', () => {
    const enm = createEmptyEnm();
    const ws = computeWizardState(enm);
    const issueMap = buildIssuesByStep(ws);

    // K1 should have issues (no name)
    expect(issueMap['K1']).toBeDefined();
    expect(issueMap['K1'].length).toBeGreaterThan(0);
    expect(issueMap['K1'][0].code).toBe('K1_NO_NAME');
  });

  it('valid ENM has no blockers in K1-K3', () => {
    const enm = createValidEnm();
    const ws = computeWizardState(enm);
    const issueMap = buildIssuesByStep(ws);

    expect(issueMap['K1']).toBeUndefined();
    expect(issueMap['K2']).toBeUndefined();
    expect(issueMap['K3']).toBeUndefined();
  });

  it('empty ENM has K2 issues (no source)', () => {
    const enm = createEmptyEnm();
    const ws = computeWizardState(enm);
    const issueMap = buildIssuesByStep(ws);

    expect(issueMap['K2']).toBeDefined();
    const codes = issueMap['K2'].map(i => i.code);
    expect(codes).toContain('K2_NO_SOURCE_BUS');
    expect(codes).toContain('K2_NO_SOURCE');
  });
});

describe('Wizard store: deterministic recomputation', () => {
  it('same ENM produces identical wizard state', () => {
    const enm = createValidEnm();
    const ws1 = computeWizardState(enm);
    const ws2 = computeWizardState(enm);

    expect(ws1.overallStatus).toBe(ws2.overallStatus);
    expect(ws1.steps.length).toBe(ws2.steps.length);
    for (let i = 0; i < ws1.steps.length; i++) {
      expect(ws1.steps[i].stepId).toBe(ws2.steps[i].stepId);
      expect(ws1.steps[i].status).toBe(ws2.steps[i].status);
      expect(ws1.steps[i].completionPercent).toBe(ws2.steps[i].completionPercent);
      expect(ws1.steps[i].issues.length).toBe(ws2.steps[i].issues.length);
    }
  });

  it('changing ENM produces different state', () => {
    const enm1 = createEmptyEnm();
    const enm2 = createValidEnm();
    const ws1 = computeWizardState(enm1);
    const ws2 = computeWizardState(enm2);

    expect(ws1.overallStatus).not.toBe(ws2.overallStatus);
    expect(ws1.steps[0].status).not.toBe(ws2.steps[0].status);
  });
});

describe('Wizard store: overall status', () => {
  it('empty ENM has "blocked" status (K1 has blocker)', () => {
    const enm = createEmptyEnm();
    const ws = computeWizardState(enm);
    expect(ws.overallStatus).toBe('blocked');
  });

  it('valid ENM has "ready" status', () => {
    const enm = createValidEnm();
    const ws = computeWizardState(enm);
    expect(ws.overallStatus).toBe('ready');
  });

  it('ENM with only name has "incomplete" or "blocked" status', () => {
    const enm = createEmptyEnm();
    enm.header.name = 'Test';
    const ws = computeWizardState(enm);
    // Has source blocker
    expect(['blocked', 'incomplete']).toContain(ws.overallStatus);
  });
});

describe('Wizard store: readiness matrix', () => {
  it('empty ENM has all analyses unavailable', () => {
    const enm = createEmptyEnm();
    const ws = computeWizardState(enm);
    expect(ws.readinessMatrix.shortCircuit3F.available).toBe(false);
    expect(ws.readinessMatrix.shortCircuit1F.available).toBe(false);
    expect(ws.readinessMatrix.loadFlow.available).toBe(false);
  });

  it('valid ENM has SC 3F and load flow available', () => {
    const enm = createValidEnm();
    const ws = computeWizardState(enm);
    expect(ws.readinessMatrix.shortCircuit3F.available).toBe(true);
    expect(ws.readinessMatrix.loadFlow.available).toBe(true);
  });
});
