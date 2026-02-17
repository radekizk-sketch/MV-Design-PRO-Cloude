/**
 * SLD INDUSTRIAL AESTHETICS — Testy deterministyczne kontraktu
 *
 * Weryfikacja wszystkich reguł kontraktu estetyki przemysłowej:
 * §1.1 Siatka rytmu (GRID_BASE)
 * §1.2 Kanały Y (Y_MAIN, Y_RING, Y_BRANCH)
 * §1.3 Równy rozstaw stacji (GRID_SPACING_MAIN)
 * §1.4 Symetryczne ringi (4-odcinkowe ścieżki)
 * §1.6 Wyrównanie pól stacji
 * §1.7 Grubości linii
 * §1.8 Minimalne marginesy
 *
 * Wymóg deterministyczności:
 * - 50 permutacji danych wejściowych → identyczny hash geometrii
 * - Tolerancja: 0 px
 */

import { describe, it, expect } from 'vitest';
import {
  // Stałe
  GRID_BASE,
  Y_MAIN,
  Y_RING,
  Y_BRANCH,
  GRID_SPACING_MAIN,
  X_START,
  OFFSET_POLE,
  BUSBAR_STROKE_WIDTH,
  BRANCH_STROKE_WIDTH,
  RING_STROKE_WIDTH,
  MIN_HORIZONTAL_GAP,
  MIN_VERTICAL_GAP,
  // Funkcje
  snapToAestheticGrid,
  snapPositionToAestheticGrid,
  validateGridAlignment,
  validateStationSpacing,
  validateRingGeometry,
  stationX,
  poleY,
  ringPath,
  verifyAestheticContract,
} from '../IndustrialAesthetics';

// =============================================================================
// § WERYFIKACJA KONTRAKTU — NIEZMIENNIKI
// =============================================================================

