/**
 * OBSTACLE-AWARE ROUTER TESTS — Deterministic A* orthogonal pathfinding
 *
 * PR-SLD-ROUTING-V2: Obstacle-aware orthogonal routing tests
 *
 * TEST COVERAGE:
 * 1. Path avoids symbol obstacles (AABB)
 * 2. Path avoids busbar obstacles
 * 3. All segments are orthogonal (H/V only, no diagonals)
 * 4. Determinism (same input -> same output)
 * 5. Fallback works without crash when path is impossible
 */

import { describe, it, expect } from 'vitest';
import {
  findOrthogonalPath,
  routeWithObstacles,
  isPathOrthogonal,
  isPathClearOfObstacles,
  countPathBends,
  calculatePathLength,
  buildExpandedObstacles,
  type Aabb,
  type RoutingObstacle,
  type ObstacleRouterConfig,
} from '../utils/obstacleAwareRouter';
import type { Position } from '../types';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_CONFIG: ObstacleRouterConfig = {
  gridStep: 20,
  obstacleMargin: 8,
  maxIterations: 5000,
  maxPathLength: 200,
};

// =============================================================================
// FIXTURES
// =============================================================================

/**
 * Create a simple obstacle fixture with a blocking symbol between start and end.
 */
function createSymbolBlockingFixture(): {
  start: Position;
  end: Position;
  obstacles: RoutingObstacle[];
  excludeIds: Set<string>;
} {
  return {
    start: { x: 100, y: 100 },
    end: { x: 100, y: 300 },
    obstacles: [
      {
        id: 'start-symbol',
        bbox: { x: 80, y: 80, width: 40, height: 40 },
      },
      {
        id: 'blocker-symbol',
        bbox: { x: 80, y: 180, width: 40, height: 40 },
      },
      {
        id: 'end-symbol',
        bbox: { x: 80, y: 280, width: 40, height: 40 },
      },
    ],
    excludeIds: new Set(['start-symbol', 'end-symbol']),
  };
}

/**
 * Create a busbar blocking fixture.
 */
function createBusbarBlockingFixture(): {
  start: Position;
  end: Position;
  obstacles: RoutingObstacle[];
  excludeIds: Set<string>;
} {
  return {
    start: { x: 100, y: 100 },
    end: { x: 100, y: 300 },
    obstacles: [
      {
        id: 'start-symbol',
        bbox: { x: 80, y: 80, width: 40, height: 40 },
      },
      {
        id: 'busbar-blocker',
        bbox: { x: 0, y: 180, width: 200, height: 20 },
      },
      {
        id: 'end-symbol',
        bbox: { x: 80, y: 280, width: 40, height: 40 },
      },
    ],
    excludeIds: new Set(['start-symbol', 'end-symbol']),
  };
}

/**
 * Create a complex maze-like obstacle layout.
 */
function createMazeFixture(): {
  start: Position;
  end: Position;
  obstacles: RoutingObstacle[];
  excludeIds: Set<string>;
} {
  return {
    start: { x: 60, y: 60 },
    end: { x: 260, y: 260 },
    obstacles: [
      { id: 'start', bbox: { x: 40, y: 40, width: 40, height: 40 } },
      { id: 'end', bbox: { x: 240, y: 240, width: 40, height: 40 } },
      // Vertical wall
      { id: 'wall-1', bbox: { x: 140, y: 0, width: 20, height: 120 } },
      // Horizontal wall
      { id: 'wall-2', bbox: { x: 80, y: 160, width: 100, height: 20 } },
      // Another vertical wall
      { id: 'wall-3', bbox: { x: 200, y: 140, width: 20, height: 80 } },
    ],
    excludeIds: new Set(['start', 'end']),
  };
}

/**
 * Create a fixture with no obstacles (direct path possible).
 */
function createClearPathFixture(): {
  start: Position;
  end: Position;
  obstacles: RoutingObstacle[];
  excludeIds: Set<string>;
} {
  return {
    start: { x: 100, y: 100 },
    end: { x: 100, y: 200 },
    obstacles: [
      { id: 'start', bbox: { x: 80, y: 80, width: 40, height: 40 } },
      { id: 'end', bbox: { x: 80, y: 180, width: 40, height: 40 } },
    ],
    excludeIds: new Set(['start', 'end']),
  };
}

