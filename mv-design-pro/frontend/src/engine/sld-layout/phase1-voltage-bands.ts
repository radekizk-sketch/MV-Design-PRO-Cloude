/**
 * Phase 1: Voltage Band Assignment
 *
 * ZADANIE: Odczytaj napięcia z MODELU i utwórz pasma napięciowe.
 *
 * ZASADA KLUCZOWA: Napięcia są DYNAMICZNE — odczytywane z modelu,
 * NIE hardkodowane (np. if voltage === 15).
 *
 * ALGORYTM:
 * 1. Zbierz UNIKALNE napięcia znamionowe z WSZYSTKICH elementów modelu
 * 2. Posortuj MALEJĄCO (najwyższe napięcie = najwyższy band = góra schematu)
 * 3. Przypisz pasma Y od góry do dołu z dynamicznym spacingiem
 * 4. Transformatory ŁĄCZĄ dwa pasma (HV→LV)
 * 5. Przypisz kolory z KONFIGUROWALNEJ mapy
 *
 * DETERMINIZM: Ten sam zestaw napięć → te same pasma (sortowanie stabilne).
 */

import type {
  LayoutSymbol,
  VoltageBand,
  VoltageColorRule,
  PipelineContext,
  LayoutConfig,
} from './types';
import {
  getVoltageColor,
  getVoltageCategory,
  formatVoltageLabel,
  generateVoltageBandId,
} from './config/voltage-colors';

// =============================================================================
// GŁÓWNA FUNKCJA FAZY 1
// =============================================================================

/**
 * Faza 1: Przypisanie pasm napięciowych.
 *
 * @param context - Kontekst pipeline
 * @returns Zaktualizowany kontekst z voltageBands
 */
