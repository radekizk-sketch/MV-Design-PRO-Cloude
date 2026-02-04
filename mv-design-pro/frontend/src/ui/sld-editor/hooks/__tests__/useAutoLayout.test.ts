/**
 * Tests for useAutoLayout hook and related functions.
 *
 * CANONICAL ALIGNMENT:
 * - AUDYT_SLD_ETAP.md N-02: hierarchiczne auto-rozmieszczenie
 *
 * TEST COVERAGE:
 * - Determinizm: ten sam model -> identyczne wspolrzedne
 * - Stabilnosc: mala zmiana = wiekszosc elementow zachowuje pozycje
 * - Brak nakladania: kolizje rozwiazywane deterministycznie
 * - Hash topologii: zmiany wykrywane poprawnie
 */

import { describe, it, expect } from 'vitest';
import {
  computeTopologyHash,
  detectCollisions,
  resolveCollisions,
  applyOverrides,
  type PositionOverride,
} from '../useAutoLayout';
import { generateAutoLayout, verifyLayoutDeterminism, DEFAULT_LAYOUT_CONFIG } from '../../utils/autoLayout';
import type { AnySldSymbol, Position, NodeSymbol, SourceSymbol, LoadSymbol, BranchSymbol } from '../../types';

// =============================================================================
// FIXTURES
// =============================================================================

/**
 * Tworzy prosty model SLD dla testow.
 * Topologia: Source -> Bus1 -> LineBranch -> Bus2 -> Load
 */
function createSimpleModel(): AnySldSymbol[] {
  const source: SourceSymbol = {
    id: 'sym-source-1',
    elementId: 'source-1',
    elementType: 'Source',
    elementName: 'Zasilanie',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-1',
  };

  const bus1: NodeSymbol = {
    id: 'sym-bus-1',
    elementId: 'bus-1',
    elementType: 'Bus',
    elementName: 'Szyna 1',
    position: { x: 0, y: 0 },
    inService: true,
    width: 80,
    height: 8,
  };

  const line: BranchSymbol = {
    id: 'sym-line-1',
    elementId: 'line-1',
    elementType: 'LineBranch',
    elementName: 'Linia 1',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-1',
    toNodeId: 'bus-2',
    points: [],
  };

  const bus2: NodeSymbol = {
    id: 'sym-bus-2',
    elementId: 'bus-2',
    elementType: 'Bus',
    elementName: 'Szyna 2',
    position: { x: 0, y: 0 },
    inService: true,
    width: 80,
    height: 8,
  };

  const load: LoadSymbol = {
    id: 'sym-load-1',
    elementId: 'load-1',
    elementType: 'Load',
    elementName: 'Odbiorca',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-2',
  };

  return [source, bus1, line, bus2, load];
}

/**
 * Tworzy model z wieloma elementami.
 */
function createLargeModel(): AnySldSymbol[] {
  const symbols: AnySldSymbol[] = [];

  // 5 szyn
  for (let i = 1; i <= 5; i++) {
    symbols.push({
      id: `sym-bus-${i}`,
      elementId: `bus-${i}`,
      elementType: 'Bus',
      elementName: `Szyna ${i}`,
      position: { x: 0, y: 0 },
      inService: true,
      width: 80,
      height: 8,
    } as NodeSymbol);
  }

  // Zasilanie
  symbols.push({
    id: 'sym-source-1',
    elementId: 'source-1',
    elementType: 'Source',
    elementName: 'Zasilanie',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-1',
  } as SourceSymbol);

  // Linie miedzy szynami
  symbols.push({
    id: 'sym-line-1',
    elementId: 'line-1',
    elementType: 'LineBranch',
    elementName: 'Linia 1-2',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-1',
    toNodeId: 'bus-2',
    points: [],
  } as BranchSymbol);

  symbols.push({
    id: 'sym-line-2',
    elementId: 'line-2',
    elementType: 'LineBranch',
    elementName: 'Linia 2-3',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-2',
    toNodeId: 'bus-3',
    points: [],
  } as BranchSymbol);

  symbols.push({
    id: 'sym-line-3',
    elementId: 'line-3',
    elementType: 'LineBranch',
    elementName: 'Linia 2-4',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-2',
    toNodeId: 'bus-4',
    points: [],
  } as BranchSymbol);

  symbols.push({
    id: 'sym-line-4',
    elementId: 'line-4',
    elementType: 'LineBranch',
    elementName: 'Linia 4-5',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-4',
    toNodeId: 'bus-5',
    points: [],
  } as BranchSymbol);

  // Odbiorcy
  symbols.push({
    id: 'sym-load-1',
    elementId: 'load-1',
    elementType: 'Load',
    elementName: 'Odbiorca 3',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-3',
  } as LoadSymbol);

  symbols.push({
    id: 'sym-load-2',
    elementId: 'load-2',
    elementType: 'Load',
    elementName: 'Odbiorca 5',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-5',
  } as LoadSymbol);

  return symbols;
}

