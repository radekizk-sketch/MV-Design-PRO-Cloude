/**
 * LayoutEngine — klasa OOP opakowująca pipeline layoutu SLD.
 *
 * ARCHITEKTURA:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    LayoutEngine                              │
 * │                                                              │
 * │  compute(input) ──────┬──── 'pipeline'  → computeFullLayout │
 * │                       ├──── 'force-directed' → FD + convert │
 * │                       └──── 'greedy'    → Greedy + convert  │
 * │                                                              │
 * │  Post-processing:                                            │
 * │  ├── enableCollisionDetection → detectCollisions + resolveA* │
 * │  └── phaseColors → applyPhaseColors                         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * UŻYCIE:
 * ```typescript
 * const engine = new LayoutEngine({ algorithm: 'force-directed', phaseColors: PHASE_COLORS_DEFAULT });
 * const result = engine.compute({ symbols: [...] });
 * ```
 *
 * BACKWARD COMPAT:
 * Istniejące computeLayout() / generateLayout() nadal działają bez zmian.
 * LayoutEngine to opcjonalne OOP API na wierzchu istniejącego pipeline.
 *
 * DETERMINIZM: te same opcje + input → identyczny output.
 */

import type {
  LayoutInput,
  LayoutResult,
  PhaseColorConfig,
  PlacementAlgorithm,
  ConnectionStyle,
} from './types';
import { computeFullLayout, computeIncrementalLayout, verifyDeterminism as pipelineDeterminism } from './pipeline';
import { computeForceDirectedPositions } from './algorithms/force-directed';
import { computeGreedyPlacement } from './algorithms/greedy-placement';
import { detectCollisions, resolveCollisionsAstar, buildObstacleList } from './algorithms/collision-detector';
import { applyPhaseColors } from './algorithms/phase-colors';

// =============================================================================
// TYPY
// =============================================================================

export type { PlacementAlgorithm, ConnectionStyle, PhaseColorConfig };

export interface LayoutEngineOptions {
  /** Algorytm rozmieszczania. Domyślnie 'pipeline'. */
  algorithm: PlacementAlgorithm;
  /** Styl połączeń. Domyślnie 'orthogonal'. */
  connectionStyle: ConnectionStyle;
  /** Minimalna odległość między elementami [px]. Domyślnie 80. */
  minDistance: number;
  /** Maksymalna odległość [px]. Domyślnie 400. */
  maxDistance: number;
  /** Współczynnik skalowania. Domyślnie 1.0. */
  scaleFactor: number;
  /** Włącz wykrywanie kolizji BoundingBox. Domyślnie true. */
  enableCollisionDetection: boolean;
  /** Wyróżnij GPZ (rozmiar/kolor). Domyślnie true. */
  gpzHighlight: boolean;
  /** Kolory faz R/W/B. Domyślnie null (kolory napięciowe). */
  phaseColors: PhaseColorConfig | null;
}

export const DEFAULT_ENGINE_OPTIONS: LayoutEngineOptions = {
  algorithm:                'pipeline',
  connectionStyle:          'orthogonal',
  minDistance:              80,
  maxDistance:              400,
  scaleFactor:              1.0,
  enableCollisionDetection: true,
  gpzHighlight:             true,
  phaseColors:              null,
};

// =============================================================================
// KLASA LAYOUTENGINE
// =============================================================================

/**
 * LayoutEngine — główny punkt wejścia do layoutu SLD.
 *
 * Opakowuje istniejący `computeFullLayout()` (pipeline) w OOP interfejs
 * z wyborem algorytmu, wykrywaniem kolizji i kolorami faz.
 */
export class LayoutEngine {
  private readonly options: Readonly<LayoutEngineOptions>;

  constructor(options?: Partial<LayoutEngineOptions>) {
    this.options = Object.freeze({ ...DEFAULT_ENGINE_OPTIONS, ...options });
  }

  /**
   * Oblicza pełny layout SLD.
   *
   * Wybiera algorytm rozmieszczania, stosuje post-processing
   * (collision detection, phase colors).
   */
  compute(input: LayoutInput): LayoutResult {
    const { algorithm, enableCollisionDetection, phaseColors } = this.options;

    let result: LayoutResult;

    switch (algorithm) {
      case 'force-directed':
        result = this.computeWithForceDirected(input);
        break;
      case 'greedy':
        result = this.computeWithGreedy(input);
        break;
      case 'pipeline':
      default:
        // Domyślny 5-fazowy pipeline (z opcjonalnym collision detection w Fazie 4b)
        result = computeFullLayout({
          ...input,
          config: {
            ...input.config,
            // Przekaż flagę collision detection do pipeline (przez context)
          },
        });
        break;
    }

    // Post-processing: collision detection (dla force-directed i greedy)
    if (enableCollisionDetection && algorithm !== 'pipeline') {
      result = this.resolveCollisions(result, input);
    }

    // Post-processing: phase colors
    if (phaseColors) {
      const coloredEdges = applyPhaseColors(result.routedEdges, phaseColors);
      result = { ...result, routedEdges: coloredEdges };
    }

    return result;
  }

