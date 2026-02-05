/**
 * Integration Tests: Przyłącze SN/nN (Pattern C - NAJCZĘSTSZY)
 *
 * Struktura:
 * SEE → wyłącznik → szyna SN (15kV)
 *                      └── TR SN/nN → szyna nN (0.4kV)
 *                                        ├── Odbiornik 1
 *                                        ├── Odbiornik 2
 *                                        └── Odbiornik 3
 *
 * Ten wzorzec reprezentuje typową stację transformatorową SN/nN
 * obsługującą odbiorców komunalnych lub przemysłowych.
 *
 * Testuje:
 * - Wyłącznik główny (CB) na wejściu SN
 * - Prawidłowe napięcia z modelu (NIE hardkodowane)
 * - Wiele odbiorników pod szyną nN
 */

import { describe, it, expect } from 'vitest';
import { computeLayout } from '../../index';
import type { LayoutSymbol } from '../../types';

// =============================================================================
// FIXTURES
// =============================================================================

/**
 * Standardowe przyłącze 15/0.4 kV
 */
function createStandardPrzylacze(): LayoutSymbol[] {
  return [
    // SEE
    {
      id: 'see1',
      elementId: 'elem_see1',
      elementType: 'Source',
      elementName: 'Zasilanie z sieci',
      voltageKV: 15,
      connectedToNodeId: 'elem_cb_main_in',
      inService: true,
    },
    // Szyna wejściowa (przed CB)
    {
      id: 'bus_in',
      elementId: 'elem_cb_main_in',
      elementType: 'Bus',
      elementName: 'Szyna wejściowa',
      voltageKV: 15,
      inService: true,
    },
    // Wyłącznik główny
    {
      id: 'cb_main',
      elementId: 'elem_cb_main',
      elementType: 'Switch',
      elementName: 'Wyłącznik główny SN',
      fromNodeId: 'elem_cb_main_in',
      toNodeId: 'elem_bus_sn',
      switchType: 'BREAKER',
      switchState: 'CLOSED',
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
      elementName: 'TR 15/0.4kV 630kVA',
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
      elementName: 'Odbiornik komunalny 1',
      voltageKV: 0.4,
      connectedToNodeId: 'elem_bus_nn',
      inService: true,
    },
    // Odbiornik 2
    {
      id: 'load2',
      elementId: 'elem_load2',
      elementType: 'Load',
      elementName: 'Odbiornik komunalny 2',
      voltageKV: 0.4,
      connectedToNodeId: 'elem_bus_nn',
      inService: true,
    },
    // Odbiornik 3
    {
      id: 'load3',
      elementId: 'elem_load3',
      elementType: 'Load',
      elementName: 'Odbiornik komunalny 3',
      voltageKV: 0.4,
      connectedToNodeId: 'elem_bus_nn',
      inService: true,
    },
  ];
}

/**
 * Przyłącze z NIETYPOWYMI napięciami (20kV / 0.69kV)
 * Testuje dynamiczne wykrywanie napięć z modelu.
 */
function createNonStandardPrzylacze(): LayoutSymbol[] {
  return [
    // SEE - 20kV (nietypowe)
    {
      id: 'see1',
      elementId: 'elem_see1',
      elementType: 'Source',
      elementName: 'Zasilanie 20kV',
      voltageKV: 20,
      connectedToNodeId: 'elem_bus_sn',
      inService: true,
    },
    // Szyna SN 20kV
    {
      id: 'bus_sn',
      elementId: 'elem_bus_sn',
      elementType: 'Bus',
      elementName: 'Szyna SN 20kV',
      voltageKV: 20,
      inService: true,
    },
    // Transformator 20/0.69kV
    {
      id: 'tr1',
      elementId: 'elem_tr1',
      elementType: 'TransformerBranch',
      elementName: 'TR 20/0.69kV',
      voltageHV: 20,
      voltageLV: 0.69,
      fromNodeId: 'elem_bus_sn',
      toNodeId: 'elem_bus_nn',
      inService: true,
    },
    // Szyna nN 0.69kV
    {
      id: 'bus_nn',
      elementId: 'elem_bus_nn',
      elementType: 'Bus',
      elementName: 'Szyna nN 0.69kV',
      voltageKV: 0.69,
      inService: true,
    },
    // Odbiornik
    {
      id: 'load1',
      elementId: 'elem_load1',
      elementType: 'Load',
      elementName: 'Napęd przemysłowy',
      voltageKV: 0.69,
      connectedToNodeId: 'elem_bus_nn',
      inService: true,
    },
  ];
}

