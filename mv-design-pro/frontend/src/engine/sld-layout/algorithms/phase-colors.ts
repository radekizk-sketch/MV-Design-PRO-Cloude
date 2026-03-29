/**
 * Phase Colors — kolory faz R/W/B dla krawędzi SLD.
 *
 * Nakłada kolory faz na RoutedEdge na podstawie:
 * 1. Metadata krawędzi (phaseLabel: 'R' | 'W' | 'B') — jeśli dostępna
 * 2. Round-robin (deterministyczny, sorted by edgeId)
 *
 * DETERMINIZM: sortowanie krawędzi by ID przed nakładaniem kolorów.
 */

import type { RoutedEdge } from '../types';

// =============================================================================
// TYPY
// =============================================================================

export interface PhaseColorConfig {
  /** Kolor fazy R (czerwona). */
  phaseR: string;
  /** Kolor fazy W (biała/neutralna). */
  phaseW: string;
  /** Kolor fazy B (niebieska). */
  phaseB: string;
}

// =============================================================================
// PREDEFINIOWANE SCHEMATY KOLORÓW
// =============================================================================

/** Schemat domyślny (nowoczesny, czytelny). */
export const PHASE_COLORS_DEFAULT: PhaseColorConfig = {
  phaseR: '#E53E3E',   // Tailwind red-500
  phaseW: '#A0AEC0',   // Tailwind gray-400 (zamiast białego — widoczny na białym tle)
  phaseB: '#3182CE',   // Tailwind blue-500
};

/** Schemat IEC 60446 (tradycyjne kolory fazowe). */
export const PHASE_COLORS_IEC: PhaseColorConfig = {
  phaseR: '#A00000',   // Ciemna czerwień
  phaseW: '#C8C8C8',   // Jasnoszary (neutral)
  phaseB: '#0000A0',   // Ciemny niebieski
};

/** Schemat monochromatyczny (dla eksportu b/w). */
export const PHASE_COLORS_MONO: PhaseColorConfig = {
  phaseR: '#333333',
  phaseW: '#999999',
  phaseB: '#666666',
};

// Kolejność faz (round-robin)
const PHASE_ORDER: Array<keyof PhaseColorConfig> = ['phaseR', 'phaseW', 'phaseB'];

// =============================================================================
// GŁÓWNA FUNKCJA
// =============================================================================

/**
 * Nakłada kolory faz R/W/B na krawędzie SLD.
 *
 * @param routedEdges - krawędzie do pokolorowania
 * @param phaseColors - konfiguracja kolorów
 * @returns nowa mapa z pokolorowanymi krawędziami (phaseColor ustawione)
 */
export function applyPhaseColors(
  routedEdges: Map<string, RoutedEdge>,
  phaseColors: PhaseColorConfig
): Map<string, RoutedEdge & { phaseColor: string }> {
  const result = new Map<string, RoutedEdge & { phaseColor: string }>();

  // Sortuj krawędzie by ID dla determinizmu
  const sortedIds = [...routedEdges.keys()].sort();

  for (let i = 0; i < sortedIds.length; i++) {
    const id   = sortedIds[i];
    const edge = routedEdges.get(id)!;

    // Wybierz kolor: round-robin po sortowanym indeksie
    const phaseKey = PHASE_ORDER[i % PHASE_ORDER.length];
    const color    = phaseColors[phaseKey];

    result.set(id, { ...edge, phaseColor: color });
  }

  return result;
}

/**
 * Parsuje etykietę fazy na klucz PhaseColorConfig.
 * Używane gdy krawędź ma metadata z etykietą fazy.
 */
export function parsePhaseLabel(
  label: string | undefined
): keyof PhaseColorConfig | null {
  if (!label) return null;
  const upper = label.toUpperCase().trim();
  if (upper === 'R' || upper === 'L1') return 'phaseR';
  if (upper === 'W' || upper === 'L2' || upper === 'N') return 'phaseW';
  if (upper === 'B' || upper === 'L3') return 'phaseB';
  return null;
}
