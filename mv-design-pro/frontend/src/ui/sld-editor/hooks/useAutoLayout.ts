/**
 * useAutoLayout — Automatyczne rozmieszczenie SLD (bez przycisku)
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 5: Auto-Layout
 * - AUDYT_SLD_ETAP.md N-02: hierarchiczne auto-rozmieszczenie
 *
 * FEATURES:
 * - Automatyczne wywolanie przy kazdej zmianie topologii
 * - Deterministyczny uklad (ten sam model -> ten sam wynik)
 * - Stabilnosc (mala zmiana nie powoduje "przeskoku" calego schematu)
 * - Wsparcie dla nadpisan pozycji (manual overrides)
 * - Wykrywanie i rozwiazywanie kolizji
 *
 * ZAKAZ: przyciski "Rozmiesc automatycznie" — layout dziala ZAWSZE i SAM
 */

import { useMemo, useRef, useCallback } from 'react';
import type { AnySldSymbol, Position, BranchSymbol, SwitchSymbol } from '../types';
import {
  generateAutoLayout,
  type AutoLayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  type AutoLayoutResult,
  type CollisionConfig,
  DEFAULT_COLLISION_CONFIG,
} from '../utils/autoLayout';
import { generateConnections } from '../utils/connectionRouting';
import {
  ETAP_GEOMETRY,
  resolveLabelCollisions,
  type LabelBoundingBox,
} from '../../sld/sldEtapStyle';

// =============================================================================
// TYPY
// =============================================================================

/**
 * Nadpisanie pozycji dla konkretnego symbolu (manual override).
 * Uzywane gdy uzytkownik recznie przesunie symbol.
 */
export interface PositionOverride {
  /** ID symbolu */
  symbolId: string;
  /** Delta pozycji wzgledem bazowego auto-layoutu */
  deltaX: number;
  deltaY: number;
  /** Timestamp nadpisania (dla sortowania/priorytetyzacji) */
  timestamp: number;
}

/**
 * Stan auto-layoutu.
 */
export interface AutoLayoutState {
  /** Bazowe pozycje z auto-layoutu (przed nadpisaniami) */
  basePositions: Map<string, Position>;
  /** Finalne pozycje (po zastosowaniu nadpisan i kolizji) */
  finalPositions: Map<string, Position>;
  /** Nadpisania pozycji (manual overrides) */
  overrides: Map<string, PositionOverride>;
  /** Hash topologii (do wykrywania zmian) */
  topologyHash: string;
  /** Informacje debugowe */
  debug: {
    layers: Map<number, string[]>;
    totalLayers: number;
    totalNodes: number;
    collisionsResolved: number;
  };
}

/**
 * Wynik hooka useAutoLayout.
 */
export interface UseAutoLayoutResult {
  /** Finalne pozycje symboli (gotowe do renderowania) */
  positions: Map<string, Position>;
  /** Symbole z zastosowanymi pozycjami */
  layoutSymbols: AnySldSymbol[];
  /** Czy layout jest aktualny */
  isLayoutCurrent: boolean;
  /** Dodaj nadpisanie pozycji (po recznym przesunieciu) */
  addOverride: (symbolId: string, delta: Position) => void;
  /** Usun nadpisanie pozycji */
  removeOverride: (symbolId: string) => void;
  /** Wyczysc wszystkie nadpisania */
  clearOverrides: () => void;
  /** Informacje debugowe */
  debug: AutoLayoutState['debug'];
  /** PR-SLD-ETAP-GEOMETRY-01: Label position adjustments for collision avoidance */
  labelAdjustments: Map<string, { x: number; y: number }>;
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

type CollisionKind = 'node' | 'label' | 'edge';

interface CollisionItem {
  id: string;
  ownerId: string;
  kind: CollisionKind;
  x: number;
  y: number;
  width: number;
  height: number;
  layerIndex: number;
  typePriority: number;
}

interface CollisionPair {
  a: CollisionItem;
  b: CollisionItem;
  clearance: number;
}

const KIND_PRIORITY: Record<CollisionKind, number> = {
  node: 0,
  label: 1,
  edge: 2,
};

/**
 * Oblicz deterministyczny hash topologii.
 * DETERMINIZM: sortowanie po ID gwarantuje ten sam hash dla tej samej topologii.
 *
 * Hash jest odporny na:
 * - Kolejnosc symboli w tablicy
 * - Pozycje symboli (ignorowane)
 *
 * Hash zmienia sie gdy:
 * - Dodano/usunieto symbol
 * - Zmieniono polaczenia (fromNodeId, toNodeId, connectedToNodeId)
 * - Zmieniono typ elementu
 */
export function computeTopologyHash(symbols: AnySldSymbol[]): string {
  // Sortuj symbole po ID (determinizm)
  const sortedSymbols = [...symbols].sort((a, b) => a.id.localeCompare(b.id));

  // Buduj hash z: ID, elementType, polaczenia
  const parts: string[] = [];

  for (const symbol of sortedSymbols) {
    // Podstawowe dane
    parts.push(`${symbol.id}:${symbol.elementType}`);

    // Polaczenia (dla Branch/Switch)
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;
      // Sortuj fromNodeId i toNodeId dla determinizmu (krawedz nieskierowana)
      const nodeIds = [branch.fromNodeId, branch.toNodeId].sort();
      parts.push(`->${nodeIds[0]},${nodeIds[1]}`);
    }

    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;
      const nodeIds = [sw.fromNodeId, sw.toNodeId].sort();
      parts.push(`->${nodeIds[0]},${nodeIds[1]}`);
    }

