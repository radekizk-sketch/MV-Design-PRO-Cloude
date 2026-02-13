/**
 * Load Flow Overlay Adapter Tests
 *
 * INVARIANTS VERIFIED:
 * - Deterministic output (same input → same output)
 * - Sort by element_id (lexicographic)
 * - Token-only (no hex colors)
 * - No physics calculations (severity from interpretation only)
 * - Stable element ordering
 * - All three modes produce valid OverlayPayloadV1
 */

import { describe, it, expect } from 'vitest';
import { buildLoadFlowOverlay } from '../LoadFlowOverlayAdapter';
import type { PowerFlowResultV1, PowerFlowInterpretation } from '../../power-flow-results/types';
import type { OverlayPayloadV1 } from '../overlayTypes';

// =============================================================================
// Test Data
// =============================================================================

function makeResults(): PowerFlowResultV1 {
  return {
    result_version: '1.0',
    converged: true,
    iterations_count: 5,
    tolerance_used: 1e-6,
    base_mva: 100.0,
    slack_bus_id: 'bus-slack',
    bus_results: [
      { bus_id: 'bus-c', v_pu: 0.93, angle_deg: -3.5, p_injected_mw: 10, q_injected_mvar: 5 },
      { bus_id: 'bus-a', v_pu: 1.0, angle_deg: 0, p_injected_mw: -15, q_injected_mvar: -8 },
      { bus_id: 'bus-b', v_pu: 0.98, angle_deg: -1.2, p_injected_mw: 5, q_injected_mvar: 3 },
    ],
    branch_results: [
      {
        branch_id: 'branch-b',
        p_from_mw: 7.5, q_from_mvar: 3.2,
        p_to_mw: -7.4, q_to_mvar: -3.1,
        losses_p_mw: 0.1, losses_q_mvar: 0.1,
      },
      {
        branch_id: 'branch-a',
        p_from_mw: 15, q_from_mvar: 8,
        p_to_mw: -14.8, q_to_mvar: -7.8,
        losses_p_mw: 0.2, losses_q_mvar: 0.2,
      },
      {
        branch_id: 'branch-c',
        p_from_mw: 0, q_from_mvar: 0,
        p_to_mw: 0, q_to_mvar: 0,
        losses_p_mw: 0, losses_q_mvar: 0,
      },
    ],
    summary: {
      total_losses_p_mw: 0.3,
      total_losses_q_mvar: 0.3,
      min_v_pu: 0.93,
      max_v_pu: 1.0,
      slack_p_mw: -15,
      slack_q_mvar: -8,
    },
  };
}

function makeInterpretation(): PowerFlowInterpretation {
  return {
    context: null,
    voltage_findings: [
      {
        bus_id: 'bus-c',
        v_pu: 0.93,
        deviation_pct: 7.0,
        severity: 'HIGH',
        description_pl: 'Napięcie poniżej normy',
        evidence_ref: 'bus-c',
      },
      {
        bus_id: 'bus-b',
        v_pu: 0.98,
        deviation_pct: 2.0,
        severity: 'WARN',
        description_pl: 'Lekkie odchylenie napięcia',
        evidence_ref: 'bus-b',
      },
      {
        bus_id: 'bus-a',
        v_pu: 1.0,
        deviation_pct: 0.0,
        severity: 'INFO',
        description_pl: 'Napięcie w normie',
        evidence_ref: 'bus-a',
      },
    ],
    branch_findings: [
      {
        branch_id: 'branch-a',
        loading_pct: 85,
        losses_p_mw: 0.2,
        losses_q_mvar: 0.2,
        severity: 'WARN',
        description_pl: 'Wysokie obciążenie',
        evidence_ref: 'branch-a',
      },
      {
        branch_id: 'branch-b',
        loading_pct: 40,
        losses_p_mw: 0.1,
        losses_q_mvar: 0.1,
        severity: 'INFO',
        description_pl: 'Obciążenie w normie',
        evidence_ref: 'branch-b',
      },
    ],
    summary: {
      total_voltage_findings: 3,
      total_branch_findings: 2,
      high_count: 1,
      warn_count: 1,
      info_count: 3,
      top_issues: [],
    },
    trace: {
      interpretation_id: 'interp-1',
      power_flow_run_id: 'run-lf-1',
      created_at: '2025-01-15T10:00:00Z',
      thresholds: {
        voltage_info_max_pct: 2,
        voltage_warn_max_pct: 5,
        branch_loading_info_max_pct: null,
        branch_loading_warn_max_pct: null,
      },
      rules_applied: ['voltage_deviation', 'branch_loading'],
      data_sources: ['PowerFlowResultV1'],
      interpretation_version: '1.0',
    },
  };
}