/**
 * Model z gestym ukladem galezi bocznych.
 */
function createTightSideBranchesModel(): AnySldSymbol[] {
  const source: SourceSymbol = {
    id: 'sym-source-tight',
    elementId: 'source-tight',
    elementType: 'Source',
    elementName: 'Zasilanie',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-main',
  };

  const busMain: NodeSymbol = {
    id: 'sym-bus-main',
    elementId: 'bus-main',
    elementType: 'Bus',
    elementName: 'Szyna główna',
    position: { x: 0, y: 0 },
    inService: true,
    width: 200,
    height: 10,
  };

  const branchBuses: NodeSymbol[] = ['A', 'B', 'C', 'D'].map((label, index) => ({
    id: `sym-bus-${label}`,
    elementId: `bus-${label}`,
    elementType: 'Bus',
    elementName: `Szyna ${label}`,
    position: { x: 0, y: 0 },
    inService: true,
    width: 220 + index * 10,
    height: 10,
  }));

  const branches: BranchSymbol[] = branchBuses.map((bus, index) => ({
    id: `sym-line-tight-${index + 1}`,
    elementId: `line-tight-${index + 1}`,
    elementType: 'LineBranch',
    elementName: `Linia ${index + 1}`,
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-main',
    toNodeId: bus.elementId,
    points: [],
  }));

  return [source, busMain, ...branchBuses, ...branches];
}

/**
 * Warstwa z elementami o roznych szerokosciach (busbar + odpływy).
 */
function createMixedWidthLayerModel(): AnySldSymbol[] {
  const source: SourceSymbol = {
    id: 'sym-source-mixed',
    elementId: 'source-mixed',
    elementType: 'Source',
    elementName: 'Zasilanie',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-mixed',
  };

  const bus: NodeSymbol = {
    id: 'sym-bus-mixed',
    elementId: 'bus-mixed',
    elementType: 'Bus',
    elementName: 'Szyna rozdzielcza',
    position: { x: 0, y: 0 },
    inService: true,
    width: 260,
    height: 10,
  };

  const feederBuses: NodeSymbol[] = [
    { id: 'sym-feeder-1', elementId: 'feeder-1', width: 180 },
    { id: 'sym-feeder-2', elementId: 'feeder-2', width: 220 },
    { id: 'sym-feeder-3', elementId: 'feeder-3', width: 200 },
  ].map((entry, index) => ({
    id: entry.id,
    elementId: entry.elementId,
    elementType: 'Bus',
    elementName: `Odpływ ${index + 1}`,
    position: { x: 0, y: 0 },
    inService: true,
    width: entry.width,
    height: 10,
  }));

  const branches: BranchSymbol[] = feederBuses.map((busEntry, index) => ({
    id: `sym-line-mixed-${index + 1}`,
    elementId: `line-mixed-${index + 1}`,
    elementType: 'LineBranch',
    elementName: `Linia ${index + 1}`,
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-mixed',
    toNodeId: busEntry.elementId,
    points: [],
  }));

  return [source, bus, ...feederBuses, ...branches];
}

const filterCriticalCollisions = (collisions: ReturnType<typeof detectCollisions>) =>
  collisions.filter((collision) => collision.a.kind === 'node' && collision.b.kind === 'node');

// =============================================================================
// TESTY: DETERMINIZM
// =============================================================================

