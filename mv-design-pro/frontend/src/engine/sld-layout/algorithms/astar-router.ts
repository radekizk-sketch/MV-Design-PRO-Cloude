/**
 * A* Orthogonal Router — routing krawędzi omijający prostokątne przeszkody.
 *
 * ALGORYTM:
 * - Siatka: gridSize px (domyślnie 20 px = GRID_BASE)
 * - Heurystyka: odległość Manhattan
 * - Ruchy: tylko H (poziomo) i V (pionowo) → ścieżka ortogonalna
 * - Przeszkody: prostokąty (StationBoundingBox, ElementPosition.bounds)
 * - Fallback: L-shape gdy maxIterations przekroczone
 *
 * DETERMINIZM: ten sam from/to/obstacles → identyczna ścieżka.
 */

import type { ElementPosition, LayoutConfig, PathSegment, Rectangle } from '../types';

// =============================================================================
// TYPY
// =============================================================================

export interface AStarConfig {
  /** Rozmiar siatki [px]. Domyślnie 20 (GRID_BASE). */
  gridSize: number;
  /** Lista przeszkód (NO_ROUTE_RECT). */
  obstacles: Rectangle[];
  /** Szerokość kanału routingu [px]. Domyślnie 40 px. */
  channelWidth: number;
  /** Maksymalna liczba węzłów do odwiedzenia (limit). Domyślnie 10 000. */
  maxIterations: number;
}

export interface AStarPath {
  /** Ciąg ortogonalnych segmentów H/V. */
  segments: PathSegment[];
  /** Łączna długość ścieżki [px]. */
  cost: number;
  /** Liczba omiętych przeszkód. */
  bypassed: number;
}

const DEFAULT_ASTAR_CONFIG: AStarConfig = {
  gridSize: 20,
  obstacles: [],
  channelWidth: 40,
  maxIterations: 10_000,
};

// =============================================================================
// GŁÓWNA FUNKCJA
// =============================================================================

/**
 * Wyznacza ortogonalną ścieżkę H/V omijając prostokątne przeszkody.
 *
 * @param from   - punkt startowy
 * @param to     - punkt docelowy
 * @param config - konfiguracja routera
 * @returns AStarPath z segmentami, kosztem i liczbą omiętych przeszkód
 */
export function routeWithAstar(from: Point, to: Point, config?: Partial<AStarConfig>): AStarPath {
  const cfg: AStarConfig = { ...DEFAULT_ASTAR_CONFIG, ...config };
  const { gridSize, obstacles, maxIterations } = cfg;

  // Snapnij start/end do siatki
  const startG = snapToGrid({ x: Math.round(from.x / gridSize) * gridSize, y: Math.round(from.y / gridSize) * gridSize }, gridSize);
  const endG   = snapToGrid({ x: Math.round(to.x / gridSize) * gridSize, y: Math.round(to.y / gridSize) * gridSize }, gridSize);

  // Jeśli start === end → pusta ścieżka
  if (startG.x === endG.x && startG.y === endG.y) {
    return { segments: [], cost: 0, bypassed: 0 };
  }

  // Jeśli brak przeszkód → trivial L-path
  if (obstacles.length === 0) {
    return buildLPath(from, to);
  }

  // Rozszerz przeszkody o margin (channelWidth / 2)
  const margin = Math.max(cfg.channelWidth / 2, gridSize);
  const expandedObstacles = obstacles.map((r) => expandRect(r, margin));

  // A* na siatce
  const path = astarSearch(startG, endG, expandedObstacles, gridSize, maxIterations);

  if (!path) {
    // Fallback: L-path
    return buildLPath(from, to);
  }

  const segments = pointsToSegments(path);
  const cost = segments.reduce(
    (acc, s) => acc + Math.abs(s.to.x - s.from.x) + Math.abs(s.to.y - s.from.y),
    0
  );
  const bypassed = countBypassedObstacles(segments, obstacles);

  return { segments, cost, bypassed };
}

/**
 * Buduje listę przeszkód z pozycji elementów (używa ElementPosition.bounds + padding).
 *
 * @param positions - mapa symbolId → ElementPosition
 * @param padding   - margines wokół bounds [px]. Domyślnie 10.
 */
export function buildObstacleList(
  positions: Map<string, ElementPosition>,
  padding = 10
): Rectangle[] {
  const obstacles: Rectangle[] = [];
  for (const pos of positions.values()) {
    obstacles.push(expandRect(pos.bounds, padding));
  }
  return obstacles;
}

// =============================================================================
// A* SEARCH
// =============================================================================

interface GridNode {
  x: number;
  y: number;
}

interface AStarNode {
  pos:    GridNode;
  g:      number;  // koszt od startu
  h:      number;  // heurystyka
  f:      number;  // g + h
  parent: AStarNode | null;
}

