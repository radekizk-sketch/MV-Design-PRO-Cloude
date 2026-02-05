/**
 * SLD Layout Pipeline — Orchestration of 5 Phases
 *
 * Orkiestruje wykonanie 5 faz layoutu w kolejności:
 * 1. Voltage Band Assignment
 * 2. Bay Detection & Assignment
 * 3. Crossing Minimization
 * 4. Coordinate Assignment
 * 5. Edge Routing + Label Placement
 *
 * DETERMINIZM: Ten sam input → identyczny output (bit-po-bicie).
 */

import type {
  LayoutInput,
  LayoutResult,
  LayoutConfig,
  PipelineContext,
  LayoutSymbol,
  VoltageColorRule,
  UserPositionOverride,
  LayoutDebugInfo,
  Bay,
} from './types';
import { DEFAULT_LAYOUT_CONFIG } from './types';
import { DEFAULT_VOLTAGE_COLOR_MAP } from './config/voltage-colors';
import { assignVoltageBands, fillMissingVoltages, validateSymbolVoltages } from './phase1-voltage-bands';
import { detectBays } from './phase2-bay-detection';
import { minimizeCrossings } from './phase3-crossing-min';
import { assignCoordinates, calculateSchemaBounds } from './phase4-coordinates';
import { routeEdgesAndPlaceLabels, validateOrthogonalPaths, countEdgeCrossings } from './phase5-routing';

// =============================================================================
// MAIN PIPELINE FUNCTION
// =============================================================================

/**
 * Wykonaj pełny pipeline layoutu SLD.
 *
 * @param input - Dane wejściowe
 * @returns Wynik layoutu
 */
export function computeFullLayout(input: LayoutInput): LayoutResult {
  const startTime = performance.now();

  // Walidacja wejścia
  if (!input.symbols || input.symbols.length === 0) {
    return createEmptyResult();
  }

  // Konfiguracja
  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...input.config };
  const voltageColorMap: VoltageColorRule[] = input.voltageColorMap ?? DEFAULT_VOLTAGE_COLOR_MAP;

  // Przygotuj symbole (kopia dla bezpieczeństwa)
  const symbols = prepareSymbols(input.symbols);

  // Uzupełnij brakujące napięcia
  fillMissingVoltages(symbols);

  // Waliduj napięcia (ostrzeżenie, nie błąd)
  const missingVoltages = validateSymbolVoltages(symbols);
  if (missingVoltages.length > 0) {
    console.warn(
      `[SLD-Layout] ${missingVoltages.length} symbols missing voltage:`,
      missingVoltages.map((s) => s.id)
    );
  }

  // Inicjalizuj kontekst
  let context: PipelineContext = createInitialContext(
    symbols,
    config,
    voltageColorMap,
    input.previousResult
  );

  // === FAZA 1: Voltage Band Assignment ===
  context = assignVoltageBands(context);

  // === FAZA 2: Bay Detection ===
  context = detectBays(context);

  // === FAZA 3: Crossing Minimization ===
  context = minimizeCrossings(context);

  // === FAZA 4: Coordinate Assignment ===
  context = assignCoordinates(context);

  // === FAZA 5: Edge Routing + Label Placement ===
  context = routeEdgesAndPlaceLabels(context);

  // Oblicz bounding box
  const bounds = calculateSchemaBounds(context.positions ?? new Map(), config);

  // Zbuduj wynik
  const endTime = performance.now();

  // Flatten all bays (including sub-bays) for the result
  const topLevelBays = context.orderedBays ?? context.bays ?? [];
  const allBays = flattenBays(topLevelBays);

  const result: LayoutResult = {
    positions: context.positions ?? new Map(),
    busbarGeometries: context.busbarGeometries ?? new Map(),
    routedEdges: context.routedEdges ?? new Map(),
    labelPositions: context.labelPositions ?? new Map(),
    voltageBands: context.voltageBands ?? [],
    bays: allBays,
    bounds,
    debug: finalizeDebugInfo(context, endTime - startTime),
  };

  // Walidacja wyniku
  validateLayoutResult(result);

  return result;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Utwórz pusty wynik (dla pustego wejścia).
 */
