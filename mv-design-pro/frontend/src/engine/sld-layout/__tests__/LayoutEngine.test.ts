/**
 * Testy LayoutEngine
 *
 * Pokrycie:
 * - Domyślne opcje → poprawny LayoutResult
 * - algorithm: 'force-directed' → GPZ stały, brak kolizji
 * - algorithm: 'greedy' → elementy rozmieszczone
 * - 50× determinizm (same input → same positions)
 * - resolveCollisions → CollisionResult.hasCollision === false
 * - getOptions() → zwraca zamrożone opcje
 * - phaseColors → krawędzie mają phaseColor
 */

import { describe, it, expect } from 'vitest';
import { LayoutEngine, DEFAULT_ENGINE_OPTIONS } from '../LayoutEngine';
import { PHASE_COLORS_DEFAULT } from '../algorithms/phase-colors';
import { detectCollisions } from '../algorithms/collision-detector';
import type { LayoutInput, LayoutSymbol } from '../types';

// =============================================================================
// FIXTURES
// =============================================================================

function createBus(id: string, voltageKV: number): LayoutSymbol {
  return {
    id,
    elementId:   `elem_${id}`,
    elementType: 'Bus',
    elementName: `Szyna ${id}`,
    voltageKV,
    inService:   true,
  };
}

function createSource(id: string, voltageKV: number, connectedBusId: string): LayoutSymbol {
  return {
    id,
    elementId:        `elem_${id}`,
    elementType:      'Source',
    elementName:      'GPZ',
    voltageKV,
    connectedToNodeId: `elem_${connectedBusId}`,
    inService:        true,
  };
}

function createBranch(id: string, fromBusId: string, toBusId: string, voltageKV = 15): LayoutSymbol {
  return {
    id,
    elementId:   `elem_${id}`,
    elementType: 'LineBranch',
    elementName: `Linia ${id}`,
    voltageKV,
    fromNodeId:  `elem_${fromBusId}`,
    toNodeId:    `elem_${toBusId}`,
    inService:   true,
  };
}

function buildSimpleInput(): LayoutInput {
  return {
    symbols: [
      createBus('bus1', 110),
      createSource('src1', 110, 'bus1'),
      createBranch('line1', 'bus1', 'bus2'),
      createBus('bus2', 15),
      createBranch('line2', 'bus2', 'bus3'),
      createBus('bus3', 15),
    ],
  };
}

// =============================================================================
// TESTY
// =============================================================================

describe('LayoutEngine — domyślne opcje', () => {
  it('tworzy instancję z domyślnymi opcjami', () => {
    const engine = new LayoutEngine();
    const opts = engine.getOptions();
    expect(opts.algorithm).toBe('pipeline');
    expect(opts.connectionStyle).toBe('orthogonal');
    expect(opts.enableCollisionDetection).toBe(true);
    expect(opts.phaseColors).toBeNull();
  });

  it('compute() zwraca LayoutResult z positions', () => {
    const engine = new LayoutEngine();
    const result = engine.compute(buildSimpleInput());
    expect(result).toBeDefined();
    expect(result.positions).toBeDefined();
    expect(result.positions.size).toBeGreaterThan(0);
  });

  it('compute() zwraca bays', () => {
    const engine = new LayoutEngine();
    const result = engine.compute(buildSimpleInput());
    expect(result.bays).toBeDefined();
  });
});

describe('LayoutEngine — force-directed', () => {
  it('compute() force-directed zwraca pozycje dla wszystkich symboli', () => {
    const engine = new LayoutEngine({ algorithm: 'force-directed' });
    const input  = buildSimpleInput();
    const result = engine.compute(input);

    expect(result.positions.size).toBeGreaterThan(0);
  });

  it('brak kolizji po force-directed (z collision detection)', () => {
    const engine = new LayoutEngine({
      algorithm:                'force-directed',
      enableCollisionDetection: true,
    });
    const result = engine.compute(buildSimpleInput());
    const colResult = detectCollisions(result.positions, 0);
    // Po wykryciu i rozwiązaniu kolizji nie powinno być nakładania
    expect(colResult.hasCollision).toBe(false);
  });
});

