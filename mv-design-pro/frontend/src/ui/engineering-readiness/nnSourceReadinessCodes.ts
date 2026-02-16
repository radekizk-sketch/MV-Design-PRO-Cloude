/**
 * Kody gotowości źródeł nN — FAZA 7.
 *
 * BINDING:
 * - Komunikaty 100% PL.
 * - Każdy kod ma: poziom, warunek, FixAction, pierwszeństwo.
 * - Brak domyślnych wartości liczbowych.
 * - Kody deterministyczne: identyczne wejście → identyczny wynik.
 *
 * Poziomy:
 * - BLOKUJACE: uniemożliwia obliczenia (blocker)
 * - OSTRZEZENIE: nie blokuje, ale wymaga uwagi
 */

import type { ReadinessSeverity, FixActionType } from '../types';

// ---------------------------------------------------------------------------
// Readiness Code Definition
// ---------------------------------------------------------------------------

export interface NNSourceReadinessCodeDef {
  /** Unikalny kod (np. 'nn.source.field_missing') */
  code: string;
  /** Poziom ważności */
  severity: ReadinessSeverity;
  /** Komunikat PL */
  message_pl: string;
  /** Warunek wystąpienia */
  condition: string;
  /** Sugerowana akcja naprawcza */
  fix_action_type: FixActionType;
  /** Panel UI do otwarcia */
  fix_panel: string | null;
  /** Krok kreatora do nawigacji */
  fix_step: string | null;
  /** Pole formularza do fokusa */
  fix_focus: string | null;
  /** Pierwszeństwo (1 = najwyższe) */
  priority: number;
}

// ---------------------------------------------------------------------------
// Canonical Readiness Codes for nN Sources
// ---------------------------------------------------------------------------

export const NN_SOURCE_READINESS_CODES: readonly NNSourceReadinessCodeDef[] = [
  // --- Blokujące ---
  {
    code: 'nn.source.field_missing',
    severity: 'BLOCKER',
    message_pl: 'Źródło nN nie jest przypięte do pola źródłowego',
    condition: 'source.field_id is null OR field not found in snapshot',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'source_field_nn',
    fix_step: null,
    fix_focus: 'field_ref',
    priority: 1,
  },
  {
    code: 'nn.source.switch_missing',
    severity: 'BLOCKER',
    message_pl: 'Pole źródłowe nN nie posiada aparatu łączeniowego',
    condition: 'source.switch_id is null OR switch not found in snapshot',
    fix_action_type: 'ADD_MISSING_DEVICE',
    fix_panel: 'source_field_nn',
    fix_step: null,
    fix_focus: 'switch_kind',
    priority: 2,
  },
  {
    code: 'nn.source.catalog_missing',
    severity: 'BLOCKER',
    message_pl: 'Źródło nN nie ma przypisanego katalogu urządzenia',
    condition: 'source.catalog_item_id is null',
    fix_action_type: 'SELECT_CATALOG',
    fix_panel: 'source_catalog',
    fix_step: null,
    fix_focus: 'catalog_item_id',
    priority: 3,
  },
  {
    code: 'nn.source.parameters_missing',
    severity: 'BLOCKER',
    message_pl: 'Źródło nN nie ma wymaganych parametrów elektrycznych',
    condition: 'source has no materialized_params AND no explicit parameters',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'source_params',
    fix_step: null,
    fix_focus: 'rated_power',
    priority: 4,
  },
  {
    code: 'nn.voltage_missing',
    severity: 'BLOCKER',
    message_pl: 'Napięcie szyny nN nie jest określone',
    condition: 'bus_nn voltage_kv is null or <= 0',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'bus_nn_properties',
    fix_step: null,
    fix_focus: 'voltage_nn_kv',
    priority: 5,
  },
  {
    code: 'pv.control_mode_missing',
    severity: 'BLOCKER',
    message_pl: 'Falownik PV nie ma określonego trybu regulacji',
    condition: 'pv_inverter.control_mode is null',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'pv_inverter_edit',
    fix_step: null,
    fix_focus: 'control_mode',
    priority: 6,
  },
  {
    code: 'bess.energy_module_missing',
    severity: 'BLOCKER',
    message_pl: 'Falownik BESS nie ma przypisanego modułu magazynu energii',
    condition: 'bess_inverter.storage_catalog_id is null',
    fix_action_type: 'SELECT_CATALOG',
    fix_panel: 'bess_storage_catalog',
    fix_step: null,
    fix_focus: 'storage_catalog_id',
    priority: 7,
  },
  {
    code: 'bess.soc_limits_invalid',
    severity: 'BLOCKER',
    message_pl: 'Ograniczenia SOC magazynu BESS są nieprawidłowe (min >= max lub poza zakresem 0-100%)',
    condition: 'soc_min >= soc_max OR soc_min < 0 OR soc_max > 100',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'bess_inverter_edit',
    fix_step: null,
    fix_focus: 'soc_min_percent',
    priority: 8,
  },
  {
    code: 'ups.backup_time_invalid',
    severity: 'BLOCKER',
    message_pl: 'Czas podtrzymania UPS jest nieprawidłowy (musi być > 0)',
    condition: 'ups.backup_time_min is null OR <= 0',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'ups_edit',
    fix_step: null,
    fix_focus: 'backup_time_min',
    priority: 9,
  },
  // --- Ostrzeżenia ---
  {
    code: 'nn.switch.catalog_ref_missing',
    severity: 'IMPORTANT',
    message_pl: 'Aparat łączeniowy pola nN nie ma przypisanego katalogu',
    condition: 'switch.catalog_ref is null',
    fix_action_type: 'SELECT_CATALOG',
    fix_panel: 'switch_catalog',
    fix_step: null,
    fix_focus: 'switch_catalog_ref',
    priority: 20,
  },
  {
    code: 'nn.measurement.required_missing',
    severity: 'IMPORTANT',
    message_pl: 'Źródło nN nie ma przypisanego punktu pomiaru energii',
    condition: 'source has measurement_point = BRAK or null AND source is OZE type',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'source_measurement',
    fix_step: null,
    fix_focus: 'measurement_point',
    priority: 21,
  },
  {
    code: 'genset.fuel_type_missing',
    severity: 'INFO',
    message_pl: 'Agregat nie ma określonego rodzaju paliwa',
    condition: 'genset.fuel_type is null',
    fix_action_type: 'OPEN_MODAL',
    fix_panel: 'genset_edit',
    fix_step: null,
    fix_focus: 'fuel_type',
    priority: 30,
  },
] as const;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Mapa kodów gotowości nN po code */
export const NN_READINESS_CODE_MAP = new Map(
  NN_SOURCE_READINESS_CODES.map((c) => [c.code, c]),
);

/** Kody blokujące (filtr) */
export const NN_BLOCKER_CODES = NN_SOURCE_READINESS_CODES.filter(
  (c) => c.severity === 'BLOCKER',
);

/** Kody ostrzeżeń (filtr) */
export const NN_WARNING_CODES = NN_SOURCE_READINESS_CODES.filter(
  (c) => c.severity === 'IMPORTANT' || c.severity === 'INFO',
);

/**
 * Sprawdź czy źródło nN ma blokery (quick check).
 */
export function hasNNSourceBlockers(readinessCodes: string[]): boolean {
  return readinessCodes.some((code) => {
    const def = NN_READINESS_CODE_MAP.get(code);
    return def?.severity === 'BLOCKER';
  });
}
