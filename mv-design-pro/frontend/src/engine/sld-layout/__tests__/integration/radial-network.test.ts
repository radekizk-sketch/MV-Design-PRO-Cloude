/**
 * Integration Tests: Radial Network (Pattern A)
 *
 * Struktura:
 * SEE → szyna SN → TR SN/nN → szyna nN → odbiorniki
 *
 * Testuje:
 * - Prawidłowe wykrywanie pasm napięciowych
 * - Pozycjonowanie source nad szyną
 * - Transformator między pasmami napięciowymi
 * - Odbiorniki pod szyną nN
 */

import { describe, it, expect } from 'vitest';
import { computeLayout } from '../../index';
import type { LayoutSymbol, LayoutInput } from '../../types';

// =============================================================================
// FIXTURES
// =============================================================================

function createRadialNetwork(): LayoutSymbol[] {
  return [
    // SEE - External source
    {
      id: 'see1',
      elementId: 'elem_see1',
      elementType: 'Source',
      elementName: 'SEE Zasilanie',
      voltageKV: 15,
      connectedToNodeId: 'elem_bus_sn',
      inService: true,
    },
    // Szyna SN
    {
      id: 'bus_sn',
      elementId: 'elem_bus_sn',
      elementType: 'Bus',
      elementName: 'Szyna SN 15kV',
      voltageKV: 15,
      inService: true,
    },
    // Transformator SN/nN
    {
      id: 'tr1',
      elementId: 'elem_tr1',
      elementType: 'TransformerBranch',
      elementName: 'TR 15/0.4kV',
      voltageHV: 15,
      voltageLV: 0.4,
      fromNodeId: 'elem_bus_sn',
      toNodeId: 'elem_bus_nn',
      inService: true,
    },
    // Szyna nN
    {
      id: 'bus_nn',
      elementId: 'elem_bus_nn',
      elementType: 'Bus',
      elementName: 'Szyna nN 0.4kV',
      voltageKV: 0.4,
      inService: true,
    },
    // Odbiornik 1
    {
      id: 'load1',
      elementId: 'elem_load1',
      elementType: 'Load',
      elementName: 'Odbiornik 1',
      voltageKV: 0.4,
      connectedToNodeId: 'elem_bus_nn',
      inService: true,
    },
    // Odbiornik 2
    {
      id: 'load2',
      elementId: 'elem_load2',
      elementType: 'Load',
      elementName: 'Odbiornik 2',
      voltageKV: 0.4,
      connectedToNodeId: 'elem_bus_nn',
      inService: true,
    },
  ];
}

// =============================================================================
// TESTS
// =============================================================================

describe('Radial Network Layout (Pattern A)', () => {
  describe('Voltage Band Detection', () => {
    it('should detect two voltage bands (SN and nN)', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      expect(result.voltageBands.length).toBe(2);

      // SN band (15kV)
      const snBand = result.voltageBands.find((b) => b.nominalVoltageKV === 15);
      expect(snBand).toBeDefined();
      expect(snBand!.category).toBe('SN');

      // nN band (0.4kV)
      const nnBand = result.voltageBands.find((b) => b.nominalVoltageKV === 0.4);
      expect(nnBand).toBeDefined();
      expect(nnBand!.category).toBe('nN');
    });

    it('should order voltage bands from highest to lowest (top to bottom)', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      // SN should be above nN (lower Y value)
      const snBand = result.voltageBands.find((b) => b.nominalVoltageKV === 15)!;
      const nnBand = result.voltageBands.find((b) => b.nominalVoltageKV === 0.4)!;

      expect(snBand.yStart).toBeLessThan(nnBand.yStart);
    });
  });

  describe('Element Positioning', () => {
    it('should position source above SN busbar', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      const sourcePos = result.positions.get('see1');
      const busbarPos = result.positions.get('bus_sn');

      expect(sourcePos).toBeDefined();
      expect(busbarPos).toBeDefined();
      expect(sourcePos!.position.y).toBeLessThan(busbarPos!.position.y);
    });

    it('should position transformer between SN and nN busbars', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      const trPos = result.positions.get('tr1');
      const busSNPos = result.positions.get('bus_sn');
      const busNNPos = result.positions.get('bus_nn');

      expect(trPos).toBeDefined();
      expect(busSNPos).toBeDefined();
      expect(busNNPos).toBeDefined();

      // Transformer Y should be between SN busbar and nN busbar
      expect(trPos!.position.y).toBeGreaterThan(busSNPos!.position.y);
      expect(trPos!.position.y).toBeLessThan(busNNPos!.position.y);
    });

    it('should position loads below nN busbar', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      const busNNPos = result.positions.get('bus_nn');
      const load1Pos = result.positions.get('load1');
      const load2Pos = result.positions.get('load2');

      expect(busNNPos).toBeDefined();
      expect(load1Pos).toBeDefined();
      expect(load2Pos).toBeDefined();

      expect(load1Pos!.position.y).toBeGreaterThan(busNNPos!.position.y);
      expect(load2Pos!.position.y).toBeGreaterThan(busNNPos!.position.y);
    });
  });

  describe('Bay Detection', () => {
    it('should detect at least one feeder bay', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      expect(result.bays.length).toBeGreaterThan(0);

      const feederBays = result.bays.filter((b) => b.bayType === 'feeder');
      expect(feederBays.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Routing', () => {
    it('should create routed edges for all connections', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      // Should have edges for: SEE→bus_sn, tr1(bus_sn→bus_nn), load1→bus_nn, load2→bus_nn
      expect(result.routedEdges.size).toBeGreaterThanOrEqual(4);
    });

    it('should produce orthogonal paths', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      for (const [, edge] of result.routedEdges) {
        // Each path segment should be orthogonal (horizontal or vertical)
        for (let i = 1; i < edge.path.length; i++) {
          const prev = edge.path[i - 1];
          const curr = edge.path[i];

          const isHorizontal = prev.y === curr.y;
          const isVertical = prev.x === curr.x;

          expect(isHorizontal || isVertical).toBe(true);
        }
      }
    });
  });

  describe('Grid Alignment', () => {
    it('should align all positions to grid', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      const gridSize = 20; // Default grid size

      for (const [, pos] of result.positions) {
        expect(pos.position.x % gridSize).toBe(0);
        expect(pos.position.y % gridSize).toBe(0);
      }
    });
  });

  describe('No Overlaps', () => {
    it('should have no significant element overlaps', () => {
      const symbols = createRadialNetwork();
      const result = computeLayout({ symbols });

      const positions = Array.from(result.positions.values());

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];

          // Calculate overlap area
          const overlapX =
            Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) -
            Math.max(a.bounds.x, b.bounds.x);
          const overlapY =
            Math.min(a.bounds.y + a.bounds.height, b.bounds.y + b.bounds.height) -
            Math.max(a.bounds.y, b.bounds.y);
          const overlapArea = Math.max(0, overlapX) * Math.max(0, overlapY);

          // Allow small overlap for connected elements
          expect(overlapArea).toBeLessThan(100);
        }
      }
    });
  });
});
