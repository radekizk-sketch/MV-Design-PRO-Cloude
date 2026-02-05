/**
 * Tests for Layout Determinism
 *
 * ZASADY ŻELAZNE:
 * D1: Brak Math.random()
 * D2: Brak Date.now() jako seed
 * D3: Brak iteration order z Set/Map — zawsze sortuj
 * D4: Brak zależności od DOM layout
 * D5: Tiebreaker = element.id (string sort)
 * D6: Floating point: Math.round(x * 100) / 100
 * D7: Test: computeLayout(model) === computeLayout(model) BIT-PO-BICIE
 */

import { describe, it, expect } from 'vitest';
import { computeLayout, verifyDeterminism } from '../index';
import type { LayoutSymbol, LayoutInput, LayoutResult } from '../types';

// =============================================================================
// FIXTURES
// =============================================================================

function createBus(id: string, voltageKV: number): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Bus',
    elementName: `Szyna ${id}`,
    voltageKV,
    inService: true,
  };
}

function createTransformer(
  id: string,
  voltageHV: number,
  voltageLV: number,
  fromBusId: string,
  toBusId: string
): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'TransformerBranch',
    elementName: `TR ${id}`,
    voltageHV,
    voltageLV,
    fromNodeId: `elem_${fromBusId}`,
    toNodeId: `elem_${toBusId}`,
    inService: true,
  };
}

function createSwitch(id: string, fromBusId: string, toBusId: string): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Switch',
    elementName: `CB ${id}`,
    fromNodeId: `elem_${fromBusId}`,
    toNodeId: `elem_${toBusId}`,
    switchType: 'BREAKER',
    switchState: 'CLOSED',
    inService: true,
  };
}

function createSource(id: string, voltageKV: number, connectedBusId: string): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Source',
    elementName: `SEE ${id}`,
    voltageKV,
    connectedToNodeId: `elem_${connectedBusId}`,
    inService: true,
  };
}

function createLoad(id: string, voltageKV: number, connectedBusId: string): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'Load',
    elementName: `Odb ${id}`,
    voltageKV,
    connectedToNodeId: `elem_${connectedBusId}`,
    inService: true,
  };
}

function createLine(id: string, fromBusId: string, toBusId: string): LayoutSymbol {
  return {
    id,
    elementId: `elem_${id}`,
    elementType: 'LineBranch',
    elementName: `WL ${id}`,
    fromNodeId: `elem_${fromBusId}`,
    toNodeId: `elem_${toBusId}`,
    branchType: 'CABLE',
    inService: true,
  };
}

// =============================================================================
// NETWORK FIXTURES
// =============================================================================

function createSimpleRadialNetwork(): LayoutSymbol[] {
  return [
    createSource('see1', 15, 'bus_sn'),
    createBus('bus_sn', 15),
    createTransformer('tr1', 15, 0.4, 'bus_sn', 'bus_nn'),
    createBus('bus_nn', 0.4),
    createLoad('odb1', 0.4, 'bus_nn'),
  ];
}

function createMultiFeederNetwork(): LayoutSymbol[] {
  const symbols: LayoutSymbol[] = [
    createSource('see1', 15, 'bus_sn'),
    createBus('bus_sn', 15),
  ];

  // 4 feedery
  for (let i = 1; i <= 4; i++) {
    const bayBusId = `bus_bay${i}`;
    symbols.push(createSwitch(`cb${i}`, 'bus_sn', bayBusId));
    symbols.push(createBus(bayBusId, 15));
    symbols.push(createTransformer(`tr${i}`, 15, 0.4, bayBusId, `bus_nn${i}`));
    symbols.push(createBus(`bus_nn${i}`, 0.4));
    symbols.push(createLoad(`odb${i}`, 0.4, `bus_nn${i}`));
  }

  return symbols;
}

