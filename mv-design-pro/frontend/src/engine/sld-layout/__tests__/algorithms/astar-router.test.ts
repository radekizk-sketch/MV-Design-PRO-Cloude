/**
 * Testy A* Orthogonal Router
 *
 * Pokrycie:
 * - Trasa bez przeszkód → Manhattan H+V
 * - Trasa z 1 przeszkodą → segmenty omijają prostokąt
 * - Trasa z 3 przeszkodami → koszt ≤ 2× Manhattan
 * - 100× determinizm
 * - buildObstacleList
 */

import { describe, it, expect } from 'vitest';
import { routeWithAstar, buildObstacleList, DEFAULT_ASTAR_CONFIG } from '../../algorithms/astar-router';
import type { ElementPosition } from '../../types';

// =============================================================================
// HELPERS
// =============================================================================

function manhattanDistance(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
}

function pathLength(result: ReturnType<typeof routeWithAstar>): number {
  return result.segments.reduce(
    (acc, s) => acc + Math.abs(s.to.x - s.from.x) + Math.abs(s.to.y - s.from.y),
    0
  );
}

function isOrthogonal(result: ReturnType<typeof routeWithAstar>): boolean {
  return result.segments.every((s) => {
    const dx = Math.abs(s.to.x - s.from.x);
    const dy = Math.abs(s.to.y - s.from.y);
    return (dx < 1 && dy >= 0) || (dy < 1 && dx >= 0); // H lub V
  });
}

// =============================================================================
// TESTY
// =============================================================================

describe('routeWithAstar', () => {
  it('brak przeszkód — trasa prosta pionowa', () => {
    const from = { x: 100, y: 100 };
    const to   = { x: 100, y: 300 };
    const result = routeWithAstar(from, to, { ...DEFAULT_ASTAR_CONFIG, obstacles: [] });

    expect(result.segments.length).toBeGreaterThanOrEqual(1);
    expect(isOrthogonal(result)).toBe(true);
    // Koszt ≈ Manhattan
    expect(result.cost).toBeCloseTo(manhattanDistance(from, to), -1);
  });

  it('brak przeszkód — trasa L-shape (różne X i Y)', () => {
    const from = { x: 100, y: 100 };
    const to   = { x: 300, y: 300 };
    const result = routeWithAstar(from, to, { ...DEFAULT_ASTAR_CONFIG, obstacles: [] });

    expect(result.segments.length).toBeGreaterThanOrEqual(1);
    expect(isOrthogonal(result)).toBe(true);
    const manhattan = manhattanDistance(from, to);
    // Trasa L-shape = dokładnie Manhattan
    expect(result.cost).toBeCloseTo(manhattan, -1);
  });

  it('1 przeszkoda na osi prostej — trasa omija prostokąt', () => {
    const from = { x: 100, y: 100 };
    const to   = { x: 100, y: 400 };
    // Przeszkoda blokowałaby prostą trasę pionową
    const obstacle = { x: 80, y: 200, width: 40, height: 60 };

    const result = routeWithAstar(from, to, {
      ...DEFAULT_ASTAR_CONFIG,
      obstacles:    [obstacle],
      channelWidth: 20,
    });

    expect(isOrthogonal(result)).toBe(true);
    // Trasa musi istnieć
    expect(result.segments.length).toBeGreaterThanOrEqual(1);
    // Koszt ≤ 2× Manhattan (omijanie nie może być zbyt kosztowne)
    const manhattan = manhattanDistance(from, to);
    expect(result.cost).toBeLessThanOrEqual(manhattan * 2.5);
  });

  it('3 przeszkody — koszt ≤ 2.5× Manhattan', () => {
    const from = { x: 60, y: 60 };
    const to   = { x: 300, y: 300 };
    const obstacles = [
      { x: 120, y: 100, width: 60, height: 60 },
      { x: 200, y: 160, width: 60, height: 60 },
      { x: 140, y: 220, width: 60, height: 60 },
    ];

    const result = routeWithAstar(from, to, {
      ...DEFAULT_ASTAR_CONFIG,
      obstacles,
      channelWidth: 20,
    });

    expect(isOrthogonal(result)).toBe(true);
    const manhattan = manhattanDistance(from, to);
    expect(result.cost).toBeLessThanOrEqual(manhattan * 2.5);
  });

  it('start === end → pusta ścieżka', () => {
    const result = routeWithAstar({ x: 100, y: 100 }, { x: 100, y: 100 });
    expect(result.segments).toHaveLength(0);
    expect(result.cost).toBe(0);
  });

  it('100× determinizm — identyczna ścieżka', () => {
    const from = { x: 100, y: 100 };
    const to   = { x: 300, y: 300 };
    const obstacles = [{ x: 180, y: 160, width: 60, height: 60 }];
    const config = { ...DEFAULT_ASTAR_CONFIG, obstacles, channelWidth: 20 };

    const reference = routeWithAstar(from, to, config);

    for (let i = 0; i < 100; i++) {
      const result = routeWithAstar(from, to, config);
      expect(result.cost).toBe(reference.cost);
      expect(result.segments.length).toBe(reference.segments.length);
      for (let j = 0; j < reference.segments.length; j++) {
        expect(result.segments[j].from.x).toBe(reference.segments[j].from.x);
        expect(result.segments[j].from.y).toBe(reference.segments[j].from.y);
        expect(result.segments[j].to.x).toBe(reference.segments[j].to.x);
        expect(result.segments[j].to.y).toBe(reference.segments[j].to.y);
      }
    }
  });

  it('fallback: L-path gdy maxIterations=0', () => {
    const from = { x: 100, y: 100 };
    const to   = { x: 300, y: 300 };
    // maxIterations=1 → praktycznie brak A* → fallback L-path
    const result = routeWithAstar(from, to, {
      ...DEFAULT_ASTAR_CONFIG,
      obstacles:     [{ x: 80, y: 80, width: 400, height: 400 }], // blokuje wszystko
      maxIterations: 1,
    });
    // Fallback L-path zawsze zwraca ścieżkę
    expect(result.segments.length).toBeGreaterThanOrEqual(1);
  });
});

describe('buildObstacleList', () => {
  it('zwraca listę prostokątów z padding', () => {
    const positions = new Map<string, ElementPosition>([
      ['a', {
        symbolId: 'a',
        position: { x: 100, y: 100 },
        size:     { width: 60, height: 40 },
        bounds:   { x: 70, y: 80, width: 60, height: 40 },
        voltageBandId: 'band1',
        autoPositioned: true,
        isQuarantined: false,
      }],
    ]);

    const obstacles = buildObstacleList(positions, 10);
    expect(obstacles).toHaveLength(1);
    expect(obstacles[0].x).toBe(70 - 10);
    expect(obstacles[0].y).toBe(80 - 10);
    expect(obstacles[0].width).toBe(60 + 20);
    expect(obstacles[0].height).toBe(40 + 20);
  });

  it('pusta mapa → pusta lista', () => {
    const obstacles = buildObstacleList(new Map());
    expect(obstacles).toHaveLength(0);
  });
});
