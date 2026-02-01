/**
 * Compare Cases Types — UI Contract
 *
 * CANONICAL ALIGNMENT:
 * - P10: Study Cases comparison (Case A vs Case B)
 * - READ-ONLY: No physics calculations, only delta rendering
 * - UI 100% po polsku
 * - Deterministic sorting: row_id, element_id, severity, code
 *
 * CONTRACT:
 * - Compare results: identifies rows by stable `row_id`
 * - Compare diagnostics: identifies by `element_id + code`
 * - Shows values A, values B, and delta (Δ)
 */

import type { DiagnosticSeverity } from '../protection-diagnostics/types';

// =============================================================================
// Results Comparison Types
// =============================================================================

/**
 * Comparison row status for results diff.
 */
export type CompareRowStatus =
  | 'IDENTICAL'
  | 'CHANGED'
  | 'ONLY_IN_A'
  | 'ONLY_IN_B';

/**
 * Polish labels for row status.
 */
export const COMPARE_ROW_STATUS_LABELS: Record<CompareRowStatus, string> = {
  IDENTICAL: 'Bez zmian',
  CHANGED: 'Zmieniono',
  ONLY_IN_A: 'Tylko w A',
  ONLY_IN_B: 'Tylko w B',
};

/**
 * Tailwind classes for row status.
 */
export const COMPARE_ROW_STATUS_COLORS: Record<CompareRowStatus, string> = {
  IDENTICAL: 'bg-slate-50 text-slate-600',
  CHANGED: 'bg-amber-50 text-amber-700',
  ONLY_IN_A: 'bg-red-50 text-red-700',
  ONLY_IN_B: 'bg-green-50 text-green-700',
};

/**
 * Generic result row comparison.
 * Used for buses, branches, short-circuit.
 */
export interface ResultRowComparison<T> {
  row_id: string;
  row_name: string | null;
  value_a: T | null;
  value_b: T | null;
  status: CompareRowStatus;
}

/**
 * Bus result comparison row.
 */
export interface BusComparisonRow {
  row_id: string;
  name: string;
  u_kv_a: number | null;
  u_kv_b: number | null;
  u_pu_a: number | null;
  u_pu_b: number | null;
  delta_u_kv: number | null;
  delta_u_pu: number | null;
  status: CompareRowStatus;
}

/**
 * Branch result comparison row.
 */
export interface BranchComparisonRow {
  row_id: string;
  name: string;
  from_bus: string;
  to_bus: string;
  p_mw_a: number | null;
  p_mw_b: number | null;
  i_a_a: number | null;
  i_a_b: number | null;
  loading_pct_a: number | null;
  loading_pct_b: number | null;
  delta_p_mw: number | null;
  delta_i_a: number | null;
  delta_loading_pct: number | null;
  status: CompareRowStatus;
}

/**
 * Short-circuit comparison row.
 */
export interface ShortCircuitComparisonRow {
  row_id: string;
  target_name: string | null;
  ikss_ka_a: number | null;
  ikss_ka_b: number | null;
  sk_mva_a: number | null;
  sk_mva_b: number | null;
  delta_ikss_ka: number | null;
  delta_sk_mva: number | null;
  status: CompareRowStatus;
}

// =============================================================================
// Diagnostics Comparison Types
// =============================================================================

/**
 * Diagnostic comparison status.
 */
export type DiagnosticCompareStatus =
  | 'UNCHANGED'
  | 'NEW_IN_B'
  | 'GONE_IN_B'
  | 'SEVERITY_CHANGED';

/**
 * Polish labels for diagnostic comparison status.
 */
export const DIAGNOSTIC_COMPARE_STATUS_LABELS: Record<DiagnosticCompareStatus, string> = {
  UNCHANGED: 'Bez zmian',
  NEW_IN_B: 'Nowy w B',
  GONE_IN_B: 'Usunięty w B',
  SEVERITY_CHANGED: 'Zmiana severity',
};

/**
 * Tailwind classes for diagnostic comparison status.
 */
export const DIAGNOSTIC_COMPARE_STATUS_COLORS: Record<DiagnosticCompareStatus, string> = {
  UNCHANGED: 'bg-slate-50 text-slate-600',
  NEW_IN_B: 'bg-red-50 text-red-700',
  GONE_IN_B: 'bg-green-50 text-green-700',
  SEVERITY_CHANGED: 'bg-amber-50 text-amber-700',
};

/**
 * Single diagnostic comparison row.
 * Keyed by element_id + code.
 */
export interface DiagnosticComparisonRow {
  /** Composite key: element_id + code */
  key: string;
  element_id: string;
  element_type: string;
  code: string;
  severity_a: DiagnosticSeverity | null;
  severity_b: DiagnosticSeverity | null;
  message_pl_a: string | null;
  message_pl_b: string | null;
  function_ansi: string | null;
  status: DiagnosticCompareStatus;
}