    // Polaczenia Source/Load
    if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const connected = (symbol as any).connectedToNodeId;
      if (connected) {
        parts.push(`->${connected}`);
      }
    }
  }

  // Prosty hash (dla produkcji mozna uzyc SHA-256)
  return parts.join('|');
}

/**
 * Wykryj kolizje miedzy symbolami.
 * @returns Mapa: symbolId -> tablica kolidujacych symbolIds
 */
export function detectCollisions(
  items: CollisionItem[],
  collisionConfig: CollisionConfig
): CollisionPair[] {
  const pairs: CollisionPair[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      if (a.kind === 'label' && b.kind === 'node' && a.ownerId === b.ownerId) continue;
      if (b.kind === 'label' && a.kind === 'node' && a.ownerId === b.ownerId) continue;

      const clearance = getPairClearance(a, b, collisionConfig);
      if (clearance === null) continue;

      const halfW1 = a.width / 2;
      const halfH1 = a.height / 2;
      const halfW2 = b.width / 2;
      const halfH2 = b.height / 2;

      const overlapX = Math.abs(a.x - b.x) < (halfW1 + halfW2 + clearance);
      const overlapY = Math.abs(a.y - b.y) < (halfH1 + halfH2 + clearance);

      if (overlapX && overlapY) {
        pairs.push({ a, b, clearance });
      }
    }
  }

  return pairs;
}

/**
 * Rozwiaz kolizje deterministycznie.
 * Przesuwa kolidujace symbole o minimalna odleglosc.
 *
 * DETERMINIZM:
 * - Symbole sortowane po ID
 * - Priorytet: symbol o nizszym ID zostaje w miejscu
 */
export function resolveCollisions(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>,
  basePositions: Map<string, Position>,
  layoutDebug: AutoLayoutResult['debug'],
  config: AutoLayoutConfig,
  collisionConfig: CollisionConfig = DEFAULT_COLLISION_CONFIG
): { positions: Map<string, Position>; resolvedCount: number } {
  const resolved = new Map(positions);
  let resolvedCount = 0;
  const maxIterations = collisionConfig.maxIterations;
  const layerIndexBySymbol = buildLayerIndexMap(layoutDebug.layers);
  const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  const spineX = computeSpineX(symbols, resolved, config.gridSize);

  for (let iter = 0; iter < maxIterations; iter++) {
    const items = buildCollisionItems(
      symbols,
      resolved,
      layerIndexBySymbol,
      config,
      collisionConfig
    );
    const collisions = detectCollisions(items, collisionConfig);
    if (collisions.length === 0) break;

    const sortedItems = [...items].sort(compareCollisionItems);
    const orderIndex = new Map(sortedItems.map((item, index) => [item.id, index]));

    for (const collision of collisions) {
      const { a, b, clearance } = collision;
      const moveCandidate = selectMoverItem(
        a,
        b,
        orderIndex,
        symbolById,
        resolved,
        spineX,
        config.gridSize
      );
      if (!moveCandidate) continue;

      const other = moveCandidate.id === a.id ? b : a;
      const ownerId = moveCandidate.ownerId;
      const ownerPos = resolved.get(ownerId);
      if (!ownerPos) continue;

      const dx = moveCandidate.x - other.x;
      const dy = moveCandidate.y - other.y;
      const minDistX = (moveCandidate.width + other.width) / 2 + clearance;
      const minDistY = (moveCandidate.height + other.height) / 2 + clearance;
      const neededX = minDistX - Math.abs(dx);
      const neededY = minDistY - Math.abs(dy);

      const spineLocked = isSpineLocked(ownerId, symbolById, resolved, spineX, config.gridSize);
      const preferHorizontal = !spineLocked;

      const shift = calculateShift(
        neededX,
        neededY,
        dx,
        dy,
        ownerId,
        other.ownerId,
        preferHorizontal
      );

      if (!shift) continue;

      let newX = ownerPos.x + shift.x;
      let newY = ownerPos.y + shift.y;
      const baseY = basePositions.get(ownerId)?.y ?? ownerPos.y;
      if (newY < baseY) {
        newY = baseY;
      }

      newX = Math.round(newX / config.gridSize) * config.gridSize;
      newY = Math.round(newY / config.gridSize) * config.gridSize;

      if (newX !== ownerPos.x || newY !== ownerPos.y) {
        resolved.set(ownerId, { x: newX, y: newY });
        resolvedCount++;
      }
    }
  }

  return { positions: resolved, resolvedCount };
}