// =============================================================================
// Tests: Voltage Overlay
// =============================================================================

describe('buildLoadFlowOverlay — voltage mode', () => {
  it('produces valid OverlayPayloadV1', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'voltage', 'run-1');

    expect(result.run_id).toBe('run-1');
    expect(result.analysis_type).toBe('LOAD_FLOW');
    expect(result.elements).toBeInstanceOf(Array);
    expect(result.legend).toBeInstanceOf(Array);
  });

  it('sorts elements by bus_id (lexicographic)', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'voltage', 'run-1');

    const refs = result.elements.map((e) => e.element_ref);
    expect(refs).toEqual(['bus-a', 'bus-b', 'bus-c']);
  });

  it('maps severity from interpretation to visual_state', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'voltage', 'run-1');

    const stateMap = new Map(result.elements.map((e) => [e.element_ref, e.visual_state]));
    expect(stateMap.get('bus-a')).toBe('OK');       // INFO → OK
    expect(stateMap.get('bus-b')).toBe('WARNING');   // WARN → WARNING
    expect(stateMap.get('bus-c')).toBe('CRITICAL');  // HIGH → CRITICAL
  });

  it('maps severity to semantic color tokens (not hex)', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'voltage', 'run-1');

    for (const element of result.elements) {
      // No hex colors
      expect(element.color_token).not.toMatch(/^#/);
      expect(['ok', 'warning', 'critical', 'inactive']).toContain(element.color_token);
    }
  });

  it('includes v_pu and angle_deg as numeric badges', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'voltage', 'run-1');

    for (const element of result.elements) {
      expect(element.numeric_badges).toHaveProperty('v_pu');
      expect(element.numeric_badges).toHaveProperty('angle_deg');
    }
  });

  it('defaults to OK when no interpretation available', () => {
    const result = buildLoadFlowOverlay(makeResults(), null, 'voltage', 'run-1');

    for (const element of result.elements) {
      expect(element.visual_state).toBe('OK');
      expect(element.color_token).toBe('ok');
    }
  });

  it('is deterministic (same input → identical output)', () => {
    const results = makeResults();
    const interp = makeInterpretation();

    const a = buildLoadFlowOverlay(results, interp, 'voltage', 'run-1');
    const b = buildLoadFlowOverlay(results, interp, 'voltage', 'run-1');

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// =============================================================================
// Tests: Loading Overlay
// =============================================================================

describe('buildLoadFlowOverlay — loading mode', () => {
  it('produces valid OverlayPayloadV1 for branches', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'loading', 'run-1');

    expect(result.run_id).toBe('run-1');
    expect(result.analysis_type).toBe('LOAD_FLOW');
    expect(result.elements.length).toBe(3);
  });

  it('sorts elements by branch_id (lexicographic)', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'loading', 'run-1');

    const refs = result.elements.map((e) => e.element_ref);
    expect(refs).toEqual(['branch-a', 'branch-b', 'branch-c']);
  });

  it('maps branch severity from interpretation', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'loading', 'run-1');

    const stateMap = new Map(result.elements.map((e) => [e.element_ref, e.visual_state]));
    expect(stateMap.get('branch-a')).toBe('WARNING');  // WARN
    expect(stateMap.get('branch-b')).toBe('OK');       // INFO
    expect(stateMap.get('branch-c')).toBe('OK');       // no finding → default OK
  });

  it('includes loading_pct from interpretation findings', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'loading', 'run-1');

    const branchA = result.elements.find((e) => e.element_ref === 'branch-a');
    expect(branchA?.numeric_badges.loading_pct).toBe(85);

    const branchC = result.elements.find((e) => e.element_ref === 'branch-c');
    expect(branchC?.numeric_badges.loading_pct).toBeNull();
  });

  it('uses only semantic tokens (no hex)', () => {
    const result = buildLoadFlowOverlay(makeResults(), makeInterpretation(), 'loading', 'run-1');

    for (const element of result.elements) {
      expect(element.color_token).not.toMatch(/^#/);
      expect(element.stroke_token).not.toMatch(/^#/);
    }
  });
});

