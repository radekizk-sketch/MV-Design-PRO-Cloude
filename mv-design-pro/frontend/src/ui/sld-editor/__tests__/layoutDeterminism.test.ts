/**
 * SLD LAYOUT DETERMINISM TESTS — Topological auto-layout + routing
 *
 * CANONICAL ALIGNMENT:
 * - SLD_AUTOLAYOUT_AUDIT_I_NAPRAWA.md: BINDING SPEC
 * - Deterministycznosc: ten sam input -> identyczny output
 * - Topological engine (computeTopologicalLayout) + routing (connectionRouting)
 *
 * NOTE: Migrated from legacy generateAutoLayout to computeTopologicalLayout
 * per PR-SLD-AUTO-01 (canonical topological engine only).
 */

import { describe, it, expect } from 'vitest';
import type {
  AnySldSymbol,
  NodeSymbol,
  SourceSymbol,
  LoadSymbol,
  BranchSymbol,
  Position,
} from '../types';
import {
  computeTopologicalLayout,
  DEFAULT_GEOMETRY_CONFIG,
} from '../utils/topological-layout';
import {
  generateConnections,
  DEFAULT_ROUTING_CONFIG,
  type Connection,
} from '../utils/connectionRouting';

// =============================================================================
// FIXTURES
// =============================================================================

const createRadialFixture = (): AnySldSymbol[] => {
  const bus: NodeSymbol = {
    id: 'bus-radial-1',
    elementId: 'bus-radial-1',
    elementType: 'Bus',
    elementName: 'Szyna Radialna',
    position: { x: 0, y: 0 },
    inService: true,
    width: 80,
    height: 40,
  };

  const source: SourceSymbol = {
    id: 'source-radial-1',
    elementId: 'source-radial-1',
    elementType: 'Source',
    elementName: 'Zrodlo Radialne',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-radial-1',
  };

  const load1: LoadSymbol = {
    id: 'load-radial-1',
    elementId: 'load-radial-1',
    elementType: 'Load',
    elementName: 'Odbior Radialny 1',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-radial-1',
  };

  const load2: LoadSymbol = {
    id: 'load-radial-2',
    elementId: 'load-radial-2',
    elementType: 'Load',
    elementName: 'Odbior Radialny 2',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-radial-1',
  };

  return [bus, source, load1, load2];
};

const createStarFixture = (): AnySldSymbol[] => {
  const bus: NodeSymbol = {
    id: 'bus-star-1',
    elementId: 'bus-star-1',
    elementType: 'Bus',
    elementName: 'Szyna Gwiazda',
    position: { x: 0, y: 0 },
    inService: true,
    width: 100,
    height: 40,
  };

  const source1: SourceSymbol = {
    id: 'source-star-1',
    elementId: 'source-star-1',
    elementType: 'Source',
    elementName: 'Zrodlo Gwiazdy 1',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-star-1',
  };

  const source2: SourceSymbol = {
    id: 'source-star-2',
    elementId: 'source-star-2',
    elementType: 'Source',
    elementName: 'Zrodlo Gwiazdy 2',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-star-1',
  };

  const load1: LoadSymbol = {
    id: 'load-star-1',
    elementId: 'load-star-1',
    elementType: 'Load',
    elementName: 'Odbior Gwiazdy 1',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-star-1',
  };

  const load2: LoadSymbol = {
    id: 'load-star-2',
    elementId: 'load-star-2',
    elementType: 'Load',
    elementName: 'Odbior Gwiazdy 2',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-star-1',
  };

  const load3: LoadSymbol = {
    id: 'load-star-3',
    elementId: 'load-star-3',
    elementType: 'Load',
    elementName: 'Odbior Gwiazdy 3',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-star-1',
  };

  return [bus, source1, source2, load1, load2, load3];
};