function createComplexNetwork(): LayoutSymbol[] {
  const symbols: LayoutSymbol[] = [];

  // GPZ
  symbols.push(createSource('gpz', 110, 'bus_wn'));
  symbols.push(createBus('bus_wn', 110));

  // 2 transformatory WN/SN
  for (let i = 1; i <= 2; i++) {
    symbols.push(createTransformer(`tr_wn_sn_${i}`, 110, 15, 'bus_wn', `bus_sn_${i}`));
    symbols.push(createBus(`bus_sn_${i}`, 15));
  }

  // 3 feedery na każdej szynie SN
  for (let sn = 1; sn <= 2; sn++) {
    for (let f = 1; f <= 3; f++) {
      const feederId = `f${sn}_${f}`;
      symbols.push(createSwitch(`cb_${feederId}`, `bus_sn_${sn}`, `bus_${feederId}`));
      symbols.push(createBus(`bus_${feederId}`, 15));
      symbols.push(createLine(`wl_${feederId}`, `bus_${feederId}`, `st_${feederId}_sn`));
      symbols.push(createBus(`st_${feederId}_sn`, 15));
      symbols.push(createTransformer(`tr_${feederId}`, 15, 0.4, `st_${feederId}_sn`, `st_${feederId}_nn`));
      symbols.push(createBus(`st_${feederId}_nn`, 0.4));
      symbols.push(createLoad(`odb_${feederId}`, 0.4, `st_${feederId}_nn`));
    }
  }

  return symbols;
}

// =============================================================================
// COMPARISON HELPERS
// =============================================================================

function layoutsAreIdentical(a: LayoutResult, b: LayoutResult): boolean {
  // Porównaj pozycje
  if (a.positions.size !== b.positions.size) {
    console.error('Different position count');
    return false;
  }

  for (const [id, posA] of a.positions) {
    const posB = b.positions.get(id);
    if (!posB) {
      console.error(`Missing position for ${id}`);
      return false;
    }

    if (posA.position.x !== posB.position.x || posA.position.y !== posB.position.y) {
      console.error(`Different position for ${id}: (${posA.position.x}, ${posA.position.y}) vs (${posB.position.x}, ${posB.position.y})`);
      return false;
    }
  }

  // Porównaj voltage bands
  if (a.voltageBands.length !== b.voltageBands.length) {
    console.error('Different voltage band count');
    return false;
  }

  for (let i = 0; i < a.voltageBands.length; i++) {
    if (a.voltageBands[i].id !== b.voltageBands[i].id) {
      console.error(`Different voltage band at ${i}`);
      return false;
    }
  }

  // Porównaj baye
  if (a.bays.length !== b.bays.length) {
    console.error('Different bay count');
    return false;
  }

  for (let i = 0; i < a.bays.length; i++) {
    if (a.bays[i].id !== b.bays[i].id) {
      console.error(`Different bay at ${i}`);
      return false;
    }
  }

  // Porównaj routed edges
  if (a.routedEdges.size !== b.routedEdges.size) {
    console.error('Different edge count');
    return false;
  }

  for (const [id, edgeA] of a.routedEdges) {
    const edgeB = b.routedEdges.get(id);
    if (!edgeB) {
      console.error(`Missing edge ${id}`);
      return false;
    }

    if (edgeA.path.length !== edgeB.path.length) {
      console.error(`Different path length for edge ${id}`);
      return false;
    }

    for (let i = 0; i < edgeA.path.length; i++) {
      if (edgeA.path[i].x !== edgeB.path[i].x || edgeA.path[i].y !== edgeB.path[i].y) {
        console.error(`Different path point for edge ${id} at ${i}`);
        return false;
      }
    }
  }

  return true;
}

// =============================================================================
// DETERMINISM TESTS
// =============================================================================

describe('Layout Determinism', () => {
  it('should produce identical results for same input (simple radial)', () => {
    const symbols = createSimpleRadialNetwork();
    const input: LayoutInput = { symbols };

    const result1 = computeLayout(input);
    const result2 = computeLayout(input);

    expect(layoutsAreIdentical(result1, result2)).toBe(true);
  });

  it('should produce identical results for same input (multi-feeder)', () => {
    const symbols = createMultiFeederNetwork();
    const input: LayoutInput = { symbols };

    const result1 = computeLayout(input);
    const result2 = computeLayout(input);

    expect(layoutsAreIdentical(result1, result2)).toBe(true);
  });

  it('should produce identical results for same input (complex network)', () => {
    const symbols = createComplexNetwork();
    const input: LayoutInput = { symbols };

    const result1 = computeLayout(input);
    const result2 = computeLayout(input);

    expect(layoutsAreIdentical(result1, result2)).toBe(true);
  });

  it('should produce identical results for permuted input order', () => {
    const symbolsOriginal = createSimpleRadialNetwork();
    const symbolsReversed = [...symbolsOriginal].reverse();
    const symbolsShuffled = [
      symbolsOriginal[2],
      symbolsOriginal[0],
      symbolsOriginal[4],
      symbolsOriginal[1],
      symbolsOriginal[3],
    ];

    const result1 = computeLayout({ symbols: symbolsOriginal });
    const result2 = computeLayout({ symbols: symbolsReversed });
    const result3 = computeLayout({ symbols: symbolsShuffled });

    expect(layoutsAreIdentical(result1, result2)).toBe(true);
    expect(layoutsAreIdentical(result1, result3)).toBe(true);
  });

  it('should pass verifyDeterminism helper', () => {
    const symbols = createMultiFeederNetwork();
    const input: LayoutInput = { symbols };

    expect(verifyDeterminism(input)).toBe(true);
  });
});