/**
 * Zastosuj nadpisania pozycji (manual overrides).
 * Sprawdza czy nadpisanie nie powoduje kolizji.
 *
 * @returns Mapa finalnych pozycji + lista odrzuconych nadpisan
 */
export function applyOverrides(
  basePositions: Map<string, Position>,
  overrides: Map<string, PositionOverride>,
  symbols: AnySldSymbol[],
  layoutDebug: AutoLayoutResult['debug'],
  config: AutoLayoutConfig,
  collisionConfig: CollisionConfig = DEFAULT_COLLISION_CONFIG
): { positions: Map<string, Position>; rejectedOverrides: string[] } {
  const positions = new Map(basePositions);
  const rejectedOverrides: string[] = [];
  const layerIndexBySymbol = buildLayerIndexMap(layoutDebug.layers);

  // Sortuj nadpisania po timestamp (determinizm)
  const sortedOverrides = Array.from(overrides.values()).sort((a, b) => a.timestamp - b.timestamp);

  for (const override of sortedOverrides) {
    const basePos = basePositions.get(override.symbolId);
    if (!basePos) continue;

    // Oblicz nowa pozycje
    let newX = basePos.x + override.deltaX;
    let newY = basePos.y + override.deltaY;

    // Snap to grid
    newX = Math.round(newX / config.gridSize) * config.gridSize;
    newY = Math.round(newY / config.gridSize) * config.gridSize;

    // Sprawdz czy nie powoduje kolizji
    const testPositions = new Map(positions);
    testPositions.set(override.symbolId, { x: newX, y: newY });

    const items = buildCollisionItems(
      symbols,
      testPositions,
      layerIndexBySymbol,
      config,
      collisionConfig
    );
    const collisions = detectCollisions(items, collisionConfig);
    const hasCollision = collisions.some(
      ({ a, b }) => a.ownerId === override.symbolId || b.ownerId === override.symbolId
    );

    if (hasCollision) {
      // Odrzuc nadpisanie - kolizja
      rejectedOverrides.push(override.symbolId);
    } else {
      // Zastosuj nadpisanie
      positions.set(override.symbolId, { x: newX, y: newY });
    }
  }

  return { positions, rejectedOverrides };
}

/**
 * Pobierz rozmiary symboli z tablicy symboli.
 */
function getSymbolSizes(symbols: AnySldSymbol[]): Map<string, { width: number; height: number }> {
  const sizes = new Map<string, { width: number; height: number }>();

  for (const symbol of symbols) {
    let width = 60;
    let height = 40;

    if (symbol.elementType === 'Bus') {
      const bus = symbol as any;
      width = bus.width || 80;
      height = bus.height || 8;
    } else if (symbol.elementType === 'Source') {
      width = 50;
      height = 60;
    } else if (symbol.elementType === 'Load') {
      width = 30;
      height = 30;
    } else if (symbol.elementType === 'TransformerBranch') {
      width = 40;
      height = 50;
    } else if (symbol.elementType === 'Switch') {
      width = 40;
      height = 50;
    }

    sizes.set(symbol.id, { width, height });
  }

  return sizes;
}

