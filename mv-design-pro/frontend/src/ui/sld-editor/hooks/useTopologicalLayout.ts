/**
 * useTopologicalLayout — Topological Auto-Layout Hook
 *
 * Hook integrujacy silnik auto-layoutu topologicznego z React.
 * Zastepuje/rozszerza useAutoLayout o logike topologiczna.
 *
 * ZASADY:
 * - Layout dziala ZAWSZE i SAM (bez przyciskow)
 * - Automatyczne wywolanie przy kazdej zmianie topologii
 * - Determinizm: ten sam model -> ten sam uklad
 * - Stabilnosc: mala zmiana = mala zmiana ukladu
 * - Kolizje symbol-symbol = CI guard
 *
 * KOMPATYBILNOSC: Zwraca ten sam interfejs UseAutoLayoutResult
 * co useAutoLayout, wiec mozna go uzyc jako drop-in replacement.
 */

import { useMemo, useRef, useCallback } from 'react';
import type { AnySldSymbol, Position } from '../types';
import {
  computeTopologicalLayout,
  type TopologicalLayoutResult,
  type LayoutGeometryConfig,
  DEFAULT_GEOMETRY_CONFIG,
} from '../utils/topological-layout';
import {
  type AutoLayoutConfig,
  type CollisionConfig,
} from '../utils/autoLayout';
import {
  resolveLabelCollisions,
  type LabelBoundingBox,
} from '../../sld/sldEtapStyle';
import type { PositionOverride, UseAutoLayoutResult, AutoLayoutState } from './useAutoLayout';
import { computeTopologyHash } from './useAutoLayout';

// Re-export CollisionConfig default
const DEFAULT_COLLISION_CONFIG: CollisionConfig = {
  symbolClearance: 24,
  labelSymbolClearance: 16,
  labelEdgeClearance: 12,
  busbarPadding: 20,
  labelCharWidth: 7,
  labelHeight: 12,
  edgeThickness: 6,
  maxIterations: 20,
};

// =============================================================================
// EXTENDED RESULT TYPE
// =============================================================================

