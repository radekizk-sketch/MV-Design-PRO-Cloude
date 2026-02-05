/**
 * Phase 3: Crossing Minimization
 *
 * ZADANIE: Uporządkuj baye wzdłuż szyny aby zminimalizować skrzyżowania.
 *
 * ALGORYTM (Barycenter Heuristic z Sugiyama):
 * 1. Incomer bays → skrajnie lewo lub środek
 * 2. Tie bays → skrajnie prawo
 * 3. Measurement bays → obok incomera
 * 4. Feeder bays → barycenter relative to sub-connections
 * 5. OZE/BESS bays → grupuj razem
 * 6. Iteruj do stabilizacji (max 20 iteracji)
 *
 * DETERMINIZM: Sortuj stabilnie (by element.id jako tiebreaker).
 */

import type { Bay, BayType, PipelineContext, LayoutSymbol } from './types';

// =============================================================================
// KONFIGURACJA
// =============================================================================

/** Maksymalna liczba iteracji crossing minimization */
const MAX_ITERATIONS = 20;

/** Priorytety typów bayów (mniejsza wartość = bliżej lewej strony) */
const BAY_TYPE_PRIORITY: Record<BayType, number> = {
  incomer: 1, // Incomer na początku (lewo)
  measurement: 2, // Pomiary obok incomera
  generator: 3, // Generatory przed feederami
  feeder: 5, // Feedery w środku
  oze_pv: 6, // OZE grupowane razem
  oze_wind: 7,
  bess: 8,
  capacitor: 9,
  auxiliary: 10,
  tie: 15, // Tie na końcu (prawo)
  unknown: 20,
};

// =============================================================================
// GŁÓWNA FUNKCJA FAZY 3
// =============================================================================

/**
 * Faza 3: Minimalizacja skrzyżowań.
 *
 * @param context - Kontekst pipeline
 * @returns Zaktualizowany kontekst z orderedBays
 */
export function minimizeCrossings(context: PipelineContext): PipelineContext {
  const { bays, symbolById } = context;

  if (!bays || bays.length === 0) {
    return {
      ...context,
      orderedBays: [],
      debug: {
        ...context.debug,
        crossingMinIterations: 0,
        initialCrossings: 0,
        finalCrossings: 0,
      },
    };
  }

  // Grupuj baye po parent busbar
  const baysByBusbar = groupBaysByBusbar(bays);

  // Dla każdego busbara — optymalizuj kolejność bayów
  const orderedBays: Bay[] = [];
  let totalIterations = 0;
  let totalInitialCrossings = 0;
  let totalFinalCrossings = 0;

  for (const [_busbarId, busbarBays] of baysByBusbar) {
    if (busbarBays.length <= 1) {
      // Jeden bay — nie ma co optymalizować
      orderedBays.push(...busbarBays);
      continue;
    }

    // Oblicz początkową liczbę skrzyżowań
    const initialCrossings = countCrossings(busbarBays, symbolById);
    totalInitialCrossings += initialCrossings;

    // Optymalizuj kolejność
    const { orderedBays: optimized, iterations } = optimizeBayOrder(busbarBays, symbolById);
    totalIterations = Math.max(totalIterations, iterations);

    // Oblicz końcową liczbę skrzyżowań
    const finalCrossings = countCrossings(optimized, symbolById);
    totalFinalCrossings += finalCrossings;

    // Aktualizuj slotIndex
    optimized.forEach((bay, index) => {
      bay.slotIndex = index;
    });

    orderedBays.push(...optimized);

    // Rekurencja dla sub-bayów
    for (const bay of optimized) {
      if (bay.subBays.length > 0) {
        const subContext = minimizeCrossings({
          ...context,
          bays: bay.subBays,
        });
        bay.subBays = subContext.orderedBays ?? bay.subBays;
      }
    }
  }

  return {
    ...context,
    orderedBays,
    debug: {
      ...context.debug,
      crossingMinIterations: totalIterations,
      initialCrossings: totalInitialCrossings,
      finalCrossings: totalFinalCrossings,
    },
  };
}

// =============================================================================
// GRUPOWANIE BAYÓW
// =============================================================================

/**
 * Grupuj baye po parent busbar.
 */
function groupBaysByBusbar(bays: Bay[]): Map<string, Bay[]> {
  const groups = new Map<string, Bay[]>();

  for (const bay of bays) {
    const existing = groups.get(bay.parentBusbarId) ?? [];
    existing.push(bay);
    groups.set(bay.parentBusbarId, existing);
  }

  return groups;
}

// =============================================================================
// OPTYMALIZACJA KOLEJNOŚCI BAYÓW
// =============================================================================

/**
 * Optymalizuj kolejność bayów dla jednego busbara.
 *
 * @param bays - Baye do optymalizacji
 * @param symbolById - Mapa symbol ID → symbol
 * @returns Zoptymalizowane baye i liczba iteracji
 */
