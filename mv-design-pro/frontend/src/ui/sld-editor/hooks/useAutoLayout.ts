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
} from '../utils/autoLayout';

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
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

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
  positions: Map<string, Position>,
  symbolSizes: Map<string, { width: number; height: number }>
): Map<string, string[]> {
  const collisions = new Map<string, string[]>();
  const ids = Array.from(positions.keys());

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const id1 = ids[i];
      const id2 = ids[j];
      const pos1 = positions.get(id1)!;
      const pos2 = positions.get(id2)!;
      const size1 = symbolSizes.get(id1) || { width: 60, height: 40 };
      const size2 = symbolSizes.get(id2) || { width: 60, height: 40 };

      // AABB collision detection (Axis-Aligned Bounding Box)
      const halfW1 = size1.width / 2;
      const halfH1 = size1.height / 2;
      const halfW2 = size2.width / 2;
      const halfH2 = size2.height / 2;

      const overlapX = Math.abs(pos1.x - pos2.x) < (halfW1 + halfW2);
      const overlapY = Math.abs(pos1.y - pos2.y) < (halfH1 + halfH2);

      if (overlapX && overlapY) {
        // Kolizja wykryta
        if (!collisions.has(id1)) collisions.set(id1, []);
        if (!collisions.has(id2)) collisions.set(id2, []);
        collisions.get(id1)!.push(id2);
        collisions.get(id2)!.push(id1);
      }
    }
  }

  return collisions;
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
  positions: Map<string, Position>,
  symbolSizes: Map<string, { width: number; height: number }>,
  config: AutoLayoutConfig
): { positions: Map<string, Position>; resolvedCount: number } {
  const resolved = new Map(positions);
  let resolvedCount = 0;
  const maxIterations = 10; // Unikaj nieskonczonej petli

  for (let iter = 0; iter < maxIterations; iter++) {
    const collisions = detectCollisions(resolved, symbolSizes);
    if (collisions.size === 0) break;

    // Sortuj kolidujace symbole po ID (determinizm)
    const collidingIds = Array.from(collisions.keys()).sort();

    for (const id of collidingIds) {
      const collidingWith = collisions.get(id) || [];
      if (collidingWith.length === 0) continue;

      const myPos = resolved.get(id)!;
      const mySize = symbolSizes.get(id) || { width: 60, height: 40 };

      for (const otherId of collidingWith.sort()) {
        // Symbol o nizszym ID ma priorytet (zostaje)
        if (id.localeCompare(otherId) < 0) continue;

        const otherPos = resolved.get(otherId)!;
        const otherSize = symbolSizes.get(otherId) || { width: 60, height: 40 };

        // Oblicz minimalne przesuniecie
        const dx = myPos.x - otherPos.x;
        const dy = myPos.y - otherPos.y;
        const minDistX = (mySize.width + otherSize.width) / 2 + config.gridSize;
        const minDistY = (mySize.height + otherSize.height) / 2 + config.gridSize;

        // Przesun w kierunku mniejszego nakladania
        let newX = myPos.x;
        let newY = myPos.y;

        if (Math.abs(dx) < minDistX) {
          const shiftX = (minDistX - Math.abs(dx)) * (dx >= 0 ? 1 : -1);
          newX = myPos.x + shiftX;
        }

        if (Math.abs(dy) < minDistY && Math.abs(dx) >= minDistX) {
          // Przesun tylko jesli nie przesunieto w X
        } else if (Math.abs(dy) < minDistY) {
          const shiftY = (minDistY - Math.abs(dy)) * (dy >= 0 ? 1 : -1);
          newY = myPos.y + shiftY;
        }

        // Snap to grid
        newX = Math.round(newX / config.gridSize) * config.gridSize;
        newY = Math.round(newY / config.gridSize) * config.gridSize;

        if (newX !== myPos.x || newY !== myPos.y) {
          resolved.set(id, { x: newX, y: newY });
          resolvedCount++;
        }
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
  symbolSizes: Map<string, { width: number; height: number }>,
  config: AutoLayoutConfig
): { positions: Map<string, Position>; rejectedOverrides: string[] } {
  const positions = new Map(basePositions);
  const rejectedOverrides: string[] = [];

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

    const collisions = detectCollisions(testPositions, symbolSizes);
    const hasCollision = collisions.has(override.symbolId);

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
  const symbolSizes = useMemo(() => getSymbolSizes(symbols), [symbols]);

  // Oblicz layout (AUTOMATYCZNIE przy zmianie topologii)
  const layoutState = useMemo<AutoLayoutState>(() => {
    // Generuj bazowy layout
    const layoutResult: AutoLayoutResult = generateAutoLayout(symbols, cfg);

    // Zastosuj nadpisania
    const { positions: withOverrides, rejectedOverrides } = applyOverrides(
      layoutResult.positions,
      overridesRef.current,
      symbolSizes,
      cfg
    );

    // Usun odrzucone nadpisania
    for (const rejected of rejectedOverrides) {
      overridesRef.current.delete(rejected);
    }

    // Rozwiaz pozostale kolizje
    const { positions: finalPositions, resolvedCount } = resolveCollisions(
      withOverrides,
      symbolSizes,
      cfg
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
  }, [symbols, topologyHash, symbolSizes, cfg]);

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
  };
}

// =============================================================================
// EKSPORT DOMYSLNY
// =============================================================================

export default useAutoLayout;