export function assignVoltageBands(context: PipelineContext): PipelineContext {
  const { symbols, config, voltageColorMap } = context;

  // Krok 1: Zbierz wszystkie unikalne napięcia z modelu
  const voltages = collectUniqueVoltages(symbols);

  // Krok 2: Posortuj napięcia MALEJĄCO
  const sortedVoltages = Array.from(voltages).sort((a, b) => b - a);

  // Krok 3: Policz elementy w każdym paśmie (dla dynamicznego spacingu)
  const elementCountByVoltage = countElementsByVoltage(symbols);

  // Krok 4: Oblicz geometrię pasm
  const voltageBands = calculateVoltageBandGeometry(
    sortedVoltages,
    elementCountByVoltage,
    config,
    voltageColorMap
  );

  // Krok 5: Przypisz elementy do pasm
  assignElementsToBands(voltageBands, symbols);

  return {
    ...context,
    voltageBands,
  };
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

/**
 * Zbierz wszystkie unikalne napięcia z symboli.
 *
 * WAŻNE: Dla transformatorów zbieramy OBA napięcia (HV i LV).
 *
 * @param symbols - Lista symboli
 * @returns Set unikalnych napięć w kV
 */
export function collectUniqueVoltages(symbols: LayoutSymbol[]): Set<number> {
  const voltages = new Set<number>();

  for (const symbol of symbols) {
    // Napięcie główne
    if (symbol.voltageKV !== undefined && !isNaN(symbol.voltageKV)) {
      voltages.add(normalizeVoltage(symbol.voltageKV));
    }

    // Dla transformatorów: strona HV
    if (symbol.voltageHV !== undefined && !isNaN(symbol.voltageHV)) {
      voltages.add(normalizeVoltage(symbol.voltageHV));
    }

    // Dla transformatorów: strona LV
    if (symbol.voltageLV !== undefined && !isNaN(symbol.voltageLV)) {
      voltages.add(normalizeVoltage(symbol.voltageLV));
    }
  }

  return voltages;
}

/**
 * Normalizuj napięcie (zaokrąglij do sensownej precyzji).
 *
 * @param voltageKV - Napięcie w kV
 * @returns Znormalizowane napięcie
 */
function normalizeVoltage(voltageKV: number): number {
  // Zaokrąglij do 3 miejsc po przecinku
  return Math.round(voltageKV * 1000) / 1000;
}

/**
 * Policz elementy w każdym paśmie napięciowym.
 *
 * @param symbols - Lista symboli
 * @returns Mapa: napięcie → liczba elementów
 */
function countElementsByVoltage(symbols: LayoutSymbol[]): Map<number, number> {
  const counts = new Map<number, number>();

  for (const symbol of symbols) {
    const voltage = getSymbolMainVoltage(symbol);
    if (voltage !== undefined) {
      const normalized = normalizeVoltage(voltage);
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Pobierz główne napięcie symbolu.
 *
 * @param symbol - Symbol
 * @returns Napięcie w kV lub undefined
 */
export function getSymbolMainVoltage(symbol: LayoutSymbol): number | undefined {
  // Dla transformatorów — użyj strony HV jako pozycji (transformator jest NA GRANICY)
  if (symbol.elementType === 'TransformerBranch') {
    return symbol.voltageHV ?? symbol.voltageKV;
  }

  return symbol.voltageKV;
}

/**
 * Oblicz geometrię pasm napięciowych.
 *
 * @param sortedVoltages - Posortowane napięcia (malejąco)
 * @param elementCounts - Liczba elementów w każdym paśmie
 * @param config - Konfiguracja layoutu
 * @param colorMap - Mapa kolorów
 * @returns Lista pasm napięciowych
 */
function calculateVoltageBandGeometry(
  sortedVoltages: number[],
  elementCounts: Map<number, number>,
  config: LayoutConfig,
  colorMap: VoltageColorRule[]
): VoltageBand[] {
  const bands: VoltageBand[] = [];

  if (sortedVoltages.length === 0) {
    return bands;
  }

  let currentY = config.canvasPadding + config.bandHeaderHeight;

  for (let i = 0; i < sortedVoltages.length; i++) {
    const voltage = sortedVoltages[i];
    const elementCount = elementCounts.get(voltage) ?? 0;

    // Oblicz wysokość pasma na podstawie liczby elementów
    // Minimum: bandGap, więcej elementów = więcej miejsca
    const baseHeight = config.bandGap;
    const extraHeight = Math.max(0, (elementCount - 1)) * config.elementGapY;
    const bandHeight = baseHeight + extraHeight + config.bandHeaderHeight;

    const band: VoltageBand = {
      id: generateVoltageBandId(voltage),
      nominalVoltageKV: voltage,
      yStart: currentY,
      yEnd: currentY + bandHeight,
      color: getVoltageColor(voltage, colorMap),
      label: formatVoltageLabel(voltage),
      category: getVoltageCategory(voltage, colorMap),
      elementIds: [],
    };

    bands.push(band);

    // Następne pasmo zaczyna się pod tym
    currentY = band.yEnd + config.bandGap;
  }

  return bands;
}

/**
 * Przypisz elementy do pasm napięciowych.
 *
 * @param bands - Pasma napięciowe
 * @param symbols - Symbole do przypisania
 */
function assignElementsToBands(bands: VoltageBand[], symbols: LayoutSymbol[]): void {
  const bandByVoltage = new Map<number, VoltageBand>();
  for (const band of bands) {
    bandByVoltage.set(band.nominalVoltageKV, band);
  }

  for (const symbol of symbols) {
    const voltage = getSymbolMainVoltage(symbol);
    if (voltage !== undefined) {
      const normalized = normalizeVoltage(voltage);
      const band = bandByVoltage.get(normalized);
      if (band) {
        band.elementIds.push(symbol.id);
      }
    }
  }
}

// =============================================================================
// FUNKCJE POMOCNICZE DLA INNYCH FAZ
// =============================================================================

/**
 * Znajdź pasmo napięciowe dla symbolu.
 *
 * @param symbol - Symbol
 * @param bands - Lista pasm
 * @returns Pasmo lub undefined
 */
export function findVoltageBandForSymbol(
  symbol: LayoutSymbol,
  bands: VoltageBand[]
): VoltageBand | undefined {
  const voltage = getSymbolMainVoltage(symbol);
  if (voltage === undefined) {
    return undefined;
  }

  const normalized = normalizeVoltage(voltage);

  // Szukaj dokładnego dopasowania
  const exactMatch = bands.find((b) => b.nominalVoltageKV === normalized);
  if (exactMatch) {
    return exactMatch;
  }

  // Szukaj najbliższego pasma (fallback)
  let closest: VoltageBand | undefined;
  let minDiff = Infinity;

  for (const band of bands) {
    const diff = Math.abs(band.nominalVoltageKV - normalized);
    if (diff < minDiff) {
      minDiff = diff;
      closest = band;
    }
  }

  return closest;
}

/**
 * Znajdź pasmo napięciowe dla danego napięcia.
 *
 * @param voltageKV - Napięcie w kV
 * @param bands - Lista pasm
 * @returns Pasmo lub undefined
 */
export function findVoltageBandByVoltage(
  voltageKV: number,
  bands: VoltageBand[]
): VoltageBand | undefined {
  const normalized = normalizeVoltage(voltageKV);
  return bands.find((b) => b.nominalVoltageKV === normalized);
}

/**
 * Pobierz transformatory łączące dwa pasma.
 *
 * Transformatory są pozycjonowane NA GRANICY między pasmami napięciowymi.
 *
 * @param symbols - Lista symboli
 * @param bands - Lista pasm
 * @returns Lista transformatorów z informacją o połączonych pasmach
 */
export function getTransformersBetweenBands(
  symbols: LayoutSymbol[],
  bands: VoltageBand[]
): TransformerBandConnection[] {
  const result: TransformerBandConnection[] = [];

  const transformers = symbols.filter((s) => s.elementType === 'TransformerBranch');

  for (const trafo of transformers) {
    const hvVoltage = trafo.voltageHV;
    const lvVoltage = trafo.voltageLV;

    if (hvVoltage === undefined || lvVoltage === undefined) {
      continue;
    }

    const hvBand = findVoltageBandByVoltage(hvVoltage, bands);
    const lvBand = findVoltageBandByVoltage(lvVoltage, bands);

    if (hvBand && lvBand && hvBand.id !== lvBand.id) {
      result.push({
        transformerSymbolId: trafo.id,
        hvBandId: hvBand.id,
        lvBandId: lvBand.id,
        hvVoltageKV: hvVoltage,
        lvVoltageKV: lvVoltage,
      });
    }
  }

  // Sortuj dla determinizmu
  result.sort((a, b) => a.transformerSymbolId.localeCompare(b.transformerSymbolId));

  return result;
}

/**
 * Informacja o transformatorze łączącym dwa pasma.
 */
export interface TransformerBandConnection {
  transformerSymbolId: string;
  hvBandId: string;
  lvBandId: string;
  hvVoltageKV: number;
  lvVoltageKV: number;
}

// =============================================================================
// WALIDACJA
// =============================================================================

/**
 * Waliduj czy wszystkie symbole mają przypisane napięcie.
 *
 * @param symbols - Lista symboli
 * @returns Lista symboli bez napięcia (powinna być pusta dla poprawnego layoutu)
 */
export function validateSymbolVoltages(symbols: LayoutSymbol[]): LayoutSymbol[] {
  const missing: LayoutSymbol[] = [];

  for (const symbol of symbols) {
    const voltage = getSymbolMainVoltage(symbol);
    if (voltage === undefined || isNaN(voltage)) {
      // Niektóre typy elementów mogą nie mieć napięcia (dziedziczą z baya)
      // Ale busbary i transformatory MUSZĄ mieć napięcie
      if (
        symbol.elementType === 'Bus' ||
        symbol.elementType === 'TransformerBranch' ||
        symbol.elementType === 'Source'
      ) {
        missing.push(symbol);
      }
    }
  }

  return missing;
}

/**
 * Wykryj napięcie symbolu na podstawie połączeń (fallback).
 *
 * Jeśli symbol nie ma jawnego napięcia, próbuj wywnioskować z połączonych elementów.
 *
 * @param symbol - Symbol bez napięcia
 * @param allSymbols - Wszystkie symbole
 * @returns Napięcie lub undefined
 */
export function inferVoltageFromConnections(
  symbol: LayoutSymbol,
  allSymbols: LayoutSymbol[]
): number | undefined {
  const symbolByElementId = new Map(allSymbols.map((s) => [s.elementId, s]));

  // Dla Branch/Switch — szukaj napięcia z połączonych węzłów
  if (symbol.fromNodeId || symbol.toNodeId) {
    const fromSymbol = symbol.fromNodeId ? symbolByElementId.get(symbol.fromNodeId) : undefined;
    const toSymbol = symbol.toNodeId ? symbolByElementId.get(symbol.toNodeId) : undefined;

    const fromVoltage = fromSymbol?.voltageKV;
    const toVoltage = toSymbol?.voltageKV;

    // Zwróć pierwsze znalezione napięcie
    if (fromVoltage !== undefined) return fromVoltage;
    if (toVoltage !== undefined) return toVoltage;
  }

  // Dla Source/Load — szukaj napięcia z połączonego węzła
  if (symbol.connectedToNodeId) {
    const connectedSymbol = symbolByElementId.get(symbol.connectedToNodeId);
    if (connectedSymbol?.voltageKV !== undefined) {
      return connectedSymbol.voltageKV;
    }
  }

  return undefined;
}

/**
 * Uzupełnij brakujące napięcia na podstawie połączeń.
 *
 * @param symbols - Lista symboli (mutuje voltageKV jeśli brak)
 * @returns Liczba uzupełnionych napięć
 */
export function fillMissingVoltages(symbols: LayoutSymbol[]): number {
  let filled = 0;

  // Iteruj wielokrotnie aż nie będzie zmian (propagacja napięć)
  let changed = true;
  let iterations = 0;
  const maxIterations = 10;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const symbol of symbols) {
      if (symbol.voltageKV === undefined || isNaN(symbol.voltageKV)) {
        const inferred = inferVoltageFromConnections(symbol, symbols);
        if (inferred !== undefined) {
          symbol.voltageKV = inferred;
          filled++;
          changed = true;
        }
      }
    }
  }

  return filled;
}
