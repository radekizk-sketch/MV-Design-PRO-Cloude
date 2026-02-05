/**
 * SLD ROUTING OBSTACLE TESTS — corridor + determinism
 */

import { describe, it, expect } from 'vitest';
import type { AnySldSymbol, NodeSymbol, SourceSymbol, LoadSymbol, BranchSymbol } from '../types';
import {
  buildRoutingObstacles,
  DEFAULT_ROUTING_CONFIG,
  generateConnections,
  segmentIntersectsAabb,
  type Connection,
} from '../utils/connectionRouting';

// =============================================================================
// FIXTURES
// =============================================================================

const createBusbarCrossingFixture = (): AnySldSymbol[] => {
  const busTop: NodeSymbol = {
    id: 'bus-top',
    elementId: 'bus-top',
    elementType: 'Bus',
    elementName: 'Szyna Gorna',
    position: { x: 0, y: 0 },
    inService: true,
    width: 120,
    height: 40,
  };

  const busBlocker: NodeSymbol = {
    id: 'bus-blocker',
    elementId: 'bus-blocker',
    elementType: 'Bus',
    elementName: 'Szyna Blokujaca',
    position: { x: 0, y: 100 },
    inService: true,
    width: 120,
    height: 40,
  };

  const busBottom: NodeSymbol = {
    id: 'bus-bottom',
    elementId: 'bus-bottom',
    elementType: 'Bus',
    elementName: 'Szyna Dolna',
    position: { x: 0, y: 200 },
    inService: true,
    width: 120,
    height: 40,
  };

  const branch: BranchSymbol = {
    id: 'branch-bus-cross',
    elementId: 'branch-bus-cross',
    elementType: 'LineBranch',
    elementName: 'Polaczenie Szyn',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-top',
    toNodeId: 'bus-bottom',
    points: [],
    branchType: 'CABLE',
  };

  return [busTop, busBlocker, busBottom, branch];
};

const createSymbolObstacleFixture = (): AnySldSymbol[] => {
  const bus: NodeSymbol = {
    id: 'bus-main',
    elementId: 'bus-main',
    elementType: 'Bus',
    elementName: 'Szyna Glowna',
    position: { x: 0, y: 200 },
    inService: true,
    width: 120,
    height: 40,
  };

  const source: SourceSymbol = {
    id: 'source-main',
    elementId: 'source-main',
    elementType: 'Source',
    elementName: 'Zrodlo Glowne',
    position: { x: 0, y: 0 },
    inService: true,
    connectedToNodeId: 'bus-main',
  };

  const blocker: LoadSymbol = {
    id: 'load-blocker',
    elementId: 'load-blocker',
    elementType: 'Load',
    elementName: 'Odbior Blokujacy',
    position: { x: 0, y: 100 },
    inService: true,
    connectedToNodeId: 'bus-main',
  };

  return [bus, source, blocker];
};

const createCadMovedNodeFixture = (): AnySldSymbol[] => {
  const busLeft: NodeSymbol = {
    id: 'bus-left',
    elementId: 'bus-left',
    elementType: 'Bus',
    elementName: 'Szyna Lewa',
    position: { x: -40, y: 0 },
    inService: true,
    width: 120,
    height: 40,
  };

  const busRight: NodeSymbol = {
    id: 'bus-right',
    elementId: 'bus-right',
    elementType: 'Bus',
    elementName: 'Szyna Prawa',
    position: { x: 80, y: 200 },
    inService: true,
    width: 120,
    height: 40,
  };

  const blocker: LoadSymbol = {
    id: 'load-obstacle',
    elementId: 'load-obstacle',
    elementType: 'Load',
    elementName: 'Odbior Przeszkoda',
    position: { x: 20, y: 100 },
    inService: true,
    connectedToNodeId: 'bus-left',
  };

  const branch: BranchSymbol = {
    id: 'branch-cad-moved',
    elementId: 'branch-cad-moved',
    elementType: 'LineBranch',
    elementName: 'Polaczenie CAD',
    position: { x: 0, y: 0 },
    inService: true,
    fromNodeId: 'bus-left',
    toNodeId: 'bus-right',
    points: [],
    branchType: 'LINE',
  };

  return [busLeft, busRight, blocker, branch];
};

// =============================================================================
// ASSERTIONS
// =============================================================================

const isOnGrid = (value: number, gridSize: number) => value % gridSize === 0;

const pathKey = (path: Connection['path']) =>
  path.map((point) => `${point.x},${point.y}`).join('|');

const toConnectionMap = (connections: Connection[]) =>
  new Map(connections.map((conn) => [conn.id, pathKey(conn.path)]));

const assertRoutingInvariants = (symbols: AnySldSymbol[]) => {
  const connections = generateConnections(symbols);
  const connectionsRepeat = generateConnections(symbols);

  expect(toConnectionMap(connections)).toEqual(toConnectionMap(connectionsRepeat));

  const shuffled = [...symbols].reverse();
  const connectionsShuffled = generateConnections(shuffled);
  expect(toConnectionMap(connections)).toEqual(toConnectionMap(connectionsShuffled));

  const obstacles = buildRoutingObstacles(symbols, DEFAULT_ROUTING_CONFIG);
  const obstacleById = new Map(obstacles.map((obs) => [obs.id, obs]));

  connections.forEach((connection) => {
    const filteredObstacles = obstacles.filter(
      (obs) => obs.id !== connection.fromSymbolId && obs.id !== connection.toSymbolId && obs.id !== connection.id
    );

    connection.path.forEach((point) => {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(isOnGrid(point.x, DEFAULT_ROUTING_CONFIG.gridSnap)).toBe(true);
      expect(isOnGrid(point.y, DEFAULT_ROUTING_CONFIG.gridSnap)).toBe(true);
    });

    for (let i = 0; i < connection.path.length - 1; i += 1) {
      const start = connection.path[i];
      const end = connection.path[i + 1];

      for (const obstacle of filteredObstacles) {
        const intersects = segmentIntersectsAabb({ start, end }, obstacle.bbox);
        expect(intersects).toBe(false);
      }
    }

    if (connection.path.length > 2) {
      for (let i = 0; i < connection.path.length - 1; i += 1) {
        const segmentLength =
          Math.abs(connection.path[i + 1].x - connection.path[i].x) +
          Math.abs(connection.path[i + 1].y - connection.path[i].y);
        if (segmentLength > 0) {
          expect(segmentLength).toBeGreaterThanOrEqual(DEFAULT_ROUTING_CONFIG.minBendLength);
        }
      }
    }

    const fromObstacle = obstacleById.get(connection.fromSymbolId);
    const toObstacle = obstacleById.get(connection.toSymbolId);
    expect(fromObstacle).toBeDefined();
    expect(toObstacle).toBeDefined();
  });
};

// =============================================================================
// TESTS
// =============================================================================

describe('SLD routing obstacle-aware', () => {
  it('omija busbar w trasie L/Z (busbar crossing)', () => {
    assertRoutingInvariants(createBusbarCrossingFixture());
  });

  it('omija symbol jako przeszkode (symbol obstacle)', () => {
    assertRoutingInvariants(createSymbolObstacleFixture());
  });

  it('utrzymuje determinism przy przesunieciu CAD (CAD moved node)', () => {
    assertRoutingInvariants(createCadMovedNodeFixture());
  });
});