function astarSearch(
  start:         GridNode,
  end:           GridNode,
  obstacles:     Rectangle[],
  gridSize:      number,
  maxIterations: number
): Point[] | null {
  const key = (n: GridNode) => `${n.x},${n.y}`;

  const openSet  = new Map<string, AStarNode>();
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    pos: start,
    g: 0,
    h: manhattan(start, end),
    f: manhattan(start, end),
    parent: null,
  };

  openSet.set(key(start), startNode);

  let iterations = 0;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    // Wybierz węzeł z najniższym f (deterministyczny tiebreak: x, y)
    const current = pickLowest(openSet);
    const currentKey = key(current.pos);

    if (current.pos.x === end.x && current.pos.y === end.y) {
      return reconstructPath(current);
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    // Sąsiedzi: 4 kierunki (ortogonalne)
    const neighbors = getNeighbors(current.pos, gridSize);

    for (const neighbor of neighbors) {
      const nKey = key(neighbor);
      if (closedSet.has(nKey)) continue;
      if (isInsideObstacle(neighbor, obstacles)) continue;

      const g = current.g + gridSize;
      const h = manhattan(neighbor, end);
      const f = g + h;

      const existing = openSet.get(nKey);
      if (!existing || g < existing.g) {
        openSet.set(nKey, { pos: neighbor, g, h, f, parent: current });
      }
    }
  }

  return null;
}

function pickLowest(openSet: Map<string, AStarNode>): AStarNode {
  let best: AStarNode | null = null;
  for (const node of openSet.values()) {
    if (!best) {
      best = node;
      continue;
    }
    if (node.f < best.f) {
      best = node;
    } else if (node.f === best.f) {
      // Deterministyczny tiebreak: mniejsze x, potem y
      if (node.pos.x < best.pos.x || (node.pos.x === best.pos.x && node.pos.y < best.pos.y)) {
        best = node;
      }
    }
  }
  return best!;
}

function getNeighbors(pos: GridNode, gridSize: number): GridNode[] {
  // Kolejność deterministyczna: góra, dół, lewo, prawo
  return [
    { x: pos.x,            y: pos.y - gridSize },
    { x: pos.x,            y: pos.y + gridSize },
    { x: pos.x - gridSize, y: pos.y            },
    { x: pos.x + gridSize, y: pos.y            },
  ];
}

function isInsideObstacle(pos: GridNode, obstacles: Rectangle[]): boolean {
  for (const obs of obstacles) {
    if (
      pos.x >= obs.x &&
      pos.x <= obs.x + obs.width &&
      pos.y >= obs.y &&
      pos.y <= obs.y + obs.height
    ) {
      return true;
    }
  }
  return false;
}

function manhattan(a: GridNode, b: GridNode): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(node: AStarNode): Point[] {
  const points: Point[] = [];
  let current: AStarNode | null = node;
  while (current) {
    points.unshift({ x: current.pos.x, y: current.pos.y });
    current = current.parent;
  }
  return points;
}

// =============================================================================
// POMOCNICZE
// =============================================================================

interface Point { x: number; y: number; }

function snapToGrid(p: Point, gridSize: number): Point {
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  };
}

function expandRect(r: Rectangle, margin: number): Rectangle {
  return {
    x:      r.x - margin,
    y:      r.y - margin,
    width:  r.width  + 2 * margin,
    height: r.height + 2 * margin,
  };
}

function pointsToSegments(points: Point[]): PathSegment[] {
  const segments: PathSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to   = points[i + 1];
    const kind: 'H' | 'V' = Math.abs(from.y - to.y) < 1 ? 'H' : 'V';
    segments.push({ from, to, kind });
  }
  return segments;
}

function buildLPath(from: Point, to: Point): AStarPath {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) < 1) {
    // Prosta pionowa
    const segments: PathSegment[] = [{ from, to, kind: 'V' }];
    return { segments, cost: Math.abs(dy), bypassed: 0 };
  }
  if (Math.abs(dy) < 1) {
    // Prosta pozioma
    const segments: PathSegment[] = [{ from, to, kind: 'H' }];
    return { segments, cost: Math.abs(dx), bypassed: 0 };
  }

  // L-shape: pionowo najpierw, potem poziomo
  const mid: Point = { x: from.x, y: to.y };
  const segments: PathSegment[] = [
    { from, to: mid,  kind: 'V' },
    { from: mid, to,  kind: 'H' },
  ];
  return { segments, cost: Math.abs(dx) + Math.abs(dy), bypassed: 0 };
}

function countBypassedObstacles(segments: PathSegment[], obstacles: Rectangle[]): number {
  let count = 0;
  for (const obs of obstacles) {
    const cx = obs.x + obs.width  / 2;
    const cy = obs.y + obs.height / 2;
    // Przeszkoda jest "ominięta" jeśli żaden segment przez nią nie przechodzi
    const crosses = segments.some((s) => segmentCrossesRect(s, obs));
    if (!crosses && segmentsBoundingBoxContains(segments, cx, cy)) {
      count++;
    }
  }
  return count;
}

function segmentCrossesRect(seg: PathSegment, rect: Rectangle): boolean {
  const minX = Math.min(seg.from.x, seg.to.x);
  const maxX = Math.max(seg.from.x, seg.to.x);
  const minY = Math.min(seg.from.y, seg.to.y);
  const maxY = Math.max(seg.from.y, seg.to.y);
  return (
    maxX >= rect.x && minX <= rect.x + rect.width &&
    maxY >= rect.y && minY <= rect.y + rect.height
  );
}

function segmentsBoundingBoxContains(segments: PathSegment[], cx: number, cy: number): boolean {
  if (segments.length === 0) return false;
  const allPoints = segments.flatMap((s) => [s.from, s.to]);
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
}

// Re-export config default
export { DEFAULT_ASTAR_CONFIG };
export type { LayoutConfig };