const createGridFixture = (): AnySldSymbol[] => {
  const busA: NodeSymbol = {
    id: 'bus-grid-a',
    elementId: 'bus-grid-a',
    elementType: 'Bus',
    elementName: 'Szyna Siatka A',
    position: { x: 0, y: 0 },
    inService: true,
    width: 80,
    height: 40,
  };

  const busB: NodeSymbol = {
    id: 'bus-grid-b',
    elementId: 'bus-grid-b',
    elementType: 'Bus',
    elementName: 'Szyna Siatka B',
    position: { x: 0, y: 0 },
    inService: true,
    width: 80,
    height: 40,
  };

  const busC: NodeSymbol = {
    id: 'bus-grid-c',
    elementId: 'bus-grid-c',
    elementType: 'Bus',
    elementName: 'Szyna Siatka C',
    position: { x: 0, y: 0 },
    inService: true,
    width: 80,
    height: 40,
  };

  const busD: NodeSymbol = {
    id: 'bus-grid-d',
    elementId: 'bus-grid-d',
    elementType: 'Bus',
    elementName: 'Szyna Siatka D',
    position: { x: 0, y: 0 },
    inService: true,
    width: 80,
    height: 40,
  };

  const branchAB: BranchSymbol = {
    id: 'branch-grid-ab',
    elementId: 'branch-grid-ab',
    elementType: 'LineBranch',
    elementName: 'Polaczenie A-B',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-grid-a',
    toNodeId: 'bus-grid-b',
    points: [],
    branchType: 'CABLE',
  };

  const branchBC: BranchSymbol = {
    id: 'branch-grid-bc',
    elementId: 'branch-grid-bc',
    elementType: 'LineBranch',
    elementName: 'Polaczenie B-C',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-grid-b',
    toNodeId: 'bus-grid-c',
    points: [],
    branchType: 'CABLE',
  };

  const branchCD: BranchSymbol = {
    id: 'branch-grid-cd',
    elementId: 'branch-grid-cd',
    elementType: 'LineBranch',
    elementName: 'Polaczenie C-D',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-grid-c',
    toNodeId: 'bus-grid-d',
    points: [],
    branchType: 'CABLE',
  };

  const branchDA: BranchSymbol = {
    id: 'branch-grid-da',
    elementId: 'branch-grid-da',
    elementType: 'LineBranch',
    elementName: 'Polaczenie D-A',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-grid-d',
    toNodeId: 'bus-grid-a',
    points: [],
    branchType: 'CABLE',
  };

  const branchAC: BranchSymbol = {
    id: 'branch-grid-ac',
    elementId: 'branch-grid-ac',
    elementType: 'LineBranch',
    elementName: 'Polaczenie A-C',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-grid-a',
    toNodeId: 'bus-grid-c',
    points: [],
    branchType: 'CABLE',
  };

  return [busA, busB, busC, busD, branchAB, branchBC, branchCD, branchDA, branchAC];
};

// =============================================================================
// HELPERS
// =============================================================================

const fixtures = [
  { name: 'Radialna', createSymbols: createRadialFixture },
  { name: 'Gwiazda', createSymbols: createStarFixture },
  { name: 'Siatka', createSymbols: createGridFixture },
];

function applyLayoutToSymbols(
  symbols: AnySldSymbol[],
  positions: ReadonlyMap<string, Position>,
): AnySldSymbol[] {
  return symbols.map((s) => {
    const pos = positions.get(s.id);
    return pos ? { ...s, position: pos } : s;
  });
}