describe('Auto-Layout Determinism', () => {
  it('generates identical layout for the same model', () => {
    const model = createSimpleModel();

    const result1 = generateAutoLayout(model);
    const result2 = generateAutoLayout(model);

    // Porownaj pozycje
    expect(result1.positions.size).toBe(result2.positions.size);

    for (const [id, pos1] of result1.positions) {
      const pos2 = result2.positions.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });

  it('passes verifyLayoutDeterminism check', () => {
    const model = createSimpleModel();
    const isDeterministic = verifyLayoutDeterminism(model);
    expect(isDeterministic).toBe(true);
  });

  it('generates identical layout regardless of input order', () => {
    const model = createSimpleModel();
    const reversed = [...model].reverse();
    const shuffled = [model[2], model[0], model[4], model[1], model[3]];

    const result1 = generateAutoLayout(model);
    const result2 = generateAutoLayout(reversed);
    const result3 = generateAutoLayout(shuffled);

    // Wszystkie powinny byc identyczne
    for (const [id, pos1] of result1.positions) {
      const pos2 = result2.positions.get(id);
      const pos3 = result3.positions.get(id);

      expect(pos2).toBeDefined();
      expect(pos3).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
      expect(pos1.x).toBe(pos3!.x);
      expect(pos1.y).toBe(pos3!.y);
    }
  });

  it('generates deterministic layout for large model', () => {
    const model = createLargeModel();

    const result1 = generateAutoLayout(model);
    const result2 = generateAutoLayout(model);

    for (const [id, pos1] of result1.positions) {
      const pos2 = result2.positions.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });
});

// =============================================================================
// TESTY: STABILNOSC
// =============================================================================

describe('Auto-Layout Stability', () => {
  it('preserves most positions when adding one element', () => {
    const model = createSimpleModel();

    // Layout przed dodaniem elementu
    const resultBefore = generateAutoLayout(model);

    // Dodaj nowy Load
    const extendedModel: AnySldSymbol[] = [
      ...model,
      {
        id: 'sym-load-new',
        elementId: 'load-new',
        elementType: 'Load',
        elementName: 'Nowy odbiorca',
        position: { x: 0, y: 0 },
        inService: true,
        connectedToNodeId: 'bus-2',
      } as LoadSymbol,
    ];

    const resultAfter = generateAutoLayout(extendedModel);

    // Policz ile warstw (Y-koordynat) sie nie zmienilo
    // W algorytmie Sugiyama, X moze sie zmieniac przy dodaniu elementu do warstwy
    // Ale Y (warstwa) powinno pozostac stabilne dla wiekszosci elementow
    let stableYCount = 0;
    for (const [id, posBefore] of resultBefore.positions) {
      const posAfter = resultAfter.positions.get(id);
      if (posAfter && posBefore.y === posAfter.y) {
        stableYCount++;
      }
    }

    // Warstwy (Y) powinny byc stabilne dla wiekszosci elementow
    // (w tym przypadku dodajemy element do tej samej warstwy co Load)
    const stabilityRatio = stableYCount / resultBefore.positions.size;
    // Algorytm Sugiyama moze przesunac elementy w X przy rebalansowaniu,
    // ale warstwy powinny pozostac stabilne (co najmniej 50%)
    expect(stabilityRatio).toBeGreaterThanOrEqual(0.5);
  });

  it('layers remain stable when adding sibling element', () => {
    const model = createSimpleModel();
    const resultBefore = generateAutoLayout(model);

    // Dodaj drugi Load do tego samego Bus
    const extendedModel: AnySldSymbol[] = [
      ...model,
      {
        id: 'sym-load-2',
        elementId: 'load-2',
        elementType: 'Load',
        elementName: 'Odbiorca 2',
        position: { x: 0, y: 0 },
        inService: true,
        connectedToNodeId: 'bus-2',
      } as LoadSymbol,
    ];

    const resultAfter = generateAutoLayout(extendedModel);

    // Bus i Source powinny miec te same warstwy
    expect(resultBefore.debug.layers.get(0)).toContain('sym-source-1');
    expect(resultAfter.debug.layers.get(0)).toContain('sym-source-1');
  });
});

// =============================================================================
// TESTY: HASH TOPOLOGII
// =============================================================================

describe('Topology Hash', () => {
  it('produces same hash for identical topology', () => {
    const model = createSimpleModel();
    const hash1 = computeTopologyHash(model);
    const hash2 = computeTopologyHash(model);

    expect(hash1).toBe(hash2);
  });

  it('produces same hash regardless of array order', () => {
    const model = createSimpleModel();
    const reversed = [...model].reverse();

    const hash1 = computeTopologyHash(model);
    const hash2 = computeTopologyHash(reversed);

    expect(hash1).toBe(hash2);
  });

  it('produces different hash when element added', () => {
    const model = createSimpleModel();
    const hashBefore = computeTopologyHash(model);

    const extended = [
      ...model,
      {
        id: 'sym-load-new',
        elementId: 'load-new',
        elementType: 'Load',
        elementName: 'Nowy',
        position: { x: 0, y: 0 },
        inService: true,
        connectedToNodeId: 'bus-2',
      } as LoadSymbol,
    ];

    const hashAfter = computeTopologyHash(extended);

    expect(hashBefore).not.toBe(hashAfter);
  });

  it('produces different hash when connection changed', () => {
    const model = createSimpleModel();
    const hashBefore = computeTopologyHash(model);

    // Zmien polaczenie Load
    const modified = model.map((s) => {
      if (s.id === 'sym-load-1') {
        return { ...s, connectedToNodeId: 'bus-1' } as LoadSymbol;
      }
      return s;
    });

    const hashAfter = computeTopologyHash(modified);

    expect(hashBefore).not.toBe(hashAfter);
  });

  it('ignores position changes in hash', () => {
    const model = createSimpleModel();
    const hashBefore = computeTopologyHash(model);

    // Zmien tylko pozycje
    const moved = model.map((s) => ({
      ...s,
      position: { x: s.position.x + 100, y: s.position.y + 100 },
    }));

    const hashAfter = computeTopologyHash(moved);

    expect(hashBefore).toBe(hashAfter);
  });
});

// =============================================================================
// TESTY: KOLIZJE
// =============================================================================

describe('Collision Detection', () => {
  it('detects overlapping symbols', () => {
    const items = [
      {
        id: 'a',
        ownerId: 'a',
        kind: 'node',
        x: 100,
        y: 100,
        width: 60,
        height: 40,
        layerIndex: 0,
        typePriority: 0,
      },
      {
        id: 'b',
        ownerId: 'b',
        kind: 'node',
        x: 110,
        y: 100,
        width: 60,
        height: 40,
        layerIndex: 0,
        typePriority: 0,
      },
      {
        id: 'c',
        ownerId: 'c',
        kind: 'node',
        x: 300,
        y: 300,
        width: 60,
        height: 40,
        layerIndex: 0,
        typePriority: 0,
      },
    ];

    const collisions = detectCollisions(items as any, {
      symbolClearance: 0,
      labelSymbolClearance: 0,
      labelEdgeClearance: 0,
      busbarPadding: 0,
      labelCharWidth: 7,
      labelHeight: 12,
      edgeThickness: 6,
      maxIterations: 10,
    });

    expect(collisions.length).toBeGreaterThan(0);
  });

  it('returns empty map when no collisions', () => {
    const items = [
      {
        id: 'a',
        ownerId: 'a',
        kind: 'node',
        x: 100,
        y: 100,
        width: 60,
        height: 40,
        layerIndex: 0,
        typePriority: 0,
      },
      {
        id: 'b',
        ownerId: 'b',
        kind: 'node',
        x: 300,
        y: 100,
        width: 60,
        height: 40,
        layerIndex: 0,
        typePriority: 0,
      },
      {
        id: 'c',
        ownerId: 'c',
        kind: 'node',
        x: 100,
        y: 300,
        width: 60,
        height: 40,
        layerIndex: 0,
        typePriority: 0,
      },
    ];

    const collisions = detectCollisions(items as any, {
      symbolClearance: 0,
      labelSymbolClearance: 0,
      labelEdgeClearance: 0,
      busbarPadding: 0,
      labelCharWidth: 7,
      labelHeight: 12,
      edgeThickness: 6,
      maxIterations: 10,
    });

    expect(filterCriticalCollisions(collisions).length).toBe(0);
  });
});

describe('Collision Resolution', () => {
  it('resolves collisions deterministically', () => {
    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 100, y: 100 }], // Identyczna pozycja
    ]);

    const symbols: AnySldSymbol[] = [
      {
        id: 'a',
        elementId: 'a',
        elementType: 'Bus',
        elementName: 'Szyna A',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
      {
        id: 'b',
        elementId: 'b',
        elementType: 'Bus',
        elementName: 'Szyna B',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
    ];

    const debugLayers = new Map<number, string[]>([[0, ['a', 'b']]]);

    const result1 = resolveCollisions(
      symbols,
      positions,
      positions,
      { layers: debugLayers, totalLayers: 1, totalNodes: 2 },
      DEFAULT_LAYOUT_CONFIG
    );
    const result2 = resolveCollisions(
      symbols,
      positions,
      positions,
      { layers: debugLayers, totalLayers: 1, totalNodes: 2 },
      DEFAULT_LAYOUT_CONFIG
    );

    // Wyniki musza byc identyczne (determinizm)
    for (const [id, pos1] of result1.positions) {
      const pos2 = result2.positions.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });

  it('produces non-overlapping layout', () => {
    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 110, y: 100 }],
      ['c', { x: 120, y: 100 }],
    ]);

    const symbols: AnySldSymbol[] = ['a', 'b', 'c'].map((id) => ({
      id,
      elementId: id,
      elementType: 'Bus',
      elementName: `Szyna ${id}`,
      position: { x: 0, y: 0 },
      inService: true,
      width: 80,
      height: 10,
    })) as NodeSymbol[];
    const debugLayers = new Map<number, string[]>([[0, ['a', 'b', 'c']]]);

    const { positions: resolved } = resolveCollisions(
      symbols,
      positions,
      positions,
      { layers: debugLayers, totalLayers: 1, totalNodes: 3 },
      DEFAULT_LAYOUT_CONFIG
    );

    // Sprawdz brak kolizji po rozwiazaniu
    const items = ['a', 'b', 'c'].map((id) => ({
      id,
      ownerId: id,
      kind: 'node',
      x: resolved.get(id)!.x,
      y: resolved.get(id)!.y,
      width: 60,
      height: 40,
      layerIndex: 0,
      typePriority: 0,
    }));
    const collisionsAfter = detectCollisions(items as any, {
      symbolClearance: 0,
      labelSymbolClearance: 0,
      labelEdgeClearance: 0,
      busbarPadding: 0,
      labelCharWidth: 7,
      labelHeight: 12,
      edgeThickness: 6,
      maxIterations: 10,
    });
    expect(filterCriticalCollisions(collisionsAfter).length).toBe(0);
  });

  it('snaps resolved positions to grid', () => {
    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 100, y: 100 }],
    ]);

    const symbols: AnySldSymbol[] = [
      {
        id: 'a',
        elementId: 'a',
        elementType: 'Bus',
        elementName: 'Szyna A',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
      {
        id: 'b',
        elementId: 'b',
        elementType: 'Bus',
        elementName: 'Szyna B',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
    ];
    const debugLayers = new Map<number, string[]>([[0, ['a', 'b']]]);

    const config = { ...DEFAULT_LAYOUT_CONFIG, gridSize: 20 };
    const { positions: resolved } = resolveCollisions(
      symbols,
      positions,
      positions,
      { layers: debugLayers, totalLayers: 1, totalNodes: 2 },
      config
    );

    // Wszystkie pozycje musza byc wielokrotnoscia 20
    for (const [, pos] of resolved) {
      expect(pos.x % 20).toBe(0);
      expect(pos.y % 20).toBe(0);
    }
  });
});

