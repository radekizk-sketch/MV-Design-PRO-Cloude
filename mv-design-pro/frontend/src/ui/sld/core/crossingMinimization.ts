/**
 * Crossing Minimization — Barycenter heuristic (Sugiyama).
 *
 * Adaptacja algorytmu z engine/sld-layout/phase3-crossing-min.ts
 * do VisualGraphV1 i LayoutResultV1.
 *
 * Cel: Minimalizacja przecięć krawędzi na szynie GPZ przez
 * optymalne sortowanie pól (feederów) wzdłuż szyny.
 *
 * DETERMINIZM:
 * - Stałe max iteracji (MAX_BARYCENTER_ITERATIONS = 20)
 * - Stable sort z ID tiebreaker
 * - Brak losowości
 */

import type { FeederClassification } from './bayClassification';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maksymalna liczba iteracji barycenter heuristic. */
export const MAX_BARYCENTER_ITERATIONS = 20;

// =============================================================================
// CROSSING COUNTER
// =============================================================================

/**
 * Policz przecięcia krawędzi między dwoma warstwami.
 *
 * Warstwa 0: pozycje węzłów na szynie GPZ (kolejność slotów)
 * Warstwa 1: pozycje stacji/elementów poniżej szyny
 *
 * @param topOrder - kolejność feederów na szynie (indeksy)
 * @param connections - pary (feederIndex, targetX) opisujące krawędzie
 * @returns liczba przecięć
 */
export function countCrossings(
  feederOrder: string[],
  connections: ReadonlyMap<string, number>,
): number {
  // Map feeder IDs to their slot positions
  const slotPositions = new Map<string, number>();
  for (let i = 0; i < feederOrder.length; i++) {
    slotPositions.set(feederOrder[i], i);
  }

  // Build edge list: (topSlot, bottomX)
  const edges: Array<[number, number]> = [];
  for (const [feederId, targetX] of connections) {
    const topSlot = slotPositions.get(feederId);
    if (topSlot !== undefined) {
      edges.push([topSlot, targetX]);
    }
  }

  // Count crossings via inversion counting
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a1, a2] = edges[i];
      const [b1, b2] = edges[j];
      if ((a1 - b1) * (a2 - b2) < 0) {
        crossings++;
      }
    }
  }

  return crossings;
}

// =============================================================================
// BARYCENTER HEURISTIC
// =============================================================================

/**
 * Oblicz barycentrum feedera na podstawie pozycji jego celów.
 *
 * @param feederId - ID feedera
 * @param targetPositions - mapa feederId → pozycja celu
 * @returns barycentrum (średnia pozycja celów)
 */
function computeBarycenter(
  feederId: string,
  targetPositions: ReadonlyMap<string, number>,
): number {
  const pos = targetPositions.get(feederId);
  return pos ?? 0;
}

/**
 * Minimalizuj przecięcia krawędzi na szynie GPZ.
 *
 * Algorytm barycenter:
 * 1. Oblicz barycentrum każdego feedera (= pozycja jego celu pod szyną)
 * 2. Posortuj feedery po barycentrum
 * 3. Powtarzaj aż stabilne lub MAX_BARYCENTER_ITERATIONS
 *
 * @param feeders - klasyfikacje feederów (z bayClassification)
 * @param targetPositions - mapa feederId → docelowa pozycja X elementu docelowego
 * @returns zoptymalizowana kolejność feederów (lista ID)
 */
export function minimizeCrossings(
  feeders: readonly FeederClassification[],
  targetPositions: ReadonlyMap<string, number>,
): string[] {
  if (feeders.length <= 1) {
    return feeders.map(f => f.feederId);
  }

  let currentOrder = feeders.map(f => f.feederId);
  let bestCrossings = countCrossings(currentOrder, targetPositions);
  let bestOrder = [...currentOrder];

  for (let iter = 0; iter < MAX_BARYCENTER_ITERATIONS; iter++) {
    // Compute barycenters
    const barycenters = new Map<string, number>();
    for (const feederId of currentOrder) {
      barycenters.set(feederId, computeBarycenter(feederId, targetPositions));
    }

    // Build feeder metadata for sort
    const feederMap = new Map(feeders.map(f => [f.feederId, f]));

    // Sort by: priority group first, then barycenter, then ID for stability
    const newOrder = [...currentOrder].sort((a, b) => {
      const fa = feederMap.get(a);
      const fb = feederMap.get(b);
      const prioA = fa?.sortPriority ?? 20;
      const prioB = fb?.sortPriority ?? 20;

      // Same priority group → sort by barycenter
      if (prioA === prioB) {
        const barA = barycenters.get(a) ?? 0;
        const barB = barycenters.get(b) ?? 0;
        if (barA !== barB) return barA - barB;
        return a.localeCompare(b);  // Deterministic tiebreaker
      }

      return prioA - prioB;
    });

    const newCrossings = countCrossings(newOrder, targetPositions);

    if (newCrossings < bestCrossings) {
      bestCrossings = newCrossings;
      bestOrder = [...newOrder];
    }

    // Check convergence
    const orderChanged = newOrder.some((id, i) => id !== currentOrder[i]);
    if (!orderChanged) break;

    currentOrder = newOrder;
  }

  return bestOrder;
}

/**
 * Wynik crossing minimization z metadanymi.
 */
export interface CrossingMinResult {
  /** Zoptymalizowana kolejność feederów (lista ID) */
  readonly order: readonly string[];
  /** Początkowa liczba przecięć */
  readonly initialCrossings: number;
  /** Końcowa liczba przecięć */
  readonly finalCrossings: number;
  /** Liczba iteracji */
  readonly iterations: number;
}

/**
 * Minimalizuj z metadanymi diagnostycznymi.
 */
export function minimizeCrossingsWithStats(
  feeders: readonly FeederClassification[],
  targetPositions: ReadonlyMap<string, number>,
): CrossingMinResult {
  const initialOrder = feeders.map(f => f.feederId);
  const initialCrossings = countCrossings(initialOrder, targetPositions);

  const optimized = minimizeCrossings(feeders, targetPositions);
  const finalCrossings = countCrossings(optimized, targetPositions);

  return {
    order: optimized,
    initialCrossings,
    finalCrossings,
    iterations: Math.min(MAX_BARYCENTER_ITERATIONS, feeders.length),
  };
}