// =============================================================================
// Compare Cases Result
// =============================================================================

/**
 * Full case comparison result.
 */
export interface CaseComparisonResult {
  case_a_id: string;
  case_b_id: string;
  case_a_name: string;
  case_b_name: string;
  run_a_id: string | null;
  run_b_id: string | null;
  buses: BusComparisonRow[];
  branches: BranchComparisonRow[];
  short_circuit: ShortCircuitComparisonRow[];
  diagnostics: DiagnosticComparisonRow[];
  summary: CaseComparisonSummary;
}

/**
 * Case comparison summary.
 */
export interface CaseComparisonSummary {
  total_buses: number;
  changed_buses: number;
  only_in_a_buses: number;
  only_in_b_buses: number;
  total_branches: number;
  changed_branches: number;
  only_in_a_branches: number;
  only_in_b_branches: number;
  total_diagnostics: number;
  new_diagnostics: number;
  gone_diagnostics: number;
  changed_severity: number;
}

// =============================================================================
// Tabs
// =============================================================================

/**
 * Compare view tabs.
 */
export type CompareViewTab = 'RESULTS' | 'DIAGNOSTICS';

/**
 * Polish labels for compare tabs.
 */
export const COMPARE_TAB_LABELS: Record<CompareViewTab, string> = {
  RESULTS: 'Wyniki',
  DIAGNOSTICS: 'Diagnostyka',
};

/**
 * Results sub-tabs.
 */
export type ResultsSubTab = 'BUSES' | 'BRANCHES' | 'SHORT_CIRCUIT';

/**
 * Polish labels for results sub-tabs.
 */
export const RESULTS_SUB_TAB_LABELS: Record<ResultsSubTab, string> = {
  BUSES: 'Szyny',
  BRANCHES: 'Gałęzie',
  SHORT_CIRCUIT: 'Zwarcia',
};

// =============================================================================
// Sorting
// =============================================================================

/**
 * Deterministic sort for bus comparisons.
 * Sort by: status (ONLY_IN_A > ONLY_IN_B > CHANGED > IDENTICAL), then row_id ASC
 */
export function sortBusComparisons(rows: BusComparisonRow[]): BusComparisonRow[] {
  const statusOrder: Record<CompareRowStatus, number> = {
    ONLY_IN_A: 0,
    ONLY_IN_B: 1,
    CHANGED: 2,
    IDENTICAL: 3,
  };

  return [...rows].sort((a, b) => {
    const statusCmp = statusOrder[a.status] - statusOrder[b.status];
    if (statusCmp !== 0) return statusCmp;
    return a.row_id.localeCompare(b.row_id);
  });
}

/**
 * Deterministic sort for branch comparisons.
 */
export function sortBranchComparisons(rows: BranchComparisonRow[]): BranchComparisonRow[] {
  const statusOrder: Record<CompareRowStatus, number> = {
    ONLY_IN_A: 0,
    ONLY_IN_B: 1,
    CHANGED: 2,
    IDENTICAL: 3,
  };

  return [...rows].sort((a, b) => {
    const statusCmp = statusOrder[a.status] - statusOrder[b.status];
    if (statusCmp !== 0) return statusCmp;
    return a.row_id.localeCompare(b.row_id);
  });
}

/**
 * Deterministic sort for short-circuit comparisons.
 */
export function sortShortCircuitComparisons(rows: ShortCircuitComparisonRow[]): ShortCircuitComparisonRow[] {
  const statusOrder: Record<CompareRowStatus, number> = {
    ONLY_IN_A: 0,
    ONLY_IN_B: 1,
    CHANGED: 2,
    IDENTICAL: 3,
  };

  return [...rows].sort((a, b) => {
    const statusCmp = statusOrder[a.status] - statusOrder[b.status];
    if (statusCmp !== 0) return statusCmp;
    return a.row_id.localeCompare(b.row_id);
  });
}

/**
 * Deterministic sort for diagnostic comparisons.
 * Sort by: status (NEW_IN_B > GONE_IN_B > SEVERITY_CHANGED > UNCHANGED), element_id, code
 */
export function sortDiagnosticComparisons(rows: DiagnosticComparisonRow[]): DiagnosticComparisonRow[] {
  const statusOrder: Record<DiagnosticCompareStatus, number> = {
    NEW_IN_B: 0,
    GONE_IN_B: 1,
    SEVERITY_CHANGED: 2,
    UNCHANGED: 3,
  };

  return [...rows].sort((a, b) => {
    const statusCmp = statusOrder[a.status] - statusOrder[b.status];
    if (statusCmp !== 0) return statusCmp;

    const elementCmp = a.element_id.localeCompare(b.element_id);
    if (elementCmp !== 0) return elementCmp;

    return a.code.localeCompare(b.code);
  });
}
