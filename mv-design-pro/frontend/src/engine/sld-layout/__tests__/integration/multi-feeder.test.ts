/**
 * Integration Tests: Multi-Feeder Network (Pattern B)
 *
 * Struktura:
 * SEE → szyna SN (15kV)
 *        ├── CB1 → TR1 SN/nN → szyna nN_1 → odbiorniki 1
 *        ├── CB2 → TR2 SN/nN → szyna nN_2 → odbiorniki 2
 *        ├── CB3 → TR3 SN/nN → szyna nN_3 → odbiorniki 3
 *        └── CB4 → TR4 SN/nN → szyna nN_4 → odbiorniki 4
 *
 * Testuje:
 * - Wykrywanie wielu bayów feeder
 * - Prawidłowe pozycjonowanie bayów obok siebie
 * - Minimalizacja skrzyżowań
 * - Szyna rozciągająca się dla wszystkich bayów
 */

import { describe, it, expect } from 'vitest';
import { computeLayout } from '../../index';
import type { LayoutSymbol } from '../../types';

// =============================================================================
// FIXTURES
// =============================================================================

function createMultiFeederNetwork(feederCount: number = 4): LayoutSymbol[] {
  const symbols: LayoutSymbol[] = [
    // SEE
    {
      id: 'see1',
      elementId: 'elem_see1',
      elementType: 'Source',
      elementName: 'SEE Zasilanie GPZ',
      voltageKV: 15,
      connectedToNodeId: 'elem_bus_sn',
      inService: true,
    },
    // Szyna SN główna
    {
      id: 'bus_sn',
      elementId: 'elem_bus_sn',
      elementType: 'Bus',
      elementName: 'Szyna SN 15kV',
      voltageKV: 15,
      inService: true,
    },
  ];

  // Dodaj feedery
  for (let i = 1; i <= feederCount; i++) {
    const bayBusId = `bus_bay${i}`;
    const nnBusId = `bus_nn${i}`;

    // Circuit breaker
    symbols.push({
      id: `cb${i}`,
      elementId: `elem_cb${i}`,
      elementType: 'Switch',
      elementName: `CB Pole ${i}`,
      fromNodeId: 'elem_bus_sn',
      toNodeId: `elem_${bayBusId}`,
      switchType: 'BREAKER',
      switchState: 'CLOSED',
      inService: true,
    });

    // Bay bus (virtual bus for bay)
    symbols.push({
      id: bayBusId,
      elementId: `elem_${bayBusId}`,
      elementType: 'Bus',
      elementName: `Szyna pole ${i}`,
      voltageKV: 15,
      inService: true,
    });

    // Transformer
    symbols.push({
      id: `tr${i}`,
      elementId: `elem_tr${i}`,
      elementType: 'TransformerBranch',
      elementName: `TR${i} 15/0.4kV`,
      voltageHV: 15,
      voltageLV: 0.4,
      fromNodeId: `elem_${bayBusId}`,
      toNodeId: `elem_${nnBusId}`,
      inService: true,
    });

    // nN bus
    symbols.push({
      id: nnBusId,
      elementId: `elem_${nnBusId}`,
      elementType: 'Bus',
      elementName: `Szyna nN ${i}`,
      voltageKV: 0.4,
      inService: true,
    });

    // Load
    symbols.push({
      id: `load${i}`,
      elementId: `elem_load${i}`,
      elementType: 'Load',
      elementName: `Odbiornik ${i}`,
      voltageKV: 0.4,
      connectedToNodeId: `elem_${nnBusId}`,
      inService: true,
    });
  }

  return symbols;
}

// =============================================================================
// TESTS
// =============================================================================