function createEmptyResult(): LayoutResult {
  return {
    positions: new Map(),
    busbarGeometries: new Map(),
    routedEdges: new Map(),
    labelPositions: new Map(),
    voltageBands: [],
    bays: [],
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    debug: {
      layers: new Map(),
      totalLayers: 0,
      totalNodes: 0,
      floatingSymbols: [],
      quarantinedSymbols: [],
      transformerCount: 0,
      busbarSections: new Map(),
      filteredPccNodes: [],
      stationStacks: new Map(),
      canonicalLayerAssignments: new Map(),
      spineX: 0,
      isEmptyState: true,
      collisionsResolved: 0,
      executionTimeMs: 0,
      crossingMinIterations: 0,
      initialCrossings: 0,
      finalCrossings: 0,
    },
  };
}

/**
 * Przygotuj symbole do layoutu.
 */
function prepareSymbols(symbols: LayoutSymbol[]): LayoutSymbol[] {
  // Głęboka kopia
  return symbols.map((s) => ({ ...s }));
}

/**
 * Flatten all bays including sub-bays into a single array.
 * This ensures that nested bays (e.g., OZE bays under intermediate busbars)
 * are included in the result.bays array.
 */
function flattenBays(bays: Bay[]): Bay[] {
  const result: Bay[] = [];

  function collectBays(bayList: Bay[]): void {
    for (const bay of bayList) {
      result.push(bay);
      if (bay.subBays && bay.subBays.length > 0) {
        collectBays(bay.subBays);
      }
    }
  }

  collectBays(bays);

  // Sort for determinism
  result.sort((a, b) => a.id.localeCompare(b.id));

  return result;
}

/**
 * Utwórz początkowy kontekst pipeline.
 */
function createInitialContext(
  symbols: LayoutSymbol[],
  config: LayoutConfig,
  voltageColorMap: VoltageColorRule[],
  previousResult?: LayoutResult
): PipelineContext {
  // Buduj mapy
  const elementToSymbol = new Map<string, string>();
  const symbolById = new Map<string, LayoutSymbol>();

  for (const symbol of symbols) {
    elementToSymbol.set(symbol.elementId, symbol.id);
    symbolById.set(symbol.id, symbol);
  }

  // User overrides z poprzedniego wyniku
  const userOverrides = new Map<string, UserPositionOverride>();
  if (previousResult) {
    for (const [symbolId, pos] of previousResult.positions) {
      if (!pos.autoPositioned) {
        userOverrides.set(symbolId, {
          symbolId,
          position: pos.position,
          timestamp: Date.now(),
        });
      }
    }
  }

  return {
    symbols,
    config,
    voltageColorMap,
    elementToSymbol,
    symbolById,
    userOverrides,
    debug: {},
  };
}

/**
 * Sfinalizuj informacje debugowe.
 */
function finalizeDebugInfo(context: PipelineContext, executionTimeMs: number): LayoutDebugInfo {
  return {
    layers: context.debug.layers ?? new Map(),
    totalLayers: context.debug.totalLayers ?? 0,
    totalNodes: context.symbols.length,
    floatingSymbols: context.debug.floatingSymbols ?? [],
    quarantinedSymbols: context.debug.quarantinedSymbols ?? [],
    transformerCount: context.symbols.filter((s) => s.elementType === 'TransformerBranch').length,
    busbarSections: context.debug.busbarSections ?? new Map(),
    filteredPccNodes: context.debug.filteredPccNodes ?? [],
    stationStacks: context.debug.stationStacks ?? new Map(),
    canonicalLayerAssignments: context.debug.canonicalLayerAssignments ?? new Map(),
    spineX: context.debug.spineX ?? 0,
    isEmptyState: context.symbols.length === 0,
    collisionsResolved: context.debug.collisionsResolved ?? 0,
    executionTimeMs: Math.round(executionTimeMs * 100) / 100,
    crossingMinIterations: context.debug.crossingMinIterations ?? 0,
    initialCrossings: context.debug.initialCrossings ?? 0,
    finalCrossings: context.debug.finalCrossings ?? 0,
  };
}

