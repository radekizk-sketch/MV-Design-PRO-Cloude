/**
 * Protection Diagnostics Types — UI Contract
 *
 * CANONICAL ALIGNMENT:
 * - Backend: application/analyses/protection/sanity_checks/models.py
 * - UI 100% po polsku
 * - READ-ONLY: brak obliczeń, tylko renderowanie
 *
 * Contract-first: typy gotowe zanim backend dostarczy dane.
 */

// =============================================================================
// Severity — poziom ważności
// =============================================================================

/**
 * Poziom ważności wyniku diagnostyki.
 * Sort: ERROR > WARN > INFO
 */
export type DiagnosticSeverity = 'ERROR' | 'WARN' | 'INFO';

/**
 * Polskie etykiety dla severity.
 */
export const SEVERITY_LABELS_PL: Record<DiagnosticSeverity, string> = {
  ERROR: 'Błąd',
  WARN: 'Ostrzeżenie',
  INFO: 'Informacja',
};

/**
 * Kolory CSS dla severity (Tailwind).
 */
export const SEVERITY_COLORS: Record<DiagnosticSeverity, string> = {
  ERROR: 'text-red-600 bg-red-50 border-red-200',
  WARN: 'text-amber-600 bg-amber-50 border-amber-200',
  INFO: 'text-blue-600 bg-blue-50 border-blue-200',
};

/**
 * Ikony dla severity.
 */
export const SEVERITY_ICONS: Record<DiagnosticSeverity, string> = {
  ERROR: '✕',
  WARN: '⚠',
  INFO: 'ℹ',
};

// =============================================================================
// Sanity Check Codes — stabilne kody reguł
// =============================================================================

/**
 * Kody reguł walidacji — STABILNE dla UI/raportów.
 * Mapowane 1:1 z backendu SanityCheckCode.
 */
export type SanityCheckCode =
  // Napięciowe (27/59)
  | 'VOLT_MISSING_UN'
  | 'VOLT_OVERLAP'
  | 'VOLT_U_LT_TOO_LOW'
  | 'VOLT_U_GT_TOO_HIGH'
  // Częstotliwościowe (81U/81O)
  | 'FREQ_OVERLAP'
  | 'FREQ_F_LT_TOO_LOW'
  | 'FREQ_F_GT_TOO_HIGH'
  // ROCOF (81R)
  | 'ROCOF_NON_POSITIVE'
  | 'ROCOF_TOO_HIGH'
  // Nadprądowe (50/51)
  | 'OC_MISSING_IN'
  | 'OC_OVERLAP'
  | 'OC_I_GT_TOO_LOW'
  | 'OC_I_INST_TOO_LOW'
  // SPZ (79)
  | 'SPZ_NO_TRIP_FUNCTION'
  | 'SPZ_MISSING_CYCLE_DATA'
  // Ogólne
  | 'GEN_NEGATIVE_SETPOINT'
  | 'GEN_PARTIAL_ANALYSIS';

/**
 * Polskie etykiety dla kodów reguł.
 */
export const CODE_LABELS_PL: Record<SanityCheckCode, string> = {
  // Napięciowe
  VOLT_MISSING_UN: 'Brak wartości Un dla nastawy napięciowej',
  VOLT_OVERLAP: 'Nakładanie się progów U< i U> (U< >= U>)',
  VOLT_U_LT_TOO_LOW: 'Próg U< zbyt niski (< 0,5×Un)',
  VOLT_U_GT_TOO_HIGH: 'Próg U> zbyt wysoki (> 1,2×Un)',
  // Częstotliwościowe
  FREQ_OVERLAP: 'Nakładanie się progów f< i f> (f< >= f>)',
  FREQ_F_LT_TOO_LOW: 'Próg f< zbyt niski (< 45 Hz)',
  FREQ_F_GT_TOO_HIGH: 'Próg f> zbyt wysoki (> 55 Hz)',
  // ROCOF
  ROCOF_NON_POSITIVE: 'df/dt niedodatnie (<= 0)',
  ROCOF_TOO_HIGH: 'df/dt zbyt wysokie (> 10 Hz/s)',
  // Nadprądowe
  OC_MISSING_IN: 'Brak wartości In dla nastawy prądowej',
  OC_OVERLAP: 'Nakładanie się progów I> i I>> (I> >= I>>)',
  OC_I_GT_TOO_LOW: 'Próg I> zbyt niski (< 1,0×In)',
  OC_I_INST_TOO_LOW: 'Próg I>> zbyt niski (< 1,5×In)',
  // SPZ
  SPZ_NO_TRIP_FUNCTION: 'SPZ aktywne bez funkcji wyzwalającej',
  SPZ_MISSING_CYCLE_DATA: 'Brak danych cyklu SPZ',
  // Ogólne
  GEN_NEGATIVE_SETPOINT: 'Nastawa niefizyczna (ujemna)',
  GEN_PARTIAL_ANALYSIS: 'Brak danych bazowych — analiza częściowa',
};

