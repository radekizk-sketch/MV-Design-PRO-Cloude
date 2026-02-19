/**
 * SLD Label Layer — §8 UX 10/10 Tests
 *
 * Tests:
 * - Label generation per mode (Minimalny/Techniczny/Analityczny)
 * - Deterministic output (same input → same labels)
 * - Empty labels for symbols without data
 * - Units always present in Techniczny/Analityczny
 * - Polish labels only
 */

import { describe, it, expect } from 'vitest';
import {
  buildMinimalLabels,
  buildTechnicalLabels,
  buildAnalyticalLabels,
  buildLabelsForSymbol,
  LABEL_MODE_LABELS,
} from '../sldLabelLayer';
import type { LabelMode, BranchResultData, BusResultData } from '../sldLabelLayer';
import type { AnySldSymbol } from '../../sld-editor/types';

// =============================================================================
// Mock Symbols
// =============================================================================

function makeSymbol(overrides: Partial<AnySldSymbol> & { elementType: string; elementId: string }): AnySldSymbol {
  return {
    position: { x: 0, y: 0 },
    rotation: 0,
    ...overrides,
  } as unknown as AnySldSymbol;
}

// =============================================================================
// Tests
// =============================================================================

describe('SLD Label Layer — §8 UX 10/10', () => {
  describe('MINIMALNY mode', () => {
    it('returns NOP label for open switch', () => {
      const symbol = makeSymbol({
        elementType: 'Switch',
        elementId: 'sw-001',
        switchState: 'OPEN',
      });
      const labels = buildMinimalLabels(symbol);
      expect(labels).toHaveLength(1);
      expect(labels[0].text).toBe('NOP');
    });

    it('returns WYŁ. label for out-of-service element', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        inService: false,
      });
      const labels = buildMinimalLabels(symbol);
      expect(labels).toHaveLength(1);
      expect(labels[0].text).toBe('WYŁ.');
    });

    it('returns empty for normal in-service elements', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
      });
      const labels = buildMinimalLabels(symbol);
      expect(labels).toHaveLength(0);
    });
  });

  describe('TECHNICZNY mode', () => {
    it('shows cable type and length for LineBranch', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        branchType: 'CABLE',
        length_m: 350,
      });
      const labels = buildTechnicalLabels(symbol);
      expect(labels.length).toBeGreaterThanOrEqual(1);
      expect(labels[0].text).toBe('Kab.');
      const lengthLabel = labels.find((l) => l.text.includes('m'));
      expect(lengthLabel).toBeDefined();
      expect(lengthLabel!.text).toBe('350 m');
    });

    it('shows loading percentage with color', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        branchType: 'CABLE',
      });
      const branchResult: BranchResultData = { loading_pct: 85 };
      const labels = buildTechnicalLabels(symbol, branchResult);
      const loadLabel = labels.find((l) => l.text.includes('%'));
      expect(loadLabel).toBeDefined();
      expect(loadLabel!.text).toBe('85%');
      // High loading (>80%) should be red
      expect(loadLabel!.color).toBe('#dc2626');
    });

    it('shows voltage for Bus', () => {
      const symbol = makeSymbol({
        elementType: 'Bus',
        elementId: 'bus-001',
      });
      const busResult: BusResultData = { u_kv: 14.85 };
      const labels = buildTechnicalLabels(symbol, undefined, busResult);
      expect(labels).toHaveLength(1);
      expect(labels[0].text).toBe('14.85 kV');
    });

    it('shows transformer loading', () => {
      const symbol = makeSymbol({
        elementType: 'TransformerBranch',
        elementId: 'tr-001',
      });
      const branchResult: BranchResultData = { loading_pct: 65 };
      const labels = buildTechnicalLabels(symbol, branchResult);
      const trLabel = labels.find((l) => l.text.includes('TR'));
      expect(trLabel).toBeDefined();
      expect(trLabel!.text).toBe('TR 65%');
    });

    it('shows NOP for open switch', () => {
      const symbol = makeSymbol({
        elementType: 'Switch',
        elementId: 'sw-001',
        switchState: 'OPEN',
      });
      const labels = buildTechnicalLabels(symbol);
      expect(labels).toHaveLength(1);
      expect(labels[0].text).toBe('NOP');
    });
  });

  describe('ANALITYCZNY mode', () => {
    it('shows impedance for LineBranch', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        r_ohm: 0.125,
        x_ohm: 0.088,
      });
      const labels = buildAnalyticalLabels(symbol);
      expect(labels).toHaveLength(1);
      expect(labels[0].text).toContain('Z =');
      expect(labels[0].text).toContain('Ω');
    });

    it('shows power flow direction', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        r_ohm: 0.1,
        x_ohm: 0.1,
      });
      const branchResult: BranchResultData = {
        p_kw: 150.5,
        q_kvar: -30.2,
      };
      const labels = buildAnalyticalLabels(symbol, branchResult);
      const pLabel = labels.find((l) => l.text.startsWith('P'));
      expect(pLabel).toBeDefined();
      expect(pLabel!.text).toContain('kW');

      const qLabel = labels.find((l) => l.text.startsWith('Q'));
      expect(qLabel).toBeDefined();
      expect(qLabel!.text).toContain('kvar');
    });

    it('shows losses', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        r_ohm: 0.1,
        x_ohm: 0.1,
      });
      const branchResult: BranchResultData = { losses_kw: 2.45 };
      const labels = buildAnalyticalLabels(symbol, branchResult);
      const lossLabel = labels.find((l) => l.text.includes('ΔP'));
      expect(lossLabel).toBeDefined();
      expect(lossLabel!.text).toBe('ΔP = 2.45 kW');
    });

    it('shows protection settings', () => {
      const symbol = makeSymbol({
        elementType: 'Switch',
        elementId: 'sw-001',
      });
      const protSettings = { i_pickup_a: 250, t_delay_s: 0.3 };
      const labels = buildAnalyticalLabels(symbol, undefined, undefined, protSettings);
      expect(labels).toHaveLength(1);
      expect(labels[0].text).toContain('I>=250 A');
      expect(labels[0].text).toContain('t=0.30 s');
    });

    it('shows voltage with p.u. for Bus', () => {
      const symbol = makeSymbol({
        elementType: 'Bus',
        elementId: 'bus-001',
      });
      const busResult: BusResultData = { u_kv: 14.25, u_pu: 0.95 };
      const labels = buildAnalyticalLabels(symbol, undefined, busResult);
      expect(labels).toHaveLength(1);
      expect(labels[0].text).toContain('kV');
      expect(labels[0].text).toContain('p.u.');
    });
  });

  describe('buildLabelsForSymbol dispatcher', () => {
    const symbol = makeSymbol({
      elementType: 'LineBranch',
      elementId: 'line-001',
      branchType: 'CABLE',
      switchState: 'CLOSED',
    });

    it('dispatches to MINIMALNY builder', () => {
      const labels = buildLabelsForSymbol('MINIMALNY', symbol);
      // LineBranch with no special state → empty
      expect(labels).toHaveLength(0);
    });

    it('dispatches to TECHNICZNY builder', () => {
      const labels = buildLabelsForSymbol('TECHNICZNY', symbol);
      expect(labels.length).toBeGreaterThanOrEqual(1);
      expect(labels[0].text).toBe('Kab.');
    });

    it('dispatches to ANALITYCZNY builder', () => {
      const symbolWithZ = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        r_ohm: 0.1,
        x_ohm: 0.1,
      });
      const labels = buildLabelsForSymbol('ANALITYCZNY', symbolWithZ);
      expect(labels.length).toBeGreaterThanOrEqual(1);
      expect(labels[0].text).toContain('Z =');
    });
  });

  describe('Label mode labels (Polish)', () => {
    it('all modes have Polish labels', () => {
      const modes: LabelMode[] = ['MINIMALNY', 'TECHNICZNY', 'ANALITYCZNY'];
      for (const mode of modes) {
        expect(LABEL_MODE_LABELS[mode]).toBeDefined();
        expect(LABEL_MODE_LABELS[mode].length).toBeGreaterThan(0);
      }
    });
  });

  describe('Determinism', () => {
    it('same input produces identical labels', () => {
      const symbol = makeSymbol({
        elementType: 'LineBranch',
        elementId: 'line-001',
        branchType: 'CABLE',
        length_m: 200,
        r_ohm: 0.1,
        x_ohm: 0.08,
      });
      const result: BranchResultData = { loading_pct: 72, p_kw: 100 };

      const labels1 = buildLabelsForSymbol('TECHNICZNY', symbol, result);
      const labels2 = buildLabelsForSymbol('TECHNICZNY', symbol, result);
      const labels3 = buildLabelsForSymbol('TECHNICZNY', symbol, result);

      expect(labels1).toEqual(labels2);
      expect(labels2).toEqual(labels3);
    });
  });
});