/**
 * Waliduj wynik layoutu.
 */
function validateLayoutResult(result: LayoutResult): void {
  // Sprawdź ortogonalność ścieżek
  if (!validateOrthogonalPaths(result.routedEdges)) {
    console.warn('[SLD-Layout] Non-orthogonal paths detected');
  }

  // Policz skrzyżowania
  const crossings = countEdgeCrossings(result.routedEdges);
  if (crossings > 0) {
    console.info(`[SLD-Layout] ${crossings} edge crossings detected`);
  }

  // Sprawdź floating symbols
  if (result.debug.floatingSymbols.length > 0) {
    console.warn(
      `[SLD-Layout] ${result.debug.floatingSymbols.length} floating symbols (ETAP violation):`,
      result.debug.floatingSymbols
    );
  }
}

// =============================================================================
// DETERMINISM VERIFICATION
// =============================================================================

/**
 * Zweryfikuj determinizm layoutu.
 *
 * @param input - Dane wejściowe
 * @returns true jeśli dwa uruchomienia dają identyczny wynik
 */
export function verifyDeterminism(input: LayoutInput): boolean {
  const result1 = computeFullLayout(input);
  const result2 = computeFullLayout(input);

  // Porównaj pozycje
  if (result1.positions.size !== result2.positions.size) {
    console.error('[Determinism] Different number of positions');
    return false;
  }

  for (const [id, pos1] of result1.positions) {
    const pos2 = result2.positions.get(id);
    if (!pos2) {
      console.error(`[Determinism] Missing position for ${id}`);
      return false;
    }

    if (pos1.position.x !== pos2.position.x || pos1.position.y !== pos2.position.y) {
      console.error(
        `[Determinism] Different position for ${id}: (${pos1.position.x}, ${pos1.position.y}) vs (${pos2.position.x}, ${pos2.position.y})`
      );
      return false;
    }
  }

  // Porównaj baye
  if (result1.bays.length !== result2.bays.length) {
    console.error('[Determinism] Different number of bays');
    return false;
  }

  for (let i = 0; i < result1.bays.length; i++) {
    if (result1.bays[i].id !== result2.bays[i].id) {
      console.error(`[Determinism] Different bay order at index ${i}`);
      return false;
    }
  }

  // Porównaj voltage bands
  if (result1.voltageBands.length !== result2.voltageBands.length) {
    console.error('[Determinism] Different number of voltage bands');
    return false;
  }

  for (let i = 0; i < result1.voltageBands.length; i++) {
    if (result1.voltageBands[i].id !== result2.voltageBands[i].id) {
      console.error(`[Determinism] Different voltage band at index ${i}`);
      return false;
    }
  }

  return true;
}

// =============================================================================
// INCREMENTAL LAYOUT
// =============================================================================

/**
 * Przelicz layout inkrementalnie (tylko dla zmienionego regionu).
 *
 * NOTE: Obecna implementacja wykonuje pełne przeliczenie.
 * Prawdziwy incremental layout wymaga bardziej zaawansowanej implementacji.
 *
 * @param input - Dane wejściowe
 * @param changedSymbolIds - ID symboli, które się zmieniły
 * @returns Wynik layoutu
 */
export function computeIncrementalLayout(
  input: LayoutInput,
  _changedSymbolIds: string[]
): LayoutResult {
  // TODO: Implementacja prawdziwego incremental layout
  // Na razie wykonujemy pełne przeliczenie z zachowaniem user overrides
  return computeFullLayout(input);
}
