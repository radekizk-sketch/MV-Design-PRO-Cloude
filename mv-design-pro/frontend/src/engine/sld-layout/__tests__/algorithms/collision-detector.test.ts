/**
 * Testy Collision Detector
 *
 * Pokrycie:
 * - 2 elementy bez kolizji → hasCollision: false
 * - 2 elementy z kolizją → hasCollision: true, poprawne overlapX/Y
 * - 4 elementy (2 kolizje) → collisions.length === 2
 * - resolveCollisionsAstar → brak kolizji po rozwiązaniu
 * - 50× determinizm
 */

import { describe, it, expect } from 'vitest';
import { detectCollisions, resolveCollisionsAstar } from '../../algorithms/collision-detector';
import { buildObstacleList } from '../../algorithms/astar-router';
import type { ElementPosition, LayoutConfig } from '../../types';
import { DEFAULT_LAYOUT_CONFIG } from '../../types';

// =============================================================================
// HELPERS
// =============================================================================

function makePos(id: string, x: number, y: number, w = 60, h = 40): ElementPosition {
  return {
    symbolId:       id,
    position:       { x, y },
    size:           { width: w, height: h },
    bounds:         { x: x - w / 2, y: y - h / 2, width: w, height: h },
    voltageBandId:  'band1',
    autoPositioned: true,
    isQuarantined:  false,
  };
}

// =============================================================================
// TESTY
// =============================================================================

describe('detectCollisions', () => {
  it('2 elementy bez kolizji → hasCollision: false', () => {
    const positions = new Map<string, ElementPosition>([
      ['a', makePos('a', 100, 100)],
      ['b', makePos('b', 400, 100)],   // 300px między centrami
    ]);
    const result = detectCollisions(positions, 0);
    expect(result.hasCollision).toBe(false);
    expect(result.collisions).toHaveLength(0);
  });

  it('2 elementy nakładające się → hasCollision: true', () => {
    const positions = new Map<string, ElementPosition>([
      ['a', makePos('a', 100, 100)],
      ['b', makePos('b', 110, 100)],   // 10px między centrami → nakładanie
    ]);
    const result = detectCollisions(positions, 0);
    expect(result.hasCollision).toBe(true);
    expect(result.collisions).toHaveLength(1);
    expect(result.collisions[0].nodeIdA).toBe('a');
    expect(result.collisions[0].nodeIdB).toBe('b');
    expect(result.collisions[0].overlapX).toBeGreaterThan(0);
    expect(result.collisions[0].overlapY).toBeGreaterThan(0);
  });

  it('para sortowana lexicographically (nodeIdA < nodeIdB)', () => {
    const positions = new Map<string, ElementPosition>([
      ['z', makePos('z', 100, 100)],
      ['a', makePos('a', 110, 100)],
    ]);
    const result = detectCollisions(positions, 0);
    if (result.hasCollision) {
      expect(result.collisions[0].nodeIdA.localeCompare(result.collisions[0].nodeIdB)).toBeLessThan(0);
    }
  });

  it('margin=16 powoduje wykrycie kolizji przy większym odstępie', () => {
    const positions = new Map<string, ElementPosition>([
      ['a', makePos('a', 100, 100, 40, 40)],
      ['b', makePos('b', 170, 100, 40, 40)],   // 70px między centrami, 50px między bounds
    ]);
    const withoutMargin = detectCollisions(positions, 0);
    const withMargin    = detectCollisions(positions, 16);

    // Bez marginu: bounds: [80,80,40,40] vs [150,80,40,40] → odstęp 30px → brak kolizji
    expect(withoutMargin.hasCollision).toBe(false);
    // Z marginem 16: expanded bounds nakładają się
    expect(withMargin.hasCollision).toBe(true);
  });

  it('4 elementy (2 pary kolizji)', () => {
    const positions = new Map<string, ElementPosition>([
      ['a', makePos('a', 100, 100)],
      ['b', makePos('b', 110, 100)],   // koliduje z a
      ['c', makePos('c', 400, 200)],
      ['d', makePos('d', 410, 200)],   // koliduje z c
    ]);
    const result = detectCollisions(positions, 0);
    expect(result.collisions.length).toBeGreaterThanOrEqual(2);
  });

  it('50× determinizm', () => {
    const positions = new Map<string, ElementPosition>([
      ['b', makePos('b', 200, 200)],
      ['a', makePos('a', 210, 200)],
      ['c', makePos('c', 100, 100)],
    ]);

    const reference = detectCollisions(positions, 0);
    for (let i = 0; i < 50; i++) {
      const result = detectCollisions(positions, 0);
      expect(result.hasCollision).toBe(reference.hasCollision);
      expect(result.collisions.length).toBe(reference.collisions.length);
      for (let j = 0; j < reference.collisions.length; j++) {
        expect(result.collisions[j].nodeIdA).toBe(reference.collisions[j].nodeIdA);
        expect(result.collisions[j].nodeIdB).toBe(reference.collisions[j].nodeIdB);
      }
    }
  });
});

describe('resolveCollisionsAstar', () => {
  const config = DEFAULT_LAYOUT_CONFIG;

  it('brak kolizji → pozycje niezmienione', () => {
    const positions = new Map<string, ElementPosition>([
      ['a', makePos('a', 100, 100)],
      ['b', makePos('b', 400, 100)],
    ]);
    const colResult = detectCollisions(positions, 0);
    const obstacles = buildObstacleList(positions);
    const resolved  = resolveCollisionsAstar(positions, colResult, obstacles, config);

    expect(resolved.get('a')!.position.x).toBe(positions.get('a')!.position.x);
    expect(resolved.get('b')!.position.x).toBe(positions.get('b')!.position.x);
  });

  it('po rozwiązaniu brak kolizji (margin=0)', () => {
    const positions = new Map<string, ElementPosition>([
      ['a', makePos('a', 100, 100)],
      ['b', makePos('b', 110, 100)],   // koliduje
    ]);
    const colResult = detectCollisions(positions, 0);
    expect(colResult.hasCollision).toBe(true);

    const obstacles = buildObstacleList(positions);
    const resolved  = resolveCollisionsAstar(positions, colResult, obstacles, config);

    const afterResult = detectCollisions(resolved, 0);
    expect(afterResult.hasCollision).toBe(false);
  });

  it('50× determinizm po rozwiązaniu', () => {
    const positions = new Map<string, ElementPosition>([
      ['z', makePos('z', 200, 200)],
      ['a', makePos('a', 210, 200)],
    ]);
    const colResult = detectCollisions(positions, 0);
    const obstacles = buildObstacleList(positions);

    const reference = resolveCollisionsAstar(positions, colResult, obstacles, config);
    for (let i = 0; i < 50; i++) {
      const result = resolveCollisionsAstar(positions, colResult, obstacles, config);
      for (const [id] of reference) {
        expect(result.get(id)!.position.x).toBe(reference.get(id)!.position.x);
        expect(result.get(id)!.position.y).toBe(reference.get(id)!.position.y);
      }
    }
  });
});