describe('Tight Layout Fixtures', () => {
  const assertGridSnapped = (positions: Map<string, Position>, gridSize: number) => {
    for (const [, pos] of positions) {
      expect(Math.abs(pos.x % gridSize)).toBe(0);
      expect(Math.abs(pos.y % gridSize)).toBe(0);
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  };

  const assertNoSymbolOverlap = (symbols: AnySldSymbol[], positions: Map<string, Position>) => {
    const items = symbols.flatMap((symbol) => {
      const pos = positions.get(symbol.id);
      if (!pos) return [];
      let width = 60;
      let height = 40;
      if (symbol.elementType === 'Bus') {
        width = (symbol as NodeSymbol).width || 80;
        height = (symbol as NodeSymbol).height || 8;
      } else if (symbol.elementType === 'Source') {
        width = 50;
        height = 60;
      } else if (symbol.elementType === 'Load') {
        width = 30;
        height = 30;
      }
      return [{
        id: symbol.id,
        ownerId: symbol.id,
        kind: 'node',
        x: pos.x,
        y: pos.y,
        width,
        height,
        layerIndex: 0,
        typePriority: 0,
      }];
    });
    const overlaps = detectCollisions(items as any, {
      symbolClearance: 0,
      labelSymbolClearance: 0,
      labelEdgeClearance: 0,
      busbarPadding: 0,
      labelCharWidth: 7,
      labelHeight: 12,
      edgeThickness: 6,
      maxIterations: 10,
    });
    expect(filterCriticalCollisions(overlaps).length).toBe(0);
  };

  it('resolves tight side-branch layout deterministically', () => {
    const model = createTightSideBranchesModel();
    const layout = generateAutoLayout(model);
    const resolved = resolveCollisions(
      model,
      layout.positions,
      layout.positions,
      layout.debug,
      DEFAULT_LAYOUT_CONFIG
    );

    const resolvedAgain = resolveCollisions(
      model,
      layout.positions,
      layout.positions,
      layout.debug,
      DEFAULT_LAYOUT_CONFIG
    );

    const orderedPositions = Array.from(resolved.positions.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const orderedAgain = Array.from(resolvedAgain.positions.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    expect(orderedPositions).toEqual(orderedAgain);
    expect(orderedPositions).toMatchSnapshot();
    assertGridSnapped(resolved.positions, DEFAULT_LAYOUT_CONFIG.gridSize);
    assertNoSymbolOverlap(model, resolved.positions);
  });

  it('resolves mixed-width layer without overlaps', () => {
    const model = createMixedWidthLayerModel();
    const layout = generateAutoLayout(model);
    const resolved = resolveCollisions(
      model,
      layout.positions,
      layout.positions,
      layout.debug,
      DEFAULT_LAYOUT_CONFIG
    );

    const orderedPositions = Array.from(resolved.positions.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    expect(orderedPositions).toMatchSnapshot();
    assertGridSnapped(resolved.positions, DEFAULT_LAYOUT_CONFIG.gridSize);
    assertNoSymbolOverlap(model, resolved.positions);
  });
});

// =============================================================================
// TESTY: NADPISANIA POZYCJI
// =============================================================================

describe('Position Overrides', () => {
  it('applies valid override', () => {
    const basePositions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 300, y: 100 }],
    ]);

    const overrides = new Map<string, PositionOverride>([
      ['a', { symbolId: 'a', deltaX: 40, deltaY: 0, timestamp: 1 }],
    ]);

    const symbols: AnySldSymbol[] = [
      {
        id: 'a',
        elementId: 'a',
        elementType: 'Bus',
        elementName: 'Szyna A',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
      {
        id: 'b',
        elementId: 'b',
        elementType: 'Bus',
        elementName: 'Szyna B',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
    ];
    const debugLayers = new Map<number, string[]>([[0, ['a', 'b']]]);

    const { positions, rejectedOverrides } = applyOverrides(
      basePositions,
      overrides,
      symbols,
      { layers: debugLayers, totalLayers: 1, totalNodes: 2 },
      DEFAULT_LAYOUT_CONFIG
    );

    expect(rejectedOverrides).toHaveLength(0);
    expect(positions.get('a')!.x).toBe(140);
    expect(positions.get('a')!.y).toBe(100);
  });

  it('rejects override causing collision', () => {
    const basePositions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 160, y: 100 }], // Blisko 'a'
    ]);

    const overrides = new Map<string, PositionOverride>([
      ['a', { symbolId: 'a', deltaX: 50, deltaY: 0, timestamp: 1 }], // Przesuwa 'a' na 'b'
    ]);

    const symbols: AnySldSymbol[] = [
      {
        id: 'a',
        elementId: 'a',
        elementType: 'Bus',
        elementName: 'Szyna A',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
      {
        id: 'b',
        elementId: 'b',
        elementType: 'Bus',
        elementName: 'Szyna B',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
    ];
    const debugLayers = new Map<number, string[]>([[0, ['a', 'b']]]);

    const { rejectedOverrides } = applyOverrides(
      basePositions,
      overrides,
      symbols,
      { layers: debugLayers, totalLayers: 1, totalNodes: 2 },
      DEFAULT_LAYOUT_CONFIG
    );

    expect(rejectedOverrides).toContain('a');
  });

  it('snaps override positions to grid', () => {
    const basePositions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
    ]);

    const overrides = new Map<string, PositionOverride>([
      ['a', { symbolId: 'a', deltaX: 33, deltaY: 17, timestamp: 1 }], // Nie na siatce
    ]);

    const symbols: AnySldSymbol[] = [
      {
        id: 'a',
        elementId: 'a',
        elementType: 'Bus',
        elementName: 'Szyna A',
        position: { x: 0, y: 0 },
        inService: true,
        width: 80,
        height: 10,
      } as NodeSymbol,
    ];
    const debugLayers = new Map<number, string[]>([[0, ['a']]]);

    const config = { ...DEFAULT_LAYOUT_CONFIG, gridSize: 20 };
    const { positions } = applyOverrides(
      basePositions,
      overrides,
      symbols,
      { layers: debugLayers, totalLayers: 1, totalNodes: 1 },
      config
    );

    // Pozycja powinna byc zaokraglona do siatki
    const pos = positions.get('a')!;
    expect(pos.x % 20).toBe(0);
    expect(pos.y % 20).toBe(0);
  });
});