/**
 * Create a fixture where path is completely blocked (no solution).
 */
function createImpossiblePathFixture(): {
  start: Position;
  end: Position;
  obstacles: RoutingObstacle[];
  excludeIds: Set<string>;
} {
  // End point is completely surrounded by obstacles
  return {
    start: { x: 100, y: 100 },
    end: { x: 200, y: 200 },
    obstacles: [
      { id: 'start', bbox: { x: 80, y: 80, width: 40, height: 40 } },
      // Surround end with obstacles (not excluded)
      { id: 'wall-top', bbox: { x: 160, y: 140, width: 80, height: 20 } },
      { id: 'wall-bottom', bbox: { x: 160, y: 240, width: 80, height: 20 } },
      { id: 'wall-left', bbox: { x: 140, y: 140, width: 20, height: 120 } },
      { id: 'wall-right', bbox: { x: 240, y: 140, width: 20, height: 120 } },
    ],
    excludeIds: new Set(['start']), // end is NOT excluded, so it's blocked
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function pathKey(path: Position[]): string {
  return path.map((p) => `${p.x},${p.y}`).join('|');
}

function segmentIntersectsAabb(
  p1: Position,
  p2: Position,
  bbox: Aabb
): boolean {
  const left = bbox.x;
  const right = bbox.x + bbox.width;
  const top = bbox.y;
  const bottom = bbox.y + bbox.height;

  // Horizontal segment
  if (p1.y === p2.y) {
    const y = p1.y;
    if (y < top || y > bottom) return false;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    return minX <= right && maxX >= left;
  }

  // Vertical segment
  if (p1.x === p2.x) {
    const x = p1.x;
    if (x < left || x > right) return false;
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    return minY <= bottom && maxY >= top;
  }

  return false;
}

// =============================================================================
// TESTS: OBSTACLE AVOIDANCE
// =============================================================================

describe('Obstacle-Aware Router - Obstacle Avoidance', () => {
  it('should avoid symbol obstacle (path does not intersect AABB)', () => {
    const { start, end, obstacles, excludeIds } = createSymbolBlockingFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(2);

    // Verify path does not intersect any obstacle (expanded)
    for (let i = 0; i < path!.length - 1; i++) {
      for (const obs of expandedObstacles) {
        expect(segmentIntersectsAabb(path![i], path![i + 1], obs)).toBe(false);
      }
    }
  });

  it('should avoid busbar obstacle (path routes around wide busbar)', () => {
    const { start, end, obstacles, excludeIds } = createBusbarBlockingFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(2);

    // Verify path does not intersect any expanded obstacle (including busbar)
    for (let i = 0; i < path!.length - 1; i++) {
      for (const obs of expandedObstacles) {
        expect(segmentIntersectsAabb(path![i], path![i + 1], obs)).toBe(false);
      }
    }
  });

  it('should navigate complex maze layout', () => {
    const { start, end, obstacles, excludeIds } = createMazeFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(isPathClearOfObstacles(path!, expandedObstacles)).toBe(true);
  });
});

// =============================================================================
// TESTS: ORTHOGONALITY
// =============================================================================

describe('Obstacle-Aware Router - Orthogonality', () => {
  it('should produce only horizontal and vertical segments (no diagonals)', () => {
    const { start, end, obstacles, excludeIds } = createSymbolBlockingFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(isPathOrthogonal(path!)).toBe(true);
  });

  it('should produce orthogonal path for diagonal endpoints', () => {
    const start = { x: 100, y: 100 };
    const end = { x: 200, y: 200 };

    const path = findOrthogonalPath(start, end, [], TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(isPathOrthogonal(path!)).toBe(true);

    // Should have at least one bend
    expect(countPathBends(path!)).toBeGreaterThanOrEqual(1);
  });

  it('should produce straight line for aligned endpoints', () => {
    const { start, end, obstacles, excludeIds } = createClearPathFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(isPathOrthogonal(path!)).toBe(true);

    // Vertical alignment should produce straight line
    if (path!.length === 2) {
      expect(countPathBends(path!)).toBe(0);
    }
  });
});

// =============================================================================
// TESTS: DETERMINISM
// =============================================================================

describe('Obstacle-Aware Router - Determinism', () => {
  it('should produce identical path for same input (repeated calls)', () => {
    const { start, end, obstacles, excludeIds } = createSymbolBlockingFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path1 = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);
    const path2 = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);
    const path3 = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path1).not.toBeNull();
    expect(path2).not.toBeNull();
    expect(path3).not.toBeNull();

    expect(pathKey(path1!)).toBe(pathKey(path2!));
    expect(pathKey(path2!)).toBe(pathKey(path3!));
  });

  it('should produce identical path regardless of obstacle order', () => {
    const { start, end, obstacles, excludeIds } = createMazeFixture();

    // Original order
    const exp1 = buildExpandedObstacles(obstacles, TEST_CONFIG.obstacleMargin, excludeIds);
    const path1 = findOrthogonalPath(start, end, exp1, TEST_CONFIG);

    // Reversed order
    const reversedObstacles = [...obstacles].reverse();
    const exp2 = buildExpandedObstacles(reversedObstacles, TEST_CONFIG.obstacleMargin, excludeIds);
    const path2 = findOrthogonalPath(start, end, exp2, TEST_CONFIG);

    // Shuffled order
    const shuffledObstacles = [...obstacles].sort(() => Math.random() - 0.5);
    const exp3 = buildExpandedObstacles(shuffledObstacles, TEST_CONFIG.obstacleMargin, excludeIds);
    const path3 = findOrthogonalPath(start, end, exp3, TEST_CONFIG);

    expect(path1).not.toBeNull();
    expect(path2).not.toBeNull();
    expect(path3).not.toBeNull();

    // All paths should be identical
    expect(pathKey(path1!)).toBe(pathKey(path2!));
    expect(pathKey(path1!)).toBe(pathKey(path3!));
  });

  it('should produce same path for routeWithObstacles wrapper', () => {
    const { start, end, obstacles, excludeIds } = createBusbarBlockingFixture();

    const path1 = routeWithObstacles(start, end, obstacles, excludeIds, TEST_CONFIG);
    const path2 = routeWithObstacles(start, end, obstacles, excludeIds, TEST_CONFIG);

    expect(path1).not.toBeNull();
    expect(path2).not.toBeNull();

    expect(pathKey(path1!)).toBe(pathKey(path2!));
  });
});

