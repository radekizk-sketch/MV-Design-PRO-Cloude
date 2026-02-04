/**
 * OBSTACLE-AWARE ORTHOGONAL ROUTER — Grid A* pathfinding for SLD connections
 *
 * PR-SLD-ROUTING-V2: Obstacle-aware orthogonal routing
 *
 * FEATURES:
 * - A* pathfinding on orthogonal grid
 * - AABB obstacle avoidance (symbols + busbars)
 * - 100% orthogonal paths (H/V only, no diagonals)
 * - Deterministic tie-breaking
 * - Minimizes bends, then path length
 *
 * DETERMINISM:
 * - Fixed direction order: RIGHT, DOWN, LEFT, UP
 * - Consistent tie-breaking by position coordinates
 * - Same input -> same output guaranteed
 */

import type { Position } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/** Axis-Aligned Bounding Box */
export interface Aabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Obstacle for routing */
export interface RoutingObstacle {
  id: string;
  bbox: Aabb;
}

/** Router configuration */
export interface ObstacleRouterConfig {
  /** Grid step size (px) */
  gridStep: number;
  /** Obstacle margin expansion (px) */
  obstacleMargin: number;
  /** Maximum search iterations (prevents infinite loops) */
  maxIterations: number;
  /** Maximum path length in grid cells */
  maxPathLength: number;
}

/** Default configuration */
export const DEFAULT_OBSTACLE_ROUTER_CONFIG: ObstacleRouterConfig = {
  gridStep: 20,
  obstacleMargin: 8,
  maxIterations: 5000,
  maxPathLength: 200,
};

// =============================================================================
// A* NODE
// =============================================================================

interface AStarNode {
  x: number;
  y: number;
  /** g = cost from start */
  g: number;
  /** h = heuristic to goal */
  h: number;
  /** f = g + h */
  f: number;
  /** Number of direction changes (bends) */
  bends: number;
  /** Parent node for path reconstruction */
  parent: AStarNode | null;
  /** Direction from parent (for bend counting) */
  directionFromParent: Direction | null;
}

/** Direction enum for deterministic ordering */
type Direction = 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';