function optimizeBayOrder(
  bays: Bay[],
  symbolById: Map<string, LayoutSymbol>
): { orderedBays: Bay[]; iterations: number } {
  // Krok 1: Inicjalna kolejność na podstawie typu
  let currentOrder = initialOrderByType(bays);

  // Krok 2: Barycenter optimization
  let iterations = 0;
  let improved = true;

  while (improved && iterations < MAX_ITERATIONS) {
    iterations++;
    improved = false;

    // Oblicz barycenter dla każdego baya
    const barycenters = computeBarycenters(currentOrder, symbolById);

    // Sortuj po barycenter (z uwzględnieniem typu jako tiebreaker)
    const newOrder = [...currentOrder].sort((a, b) => {
      const aBarycenter = barycenters.get(a.id) ?? 0;
      const bBarycenter = barycenters.get(b.id) ?? 0;

      // Najpierw po barycenter
      const barycenterDiff = aBarycenter - bBarycenter;
      if (Math.abs(barycenterDiff) > 0.01) {
        return barycenterDiff;
      }

      // Potem po priorytecie typu
      const typeDiff = BAY_TYPE_PRIORITY[a.bayType] - BAY_TYPE_PRIORITY[b.bayType];
      if (typeDiff !== 0) {
        return typeDiff;
      }

      // Tiebreaker: ID (determinizm)
      return a.id.localeCompare(b.id);
    });

    // Sprawdź czy kolejność się zmieniła
    if (!arraysEqual(currentOrder.map((b) => b.id), newOrder.map((b) => b.id))) {
      currentOrder = newOrder;
      improved = true;
    }
  }

  // Krok 3: Finalne dopasowanie pozycji specjalnych
  currentOrder = applyPositionConstraints(currentOrder);

  return { orderedBays: currentOrder, iterations };
}

/**
 * Inicjalna kolejność na podstawie typu baya.
 */
function initialOrderByType(bays: Bay[]): Bay[] {
  return [...bays].sort((a, b) => {
    // Najpierw po priorytecie typu
    const typeDiff = BAY_TYPE_PRIORITY[a.bayType] - BAY_TYPE_PRIORITY[b.bayType];
    if (typeDiff !== 0) {
      return typeDiff;
    }

    // Tiebreaker: ID
    return a.id.localeCompare(b.id);
  });
}

/**
 * Oblicz barycenter dla każdego baya.
 *
 * Barycenter = średnia pozycja elementów połączonych w innych warstwach.
 */
function computeBarycenters(bays: Bay[], symbolById: Map<string, LayoutSymbol>): Map<string, number> {
  const barycenters = new Map<string, number>();

  // Dla każdego baya — oblicz średnią pozycję połączeń
  bays.forEach((bay, index) => {
    // Zbierz pozycje połączonych elementów
    const connectedPositions: number[] = [];

    for (const element of bay.elements) {
      const symbol = symbolById.get(element.symbolId);
      if (!symbol) continue;

      // Dla elementów z połączeniami — szukaj pozycji w innych bayach
      if (symbol.fromNodeId || symbol.toNodeId || symbol.connectedToNodeId) {
        // Znajdź powiązane baye
        for (let j = 0; j < bays.length; j++) {
          if (j === index) continue;

          const otherBay = bays[j];
          for (const otherElement of otherBay.elements) {
            const otherSymbol = symbolById.get(otherElement.symbolId);
            if (!otherSymbol) continue;

            // Sprawdź czy są połączone
            if (areSymbolsConnected(symbol, otherSymbol)) {
              connectedPositions.push(j);
            }
          }
        }
      }
    }

    // Oblicz barycenter
    if (connectedPositions.length > 0) {
      const sum = connectedPositions.reduce((a, b) => a + b, 0);
      barycenters.set(bay.id, sum / connectedPositions.length);
    } else {
      // Brak połączeń — użyj pozycji początkowej (zachowaj kolejność)
      barycenters.set(bay.id, index);
    }
  });

  return barycenters;
}

/**
 * Sprawdź czy dwa symbole są połączone.
 */
function areSymbolsConnected(a: LayoutSymbol, b: LayoutSymbol): boolean {
  // a łączy się z elementem b
  if (a.fromNodeId === b.elementId || a.toNodeId === b.elementId) {
    return true;
  }

  // b łączy się z elementem a
  if (b.fromNodeId === a.elementId || b.toNodeId === a.elementId) {
    return true;
  }

  // Source/Load połączony z busbar
  if (a.connectedToNodeId === b.elementId || b.connectedToNodeId === a.elementId) {
    return true;
  }

  return false;
}

/**
 * Zastosuj ograniczenia pozycji (incomer lewo, tie prawo).
 */