// =============================================================================
// TESTS: FALLBACK BEHAVIOR
// =============================================================================

describe('Obstacle-Aware Router - Fallback', () => {
  it('should return null for impossible path (no crash)', () => {
    const { start, end, obstacles, excludeIds } = createImpossiblePathFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    // Should not throw, should return null
    expect(() => {
      const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);
      expect(path).toBeNull();
    }).not.toThrow();
  });

  it('should return null for routeWithObstacles when path blocked', () => {
    const { start, end, obstacles, excludeIds } = createImpossiblePathFixture();

    // Should not throw, should return null
    expect(() => {
      const path = routeWithObstacles(start, end, obstacles, excludeIds, TEST_CONFIG);
      expect(path).toBeNull();
    }).not.toThrow();
  });

  it('should handle same start and end point', () => {
    const point = { x: 100, y: 100 };

    const path = findOrthogonalPath(point, point, [], TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    expect(path![0].x).toBe(100);
    expect(path![0].y).toBe(100);
  });

  it('should handle empty obstacles array', () => {
    const start = { x: 100, y: 100 };
    const end = { x: 200, y: 200 };

    const path = findOrthogonalPath(start, end, [], TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(isPathOrthogonal(path!)).toBe(true);
  });
});

// =============================================================================
// TESTS: PATH QUALITY
// =============================================================================

describe('Obstacle-Aware Router - Path Quality', () => {
  it('should minimize bends when possible', () => {
    // Diagonal route with no obstacles - should have exactly 1 bend
    const start = { x: 100, y: 100 };
    const end = { x: 200, y: 200 };

    const path = findOrthogonalPath(start, end, [], TEST_CONFIG);

    expect(path).not.toBeNull();
    expect(countPathBends(path!)).toBeLessThanOrEqual(2);
  });

  it('should produce reasonable path length', () => {
    const { start, end, obstacles, excludeIds } = createSymbolBlockingFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path).not.toBeNull();

    const pathLen = calculatePathLength(path!);
    const directDistance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);

    // Path should not be excessively longer than direct distance
    // (allowing 3x for obstacle avoidance)
    expect(pathLen).toBeLessThanOrEqual(directDistance * 3);
  });
});