const normalizeLayoutPositions = (
  positions: ReadonlyMap<string, Position>,
) => {
  return Array.from(positions.entries())
    .map(([id, pos]) => ({ id, x: pos.x, y: pos.y }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

const normalizeRoutes = (connections: Connection[]) =>
  connections
    .map((connection) => ({
      edgeId: connection.id,
      path: connection.path.map((point) => ({
        x: Math.round(point.x),
        y: Math.round(point.y),
      })),
    }))
    .sort((a, b) => a.edgeId.localeCompare(b.edgeId));

const runLayoutAndRouting = (symbols: AnySldSymbol[]) => {
  const result = computeTopologicalLayout(symbols);
  const layoutedSymbols = applyLayoutToSymbols(symbols, result.positions);
  const connections = generateConnections(layoutedSymbols);

  return { result, layoutedSymbols, connections };
};

const isOnGrid = (value: number, gridSize: number) => value % gridSize === 0;

const assertFinitePosition = (label: string, value: number) => {
  expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
};

const createPermutations = (symbols: AnySldSymbol[]) => [
  [...symbols],
  [...symbols].reverse(),
  [...symbols.slice(1), symbols[0]],
  [...symbols.slice(2), ...symbols.slice(0, 2)],
];

// =============================================================================
// TESTS
// =============================================================================

describe('SLD Layout + Routing Determinism (Topological Engine)', () => {
  fixtures.forEach(({ name, createSymbols }) => {
    describe(`Fixture: ${name}`, () => {
      it('layout determinism: 2x ten sam input', () => {
        const symbols = createSymbols();
        const result1 = computeTopologicalLayout(symbols);
        const result2 = computeTopologicalLayout(symbols);

        expect(normalizeLayoutPositions(result1.positions)).toEqual(
          normalizeLayoutPositions(result2.positions)
        );
      });

      it('routing determinism: 2x ten sam input', () => {
        const symbols = createSymbols();
        const { result, connections } = runLayoutAndRouting(symbols);
        const layouted2 = applyLayoutToSymbols(symbols, result.positions);
        const connections2 = generateConnections(layouted2);

        expect(normalizeRoutes(connections)).toEqual(normalizeRoutes(connections2));
      });

      it('permutation invariance for layout + routing', () => {
        const baseSymbols = createSymbols();
        const baseResult = runLayoutAndRouting(baseSymbols);
        const baseLayout = normalizeLayoutPositions(baseResult.result.positions);
        const baseRoutes = normalizeRoutes(baseResult.connections);

        const permutations = createPermutations(baseSymbols);

        permutations.forEach((permutedSymbols) => {
          const permutedResult = runLayoutAndRouting(permutedSymbols);

          expect(normalizeLayoutPositions(permutedResult.result.positions)).toEqual(baseLayout);
          expect(normalizeRoutes(permutedResult.connections)).toEqual(baseRoutes);
        });
      });

      it('grid snapping: wszystkie punkty na siatce', () => {
        const symbols = createSymbols();
        const { result, connections } = runLayoutAndRouting(symbols);
        const gridSize = DEFAULT_GEOMETRY_CONFIG.gridSize;

        result.positions.forEach((position) => {
          expect(isOnGrid(position.x, gridSize)).toBe(true);
          expect(isOnGrid(position.y, gridSize)).toBe(true);
        });

        connections.forEach((connection) => {
          connection.path.forEach((point) => {
            expect(isOnGrid(point.x, DEFAULT_ROUTING_CONFIG.gridSnap)).toBe(true);
            expect(isOnGrid(point.y, DEFAULT_ROUTING_CONFIG.gridSnap)).toBe(true);
          });
        });
      });

      it('no NaN/Infinity in layout + routing', () => {
        const symbols = createSymbols();
        const { result, connections } = runLayoutAndRouting(symbols);

        result.positions.forEach((position) => {
          assertFinitePosition('layout.x', position.x);
          assertFinitePosition('layout.y', position.y);
        });

        connections.forEach((connection) => {
          connection.path.forEach((point) => {
            assertFinitePosition('route.x', point.x);
            assertFinitePosition('route.y', point.y);
          });
        });
      });

      if (name === 'Siatka') {
        it('routing produces valid connections for grid topology', () => {
          const symbols = createSymbols();
          const { connections } = runLayoutAndRouting(symbols);

          const allValid = connections.every((connection) => connection.path.length >= 2);
          expect(allValid).toBe(true);
        });
      }
    });
  });
});