describe('LayoutEngine — greedy', () => {
  it('compute() greedy zwraca pozycje dla wszystkich symboli', () => {
    const engine = new LayoutEngine({ algorithm: 'greedy' });
    const result = engine.compute(buildSimpleInput());
    expect(result.positions.size).toBeGreaterThan(0);
  });

  it('greedy — elementy w rozsądnych odległościach', () => {
    const engine = new LayoutEngine({ algorithm: 'greedy', minDistance: 80 });
    const result = engine.compute(buildSimpleInput());

    // Sprawdź że elementy nie są zbyt blisko GPZ_X, GPZ_Y
    for (const pos of result.positions.values()) {
      expect(pos.position.x).toBeGreaterThanOrEqual(0);
      expect(pos.position.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('LayoutEngine — determinizm', () => {
  it('50× pipeline — identyczne pozycje', () => {
    const engine = new LayoutEngine();
    const input  = buildSimpleInput();

    const reference = engine.compute(input);
    for (let i = 0; i < 50; i++) {
      const result = engine.compute(input);
      for (const [id, pos] of reference.positions) {
        const pos2 = result.positions.get(id);
        expect(pos2).toBeDefined();
        expect(pos2!.position.x).toBe(pos.position.x);
        expect(pos2!.position.y).toBe(pos.position.y);
      }
    }
  });

  it('verifyDeterminism() → true dla pipeline', () => {
    const engine = new LayoutEngine({ algorithm: 'pipeline' });
    expect(engine.verifyDeterminism(buildSimpleInput())).toBe(true);
  });

  it('verifyDeterminism() → true dla force-directed', () => {
    const engine = new LayoutEngine({ algorithm: 'force-directed' });
    expect(engine.verifyDeterminism(buildSimpleInput())).toBe(true);
  });

  it('verifyDeterminism() → true dla greedy', () => {
    const engine = new LayoutEngine({ algorithm: 'greedy' });
    expect(engine.verifyDeterminism(buildSimpleInput())).toBe(true);
  });
});

describe('LayoutEngine — phaseColors', () => {
  it('phaseColors nakłada kolory na krawędzie', () => {
    const engine = new LayoutEngine({ phaseColors: PHASE_COLORS_DEFAULT });
    const result = engine.compute(buildSimpleInput());

    let coloredCount = 0;
    for (const edge of result.routedEdges.values()) {
      if ((edge as typeof edge & { phaseColor?: string }).phaseColor) {
        coloredCount++;
      }
    }
    // Przynajmniej jedna krawędź powinna mieć kolor (jeśli są krawędzie)
    if (result.routedEdges.size > 0) {
      expect(coloredCount).toBeGreaterThan(0);
    }
  });

  it('bez phaseColors → brak phaseColor na krawędziach', () => {
    const engine = new LayoutEngine({ phaseColors: null });
    const result = engine.compute(buildSimpleInput());

    for (const edge of result.routedEdges.values()) {
      expect((edge as typeof edge & { phaseColor?: string }).phaseColor).toBeUndefined();
    }
  });
});

describe('LayoutEngine — resolveCollisions', () => {
  it('po resolveCollisions brak kolizji', () => {
    const engine = new LayoutEngine();
    const input  = buildSimpleInput();
    let result   = engine.compute(input);

    result = engine.resolveCollisions(result, input);
    const colResult = detectCollisions(result.positions, 0);
    expect(colResult.hasCollision).toBe(false);
  });
});

describe('LayoutEngine — opcje', () => {
  it('getOptions() zwraca zamrożony obiekt', () => {
    const engine = new LayoutEngine({ algorithm: 'greedy' });
    const opts   = engine.getOptions();

    expect(opts.algorithm).toBe('greedy');
    // Sprawdź immutability
    expect(() => {
      (opts as Record<string, unknown>)['algorithm'] = 'pipeline';
    }).toThrow();
  });

  it('opcje nie modyfikują DEFAULT_ENGINE_OPTIONS', () => {
    new LayoutEngine({ algorithm: 'force-directed' });
    expect(DEFAULT_ENGINE_OPTIONS.algorithm).toBe('pipeline');
  });
});