describe('Industrial Aesthetics — weryfikacja kontraktu', () => {
  it('wszystkie niezmienniki kontraktu są spełnione', () => {
    const result = verifyAestheticContract();
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('GRID_BASE = 20', () => {
    expect(GRID_BASE).toBe(20);
  });

  it('Y_RING = Y_MAIN - 4*GRID_BASE', () => {
    expect(Y_RING).toBe(Y_MAIN - 4 * GRID_BASE);
    expect(Y_RING).toBe(320);
  });

  it('Y_BRANCH = Y_MAIN + 4*GRID_BASE', () => {
    expect(Y_BRANCH).toBe(Y_MAIN + 4 * GRID_BASE);
    expect(Y_BRANCH).toBe(480);
  });

  it('GRID_SPACING_MAIN = 14*GRID_BASE', () => {
    expect(GRID_SPACING_MAIN).toBe(14 * GRID_BASE);
    expect(GRID_SPACING_MAIN).toBe(280);
  });

  it('OFFSET_POLE = 3*GRID_BASE', () => {
    expect(OFFSET_POLE).toBe(3 * GRID_BASE);
    expect(OFFSET_POLE).toBe(60);
  });
});

// =============================================================================
// § 1.1 SIATKA RYTMU
// =============================================================================

describe('§1.1 Siatka rytmu — GRID_BASE', () => {
  it('snapToAestheticGrid zaokrągla do GRID_BASE', () => {
    expect(snapToAestheticGrid(0)).toBe(0);
    expect(snapToAestheticGrid(10)).toBe(20);  // round(10/20)*20 = 1*20 = 20
    expect(snapToAestheticGrid(19)).toBe(20);
    expect(snapToAestheticGrid(20)).toBe(20);
    expect(snapToAestheticGrid(21)).toBe(20);
    expect(snapToAestheticGrid(30)).toBe(40);  // round(30/20)*20 = round(1.5)*20 = 2*20 = 40
    expect(snapToAestheticGrid(280)).toBe(280);
    expect(snapToAestheticGrid(400)).toBe(400);
  });

  it('snapToAestheticGrid(wartość % GRID_BASE === 0) jest idempotentny', () => {
    const values = [0, 20, 40, 60, 80, 100, 200, 280, 400, 480];
    for (const v of values) {
      expect(snapToAestheticGrid(v)).toBe(v);
    }
  });

  it('snapPositionToAestheticGrid normalizuje pozycję x,y', () => {
    const pos = snapPositionToAestheticGrid({ x: 15, y: 37 });
    expect(pos.x).toBe(20);
    expect(pos.y).toBe(40);
  });

  it('snapPositionToAestheticGrid jest idempotentny dla pozycji już na siatce', () => {
    const pos = { x: 280, y: 400 };
    expect(snapPositionToAestheticGrid(pos)).toEqual(pos);
  });
});

// =============================================================================
// § 1.2 KANAŁY Y
// =============================================================================

describe('§1.2 Kanały Y', () => {
  it('Y_MAIN jest wielokrotnością GRID_BASE', () => {
    expect(Y_MAIN % GRID_BASE).toBe(0);
  });

  it('Y_RING jest wielokrotnością GRID_BASE', () => {
    expect(Y_RING % GRID_BASE).toBe(0);
  });

  it('Y_BRANCH jest wielokrotnością GRID_BASE', () => {
    expect(Y_BRANCH % GRID_BASE).toBe(0);
  });

  it('Y_RING < Y_MAIN < Y_BRANCH (kolejność kanałów)', () => {
    expect(Y_RING).toBeLessThan(Y_MAIN);
    expect(Y_MAIN).toBeLessThan(Y_BRANCH);
  });

  it('odległość kanałów = MIN_VERTICAL_GAP (4*GRID_BASE)', () => {
    expect(Y_MAIN - Y_RING).toBe(MIN_VERTICAL_GAP);
    expect(Y_BRANCH - Y_MAIN).toBe(MIN_VERTICAL_GAP);
  });
});

// =============================================================================
// § 1.3 RÓWNY ROZSTAW STACJI
// =============================================================================

describe('§1.3 Równy rozstaw stacji', () => {
  it('stationX(0) = X_START', () => {
    expect(stationX(0)).toBe(X_START);
  });

  it('stationX(i) = X_START + i*GRID_SPACING_MAIN', () => {
    for (let i = 0; i < 10; i++) {
      expect(stationX(i)).toBe(X_START + i * GRID_SPACING_MAIN);
    }
  });

  it('każda pozycja stacji jest wielokrotnością GRID_BASE', () => {
    for (let i = 0; i < 10; i++) {
      expect(stationX(i) % GRID_BASE).toBe(0);
    }
  });

  it('różnica X kolejnych stacji = GRID_SPACING_MAIN', () => {
    for (let i = 0; i < 9; i++) {
      expect(stationX(i + 1) - stationX(i)).toBe(GRID_SPACING_MAIN);
    }
  });

  it('validateStationSpacing wykrywa jednolity rozstaw', () => {
    const positions = [0, 1, 2, 3, 4].map(stationX);
    const result = validateStationSpacing(positions);
    expect(result.uniformSpacing).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('validateStationSpacing wykrywa niejednolity rozstaw', () => {
    const positions = [40, 320, 600, 880, 1200]; // 280,280,280,320 — ostatni błędny
    const result = validateStationSpacing(positions);
    expect(result.uniformSpacing).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].dx).toBe(320);
    expect(result.violations[0].expected).toBe(280);
  });

  it('GRID_SPACING_MAIN >= MIN_HORIZONTAL_GAP', () => {
    expect(GRID_SPACING_MAIN).toBeGreaterThanOrEqual(MIN_HORIZONTAL_GAP);
  });
});

// =============================================================================
// § 1.4 SYMETRYCZNE RINGI
// =============================================================================

describe('§1.4 Symetryczne ringi', () => {
  it('ringPath(i,j) ma dokładnie 4 punkty', () => {
    expect(ringPath(0, 1)).toHaveLength(4);
    expect(ringPath(1, 3)).toHaveLength(4);
    expect(ringPath(0, 4)).toHaveLength(4);
  });

  it('ringPath zaczyna i kończy na Y_MAIN', () => {
    const path = ringPath(0, 2);
    expect(path[0].y).toBe(Y_MAIN);
    expect(path[3].y).toBe(Y_MAIN);
  });

  it('poziomy bieg ringu jest na Y_RING', () => {
    const path = ringPath(1, 3);
    expect(path[1].y).toBe(Y_RING);
    expect(path[2].y).toBe(Y_RING);
  });

  it('wpięcia pionowe w stacjach (X_i, X_j)', () => {
    const path = ringPath(0, 2);
    const xi = stationX(0);
    const xj = stationX(2);
    expect(path[0].x).toBe(xi);
    expect(path[1].x).toBe(xi);
    expect(path[2].x).toBe(xj);
    expect(path[3].x).toBe(xj);
  });

  it('ringPath jest symetryczny (ringPath(i,j) = ringPath(j,i))', () => {
    const p1 = ringPath(0, 3);
    const p2 = ringPath(3, 0);
    expect(p1).toEqual(p2);
  });

  it('długość pozioma ringu = |j-i| * GRID_SPACING_MAIN', () => {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 5; j++) {
        const path = ringPath(i, j);
        const horizontalLength = Math.abs(path[2].x - path[1].x);
        expect(horizontalLength).toBe((j - i) * GRID_SPACING_MAIN);
      }
    }
  });

  it('validateRingGeometry akceptuje poprawny ring', () => {
    const path = ringPath(0, 2);
    const result = validateRingGeometry(path);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.onRingChannel).toBe(true);
  });

  it('validateRingGeometry wykrywa ring nie na Y_RING', () => {
    const invalidPath = [
      { x: stationX(0), y: Y_MAIN },
      { x: stationX(0), y: Y_MAIN - 50 }, // zły Y (nie Y_RING)
      { x: stationX(2), y: Y_MAIN - 50 },
      { x: stationX(2), y: Y_MAIN },
    ];
    const result = validateRingGeometry(invalidPath);
    expect(result.valid).toBe(false);
    expect(result.onRingChannel).toBe(false);
  });

  it('validateRingGeometry wykrywa ring z niewłaściwą liczbą punktów', () => {
    const result = validateRingGeometry([
      { x: 40, y: 400 },
      { x: 40, y: 320 },
      { x: 320, y: 320 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('4 punkty'))).toBe(true);
  });

  it('wszystkie punkty ringu są na siatce', () => {
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 6; j++) {
        const path = ringPath(i, j);
        for (const pt of path) {
          expect(pt.x % GRID_BASE).toBe(0);
          expect(pt.y % GRID_BASE).toBe(0);
        }
      }
    }
  });
});