function buildLayerIndexMap(layers: Map<number, string[]>): Map<string, number> {
  const map = new Map<string, number>();
  layers.forEach((symbolIds, layerIndex) => {
    symbolIds.forEach((symbolId) => map.set(symbolId, layerIndex));
  });
  return map;
}

function computeSpineX(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>,
  gridSize: number
): number {
  const counts = new Map<number, number>();
  symbols.forEach((symbol) => {
    if (symbol.elementType !== 'Bus' && symbol.elementType !== 'Source') return;
    const pos = positions.get(symbol.id);
    if (!pos) return;
    const snapped = Math.round(pos.x / gridSize) * gridSize;
    counts.set(snapped, (counts.get(snapped) ?? 0) + 1);
  });

  let bestX = 0;
  let bestCount = -1;
  const entries = Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
  for (const [x, count] of entries) {
    if (count > bestCount) {
      bestCount = count;
      bestX = x;
    }
  }

  return bestCount >= 0 ? bestX : 0;
}

function buildCollisionItems(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>,
  layerIndexBySymbol: Map<string, number>,
  config: AutoLayoutConfig,
  collisionConfig: CollisionConfig
): CollisionItem[] {
  const items: CollisionItem[] = [];
  const symbolSizes = getSymbolSizes(symbols);
  const positionedSymbols = applyPositionsToSymbols(symbols, positions);
  const connections = generateConnections(positionedSymbols, {
    gridSnap: config.gridSize,
  });

  for (const symbol of symbols) {
    const pos = positions.get(symbol.id);
    if (!pos) continue;
    const size = symbolSizes.get(symbol.id) ?? { width: 60, height: 40 };
    const isBus = symbol.elementType === 'Bus';
    const width = isBus ? size.width + collisionConfig.busbarPadding * 2 : size.width;
    const height = isBus ? size.height + collisionConfig.busbarPadding * 2 : size.height;

    items.push({
      id: symbol.id,
      ownerId: symbol.id,
      kind: 'node',
      x: pos.x,
      y: pos.y,
      width,
      height,
      layerIndex: layerIndexBySymbol.get(symbol.id) ?? 0,
      typePriority: KIND_PRIORITY.node,
    });

    if (symbol.elementName) {
      const labelBox = buildLabelBoundingBox(symbol, pos, size, collisionConfig);
      items.push({
        id: `${symbol.id}__label`,
        ownerId: symbol.id,
        kind: 'label',
        x: labelBox.x,
        y: labelBox.y,
        width: labelBox.width,
        height: labelBox.height,
        layerIndex: layerIndexBySymbol.get(symbol.id) ?? 0,
        typePriority: KIND_PRIORITY.label,
      });
    }
  }

  for (const connection of connections) {
    for (let i = 0; i < connection.path.length - 1; i++) {
      const from = connection.path[i];
      const to = connection.path[i + 1];
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      const width = Math.max(maxX - minX, collisionConfig.edgeThickness);
      const height = Math.max(maxY - minY, collisionConfig.edgeThickness);

      items.push({
        id: `${connection.id}__seg_${i}`,
        ownerId: connection.id,
        kind: 'edge',
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width,
        height,
        layerIndex: Math.min(
          layerIndexBySymbol.get(connection.fromSymbolId) ?? 0,
          layerIndexBySymbol.get(connection.toSymbolId) ?? 0
        ),
        typePriority: KIND_PRIORITY.edge,
      });
    }
  }

  return items;
}

function buildLabelBoundingBox(
  symbol: AnySldSymbol,
  position: Position,
  size: { width: number; height: number },
  collisionConfig: CollisionConfig
): { x: number; y: number; width: number; height: number } {
  const labelWidth = Math.max(30, symbol.elementName.length * collisionConfig.labelCharWidth);
  const labelHeight = collisionConfig.labelHeight;
  const offsetY = symbol.elementType === 'Bus' ? -size.height / 2 - 8 : -size.height / 2 - 5;
  const centerX = position.x;
  const centerY = position.y + offsetY - labelHeight / 2;

  return {
    x: centerX,
    y: centerY,
    width: labelWidth,
    height: labelHeight,
  };
}

function applyPositionsToSymbols(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>
): AnySldSymbol[] {
  return symbols.map((symbol) => {
    const pos = positions.get(symbol.id);
    if (!pos) return symbol;
    return { ...symbol, position: pos };
  });
}