// =============================================================================
// INVARIANT TESTS
// =============================================================================

describe('Layout Invariants', () => {
  it('should position source above busbar', () => {
    const symbols = createSimpleRadialNetwork();
    const result = computeLayout({ symbols });

    const sourcePos = result.positions.get('see1');
    const busPos = result.positions.get('bus_sn');

    expect(sourcePos).toBeDefined();
    expect(busPos).toBeDefined();
    expect(sourcePos!.position.y).toBeLessThan(busPos!.position.y);
  });

  it('should position transformer between voltage bands', () => {
    const symbols = createSimpleRadialNetwork();
    const result = computeLayout({ symbols });

    const trPos = result.positions.get('tr1');
    const busSNPos = result.positions.get('bus_sn');
    const busNNPos = result.positions.get('bus_nn');

    expect(trPos).toBeDefined();
    expect(busSNPos).toBeDefined();
    expect(busNNPos).toBeDefined();

    // Transformator między szyny SN i nN
    expect(trPos!.position.y).toBeGreaterThan(busSNPos!.position.y);
    expect(trPos!.position.y).toBeLessThan(busNNPos!.position.y);
  });

  it('should position load at bottom', () => {
    const symbols = createSimpleRadialNetwork();
    const result = computeLayout({ symbols });

    const loadPos = result.positions.get('odb1');
    const busNNPos = result.positions.get('bus_nn');

    expect(loadPos).toBeDefined();
    expect(busNNPos).toBeDefined();
    expect(loadPos!.position.y).toBeGreaterThan(busNNPos!.position.y);
  });

  it('should have all positions on grid', () => {
    const symbols = createMultiFeederNetwork();
    const result = computeLayout({ symbols });

    const gridSize = 20; // Default grid size

    for (const [id, pos] of result.positions) {
      expect(pos.position.x % gridSize).toBe(0);
      expect(pos.position.y % gridSize).toBe(0);
    }
  });

  it('should have no node-node overlaps', () => {
    const symbols = createMultiFeederNetwork();
    const result = computeLayout({ symbols });

    const positions = Array.from(result.positions.values());

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];

        // Sprawdź czy bounding boxes się nie nakładają
        const overlap = !(
          a.bounds.x + a.bounds.width < b.bounds.x ||
          b.bounds.x + b.bounds.width < a.bounds.x ||
          a.bounds.y + a.bounds.height < b.bounds.y ||
          b.bounds.y + b.bounds.height < a.bounds.y
        );

        if (overlap) {
          // Dopuszczamy niewielki overlap dla połączonych elementów
          const overlapX = Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) -
                          Math.max(a.bounds.x, b.bounds.x);
          const overlapY = Math.min(a.bounds.y + a.bounds.height, b.bounds.y + b.bounds.height) -
                          Math.max(a.bounds.y, b.bounds.y);
          const overlapArea = Math.max(0, overlapX) * Math.max(0, overlapY);

          // Znaczący overlap to błąd
          expect(overlapArea).toBeLessThan(100);
        }
      }
    }
  });
});

// =============================================================================
// MULTIPLE RUNS TEST
// =============================================================================

describe('Multiple Runs Consistency', () => {
  it('should produce identical results in 10 consecutive runs', () => {
    const symbols = createComplexNetwork();
    const input: LayoutInput = { symbols };

    const firstResult = computeLayout(input);

    for (let i = 0; i < 10; i++) {
      const result = computeLayout(input);
      expect(layoutsAreIdentical(firstResult, result)).toBe(true);
    }
  });
});