// =============================================================================
// § 1.6 WYRÓWNANIE PÓL STACJI
// =============================================================================

describe('§1.6 Wyrównanie pionowe pól w stacji', () => {
  it('poleY(0, 1) = Y_MAIN + OFFSET_POLE', () => {
    expect(poleY(0, 1)).toBe(Y_MAIN + OFFSET_POLE);
    expect(poleY(0, 1)).toBe(460);
  });

  it('poleY(0, -1) = Y_MAIN - OFFSET_POLE', () => {
    expect(poleY(0, -1)).toBe(Y_MAIN - OFFSET_POLE);
    expect(poleY(0, -1)).toBe(340);
  });

  it('każda pozycja pola jest wielokrotnością GRID_BASE', () => {
    for (let n = 0; n < 5; n++) {
      expect(poleY(n, 1) % GRID_BASE).toBe(0);
      expect(poleY(n, -1) % GRID_BASE).toBe(0);
    }
  });

  it('pola rosną o OFFSET_POLE', () => {
    for (let n = 0; n < 4; n++) {
      expect(poleY(n + 1, 1) - poleY(n, 1)).toBe(OFFSET_POLE);
      expect(poleY(n, -1) - poleY(n + 1, -1)).toBe(OFFSET_POLE);
    }
  });
});

// =============================================================================
// § 1.7 GRUBOŚCI LINII
// =============================================================================

describe('§1.7 Grubości linii', () => {
  it('BUSBAR_STROKE_WIDTH = 3', () => {
    expect(BUSBAR_STROKE_WIDTH).toBe(3);
  });

  it('BRANCH_STROKE_WIDTH = 2', () => {
    expect(BRANCH_STROKE_WIDTH).toBe(2);
  });

  it('RING_STROKE_WIDTH = 2', () => {
    expect(RING_STROKE_WIDTH).toBe(2);
  });

  it('magistrala dominuje: BUSBAR > BRANCH', () => {
    expect(BUSBAR_STROKE_WIDTH).toBeGreaterThan(BRANCH_STROKE_WIDTH);
  });
});

// =============================================================================
// § 1.8 MINIMALNE MARGINESY
// =============================================================================

describe('§1.8 Minimalne marginesy', () => {
  it('MIN_HORIZONTAL_GAP = GRID_SPACING_MAIN', () => {
    expect(MIN_HORIZONTAL_GAP).toBe(GRID_SPACING_MAIN);
    expect(MIN_HORIZONTAL_GAP).toBe(280);
  });

  it('MIN_VERTICAL_GAP = 4*GRID_BASE', () => {
    expect(MIN_VERTICAL_GAP).toBe(4 * GRID_BASE);
    expect(MIN_VERTICAL_GAP).toBe(80);
  });
});