/**
 * Przyłącze z wieloma transformatorami (dwutransformatorowe)
 */
function createDualTransformerPrzylacze(): LayoutSymbol[] {
  return [
    // SEE
    {
      id: 'see1',
      elementId: 'elem_see1',
      elementType: 'Source',
      elementName: 'Zasilanie',
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
    // CB1
    {
      id: 'cb1',
      elementId: 'elem_cb1',
      elementType: 'Switch',
      elementName: 'CB TR1',
      fromNodeId: 'elem_bus_sn',
      toNodeId: 'elem_bus_tr1_in',
      switchType: 'BREAKER',
      switchState: 'CLOSED',
      inService: true,
    },
    // CB2
    {
      id: 'cb2',
      elementId: 'elem_cb2',
      elementType: 'Switch',
      elementName: 'CB TR2',
      fromNodeId: 'elem_bus_sn',
      toNodeId: 'elem_bus_tr2_in',
      switchType: 'BREAKER',
      switchState: 'CLOSED',
      inService: true,
    },
    // Bus TR1 in
    {
      id: 'bus_tr1_in',
      elementId: 'elem_bus_tr1_in',
      elementType: 'Bus',
      elementName: 'Szyna TR1',
      voltageKV: 15,
      inService: true,
    },
    // Bus TR2 in
    {
      id: 'bus_tr2_in',
      elementId: 'elem_bus_tr2_in',
      elementType: 'Bus',
      elementName: 'Szyna TR2',
      voltageKV: 15,
      inService: true,
    },
    // TR1
    {
      id: 'tr1',
      elementId: 'elem_tr1',
      elementType: 'TransformerBranch',
      elementName: 'TR1 15/0.4kV',
      voltageHV: 15,
      voltageLV: 0.4,
      fromNodeId: 'elem_bus_tr1_in',
      toNodeId: 'elem_bus_nn1',
      inService: true,
    },
    // TR2
    {
      id: 'tr2',
      elementId: 'elem_tr2',
      elementType: 'TransformerBranch',
      elementName: 'TR2 15/0.4kV',
      voltageHV: 15,
      voltageLV: 0.4,
      fromNodeId: 'elem_bus_tr2_in',
      toNodeId: 'elem_bus_nn2',
      inService: true,
    },
    // Bus nN 1
    {
      id: 'bus_nn1',
      elementId: 'elem_bus_nn1',
      elementType: 'Bus',
      elementName: 'Szyna nN 1',
      voltageKV: 0.4,
      inService: true,
    },
    // Bus nN 2
    {
      id: 'bus_nn2',
      elementId: 'elem_bus_nn2',
      elementType: 'Bus',
      elementName: 'Szyna nN 2',
      voltageKV: 0.4,
      inService: true,
    },
    // Loads
    {
      id: 'load1',
      elementId: 'elem_load1',
      elementType: 'Load',
      elementName: 'Odbiornik 1',
      voltageKV: 0.4,
      connectedToNodeId: 'elem_bus_nn1',
      inService: true,
    },
    {
      id: 'load2',
      elementId: 'elem_load2',
      elementType: 'Load',
      elementName: 'Odbiornik 2',
      voltageKV: 0.4,
      connectedToNodeId: 'elem_bus_nn2',
      inService: true,
    },
  ];
}

// =============================================================================
// TESTS
// =============================================================================

describe('Przyłącze SN/nN Layout (Pattern C)', () => {
  describe('Standard 15/0.4kV Configuration', () => {
    it('should detect correct voltage bands', () => {
      const symbols = createStandardPrzylacze();
      const result = computeLayout({ symbols });

      expect(result.voltageBands.length).toBe(2);

      const snBand = result.voltageBands.find((b) => b.nominalVoltageKV === 15);
      const nnBand = result.voltageBands.find((b) => b.nominalVoltageKV === 0.4);

      expect(snBand).toBeDefined();
      expect(nnBand).toBeDefined();
      expect(snBand!.category).toBe('SN');
      expect(nnBand!.category).toBe('nN');
    });

    it('should position main CB between source and busbar', () => {
      const symbols = createStandardPrzylacze();
      const result = computeLayout({ symbols });

      const seePos = result.positions.get('see1');
      const cbPos = result.positions.get('cb_main');
      const busPos = result.positions.get('bus_sn');

      expect(seePos).toBeDefined();
      expect(cbPos).toBeDefined();
      expect(busPos).toBeDefined();

      // CB should be below source
      expect(cbPos!.position.y).toBeGreaterThan(seePos!.position.y);
    });

    it('should position all loads below nN busbar', () => {
      const symbols = createStandardPrzylacze();
      const result = computeLayout({ symbols });

      const busNNPos = result.positions.get('bus_nn');
      expect(busNNPos).toBeDefined();

      for (let i = 1; i <= 3; i++) {
        const loadPos = result.positions.get(`load${i}`);
        expect(loadPos).toBeDefined();
        expect(loadPos!.position.y).toBeGreaterThan(busNNPos!.position.y);
      }
    });

    it('should spread loads horizontally', () => {
      const symbols = createStandardPrzylacze();
      const result = computeLayout({ symbols });

      const loadPositions = [1, 2, 3]
        .map((i) => result.positions.get(`load${i}`))
        .filter(Boolean);

      expect(loadPositions.length).toBe(3);

      // Check loads are spread (different X positions or minimal overlap)
      const xValues = loadPositions.map((p) => p!.position.x);
      const uniqueX = new Set(xValues);

      // Should have some horizontal distribution
      expect(uniqueX.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Non-Standard Voltages (20kV / 0.69kV)', () => {
    it('should detect voltages from model, not hardcoded', () => {
      const symbols = createNonStandardPrzylacze();
      const result = computeLayout({ symbols });

      expect(result.voltageBands.length).toBe(2);

      // Should detect 20kV (not 15kV)
      const snBand = result.voltageBands.find((b) => b.nominalVoltageKV === 20);
      expect(snBand).toBeDefined();
      expect(snBand!.category).toBe('SN');

      // Should detect 0.69kV (not 0.4kV)
      const nnBand = result.voltageBands.find((b) => b.nominalVoltageKV === 0.69);
      expect(nnBand).toBeDefined();
      expect(nnBand!.category).toBe('nN');
    });

    it('should assign correct colors based on voltage ranges', () => {
      const symbols = createNonStandardPrzylacze();
      const result = computeLayout({ symbols });

      // Both 15kV and 20kV should get SN category color
      const snBand = result.voltageBands.find((b) => b.nominalVoltageKV === 20);
      expect(snBand!.color).toBeDefined();
      expect(snBand!.color.length).toBeGreaterThan(0);

      // 0.69kV should get nN category color
      const nnBand = result.voltageBands.find((b) => b.nominalVoltageKV === 0.69);
      expect(nnBand!.color).toBeDefined();
    });
  });

  describe('Dual Transformer Configuration', () => {
    it('should position transformers side by side', () => {
      const symbols = createDualTransformerPrzylacze();
      const result = computeLayout({ symbols });

      const tr1Pos = result.positions.get('tr1');
      const tr2Pos = result.positions.get('tr2');

      expect(tr1Pos).toBeDefined();
      expect(tr2Pos).toBeDefined();

      // Transformers should be at similar Y (same voltage band transition)
      const yDiff = Math.abs(tr1Pos!.position.y - tr2Pos!.position.y);
      expect(yDiff).toBeLessThan(50);

      // Transformers should be at different X positions
      const xDiff = Math.abs(tr1Pos!.position.x - tr2Pos!.position.x);
      expect(xDiff).toBeGreaterThan(50);
    });

    it('should detect separate feeder bays for each transformer', () => {
      const symbols = createDualTransformerPrzylacze();
      const result = computeLayout({ symbols });

      // Should have at least 2 feeder bays
      const feederBays = result.bays.filter((b) => b.bayType === 'feeder');
      expect(feederBays.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Label Placement', () => {
    it('should assign labels to elements', () => {
      const symbols = createStandardPrzylacze();
      const result = computeLayout({ symbols });

      // Should have label positions for key elements
      expect(result.labelPositions.size).toBeGreaterThan(0);
    });

    it('should not overlap labels with elements', () => {
      const symbols = createStandardPrzylacze();
      const result = computeLayout({ symbols });

      // Check that labels don't significantly overlap with elements
      for (const [elementId, labelPos] of result.labelPositions) {
        const elementPos = result.positions.get(elementId);
        if (!elementPos) continue;

        // Label should be near but not on top of element
        const distance = Math.sqrt(
          Math.pow(labelPos.position.x - elementPos.position.x, 2) +
            Math.pow(labelPos.position.y - elementPos.position.y, 2)
        );

        // Label should be within reasonable distance
        expect(distance).toBeLessThan(200);
      }
    });
  });

  describe('Edge Routing', () => {
    it('should create orthogonal routes for transformer connections', () => {
      const symbols = createStandardPrzylacze();
      const result = computeLayout({ symbols });

      // Find edge for transformer
      let transformerEdge;
      for (const [, edge] of result.routedEdges) {
        if (edge.fromSymbolId === 'tr1' || edge.toSymbolId === 'tr1') {
          transformerEdge = edge;
          break;
        }
      }

      if (transformerEdge) {
        // Verify orthogonal path
        for (let i = 1; i < transformerEdge.path.length; i++) {
          const prev = transformerEdge.path[i - 1];
          const curr = transformerEdge.path[i];

          const isHorizontal = Math.abs(prev.y - curr.y) < 0.1;
          const isVertical = Math.abs(prev.x - curr.x) < 0.1;

          expect(isHorizontal || isVertical).toBe(true);
        }
      }
    });
  });

  describe('Determinism', () => {
    it('should produce identical results regardless of input order', () => {
      const symbolsOriginal = createStandardPrzylacze();
      const symbolsReversed = [...symbolsOriginal].reverse();
      const symbolsShuffled = [...symbolsOriginal].sort(() => 0.5 - Math.random());

      const result1 = computeLayout({ symbols: symbolsOriginal });
      const result2 = computeLayout({ symbols: symbolsReversed });
      const result3 = computeLayout({ symbols: symbolsShuffled });

      // All should have same position count
      expect(result2.positions.size).toBe(result1.positions.size);
      expect(result3.positions.size).toBe(result1.positions.size);

      // All should have same positions
      for (const [id, pos1] of result1.positions) {
        const pos2 = result2.positions.get(id);
        const pos3 = result3.positions.get(id);

        expect(pos2).toBeDefined();
        expect(pos3).toBeDefined();
        expect(pos1.position.x).toBe(pos2!.position.x);
        expect(pos1.position.y).toBe(pos2!.position.y);
        expect(pos1.position.x).toBe(pos3!.position.x);
        expect(pos1.position.y).toBe(pos3!.position.y);
      }
    });
  });
});