/** Direction deltas - FIXED ORDER for determinism */
const DIRECTIONS: { dir: Direction; dx: number; dy: number }[] = [
  { dir: 'RIGHT', dx: 1, dy: 0 },
  { dir: 'DOWN', dx: 0, dy: 1 },
  { dir: 'LEFT', dx: -1, dy: 0 },
  { dir: 'UP', dx: 0, dy: -1 },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Snap coordinate to grid */
function snapToGrid(value: number, gridStep: number): number {
  return Math.round(value / gridStep) * gridStep;
}

/** Convert position to grid cell */
function toGridCell(pos: Position, gridStep: number): { gx: number; gy: number } {
  return {
    gx: Math.round(pos.x / gridStep),
    gy: Math.round(pos.y / gridStep),
  };
}

/** Node key for visited set (deterministic) */
function nodeKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

/** Manhattan distance heuristic */
function manhattan(gx1: number, gy1: number, gx2: number, gy2: number): number {
  return Math.abs(gx2 - gx1) + Math.abs(gy2 - gy1);
}

/** Expand AABB by margin */
function expandAabb(bbox: Aabb, margin: number): Aabb {
  return {
    x: bbox.x - margin,
    y: bbox.y - margin,
    width: bbox.width + 2 * margin,
    height: bbox.height + 2 * margin,
  };
}

/** Check if point is inside AABB */
function pointInAabb(x: number, y: number, bbox: Aabb): boolean {
  return x >= bbox.x && x <= bbox.x + bbox.width && y >= bbox.y && y <= bbox.y + bbox.height;
}

/** Check if segment intersects AABB (axis-aligned only) */
function segmentIntersectsAabb(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bbox: Aabb
): boolean {
  const left = bbox.x;
  const right = bbox.x + bbox.width;
  const top = bbox.y;
  const bottom = bbox.y + bbox.height;

  // Horizontal segment
  if (y1 === y2) {
    const y = y1;
    if (y < top || y > bottom) return false;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    return minX <= right && maxX >= left;
  }

  // Vertical segment
  if (x1 === x2) {
    const x = x1;
    if (x < left || x > right) return false;
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return minY <= bottom && maxY >= top;
  }

  // Non-axis-aligned (should not happen in orthogonal router)
  return false;
}

// =============================================================================
// OBSTACLE GRID
// =============================================================================

/**
 * Build expanded obstacle list for routing.
 *
 * @param obstacles - Raw obstacles
 * @param margin - Expansion margin
 * @param excludeIds - IDs to exclude (start/end symbols)
 */
export function buildExpandedObstacles(
  obstacles: RoutingObstacle[],
  margin: number,
  excludeIds: Set<string>
): Aabb[] {
  return obstacles
    .filter((o) => !excludeIds.has(o.id))
    .map((o) => expandAabb(o.bbox, margin));
}

/**
 * Check if a grid cell is blocked by any obstacle.
 */
function isCellBlocked(x: number, y: number, obstacles: Aabb[]): boolean {
  for (const obs of obstacles) {
    if (pointInAabb(x, y, obs)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if movement from one cell to another is blocked.
 */
function isMovementBlocked(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: Aabb[]
): boolean {
  // Check destination cell
  if (isCellBlocked(x2, y2, obstacles)) {
    return true;
  }

  // Check segment intersection
  for (const obs of obstacles) {
    if (segmentIntersectsAabb(x1, y1, x2, y2, obs)) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// A* PATHFINDING
// =============================================================================

/**
 * Priority queue implementation using sorted array.
 * Sorted by: f-score, then bends, then position (for determinism).
 */
class PriorityQueue {
  private items: AStarNode[] = [];

  push(node: AStarNode): void {
    this.items.push(node);
    // Sort by: f (ascending), then bends (ascending), then y (ascending), then x (ascending)
    this.items.sort((a, b) => {
      if (a.f !== b.f) return a.f - b.f;
      if (a.bends !== b.bends) return a.bends - b.bends;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }

  pop(): AStarNode | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Reconstruct path from A* result.
 */
function reconstructPath(endNode: AStarNode): Position[] {
  const path: Position[] = [];
  let current: AStarNode | null = endNode;

  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path;
}

/**
 * Reduce collinear points in path.
 * Only keeps bend points + start + end.
 */
function reducePath(path: Position[]): Position[] {
  if (path.length <= 2) return path;

  const reduced: Position[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = reduced[reduced.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Check if curr is a bend point
    const sameX = prev.x === curr.x && curr.x === next.x;
    const sameY = prev.y === curr.y && curr.y === next.y;

    // Keep point if it's a bend (direction change)
    if (!sameX && !sameY) {
      reduced.push(curr);
    }
  }

  reduced.push(path[path.length - 1]);
  return reduced;
}

/**
 * A* Orthogonal Pathfinding
 *
 * Finds shortest orthogonal path avoiding obstacles.
 * Minimizes: number of bends, then total length.
 *
 * DETERMINISTIC: Same input -> same output
 *
 * @param start - Start position
 * @param end - End position
 * @param obstacles - Expanded obstacles (already filtered)
 * @param config - Router configuration
 * @returns Path as array of positions, or null if no path found
 */
export function findOrthogonalPath(
  start: Position,
  end: Position,
  obstacles: Aabb[],
  config: ObstacleRouterConfig = DEFAULT_OBSTACLE_ROUTER_CONFIG
): Position[] | null {
  const { gridStep, maxIterations, maxPathLength } = config;

  // Snap start/end to grid
  const startSnapped = {
    x: snapToGrid(start.x, gridStep),
    y: snapToGrid(start.y, gridStep),
  };
  const endSnapped = {
    x: snapToGrid(end.x, gridStep),
    y: snapToGrid(end.y, gridStep),
  };

  // Convert to grid cells
  const startCell = toGridCell(startSnapped, gridStep);
  const endCell = toGridCell(endSnapped, gridStep);

  // Same cell = single point path
  if (startCell.gx === endCell.gx && startCell.gy === endCell.gy) {
    return [startSnapped];
  }

  // Quick check: if end is blocked, no path possible
  if (isCellBlocked(endSnapped.x, endSnapped.y, obstacles)) {
    return null;
  }

  // Initialize A*
  const openSet = new PriorityQueue();
  const closedSet = new Set<string>();
  const gScores = new Map<string, number>();

  const startNode: AStarNode = {
    x: startSnapped.x,
    y: startSnapped.y,
    g: 0,
    h: manhattan(startCell.gx, startCell.gy, endCell.gx, endCell.gy),
    f: manhattan(startCell.gx, startCell.gy, endCell.gx, endCell.gy),
    bends: 0,
    parent: null,
    directionFromParent: null,
  };

  openSet.push(startNode);
  gScores.set(nodeKey(startCell.gx, startCell.gy), 0);

  let iterations = 0;

  while (!openSet.isEmpty() && iterations < maxIterations) {
    iterations++;

    const current = openSet.pop()!;
    const currentKey = nodeKey(
      Math.round(current.x / gridStep),
      Math.round(current.y / gridStep)
    );

    // Goal reached
    if (current.x === endSnapped.x && current.y === endSnapped.y) {
      const path = reconstructPath(current);
      return reducePath(path);
    }

    // Skip if already processed
    if (closedSet.has(currentKey)) {
      continue;
    }
    closedSet.add(currentKey);

    // Check path length limit
    if (current.g > maxPathLength) {
      continue;
    }

    // Explore neighbors (FIXED ORDER for determinism)
    for (const { dir, dx, dy } of DIRECTIONS) {
      const nextX = current.x + dx * gridStep;
      const nextY = current.y + dy * gridStep;
      const nextKey = nodeKey(
        Math.round(nextX / gridStep),
        Math.round(nextY / gridStep)
      );

      // Skip if already in closed set
      if (closedSet.has(nextKey)) {
        continue;
      }

      // Check if movement is blocked
      if (isMovementBlocked(current.x, current.y, nextX, nextY, obstacles)) {
        continue;
      }

      // Calculate cost
      const tentativeG = current.g + 1;

      // Check if this is a bend (direction change)
      const isBend =
        current.directionFromParent !== null && current.directionFromParent !== dir;
      const newBends = current.bends + (isBend ? 1 : 0);

      // Check if this path is better
      const existingG = gScores.get(nextKey);
      if (existingG !== undefined && tentativeG >= existingG) {
        continue;
      }

      gScores.set(nextKey, tentativeG);

      const h = manhattan(
        Math.round(nextX / gridStep),
        Math.round(nextY / gridStep),
        endCell.gx,
        endCell.gy
      );

      // f-score includes bend penalty for better paths
      // Bends are penalized to prefer straighter paths
      const bendPenalty = newBends * 0.5;

      const neighbor: AStarNode = {
        x: nextX,
        y: nextY,
        g: tentativeG,
        h,
        f: tentativeG + h + bendPenalty,
        bends: newBends,
        parent: current,
        directionFromParent: dir,
      };

      openSet.push(neighbor);
    }
  }

  // No path found
  return null;
}

// =============================================================================
// PATH VALIDATION
// =============================================================================

/**
 * Verify path is fully orthogonal (H/V segments only).
 */
export function isPathOrthogonal(path: Position[]): boolean {
  if (path.length < 2) return true;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];

    const isHorizontal = p1.y === p2.y;
    const isVertical = p1.x === p2.x;

    if (!isHorizontal && !isVertical) {
      return false;
    }
  }

  return true;
}

/**
 * Verify path does not intersect any obstacles.
 */
export function isPathClearOfObstacles(path: Position[], obstacles: Aabb[]): boolean {
  if (path.length < 2) return true;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];

    for (const obs of obstacles) {
      if (segmentIntersectsAabb(p1.x, p1.y, p2.x, p2.y, obs)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Count number of bends in path.
 */
export function countPathBends(path: Position[]): number {
  if (path.length < 3) return 0;

  let bends = 0;

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    const prevHorizontal = prev.y === curr.y;
    const nextHorizontal = curr.y === next.y;

    if (prevHorizontal !== nextHorizontal) {
      bends++;
    }
  }

  return bends;
}

/**
 * Calculate total path length (Manhattan distance).
 */
export function calculatePathLength(path: Position[]): number {
  let total = 0;

  for (let i = 0; i < path.length - 1; i++) {
    total += Math.abs(path[i + 1].x - path[i].x) + Math.abs(path[i + 1].y - path[i].y);
  }

  return total;
}

// =============================================================================
// MAIN EXPORT: ROUTE WITH OBSTACLES
// =============================================================================

/**
 * Route between two points avoiding obstacles.
 *
 * This is the main entry point for obstacle-aware routing.
 *
 * DETERMINISTIC: Same input -> same output
 *
 * @param start - Start position (port point)
 * @param end - End position (port point)
 * @param obstacles - Routing obstacles with IDs
 * @param excludeIds - Symbol IDs to exclude (start/end symbols)
 * @param config - Router configuration
 * @returns Path as array of positions, or null if no path found
 */
export function routeWithObstacles(
  start: Position,
  end: Position,
  obstacles: RoutingObstacle[],
  excludeIds: Set<string>,
  config: Partial<ObstacleRouterConfig> = {}
): Position[] | null {
  const fullConfig: ObstacleRouterConfig = {
    ...DEFAULT_OBSTACLE_ROUTER_CONFIG,
    ...config,
  };

  // Build expanded obstacles excluding start/end symbols
  const expandedObstacles = buildExpandedObstacles(
    obstacles,
    fullConfig.obstacleMargin,
    excludeIds
  );

  // Find path
  const path = findOrthogonalPath(start, end, expandedObstacles, fullConfig);

  // Validate result
  if (path && path.length >= 2) {
    // Verify path is valid
    if (!isPathOrthogonal(path)) {
      return null;
    }

    if (!isPathClearOfObstacles(path, expandedObstacles)) {
      return null;
    }
  }

  return path;
}