// =============================================================================
// TESTY: BRAK NAKLADANIA W FINALNYM LAYOUTCIE
// =============================================================================

describe('No Overlapping in Final Layout', () => {
  it('produces collision-free layout for simple model', () => {
    const model = createSimpleModel();
    const result = generateAutoLayout(model);

    // Sprawdz brak kolizji
    const items = model.flatMap((symbol) => {
      const pos = result.positions.get(symbol.id);
      if (!pos) return [];
      const width = symbol.elementType === 'Bus' ? (symbol as NodeSymbol).width || 80 : 60;
      const height = symbol.elementType === 'Bus' ? (symbol as NodeSymbol).height || 8 : 40;
      return [{
        id: symbol.id,
        ownerId: symbol.id,
        kind: 'node',
        x: pos.x,
        y: pos.y,
        width,
        height,
        layerIndex: 0,
        typePriority: 0,
      }];
    });

    const collisions = detectCollisions(items as any, {
      symbolClearance: 0,
      labelSymbolClearance: 0,
      labelEdgeClearance: 0,
      busbarPadding: 0,
      labelCharWidth: 7,
      labelHeight: 12,
      edgeThickness: 6,
      maxIterations: 10,
    });
    expect(filterCriticalCollisions(collisions).length).toBe(0);
  });

  it('produces collision-free layout for large model', () => {
    const model = createLargeModel();
    const result = generateAutoLayout(model);

    // Rozmiary symboli
    const items = model.flatMap((symbol) => {
      const pos = result.positions.get(symbol.id);
      if (!pos) return [];
      let width = 60;
      let height = 40;
      if (symbol.elementType === 'Bus') {
        width = (symbol as NodeSymbol).width || 80;
        height = (symbol as NodeSymbol).height || 8;
      } else if (symbol.elementType === 'Source') {
        width = 50;
        height = 60;
      } else if (symbol.elementType === 'Load') {
        width = 30;
        height = 30;
      }
      return [{
        id: symbol.id,
        ownerId: symbol.id,
        kind: 'node',
        x: pos.x,
        y: pos.y,
        width,
        height,
        layerIndex: 0,
        typePriority: 0,
      }];
    });

    const collisions = detectCollisions(items as any, {
      symbolClearance: 0,
      labelSymbolClearance: 0,
      labelEdgeClearance: 0,
      busbarPadding: 0,
      labelCharWidth: 7,
      labelHeight: 12,
      edgeThickness: 6,
      maxIterations: 10,
    });
    expect(filterCriticalCollisions(collisions).length).toBe(0);
  });
});

// =============================================================================
// TESTY: HIERARCHIA (SOURCES NA GORZE)
// =============================================================================

describe('Layout Hierarchy', () => {
  it('places Source in layer 0', () => {
    const model = createSimpleModel();
    const result = generateAutoLayout(model);

    const layer0 = result.debug.layers.get(0);
    expect(layer0).toBeDefined();
    expect(layer0).toContain('sym-source-1');
  });

  it('places Load in the deepest layer', () => {
    const model = createSimpleModel();
    const result = generateAutoLayout(model);

    const maxLayer = result.debug.totalLayers - 1;
    const lastLayer = result.debug.layers.get(maxLayer);

    expect(lastLayer).toBeDefined();
    expect(lastLayer).toContain('sym-load-1');
  });

  it('Source position is higher (lower Y) than Load position', () => {
    const model = createSimpleModel();
    const result = generateAutoLayout(model);

    const sourcePos = result.positions.get('sym-source-1');
    const loadPos = result.positions.get('sym-load-1');

    expect(sourcePos).toBeDefined();
    expect(loadPos).toBeDefined();
    expect(sourcePos!.y).toBeLessThan(loadPos!.y);
  });
});