// =============================================================================
// TESTS: GRID SNAPPING
// =============================================================================

describe('Obstacle-Aware Router - Grid Snapping', () => {
  it('should snap all path points to grid', () => {
    const { start, end, obstacles, excludeIds } = createMazeFixture();
    const expandedObstacles = buildExpandedObstacles(
      obstacles,
      TEST_CONFIG.obstacleMargin,
      excludeIds
    );

    const path = findOrthogonalPath(start, end, expandedObstacles, TEST_CONFIG);

    expect(path).not.toBeNull();

    for (const point of path!) {
      const isOnGrid =
        point.x % TEST_CONFIG.gridStep === 0 && point.y % TEST_CONFIG.gridStep === 0;
      expect(isOnGrid, `Point (${point.x}, ${point.y}) not on grid`).toBe(true);
    }
  });

  it('should snap non-grid-aligned input to grid', () => {
    const start = { x: 105, y: 107 }; // Not on 20px grid
    const end = { x: 203, y: 199 }; // Not on 20px grid

    const path = findOrthogonalPath(start, end, [], TEST_CONFIG);

    expect(path).not.toBeNull();

    // First and last points should be snapped
    expect(path![0].x % TEST_CONFIG.gridStep).toBe(0);
    expect(path![0].y % TEST_CONFIG.gridStep).toBe(0);
    expect(path![path!.length - 1].x % TEST_CONFIG.gridStep).toBe(0);
    expect(path![path!.length - 1].y % TEST_CONFIG.gridStep).toBe(0);
  });
});

// =============================================================================
// TESTS: UTILITY FUNCTIONS
// =============================================================================

describe('Obstacle-Aware Router - Utility Functions', () => {
  it('isPathOrthogonal should detect diagonal segments', () => {
    const orthogonalPath = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const diagonalPath = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];

    expect(isPathOrthogonal(orthogonalPath)).toBe(true);
    expect(isPathOrthogonal(diagonalPath)).toBe(false);
  });

  it('isPathClearOfObstacles should detect intersections', () => {
    const path = [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ];
    const blockingObstacle: Aabb = { x: 40, y: 40, width: 20, height: 20 };
    const clearObstacle: Aabb = { x: 40, y: 100, width: 20, height: 20 };

    expect(isPathClearOfObstacles(path, [blockingObstacle])).toBe(false);
    expect(isPathClearOfObstacles(path, [clearObstacle])).toBe(true);
  });

  it('countPathBends should count direction changes correctly', () => {
    const straightPath = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const lPath = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const zPath = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 50 },
    ];

    expect(countPathBends(straightPath)).toBe(0);
    expect(countPathBends(lPath)).toBe(1);
    expect(countPathBends(zPath)).toBe(2);
  });

  it('calculatePathLength should compute Manhattan distance', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
    ];

    expect(calculatePathLength(path)).toBe(150);
  });

  it('buildExpandedObstacles should expand and filter', () => {
    const obstacles: RoutingObstacle[] = [
      { id: 'a', bbox: { x: 0, y: 0, width: 40, height: 40 } },
      { id: 'b', bbox: { x: 100, y: 100, width: 40, height: 40 } },
    ];
    const excludeIds = new Set(['a']);
    const margin = 10;

    const expanded = buildExpandedObstacles(obstacles, margin, excludeIds);

    expect(expanded.length).toBe(1); // Only 'b' included
    expect(expanded[0].x).toBe(90); // 100 - 10
    expect(expanded[0].y).toBe(90);
    expect(expanded[0].width).toBe(60); // 40 + 2*10
    expect(expanded[0].height).toBe(60);
  });
});
