/**
 * VOLTAGE COLORS — Kolorystyka napięciowa (PLANS STYLE)
 *
 * CANONICAL ALIGNMENT:
 * - Plans: kolorystyka napięciowa dla SLD
 * - IEC 60617: standard symboli
 *
 * PALETA (inspiracja Plans):
 * - WN (110kV+):  czerwony   (#DC143C)
 * - SN (6-30kV):  cyan       (#00CED1)
 * - nN (0.4kV):   pomarańczowy (#FFA500)
 * - Domyślny:     szary      (#374151)
 */

// =============================================================================
// STAŁE KOLORÓW NAPIĘCIOWYCH
// =============================================================================

/**
 * Mapa poziomów napięciowych na kolory (PLANS STYLE).
 * Klucz: napięcie w kV jako string.
 */
export const VOLTAGE_COLORS: Record<string, string> = {
  // WN (wysokie napięcie) — czerwony
  '400': '#DC143C',
  '220': '#DC143C',
  '110': '#DC143C',

  // SN (średnie napięcie) — cyan
  '30': '#00CED1',
  '20': '#00CED1',
  '15': '#00CED1',
  '10': '#00CED1',
  '6': '#00CED1',

  // nN (niskie napięcie) — pomarańczowy
  '0.4': '#FFA500',
  '0.23': '#FFA500',
};

/** Domyślny kolor (szary) */
export const DEFAULT_VOLTAGE_COLOR = '#374151';

/** Kolor dla elementów wyłączonych z ruchu */
export const DEENERGIZED_COLOR = '#9ca3af';

/** Kolor dla elementów zaznaczonych */
export const SELECTED_COLOR = '#3b82f6';

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

/**
 * Pobierz kolor dla danego poziomu napięciowego.
 *
 * @param voltageKV - Napięcie w kV (number lub string)
 * @returns Kolor hex
 *
 * @example
 * getVoltageColor(15)     // '#00CED1' (cyan - SN)
 * getVoltageColor(0.4)    // '#FFA500' (pomarańczowy - nN)
 * getVoltageColor(110)    // '#DC143C' (czerwony - WN)
 * getVoltageColor(999)    // '#374151' (szary - domyślny)
 */
export function getVoltageColor(voltageKV: number | string | undefined): string {
  if (voltageKV === undefined || voltageKV === null) {
    return DEFAULT_VOLTAGE_COLOR;
  }

  const key = String(voltageKV);
  return VOLTAGE_COLORS[key] ?? DEFAULT_VOLTAGE_COLOR;
}

/**
 * Pobierz kolor dla napięcia z uwzględnieniem stanu energizacji.
 *
 * @param voltageKV - Napięcie w kV
 * @param energized - Czy element jest pod napięciem
 * @param selected - Czy element jest zaznaczony
 * @returns Kolor hex
 */
export function getVoltageColorWithState(
  voltageKV: number | string | undefined,
  energized: boolean,
  selected: boolean
): string {
  if (selected) {
    return SELECTED_COLOR;
  }

  if (!energized) {
    return DEENERGIZED_COLOR;
  }

  return getVoltageColor(voltageKV);
}

/**
 * Określ poziom napięciowy na podstawie wartości.
 *
 * @param voltageKV - Napięcie w kV
 * @returns 'WN' | 'SN' | 'nN' | 'unknown'
 */
export function getVoltageLevel(voltageKV: number | undefined): 'WN' | 'SN' | 'nN' | 'unknown' {
  if (voltageKV === undefined || voltageKV === null) {
    return 'unknown';
  }

  if (voltageKV >= 110) {
    return 'WN';
  }

  if (voltageKV >= 1) {
    return 'SN';
  }

  return 'nN';
}

/**
 * Pobierz etykietę poziomu napięciowego po polsku.
 *
 * @param level - Poziom napięciowy
 * @returns Etykieta po polsku
 */
export function getVoltageLevelLabel(level: 'WN' | 'SN' | 'nN' | 'unknown'): string {
  switch (level) {
    case 'WN':
      return 'Wysokie napięcie';
    case 'SN':
      return 'Średnie napięcie';
    case 'nN':
      return 'Niskie napięcie';
    default:
      return 'Nieznane';
  }
}

// =============================================================================
// EKSPORT DOMYŚLNY
// =============================================================================

export default {
  VOLTAGE_COLORS,
  DEFAULT_VOLTAGE_COLOR,
  DEENERGIZED_COLOR,
  SELECTED_COLOR,
  getVoltageColor,
  getVoltageColorWithState,
  getVoltageLevel,
  getVoltageLevelLabel,
};