// =============================================================================
// Tests: Flow Direction Overlay
// =============================================================================

describe('buildLoadFlowOverlay — flow mode', () => {
  it('produces valid OverlayPayloadV1 for branches', () => {
    const result = buildLoadFlowOverlay(makeResults(), null, 'flow', 'run-1');

    expect(result.run_id).toBe('run-1');
    expect(result.elements.length).toBe(3);
  });

  it('sorts elements by branch_id (lexicographic)', () => {
    const result = buildLoadFlowOverlay(makeResults(), null, 'flow', 'run-1');

    const refs = result.elements.map((e) => e.element_ref);
    expect(refs).toEqual(['branch-a', 'branch-b', 'branch-c']);
  });

  it('marks branches with flow as OK with pulse animation', () => {
    const result = buildLoadFlowOverlay(makeResults(), null, 'flow', 'run-1');

    const branchA = result.elements.find((e) => e.element_ref === 'branch-a');
    expect(branchA?.visual_state).toBe('OK');
    expect(branchA?.animation_token).toBe('pulse');
  });

  it('marks branches without flow as INACTIVE', () => {
    const result = buildLoadFlowOverlay(makeResults(), null, 'flow', 'run-1');

    const branchC = result.elements.find((e) => e.element_ref === 'branch-c');
    expect(branchC?.visual_state).toBe('INACTIVE');
    expect(branchC?.animation_token).toBeNull();
    expect(branchC?.color_token).toBe('inactive');
  });

  it('includes P and Q flow values as badges', () => {
    const result = buildLoadFlowOverlay(makeResults(), null, 'flow', 'run-1');

    const branchA = result.elements.find((e) => e.element_ref === 'branch-a');
    expect(branchA?.numeric_badges.p_from_mw).toBe(15);
    expect(branchA?.numeric_badges.q_from_mvar).toBe(8);
    expect(branchA?.numeric_badges.p_to_mw).toBe(-14.8);
    expect(branchA?.numeric_badges.q_to_mvar).toBe(-7.8);
  });

  it('is deterministic', () => {
    const results = makeResults();
    const a = buildLoadFlowOverlay(results, null, 'flow', 'run-1');
    const b = buildLoadFlowOverlay(results, null, 'flow', 'run-1');

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// =============================================================================
// Tests: Cross-mode invariants
// =============================================================================

describe('buildLoadFlowOverlay — cross-mode invariants', () => {
  it('all modes produce analysis_type LOAD_FLOW', () => {
    const results = makeResults();
    const interp = makeInterpretation();

    for (const mode of ['voltage', 'loading', 'flow'] as const) {
      const overlay = buildLoadFlowOverlay(results, interp, mode, 'run-1');
      expect(overlay.analysis_type).toBe('LOAD_FLOW');
    }
  });

  it('all modes bind to the provided run_id', () => {
    const results = makeResults();
    const interp = makeInterpretation();

    for (const mode of ['voltage', 'loading', 'flow'] as const) {
      const overlay = buildLoadFlowOverlay(results, interp, mode, 'run-xyz');
      expect(overlay.run_id).toBe('run-xyz');
    }
  });

  it('no mode produces hex color tokens', () => {
    const results = makeResults();
    const interp = makeInterpretation();

    for (const mode of ['voltage', 'loading', 'flow'] as const) {
      const overlay = buildLoadFlowOverlay(results, interp, mode, 'run-1');
      for (const element of overlay.elements) {
        expect(element.color_token).not.toMatch(/^#/);
        expect(element.stroke_token).not.toMatch(/^#/);
      }
    }
  });

  it('all legend entries use semantic tokens', () => {
    const results = makeResults();
    const interp = makeInterpretation();

    for (const mode of ['voltage', 'loading', 'flow'] as const) {
      const overlay = buildLoadFlowOverlay(results, interp, mode, 'run-1');
      for (const entry of overlay.legend) {
        expect(entry.color_token).not.toMatch(/^#/);
        expect(typeof entry.label).toBe('string');
        expect(entry.label.length).toBeGreaterThan(0);
      }
    }
  });
});