function getPairClearance(
  a: CollisionItem,
  b: CollisionItem,
  collisionConfig: CollisionConfig
): number | null {
  if (a.kind === 'node' && b.kind === 'node') return collisionConfig.symbolClearance;
  if (a.kind === 'label' && b.kind === 'node') return collisionConfig.labelSymbolClearance;
  if (a.kind === 'node' && b.kind === 'label') return collisionConfig.labelSymbolClearance;
  if (a.kind === 'label' && b.kind === 'edge') return collisionConfig.labelEdgeClearance;
  if (a.kind === 'edge' && b.kind === 'label') return collisionConfig.labelEdgeClearance;
  // PR-SLD-ETAP-GEOMETRY-01: Use ETAP_GEOMETRY for label-label clearance
  if (a.kind === 'label' && b.kind === 'label') return ETAP_GEOMETRY.labelCollision.labelLabelClearance;
  return null;
}

// =============================================================================
// LABEL COLLISION RESOLUTION (PR-SLD-ETAP-GEOMETRY-01)
// =============================================================================

/**
 * Build label bounding boxes for collision detection.
 * Uses ETAP_GEOMETRY tokens for consistent clearances.
 */
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

    const size = getSymbolSizes([symbol]).get(symbol.id) ?? { width: 60, height: 40 };
    const labelBox = buildLabelBoundingBox(symbol, pos, size, collisionConfig);

    labels.push({
      x: labelBox.x,
      y: labelBox.y,
      width: labelBox.width,
      height: labelBox.height,
      ownerId: symbol.id,
    });
  }

  return labels;
}

// Note: Label collision resolution is now handled directly in the hook using
// buildLabelBoundingBoxes and resolveLabelCollisions from sldEtapStyle.ts.
// The adjustments are passed to the renderer via labelAdjustments in the result.

function compareCollisionItems(a: CollisionItem, b: CollisionItem): number {
  if (a.layerIndex !== b.layerIndex) return a.layerIndex - b.layerIndex;
  if (a.typePriority !== b.typePriority) return a.typePriority - b.typePriority;
  return a.id.localeCompare(b.id);
}

function isSpineLocked(
  symbolId: string,
  symbolById: Map<string, AnySldSymbol>,
  positions: Map<string, Position>,
  spineX: number,
  gridSize: number
): boolean {
  const symbol = symbolById.get(symbolId);
  if (!symbol) return false;
  if (symbol.elementType !== 'Bus' && symbol.elementType !== 'Source') return false;
  const pos = positions.get(symbolId);
  if (!pos) return false;
  return Math.abs(pos.x - spineX) <= gridSize / 2;
}

function selectMoverItem(
  a: CollisionItem,
  b: CollisionItem,
  orderIndex: Map<string, number>,
  symbolById: Map<string, AnySldSymbol>,
  positions: Map<string, Position>,
  spineX: number,
  gridSize: number
): CollisionItem | null {
  let mover = orderIndex.get(a.id)! > orderIndex.get(b.id)! ? a : b;
  let other = mover.id === a.id ? b : a;

  if (mover.kind === 'edge' && other.kind !== 'edge') {
    mover = other;
    other = mover.id === a.id ? b : a;
  }

  const moverOwnerId = mover.ownerId;
  const otherOwnerId = other.ownerId;
  const moverSpineLocked = isSpineLocked(moverOwnerId, symbolById, positions, spineX, gridSize);
  const otherSpineLocked = isSpineLocked(otherOwnerId, symbolById, positions, spineX, gridSize);

  if (moverSpineLocked && !otherSpineLocked) {
    return other;
  }

  if (mover.kind === 'edge') return null;
  return mover;
}

function calculateShift(
  neededX: number,
  neededY: number,
  dx: number,
  dy: number,
  moverId: string,
  otherId: string,
  preferHorizontal: boolean
): { x: number; y: number } | null {
  if (neededX <= 0 && neededY <= 0) return null;

  const directionX = dx !== 0 ? Math.sign(dx) : moverId.localeCompare(otherId) < 0 ? -1 : 1;
  const directionY = dy !== 0 ? Math.sign(dy) : moverId.localeCompare(otherId) < 0 ? -1 : 1;

  if (preferHorizontal && neededX > 0) {
    return { x: neededX * directionX, y: 0 };
  }

  if (neededY > 0) {
    const safeDirectionY = directionY < 0 ? 1 : directionY;
    return { x: 0, y: neededY * safeDirectionY };
  }

  if (neededX > 0) {
    return { x: neededX * directionX, y: 0 };
  }

  return null;
}

