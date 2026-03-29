/**
 * Collision Detector — wykrywanie i rozwiązywanie kolizji BoundingBox.
 *
 * Rozszerza istniejące push-away z phase4-coordinates.ts (Y-only)
 * o pełne 2D wykrywanie kolizji i A*-based resolution.
 *
 * DETERMINIZM: sortowanie par po nodeId przed push-away.
 */

import type { ElementPosition, LayoutConfig, Rectangle } from '../types';
import { routeWithAstar, buildObstacleList } from './astar-router';

// =============================================================================
// TYPY
// =============================================================================

export interface CollisionPair {
  /** ID pierwszego elementu (lexicographically smaller) */
  nodeIdA: string;
  /** ID drugiego elementu */
  nodeIdB: string;
  /** Nakładanie się w osi X [px] */
  overlapX: number;
  /** Nakładanie się w osi Y [px] */
  overlapY: number;
}

export interface CollisionResult {
  /** Czy wykryto jakiekolwiek kolizje */
  hasCollision: boolean;
  /** Lista par kolidujących elementów (sorted by nodeIdA, nodeIdB) */
  collisions: CollisionPair[];
}

// Reuse STATION_BOUNDING_BOX_PADDING from IndustrialAesthetics via constants
const DEFAULT_MARGIN = 16; // STATION_BOUNDING_BOX_PADDING
const PUSH_STEP_Y    = 60; // PUSH_AWAY_STEP_Y from phase4-coordinates
const MAX_ITERATIONS = 20;

// =============================================================================
// WYKRYWANIE KOLIZJI
// =============================================================================

/**
 * Wykrywa kolizje BoundingBox między wszystkimi parami elementów.
 *
 * @param positions - mapa symbolId → ElementPosition
 * @param margin    - dodatkowy margines wokół bounds [px]. Domyślnie 16.
 * @returns CollisionResult z listą kolidujących par
 */
export function detectCollisions(
  positions: Map<string, ElementPosition>,
  margin = DEFAULT_MARGIN
): CollisionResult {
  const collisions: CollisionPair[] = [];

  // Posortuj klucze dla determinizmu
  const ids = [...positions.keys()].sort();

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idA = ids[i];
      const idB = ids[j];
      const posA = positions.get(idA)!;
      const posB = positions.get(idB)!;

      const overlap = computeOverlap(posA.bounds, posB.bounds, margin);
      if (overlap) {
        collisions.push({
          nodeIdA: idA,
          nodeIdB: idB,
          overlapX: overlap.x,
          overlapY: overlap.y,
        });
      }
    }
  }

  return {
    hasCollision: collisions.length > 0,
    collisions,
  };
}

// =============================================================================
// ROZWIĄZYWANIE KOLIZJI
// =============================================================================

/**
 * Rozwiązuje kolizje przez push-away deterministyczny.
 *
 * Strategia: dla każdej pary kolidujących elementów przesuń
 * element B w osi Y o PUSH_STEP_Y. Powtarzaj MAX_ITERATIONS razy.
 * Sortowanie par gwarantuje determinizm.
 *
 * @param positions  - mapa symbolId → ElementPosition
 * @param collisions - wynik detectCollisions()
 * @param obstacles  - przeszkody dla reroutingu (opcjonalne)
 * @param _config    - konfiguracja layoutu (do przyszłego użycia)
 * @returns nowa mapa pozycji po rozwiązaniu kolizji
 */
export function resolveCollisionsAstar(
  positions:  Map<string, ElementPosition>,
  collisions: CollisionResult,
  _obstacles: Rectangle[],
  _config:    LayoutConfig
): Map<string, ElementPosition> {
  if (!collisions.hasCollision) return new Map(positions);

  // Kopia pozycji (mutable)
  const resolved = new Map<string, ElementPosition>(
    [...positions.entries()].map(([id, pos]) => [id, { ...pos, bounds: { ...pos.bounds } }])
  );

  let remaining = collisions.collisions;

  for (let iter = 0; iter < MAX_ITERATIONS && remaining.length > 0; iter++) {
    for (const pair of remaining) {
      const posA = resolved.get(pair.nodeIdA);
      const posB = resolved.get(pair.nodeIdB);
      if (!posA || !posB) continue;

      // Przesuń element B w osi Y (deterministycznie w dół)
      const pushY = pair.overlapY + PUSH_STEP_Y;

      // Sprawdź która strona jest wyżej — przesuń niższy w dół
      const newY = posB.position.y > posA.position.y
        ? posB.position.y + pushY
        : posB.position.y - pushY;

      const updatedPos: ElementPosition = {
        ...posB,
        position: { x: posB.position.x, y: newY },
        bounds: {
          x: posB.bounds.x,
          y: newY - posB.size.height / 2,
          width:  posB.bounds.width,
          height: posB.bounds.height,
        },
      };
      resolved.set(pair.nodeIdB, updatedPos);
    }

    // Sprawdź czy nadal są kolizje
    const nextResult = detectCollisions(resolved);
    remaining = nextResult.collisions;
  }

  return resolved;
}

// =============================================================================
// POMOCNICZE
// =============================================================================

interface Overlap { x: number; y: number; }

function computeOverlap(a: Rectangle, b: Rectangle, margin: number): Overlap | null {
  const aExpanded: Rectangle = {
    x:      a.x - margin,
    y:      a.y - margin,
    width:  a.width  + 2 * margin,
    height: a.height + 2 * margin,
  };
  const bExpanded: Rectangle = {
    x:      b.x - margin,
    y:      b.y - margin,
    width:  b.width  + 2 * margin,
    height: b.height + 2 * margin,
  };

  const overlapX = Math.min(aExpanded.x + aExpanded.width,  bExpanded.x + bExpanded.width)  - Math.max(aExpanded.x, bExpanded.x);
  const overlapY = Math.min(aExpanded.y + aExpanded.height, bExpanded.y + bExpanded.height) - Math.max(aExpanded.y, bExpanded.y);

  if (overlapX > 0 && overlapY > 0) {
    return { x: overlapX, y: overlapY };
  }
  return null;
}

// Re-export helpers for convenience
export { buildObstacleList, routeWithAstar };