// =============================================================================
// Protection Sanity Check Result — pojedynczy wynik diagnostyki
// =============================================================================

/**
 * Wynik pojedynczej reguły walidacji.
 * Mapowany 1:1 z backendu ProtectionSanityCheckResult.
 *
 * INVARIANTY:
 * - code: stabilny kod reguły (dla UI/raportów)
 * - severity: ERROR > WARN > INFO
 * - message_pl: komunikat po polsku (100% PL)
 * - element_id: identyfikator elementu chronionego
 * - element_type: typ elementu (dla kontekstu)
 */
export interface ProtectionSanityCheckResult {
  /** Poziom ważności */
  severity: DiagnosticSeverity;
  /** Stabilny kod reguły */
  code: SanityCheckCode;
  /** Komunikat po polsku */
  message_pl: string;
  /** Identyfikator elementu */
  element_id: string;
  /** Typ elementu (np. 'LineBranch', 'TransformerBranch') */
  element_type: string;
  /** Kod ANSI funkcji (opcjonalny, np. '27', '50') */
  function_ansi?: string | null;
  /** Kod wewnętrzny funkcji (opcjonalny) */
  function_code?: string | null;
  /** Dane wejściowe jako dowód (opcjonalny) */
  evidence?: Record<string, unknown> | null;
}

// =============================================================================
// UI State Types
// =============================================================================

/**
 * Stan panelu diagnostyki.
 */
export interface DiagnosticsState {
  /** Lista wyników diagnostyki */
  results: ProtectionSanityCheckResult[];
  /** Czy dane są ładowane */
  isLoading: boolean;
  /** Komunikat błędu (jeśli wystąpił) */
  error: string | null;
  /** Filtr severity (puste = wszystkie) */
  severityFilter: DiagnosticSeverity[];
  /** Filtr po element_id (dla Inspector) */
  elementIdFilter: string | null;
}

/**
 * Statystyki diagnostyki (dla nagłówka panelu).
 */
export interface DiagnosticsStats {
  total: number;
  byError: number;
  byWarn: number;
  byInfo: number;
}

// =============================================================================
// Sort Helpers
// =============================================================================

/**
 * Porządek sortowania dla severity (ERROR=0, WARN=1, INFO=2).
 */
export const SEVERITY_SORT_ORDER: Record<DiagnosticSeverity, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
};

/**
 * Deterministyczne sortowanie wyników.
 * Porządek: element_id ASC, severity DESC (ERROR>WARN>INFO), code ASC
 */
export function sortDiagnosticsResults(
  results: ProtectionSanityCheckResult[]
): ProtectionSanityCheckResult[] {
  return [...results].sort((a, b) => {
    // 1. element_id ASC
    const elementCmp = a.element_id.localeCompare(b.element_id);
    if (elementCmp !== 0) return elementCmp;

    // 2. severity DESC (ERROR=0 < WARN=1 < INFO=2)
    const severityCmp = SEVERITY_SORT_ORDER[a.severity] - SEVERITY_SORT_ORDER[b.severity];
    if (severityCmp !== 0) return severityCmp;

    // 3. code ASC
    return a.code.localeCompare(b.code);
  });
}

/**
 * Oblicz statystyki z listy wyników.
 */
export function computeDiagnosticsStats(results: ProtectionSanityCheckResult[]): DiagnosticsStats {
  return {
    total: results.length,
    byError: results.filter((r) => r.severity === 'ERROR').length,
    byWarn: results.filter((r) => r.severity === 'WARN').length,
    byInfo: results.filter((r) => r.severity === 'INFO').length,
  };
}