function applyPositionConstraints(bays: Bay[]): Bay[] {
  if (bays.length <= 1) {
    return bays;
  }

  const result = [...bays];

  // Znajdź incomer i przenieś na początek
  const incomerIndex = result.findIndex((b) => b.bayType === 'incomer');
  if (incomerIndex > 0) {
    const [incomer] = result.splice(incomerIndex, 1);
    result.unshift(incomer);
  }

  // Znajdź tie i przenieś na koniec
  const tieIndex = result.findIndex((b) => b.bayType === 'tie');
  if (tieIndex >= 0 && tieIndex < result.length - 1) {
    const [tie] = result.splice(tieIndex, 1);
    result.push(tie);
  }

  // Measurement obok incomera
  const measurementIndices = result
    .map((b, i) => (b.bayType === 'measurement' ? i : -1))
    .filter((i) => i >= 0);

  // Przenieś measurement baye na początek (po incomerze)
  const measurements: Bay[] = [];
  for (const index of measurementIndices.reverse()) {
    const [m] = result.splice(index, 1);
    measurements.unshift(m);
  }

  // Wstaw measurement po incomerze (jeśli jest)
  const insertIndex = result.findIndex((b) => b.bayType === 'incomer') + 1;
  result.splice(insertIndex, 0, ...measurements);

  // Grupuj OZE razem
  const ozeTypes: BayType[] = ['oze_pv', 'oze_wind', 'bess'];
  const ozeIndices = result
    .map((b, i) => (ozeTypes.includes(b.bayType) ? i : -1))
    .filter((i) => i >= 0);

  if (ozeIndices.length > 1) {
    // Przenieś wszystkie OZE na pozycję pierwszego
    const ozeBays: Bay[] = [];
    for (const index of ozeIndices.reverse()) {
      const [oze] = result.splice(index, 1);
      ozeBays.unshift(oze);
    }

    // Wstaw OZE razem (za measurement)
    const ozeInsertIndex = result.findIndex((b) => b.bayType === 'feeder');
    result.splice(ozeInsertIndex >= 0 ? ozeInsertIndex : result.length, 0, ...ozeBays);
  }

  return result;
}

// =============================================================================
// LICZENIE SKRZYŻOWAŃ
// =============================================================================

/**
 * Policz liczbę skrzyżowań dla danej kolejności bayów.
 *
 * Skrzyżowanie występuje gdy linie do elementów w różnych bayach się przecinają.
 */
function countCrossings(bays: Bay[], symbolById: Map<string, LayoutSymbol>): number {
  let crossings = 0;

  // Dla każdej pary bayów — sprawdź czy ich połączenia się przecinają
  for (let i = 0; i < bays.length; i++) {
    for (let j = i + 1; j < bays.length; j++) {
      const bayI = bays[i];
      const bayJ = bays[j];

      // Znajdź połączenia z innych bayów
      const iConnections = getBayExternalConnections(bayI, bays, symbolById);
      const jConnections = getBayExternalConnections(bayJ, bays, symbolById);

      // Sprawdź czy połączenia się przecinają
      for (const connI of iConnections) {
        for (const connJ of jConnections) {
          // Skrzyżowanie jeśli: i < j ale connI > connJ (lub odwrotnie)
          if ((connI > j && connJ < i) || (connI < i && connJ > j)) {
            crossings++;
          }
        }
      }
    }
  }

  return crossings;
}

/**
 * Znajdź zewnętrzne połączenia baya (indeksy innych bayów).
 */
function getBayExternalConnections(
  bay: Bay,
  allBays: Bay[],
  symbolById: Map<string, LayoutSymbol>
): number[] {
  const connections: number[] = [];

  for (const element of bay.elements) {
    const symbol = symbolById.get(element.symbolId);
    if (!symbol) continue;

    // Szukaj połączeń z innymi bayami
    for (let i = 0; i < allBays.length; i++) {
      if (allBays[i].id === bay.id) continue;

      for (const otherElement of allBays[i].elements) {
        const otherSymbol = symbolById.get(otherElement.symbolId);
        if (!otherSymbol) continue;

        if (areSymbolsConnected(symbol, otherSymbol)) {
          connections.push(i);
        }
      }
    }
  }

  return [...new Set(connections)]; // Usuń duplikaty
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

/**
 * Porównaj dwie tablice.
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// =============================================================================
// EKSPORT FUNKCJI POMOCNICZYCH
// =============================================================================

/**
 * Pobierz priorytet typu baya.
 */
export function getBayTypePriority(bayType: BayType): number {
  return BAY_TYPE_PRIORITY[bayType];
}

/**
 * Sortuj baye po priorytecie typu.
 */
export function sortBaysByType(bays: Bay[]): Bay[] {
  return [...bays].sort((a, b) => {
    const typeDiff = BAY_TYPE_PRIORITY[a.bayType] - BAY_TYPE_PRIORITY[b.bayType];
    if (typeDiff !== 0) return typeDiff;
    return a.id.localeCompare(b.id);
  });
}