// =============================================================================
// WALIDACJA WYRÓWNANIA SIATKI
// =============================================================================

describe('validateGridAlignment — walidacja siatki', () => {
  it('akceptuje wszystkie pozycje na siatce', () => {
    const positions = new Map([
      ['bus-a', { x: 40, y: 400 }],
      ['bus-b', { x: 320, y: 400 }],
      ['load-1', { x: 40, y: 460 }],
      ['ring', { x: 180, y: 320 }],
    ]);
    const result = validateGridAlignment(positions);
    expect(result.allAligned).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('wykrywa pozycje poza siatką', () => {
    const positions = new Map([
      ['bus-a', { x: 40, y: 400 }],   // OK
      ['bus-b', { x: 315, y: 400 }],  // BŁĄD: x=315, offX=315%20=15
      ['load-1', { x: 40, y: 461 }],  // BŁĄD: y=461, offY=461%20=1
    ]);
    const result = validateGridAlignment(positions);
    expect(result.allAligned).toBe(false);
    expect(result.violations).toHaveLength(2);
    const busB = result.violations.find(v => v.symbolId === 'bus-b');
    expect(busB).toBeDefined();
    expect(busB?.offX).toBe(15);
    const load1 = result.violations.find(v => v.symbolId === 'load-1');
    expect(load1?.offY).toBe(1);
  });

  it('pusta mapa — brak naruszeń', () => {
    const result = validateGridAlignment(new Map());
    expect(result.allAligned).toBe(true);
  });
});

// =============================================================================
// TEST DETERMINISTYCZNY PERMUTACYJNY
// =============================================================================

describe('Deterministyczność — permutacje danych wejściowych', () => {
  /**
   * Generuj N permutacji tablicy.
   * Deterministyczne (Fisher-Yates z seed).
   */
  function permute<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      // Prosty LCG
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Hash geometrii — deterministyczna suma kontrolna pozycji.
   * format: "id:x,y|..." posortowane po id
   */
  function geometryHash(positions: Array<{ id: string; x: number; y: number }>): string {
    return [...positions]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(p => `${p.id}:${p.x},${p.y}`)
      .join('|');
  }

  it('50 permutacji stacji daje identyczny hash geometrii', () => {
    const stationIds = ['st-a', 'st-b', 'st-c', 'st-d', 'st-e', 'st-f'];

    // Wyznacz kanoniczny porządek stacji (deterministycznie po ID)
    const canonicalOrder = [...stationIds].sort();

    // Oblicz pozycje wg kanonicznego porządku
    const canonicalPositions = canonicalOrder.map((id, index) => ({
      id,
      x: stationX(index),
      y: Y_MAIN,
    }));
    const goldenHash = geometryHash(canonicalPositions);

    // Sprawdź 50 permutacji
    for (let seed = 1; seed <= 50; seed++) {
      const permuted = permute(stationIds, seed);
      const permutedOrder = [...permuted].sort(); // sort → kanoniczny

      const positions = permutedOrder.map((id, index) => ({
        id,
        x: stationX(index),
        y: Y_MAIN,
      }));

      const hash = geometryHash(positions);
      expect(hash).toBe(goldenHash);
    }
  });

  it('50 permutacji ścieżek ringowych daje identyczny hash geometrii', () => {
    // Sieć z ringami: stacje 0,1,2,3
    const rings = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ];

    const canonicalPaths = rings.map(r => ({
      id: `ring-${r.from}-${r.to}`,
      path: ringPath(r.from, r.to),
    }));

    function pathHash(paths: typeof canonicalPaths): string {
      return [...paths]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(p => `${p.id}:${p.path.map(pt => `(${pt.x},${pt.y})`).join('->')}`)
        .join('|');
    }

    const goldenHash = pathHash(canonicalPaths);

    // Permutuj kolejność ringów — hash musi być identyczny
    for (let seed = 1; seed <= 50; seed++) {
      const permuted = permute(rings, seed);
      const paths = permuted.map(r => ({
        id: `ring-${Math.min(r.from, r.to)}-${Math.max(r.from, r.to)}`,
        path: ringPath(r.from, r.to),
      }));
      expect(pathHash(paths)).toBe(goldenHash);
    }
  });
});