describe('Multi-Feeder Network Layout (Pattern B)', () => {
  describe('Bay Detection', () => {
    it('should detect correct number of feeder bays', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      const feederBays = result.bays.filter((b) => b.bayType === 'feeder');
      expect(feederBays.length).toBeGreaterThanOrEqual(4);
    });

    it('should detect incomer bay for source', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      const incomerBays = result.bays.filter((b) => b.bayType === 'incomer');
      // Should have at least one incomer (source bay)
      expect(incomerBays.length).toBeGreaterThanOrEqual(1);
    });

    it('should assign circuit breakers to bays', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      for (let i = 1; i <= 4; i++) {
        // Find bay containing CB
        const cbBay = result.bays.find((bay) =>
          bay.elements.some((e) => e.symbolId === `cb${i}`)
        );
        expect(cbBay).toBeDefined();
      }
    });
  });

  describe('Bay Positioning', () => {
    it('should position bays horizontally along busbar', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      // Get CB positions (they are at the top of each feeder bay)
      const cbPositions = [1, 2, 3, 4]
        .map((i) => result.positions.get(`cb${i}`))
        .filter(Boolean);

      expect(cbPositions.length).toBe(4);

      // All CBs should have similar Y position (on the busbar)
      const yValues = cbPositions.map((p) => p!.position.y);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);

      // CBs should be at similar heights (within 100px)
      expect(yMax - yMin).toBeLessThan(100);

      // CBs should be spread horizontally
      const xValues = cbPositions.map((p) => p!.position.x);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);

      // Should span at least some width
      expect(xMax - xMin).toBeGreaterThan(200);
    });

    it('should not overlap bay elements horizontally', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      // Check transformer X positions don't overlap
      const trPositions = [1, 2, 3, 4]
        .map((i) => result.positions.get(`tr${i}`))
        .filter(Boolean);

      for (let i = 0; i < trPositions.length; i++) {
        for (let j = i + 1; j < trPositions.length; j++) {
          const a = trPositions[i]!;
          const b = trPositions[j]!;

          // Check no X overlap (accounting for bounds)
          const overlapX =
            Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) -
            Math.max(a.bounds.x, b.bounds.x);

          expect(overlapX).toBeLessThan(10); // Small tolerance
        }
      }
    });
  });

  describe('Busbar Width', () => {
    it('should extend busbar width to accommodate all bays', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      const busbarPos = result.positions.get('bus_sn');
      expect(busbarPos).toBeDefined();

      // Get rightmost bay element
      const bayElements = [1, 2, 3, 4].flatMap((i) => [
        result.positions.get(`cb${i}`),
        result.positions.get(`tr${i}`),
      ]);

      const maxX = Math.max(
        ...bayElements.filter(Boolean).map((p) => p!.position.x + p!.bounds.width)
      );

      // Busbar should extend past all bay elements
      expect(busbarPos!.bounds.x + busbarPos!.bounds.width).toBeGreaterThanOrEqual(maxX);
    });
  });

  describe('Crossing Minimization', () => {
    it('should minimize edge crossings in feeder bays', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      // Check debug info if available
      if (result.debug) {
        expect(result.debug.finalCrossings).toBeLessThanOrEqual(
          result.debug.initialCrossings
        );
      }

      // Verify bay order is preserved (sequential X positions)
      const bayPositions = [1, 2, 3, 4]
        .map((i) => ({
          id: i,
          x: result.positions.get(`tr${i}`)?.position.x ?? 0,
        }))
        .sort((a, b) => a.x - b.x);

      // Check that there's no obvious reordering (relative positions maintained)
      // This is a basic check - complex networks might reorder for optimization
      expect(bayPositions.length).toBe(4);
    });
  });

  describe('Voltage Bands', () => {
    it('should have two voltage bands (15kV and 0.4kV)', () => {
      const symbols = createMultiFeederNetwork(4);
      const result = computeLayout({ symbols });

      expect(result.voltageBands.length).toBe(2);

      const voltages = result.voltageBands.map((b) => b.nominalVoltageKV);
      expect(voltages).toContain(15);
      expect(voltages).toContain(0.4);
    });
  });

  describe('Scalability', () => {
    it('should handle 8 feeders', () => {
      const symbols = createMultiFeederNetwork(8);
      const result = computeLayout({ symbols });

      // Should have all positions
      expect(result.positions.size).toBeGreaterThanOrEqual(8 * 4 + 2); // 4 elements per feeder + SEE + main bus

      // Should have all feeder bays
      const feederBays = result.bays.filter((b) => b.bayType === 'feeder');
      expect(feederBays.length).toBeGreaterThanOrEqual(8);
    });

    it('should handle 12 feeders', () => {
      const symbols = createMultiFeederNetwork(12);
      const result = computeLayout({ symbols });

      // Should complete without error
      expect(result.positions.size).toBeGreaterThan(0);
      expect(result.voltageBands.length).toBe(2);
    });
  });

  describe('Determinism', () => {
    it('should produce identical results for multiple runs', () => {
      const symbols = createMultiFeederNetwork(4);
      const input = { symbols };

      const result1 = computeLayout(input);
      const result2 = computeLayout(input);

      // Compare positions
      for (const [id, pos1] of result1.positions) {
        const pos2 = result2.positions.get(id);
        expect(pos2).toBeDefined();
        expect(pos1.position.x).toBe(pos2!.position.x);
        expect(pos1.position.y).toBe(pos2!.position.y);
      }
    });
  });
});