  /**
   * Oblicza layout inkrementalnie — tylko zmienione regiony.
   */
  computeIncremental(input: LayoutInput, changedIds: string[]): LayoutResult {
    const result = computeIncrementalLayout(input, changedIds);

    if (this.options.phaseColors) {
      const coloredEdges = applyPhaseColors(result.routedEdges, this.options.phaseColors);
      return { ...result, routedEdges: coloredEdges };
    }

    return result;
  }

  /**
   * Weryfikuje determinizm: 2× uruchomienie z identycznym inputem.
   * @returns true jeśli wyniki są identyczne
   */
  verifyDeterminism(input: LayoutInput): boolean {
    if (this.options.algorithm === 'pipeline') {
      return pipelineDeterminism(input);
    }

    const r1 = this.compute(input);
    const r2 = this.compute(input);

    // Porównaj pozycje
    if (r1.positions.size !== r2.positions.size) return false;
    for (const [id, pos1] of r1.positions) {
      const pos2 = r2.positions.get(id);
      if (!pos2) return false;
      if (pos1.position.x !== pos2.position.x || pos1.position.y !== pos2.position.y) return false;
    }

    return true;
  }

  /**
   * Rozwiązuje kolizje w istniejącym wyniku layoutu.
   */
  resolveCollisions(result: LayoutResult, _input: LayoutInput): LayoutResult {
    if (!result.positions || result.positions.size === 0) return result;

    const colResult = detectCollisions(result.positions);
    if (!colResult.hasCollision) return result;

    const obstacles   = buildObstacleList(result.positions);
    const resolvedPos = resolveCollisionsAstar(
      result.positions,
      colResult,
      obstacles,
      { gridSize: 20, bayGap: 280, elementGapY: 60, elementGapX: 40, bandGap: 80,
        bandHeaderHeight: 30, labelOffsetX: 60, labelOffsetY: -10, labelMaxWidth: 140,
        canvasPadding: 80, symbolDefaultWidth: 60, symbolDefaultHeight: 40,
        transformerOffsetFromWN: 100, transformerOffsetToSN: 80,
        sourceHeight: 60, sourceOffsetAboveBusbar: 40,
        busbarMinWidth: 400, busbarExtendPerBay: 120, busbarHeight: 8 }
    );

    return { ...result, positions: resolvedPos };
  }

  /** Odczytaj aktualne opcje. */
  getOptions(): Readonly<LayoutEngineOptions> {
    return this.options;
  }

  // =============================================================================
  // PRYWATNE — algorytmy alternatywne
  // =============================================================================

  /**
   * Force-directed: oblicza pozycje, konwertuje do LayoutResult przez pipeline.
   */
  private computeWithForceDirected(input: LayoutInput): LayoutResult {
    const { minDistance, maxDistance } = this.options;

    // Konwertuj LayoutSymbol → FDNode / FDEdge
    const nodes = input.symbols.map((s) => ({
      id:          s.id,
      elementType: s.elementType,
      voltageKV:   s.voltageKV,
    }));
    const edges = input.symbols
      .filter((s) => s.fromNodeId && s.toNodeId)
      .map((s) => ({
        fromId: findSymbolId(input.symbols, s.fromNodeId!),
        toId:   findSymbolId(input.symbols, s.toNodeId!),
      }))
      .filter((e) => e.fromId && e.toId) as Array<{ fromId: string; toId: string }>;

    const positions = computeForceDirectedPositions(nodes, edges, { minDistance, maxDistance });

    // Nadpisz pozycje w inputcie i uruchom pipeline do wygenerowania pełnego LayoutResult
    const enrichedSymbols = input.symbols.map((s) => {
      const pos = positions.get(s.id);
      return pos ? { ...s, position: pos } : s;
    });

    return computeFullLayout({ ...input, symbols: enrichedSymbols });
  }

  /**
   * Greedy: oblicza pozycje BFS, konwertuje do LayoutResult przez pipeline.
   */
  private computeWithGreedy(input: LayoutInput): LayoutResult {
    const { minDistance, maxDistance } = this.options;

    const nodes = input.symbols.map((s) => ({
      id:          s.id,
      elementType: s.elementType,
      voltageKV:   s.voltageKV,
    }));
    const edges = input.symbols
      .filter((s) => s.fromNodeId && s.toNodeId)
      .map((s) => ({
        fromId: findSymbolId(input.symbols, s.fromNodeId!),
        toId:   findSymbolId(input.symbols, s.toNodeId!),
      }))
      .filter((e) => e.fromId && e.toId) as Array<{ fromId: string; toId: string }>;

    const positions = computeGreedyPlacement(nodes, edges, { minDistance, maxDistance });

    const enrichedSymbols = input.symbols.map((s) => {
      const pos = positions.get(s.id);
      return pos ? { ...s, position: pos } : s;
    });

    return computeFullLayout({ ...input, symbols: enrichedSymbols });
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function findSymbolId(symbols: LayoutInput['symbols'], elementId: string): string {
  return symbols.find((s) => s.elementId === elementId)?.id ?? elementId;
}
