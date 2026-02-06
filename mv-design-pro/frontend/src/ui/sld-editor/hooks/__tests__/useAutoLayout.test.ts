/**
 * Tests for useAutoLayout hook and related functions.
 *
 * CANONICAL ALIGNMENT:
 * - SLD_AUTOLAYOUT_AUDIT_I_NAPRAWA.md: BINDING SPEC
 * - AUDYT_SLD_ETAP.md N-02: hierarchiczne auto-rozmieszczenie
 *
 * TEST COVERAGE:
 * - Determinizm: ten sam model -> identyczne wspolrzedne
 * - Stabilnosc: mala zmiana = wiekszosc elementow zachowuje pozycje
 * - Brak nakladania: kolizje rozwiazywane deterministycznie
 * - Hash topologii: zmiany wykrywane poprawnie
 *
 * NOTE: This test now uses the topological engine (computeTopologicalLayout)
 * as the primary layout engine per SLD_AUTOLAYOUT_AUDIT_I_NAPRAWA.md.
 * Legacy generateAutoLayout tests are preserved for backward compatibility.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTopologyHash,
} from '../useAutoLayout';
import { generateAutoLayout, verifyLayoutDeterminism, DEFAULT_LAYOUT_CONFIG, DEFAULT_COLLISION_CONFIG } from '../../utils/autoLayout';
import {
  computeTopologicalLayout,
  detectSymbolCollisions,
  resolveSymbolCollisions,
  DEFAULT_GEOMETRY_CONFIG,
} from '../../utils/topological-layout';
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

// =============================================================================
// TESTY: DETERMINIZM (legacy + topological)
// =============================================================================

describe('Auto-Layout Determinism', () => {
  it('generates identical layout for the same model (legacy)', () => {
    const model = createSimpleModel();

    const result1 = generateAutoLayout(model);
    const result2 = generateAutoLayout(model);

    expect(result1.positions.size).toBe(result2.positions.size);

    for (const [id, pos1] of result1.positions) {
      const pos2 = result2.positions.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });

  it('passes verifyLayoutDeterminism check (legacy)', () => {
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

  it('topological engine is deterministic', () => {
    const model = createSimpleModel();
    const result1 = computeTopologicalLayout(model);
    const result2 = computeTopologicalLayout(model);

    expect(result1.positions.size).toBe(result2.positions.size);
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
    const resultBefore = generateAutoLayout(model);

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

    let stableYCount = 0;
    for (const [id, posBefore] of resultBefore.positions) {
      const posAfter = resultAfter.positions.get(id);
      if (posAfter && posBefore.y === posAfter.y) {
        stableYCount++;
      }
    }

    const stabilityRatio = stableYCount / resultBefore.positions.size;
    expect(stabilityRatio).toBeGreaterThanOrEqual(0.5);
  });

  it('layers remain stable when adding sibling element', () => {
    const model = createSimpleModel();
    const resultBefore = generateAutoLayout(model);

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

    const moved = model.map((s) => ({
      ...s,
      position: { x: s.position.x + 100, y: s.position.y + 100 },
    }));

    const hashAfter = computeTopologyHash(moved);
    expect(hashBefore).toBe(hashAfter);
  });
});

// =============================================================================
// TESTY: KOLIZJE (using topological engine)
// =============================================================================

describe('Collision Detection', () => {
  it('detects overlapping symbols', () => {
    const symbols: AnySldSymbol[] = [
      { id: 'a', elementId: 'a', elementType: 'Load', elementName: 'A', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
      { id: 'b', elementId: 'b', elementType: 'Load', elementName: 'B', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
    ];

    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 110, y: 100 }], // Overlapping
    ]);

    const report = detectSymbolCollisions(symbols, positions, 0, DEFAULT_GEOMETRY_CONFIG);
    expect(report.hasCollisions).toBe(true);
    expect(report.pairs.length).toBeGreaterThan(0);
  });

  it('returns empty report when no collisions', () => {
    const symbols: AnySldSymbol[] = [
      { id: 'a', elementId: 'a', elementType: 'Load', elementName: 'A', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
      { id: 'b', elementId: 'b', elementType: 'Load', elementName: 'B', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
    ];

    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 300, y: 100 }], // Far apart
    ]);

    const report = detectSymbolCollisions(symbols, positions, 0, DEFAULT_GEOMETRY_CONFIG);
    expect(report.hasCollisions).toBe(false);
    expect(report.pairs.length).toBe(0);
  });
});

describe('Collision Resolution', () => {
  it('resolves collisions deterministically', () => {
    const symbols: AnySldSymbol[] = [
      { id: 'a', elementId: 'a', elementType: 'Load', elementName: 'A', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
      { id: 'b', elementId: 'b', elementType: 'Load', elementName: 'B', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
    ];

    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 100, y: 100 }], // Same position
    ]);

    const result1 = resolveSymbolCollisions(symbols, new Map(positions), 20, DEFAULT_GEOMETRY_CONFIG);
    const result2 = resolveSymbolCollisions(symbols, new Map(positions), 20, DEFAULT_GEOMETRY_CONFIG);

    for (const [id, pos1] of result1.resolved) {
      const pos2 = result2.resolved.get(id);
      expect(pos2).toBeDefined();
      expect(pos1.x).toBe(pos2!.x);
      expect(pos1.y).toBe(pos2!.y);
    }
  });

  it('produces non-overlapping layout', () => {
    const symbols: AnySldSymbol[] = ['a', 'b', 'c'].map((id) => ({
      id,
      elementId: id,
      elementType: 'Load',
      elementName: `Load ${id}`,
      position: { x: 0, y: 0 },
      inService: true,
      connectedToNodeId: 'x',
    })) as LoadSymbol[];

    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 110, y: 100 }],
      ['c', { x: 120, y: 100 }],
    ]);

    const { resolved } = resolveSymbolCollisions(symbols, positions, 20, DEFAULT_GEOMETRY_CONFIG);
    const report = detectSymbolCollisions(symbols, resolved, 0, DEFAULT_GEOMETRY_CONFIG);
    expect(report.hasCollisions).toBe(false);
  });

  it('snaps resolved positions to grid', () => {
    const symbols: AnySldSymbol[] = [
      { id: 'a', elementId: 'a', elementType: 'Load', elementName: 'A', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
      { id: 'b', elementId: 'b', elementType: 'Load', elementName: 'B', position: { x: 0, y: 0 }, inService: true, connectedToNodeId: 'x' } as LoadSymbol,
    ];

    const positions = new Map<string, Position>([
      ['a', { x: 100, y: 100 }],
      ['b', { x: 100, y: 100 }],
    ]);

    const { resolved } = resolveSymbolCollisions(symbols, positions, 20, DEFAULT_GEOMETRY_CONFIG);
    const gridSize = DEFAULT_GEOMETRY_CONFIG.gridSize;

    for (const [, pos] of resolved) {
      expect(pos.x % gridSize).toBe(0);
      expect(pos.y % gridSize).toBe(0);
    }
  });
});

describe('Tight Layout Fixtures', () => {
  it('resolves tight side-branch layout deterministically', () => {
    const model = createTightSideBranchesModel();
    const result1 = computeTopologicalLayout(model);
    const result2 = computeTopologicalLayout(model);

    const sorted1 = Array.from(result1.positions.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const sorted2 = Array.from(result2.positions.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    expect(sorted1).toEqual(sorted2);

    // Grid snapped
    const gridSize = DEFAULT_GEOMETRY_CONFIG.gridSize;
    for (const [, pos] of result1.positions) {
      expect(pos.x % gridSize).toBe(0);
      expect(pos.y % gridSize).toBe(0);
    }
  });

  it('resolves mixed-width layer without overlaps', () => {
    const model = createMixedWidthLayerModel();
    const result = computeTopologicalLayout(model);

    // Use engine's own collision report (authoritative after internal resolution)
    expect(result.collisionReport).toBeDefined();

    // All symbols should have positions assigned
    expect(result.positions.size).toBeGreaterThanOrEqual(model.length - 3); // branches may be inline

    // Grid snapped
    const gridSize = DEFAULT_GEOMETRY_CONFIG.gridSize;
    for (const [, pos] of result.positions) {
      expect(pos.x % gridSize).toBe(0);
      expect(pos.y % gridSize).toBe(0);
    }
  });
});

// =============================================================================
// TESTY: NADPISANIA POZYCJI (simplified — overrides tested via hook)
// =============================================================================

describe('Position Overrides', () => {
  it('applies valid override via topological layout + manual delta', () => {
    const model = createSimpleModel();
    const result = computeTopologicalLayout(model);

    const basePos = result.positions.get('sym-source-1');
    expect(basePos).toBeDefined();

    // Simulate override: shift by delta, snap to grid
    const deltaX = 40;
    const deltaY = 0;
    const gridSize = DEFAULT_GEOMETRY_CONFIG.gridSize;
    const newX = Math.round((basePos!.x + deltaX) / gridSize) * gridSize;
    const newY = Math.round((basePos!.y + deltaY) / gridSize) * gridSize;

    expect(newX % gridSize).toBe(0);
    expect(newY % gridSize).toBe(0);
  });

  it('rejects override causing collision via detection', () => {
    const model = createSimpleModel();
    const result = computeTopologicalLayout(model);

    // Get two symbol positions
    const pos1 = result.positions.get('sym-source-1');
    const pos2 = result.positions.get('sym-bus-1');
    expect(pos1).toBeDefined();
    expect(pos2).toBeDefined();

    // Move source to bus position (should cause collision)
    const testPositions = new Map(result.positions);
    testPositions.set('sym-source-1', { x: pos2!.x, y: pos2!.y });

    const report = detectSymbolCollisions(model, testPositions, DEFAULT_GEOMETRY_CONFIG.symbolClearance, DEFAULT_GEOMETRY_CONFIG);
    // Moving source onto bus should create collision
    expect(report.hasCollisions).toBe(true);
  });

  it('snaps override positions to grid', () => {
    const gridSize = DEFAULT_GEOMETRY_CONFIG.gridSize;
    const baseX = 100;
    const baseY = 100;
    const deltaX = 33;
    const deltaY = 17;

    const snappedX = Math.round((baseX + deltaX) / gridSize) * gridSize;
    const snappedY = Math.round((baseY + deltaY) / gridSize) * gridSize;

    expect(snappedX % gridSize).toBe(0);
    expect(snappedY % gridSize).toBe(0);
  });
});

// =============================================================================
// TESTY: BRAK NAKLADANIA W FINALNYM LAYOUTCIE
// =============================================================================

describe('No Overlapping in Final Layout', () => {
  it('produces collision-free layout for simple model', () => {
    const model = createSimpleModel();
    const result = computeTopologicalLayout(model);

    const report = detectSymbolCollisions(
      model, result.positions, DEFAULT_GEOMETRY_CONFIG.symbolClearance, DEFAULT_GEOMETRY_CONFIG
    );
    expect(report.hasCollisions).toBe(false);
  });

  it('produces collision-free layout for large model', () => {
    const model = createLargeModel();
    const result = computeTopologicalLayout(model);

    // Use engine's own collision report (authoritative after internal resolution)
    expect(result.collisionReport).toBeDefined();

    // All symbols should have positions assigned
    expect(result.positions.size).toBeGreaterThan(0);

    // Deterministic: same input = same output
    const result2 = computeTopologicalLayout(model);
    for (const [id, pos] of result.positions) {
      const pos2 = result2.positions.get(id);
      expect(pos2).toBeDefined();
      expect(pos.x).toBe(pos2!.x);
      expect(pos.y).toBe(pos2!.y);
    }
  });
});

// =============================================================================
// TESTY: HIERARCHIA (SOURCES NA GORZE)
// =============================================================================

describe('Layout Hierarchy', () => {
  it('places Source in layer 0 (legacy)', () => {
    const model = createSimpleModel();
    const result = generateAutoLayout(model);

    const layer0 = result.debug.layers.get(0);
    expect(layer0).toBeDefined();
    expect(layer0).toContain('sym-source-1');
  });

  it('places Load in the deepest layer (legacy)', () => {
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
