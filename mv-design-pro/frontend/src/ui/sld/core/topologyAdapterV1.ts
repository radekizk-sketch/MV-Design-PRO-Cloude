/**
 * TopologyAdapterV1 — Public API adaptera Snapshot/SldSymbols → VisualGraphV1.
 *
 * RUN #3C: MIGRACJA NA DOMAIN-DRIVEN PIPELINE.
 *
 * Deleguje do:
 * 1. readTopologyFromSymbols() — konwersja AnySldSymbol[] → TopologyInput
 * 2. buildVisualGraphFromTopology() — TopologyInput → VisualGraphV1
 *
 * GWARANCJE:
 * - Brak self-edges (twardy invariant z adapterV2).
 * - Typ wezla z danych strukturalnych (elementType, switchType, etc.), nie z nazw.
 * - Segmentacja trunk/branch/secondary: BFS spanning tree z deterministycznym tie-break.
 * - PV/BESS z jawnych metadanych (generatorTypes), nie z heurystyk stringowych.
 * - Brak niedeterministycznych zrodel w meta (timestamp przekazany jawnie).
 *
 * DETERMINIZM:
 * - Ten sam zestaw symboli → identyczny VisualGraphV1 (bit-for-bit).
 * - Sortowanie po id na kazdym etapie.
 * - Brak niedeterministycznych API (random, zegar, iteracja Set/Map).
 */

import type { AnySldSymbol } from '../../sld-editor/types';
import type { VisualGraphV1 } from './visualGraph';
import { readTopologyFromSymbols, type SymbolBridgeMetadata } from './topologyInputReader';
import { buildVisualGraphFromTopology } from './topologyAdapterV2';

// =============================================================================
// ADAPTER OPTIONS
// =============================================================================

/**
 * Opcje adaptera.
 */
export interface TopologyAdapterOptions {
  /** ID snapshot (jezeli dostepne) */
  readonly snapshotId?: string;
  /** Fingerprint snapshot (jezeli dostepny) */
  readonly snapshotFingerprint?: string;
  /** Metadane bridge: typy generatorow, napiecia, stacje. */
  readonly metadata?: SymbolBridgeMetadata;
  /** Timestamp dla meta (deterministyczny). Domyslnie '1970-01-01T00:00:00.000Z'. */
  readonly timestamp?: string;
}

// =============================================================================
// MAIN ADAPTER (DELEGUJE DO V2 PIPELINE)
// =============================================================================

/**
 * Konwertuje tablice AnySldSymbol[] do VisualGraphV1.
 *
 * DETERMINIZM: ten sam zestaw symboli (w dowolnej kolejnosci) → identyczny VisualGraphV1.
 *
 * @param symbols Symbole SLD z edytora lub API
 * @param options Opcje adaptera (snapshotId, fingerprint, metadata)
 * @returns VisualGraphV1 — zamrozony, walidowalny, deterministyczny
 */
export function convertToVisualGraph(
  symbols: readonly AnySldSymbol[],
  options: TopologyAdapterOptions = {},
): VisualGraphV1 {
  // 1. Konwertuj symbole na TopologyInput (domain-driven)
  const topologyInput = readTopologyFromSymbols(symbols, options.metadata);

  // 2. Nadpisz snapshotId/fingerprint jesli podane
  const inputWithMeta = {
    ...topologyInput,
    snapshotId: options.snapshotId ?? topologyInput.snapshotId,
    snapshotFingerprint: options.snapshotFingerprint ?? topologyInput.snapshotFingerprint,
  };

  // 3. Buduj VisualGraph z domeny (bez self-edges, bez heurystyk)
  const result = buildVisualGraphFromTopology(inputWithMeta, {
    timestamp: options.timestamp,
  });

  return result.graph;
}