export interface UseTopologicalLayoutResult extends UseAutoLayoutResult {
  /** Full topological layout result (roles, skeleton, collisions) */
  topologicalResult: TopologicalLayoutResult | null;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook do topologicznego auto-layoutu SLD.
 *
 * Drop-in replacement dla useAutoLayout z dodatkowym polem topologicalResult.
 *
 * @param symbols - Symbole SLD do rozmieszczenia
 * @param config - Konfiguracja layoutu (opcjonalna, kompatybilna z AutoLayoutConfig)
 */
export function useTopologicalLayout(
  symbols: AnySldSymbol[],
  config: Partial<AutoLayoutConfig> = {}
): UseTopologicalLayoutResult {
  // Merge config with defaults
  const geoConfig: LayoutGeometryConfig = {
    ...DEFAULT_GEOMETRY_CONFIG,
    gridSize: config.gridSize ?? DEFAULT_GEOMETRY_CONFIG.gridSize,
    padding: config.padding ?? DEFAULT_GEOMETRY_CONFIG.padding,
    minBusbarWidth: config.busMinWidth ?? DEFAULT_GEOMETRY_CONFIG.minBusbarWidth,
  };

  // Overrides ref
  const overridesRef = useRef<Map<string, PositionOverride>>(new Map());
  const previousHashRef = useRef<string>('');

  // Topology hash
  const topologyHash = useMemo(() => computeTopologyHash(symbols), [symbols]);

  // Run topological layout engine
  const topologicalResult = useMemo<TopologicalLayoutResult | null>(() => {
    if (symbols.length === 0) return null;
    return computeTopologicalLayout(
      symbols,
      geoConfig,
      (config as any).direction === 'left-right' ? 'left-right' : 'top-down'
    );
  }, [symbols, topologyHash, geoConfig]);

  // Build layout state (compatible with useAutoLayout)
  const layoutState = useMemo<AutoLayoutState>(() => {
    const basePositions = topologicalResult?.positions
      ? new Map(topologicalResult.positions)
      : new Map<string, Position>();

    // Apply manual overrides
    const finalPositions = new Map(basePositions);
    const sortedOverrides = Array.from(overridesRef.current.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
    for (const override of sortedOverrides) {
      const basePos = basePositions.get(override.symbolId);
      if (!basePos) continue;
      const gridSize = geoConfig.gridSize;
      const newX = Math.round((basePos.x + override.deltaX) / gridSize) * gridSize;
      const newY = Math.round((basePos.y + override.deltaY) / gridSize) * gridSize;
      finalPositions.set(override.symbolId, { x: newX, y: newY });
    }

    // Build layer map from topological result
    const layers = new Map<number, string[]>();
    if (topologicalResult) {
      topologicalResult.skeleton.tiers.forEach((tier, idx) => {
        layers.set(idx, [...tier.symbolIds]);
      });
    }

    return {
      basePositions,
      finalPositions,
      overrides: new Map(overridesRef.current),
      topologyHash,
      debug: {
        layers,
        totalLayers: topologicalResult?.diagnostics.tierCount ?? 0,
        totalNodes: topologicalResult?.diagnostics.assignedRoleCount ?? 0,
        collisionsResolved: topologicalResult?.collisionReport.affectedSymbolCount ?? 0,
      },
    };
  }, [topologicalResult, topologyHash, geoConfig]);

  // Check if layout is current
  const isLayoutCurrent = previousHashRef.current === topologyHash;
  previousHashRef.current = topologyHash;

  // Apply positions to symbols
  const layoutSymbols = useMemo<AnySldSymbol[]>(() => {
    return symbols.map((symbol) => {
      const pos = layoutState.finalPositions.get(symbol.id);
      if (pos) {
        return { ...symbol, position: pos };
      }
      return symbol;
    });
  }, [symbols, layoutState.finalPositions]);

  // Label collision resolution
  const labelAdjustments = useMemo<Map<string, { x: number; y: number }>>(() => {
    const labelBoxes = buildLabelBoundingBoxes(
      symbols,
      layoutState.finalPositions,
      DEFAULT_COLLISION_CONFIG
    );
    return resolveLabelCollisions(labelBoxes);
  }, [symbols, layoutState.finalPositions]);

  // Actions
  const addOverride = useCallback(
    (symbolId: string, delta: Position) => {
      const basePos = layoutState.basePositions.get(symbolId);
      if (!basePos) return;
      overridesRef.current.set(symbolId, {
        symbolId,
        deltaX: delta.x,
        deltaY: delta.y,
        timestamp: Date.now(),
      });
    },
    [layoutState.basePositions]
  );

  const removeOverride = useCallback((symbolId: string) => {
    overridesRef.current.delete(symbolId);
  }, []);

  const clearOverrides = useCallback(() => {
    overridesRef.current.clear();
  }, []);

  return {
    positions: layoutState.finalPositions,
    layoutSymbols,
    isLayoutCurrent,
    addOverride,
    removeOverride,
    clearOverrides,
    debug: layoutState.debug,
    labelAdjustments,
    topologicalResult,
  };
}

// =============================================================================
// LABEL BOUNDING BOX HELPER
// =============================================================================

function buildLabelBoundingBoxes(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>,
  collisionConfig: CollisionConfig
): LabelBoundingBox[] {
  const labels: LabelBoundingBox[] = [];

  for (const symbol of symbols) {
    if (!symbol.elementName) continue;
    const pos = positions.get(symbol.id);
    if (!pos) continue;

    const labelWidth = Math.max(
      30,
      symbol.elementName.length * collisionConfig.labelCharWidth
    );
    const labelHeight = collisionConfig.labelHeight;
    const isBus = symbol.elementType === 'Bus';
    const symHeight = isBus ? 8 : 40;
    const offsetY = isBus ? -symHeight / 2 - 8 : -symHeight / 2 - 5;

    labels.push({
      x: pos.x,
      y: pos.y + offsetY - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
      ownerId: symbol.id,
    });
  }

  return labels;
}

export default useTopologicalLayout;