// =============================================================================
// HOOK: useAutoLayout
// =============================================================================

/**
 * Hook do automatycznego rozmieszczania SLD.
 *
 * AUTOMATYCZNE WYWOLANIE:
 * - Przy kazdej zmianie topologii (hash zmienia sie)
 * - Nie wymaga zadnego przycisku
 *
 * STABILNOSC:
 * - Mala zmiana topologii = mala zmiana ukladu
 * - Nadpisania pozycji sa zachowywane jesli nie powoduja kolizji
 *
 * @param symbols - Symbole SLD do rozmieszczenia
 * @param config - Konfiguracja layoutu (opcjonalna)
 */
export function useAutoLayout(
  symbols: AnySldSymbol[],
  config: Partial<AutoLayoutConfig> = {}
): UseAutoLayoutResult {
  const cfg: AutoLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };

  // Przechowuj nadpisania pozycji
  const overridesRef = useRef<Map<string, PositionOverride>>(new Map());
  const previousHashRef = useRef<string>('');

  // Oblicz hash topologii
  const topologyHash = useMemo(() => computeTopologyHash(symbols), [symbols]);

  // Rozmiary symboli
  // Oblicz layout (AUTOMATYCZNIE przy zmianie topologii)
  const layoutState = useMemo<AutoLayoutState>(() => {
    // Generuj bazowy layout
    const layoutResult: AutoLayoutResult = generateAutoLayout(symbols, cfg);

    // Zastosuj nadpisania
    const { positions: withOverrides, rejectedOverrides } = applyOverrides(
      layoutResult.positions,
      overridesRef.current,
      symbols,
      layoutResult.debug,
      cfg,
      DEFAULT_COLLISION_CONFIG
    );

    // Usun odrzucone nadpisania
    for (const rejected of rejectedOverrides) {
      overridesRef.current.delete(rejected);
    }

    // Rozwiaz pozostale kolizje
    const { positions: finalPositions, resolvedCount } = resolveCollisions(
      symbols,
      withOverrides,
      layoutResult.positions,
      layoutResult.debug,
      cfg,
      DEFAULT_COLLISION_CONFIG
    );

    return {
      basePositions: layoutResult.positions,
      finalPositions,
      overrides: new Map(overridesRef.current),
      topologyHash,
      debug: {
        layers: layoutResult.debug.layers,
        totalLayers: layoutResult.debug.totalLayers,
        totalNodes: layoutResult.debug.totalNodes,
        collisionsResolved: resolvedCount,
      },
    };
  }, [symbols, topologyHash, cfg]);

  // Sprawdz czy topologia sie zmienila
  const isLayoutCurrent = previousHashRef.current === topologyHash;
  previousHashRef.current = topologyHash;

  // Zastosuj pozycje do symboli
  const layoutSymbols = useMemo<AnySldSymbol[]>(() => {
    return symbols.map((symbol) => {
      const pos = layoutState.finalPositions.get(symbol.id);
      if (pos) {
        return { ...symbol, position: pos };
      }
      return symbol;
    });
  }, [symbols, layoutState.finalPositions]);

  // PR-SLD-ETAP-GEOMETRY-01: Calculate label position adjustments for collision avoidance
  const labelAdjustments = useMemo<Map<string, { x: number; y: number }>>(() => {
    // Build label bounding boxes
    const labelBoxes = buildLabelBoundingBoxes(symbols, layoutState.finalPositions, DEFAULT_COLLISION_CONFIG);

    // Resolve label collisions deterministically
    return resolveLabelCollisions(labelBoxes);
  }, [symbols, layoutState.finalPositions]);

  // Akcje
  const addOverride = useCallback((symbolId: string, delta: Position) => {
    const basePos = layoutState.basePositions.get(symbolId);
    if (!basePos) return;

    overridesRef.current.set(symbolId, {
      symbolId,
      deltaX: delta.x,
      deltaY: delta.y,
      timestamp: Date.now(),
    });
  }, [layoutState.basePositions]);

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
  };
}

// =============================================================================
// EKSPORT DOMYSLNY
// =============================================================================

export default useAutoLayout;
