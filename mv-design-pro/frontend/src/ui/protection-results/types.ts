/**
 * P15c — Protection Results Inspector Types
 *
 * CANONICAL ALIGNMENT:
 * - P15a: Protection Analysis domain models (backend)
 * - Polish labels (100% PL UI)
 * - READ-ONLY: No mutations, no physics
 *
 * Types for protection analysis results display.
 */

// =============================================================================
// Protection Run Header
// =============================================================================

export interface ProtectionRunHeader {
  run_id: string;
  status: 'CREATED' | 'RUNNING' | 'FINISHED' | 'FAILED';
  result_state: 'NONE' | 'FRESH' | 'OUTDATED';
  created_at: string;
  finished_at?: string;
  sc_run_id: string;
  protection_case_id: string;
}

// =============================================================================
// Protection Evaluation (single device result)
// =============================================================================

export interface ProtectionEvaluation {
  protected_element_ref: string;
  device_id: string;
  fault_point_id: string;
  trip_state: 'TRIPS' | 'NO_TRIP' | 'INVALID';
  i_fault_a: number;
  i_pickup_a: number;
  t_trip_s?: number;
  margin_percent?: number;
  curve_ref: string;
  curve_kind: string;
}

// =============================================================================
// Protection Result Summary
// =============================================================================

export interface ProtectionResultSummary {
  total_evaluations: number;
  trips_count: number;
  no_trip_count: number;
  invalid_count: number;
  min_trip_time_s?: number;
  max_trip_time_s?: number;
}

// =============================================================================
// Protection Result (full result from backend)
// =============================================================================

export interface ProtectionResult {
  evaluations: ProtectionEvaluation[];
  summary: ProtectionResultSummary;
}

// =============================================================================
// Protection Trace (audit trail)
// =============================================================================

export interface ProtectionTraceStep {
  step_id: string;
  phase: string;
  description: string;
  timestamp?: string;
}

export interface ProtectionTrace {
  steps: ProtectionTraceStep[];
}

// =============================================================================
// Protection Comparison (A/B)
// =============================================================================

export interface ProtectionEvaluationComparison {
  element_id: string;
  trip_state_a: string;
  trip_state_b: string;
  state_change: string;
  t_trip_delta?: NumericDelta;
  margin_delta?: NumericDelta;
}

export interface NumericDelta {
  value_a: number;
  value_b: number;
  delta: number;
  percent?: number;
  sign: number;
}

export interface ProtectionComparison {
  evaluations: ProtectionEvaluationComparison[];
  trip_count_delta: NumericDelta;
  no_trip_count_delta: NumericDelta;
  invalid_count_delta: NumericDelta;
}

export interface ProtectionComparisonResult {
  run_a_id: string;
  run_b_id: string;
  project_id: string;
  analysis_type: string;
  compared_at: string;
  protection: ProtectionComparison;
}

// =============================================================================
// SLD Overlay (protection-specific)
// =============================================================================

export interface ProtectionSldOverlayElement {
  symbol_id: string;
  element_id: string;
  trip_state: 'TRIPS' | 'NO_TRIP' | 'INVALID';
  t_trip_s?: number;
  margin_percent?: number;
}

export interface ProtectionSldOverlay {
  diagram_id: string;
  run_id: string;
  result_status: 'FRESH' | 'OUTDATED' | 'NONE';
  elements: ProtectionSldOverlayElement[];
}

// =============================================================================
// UI State
// =============================================================================

export type ProtectionResultsTab = 'EVALUATIONS' | 'SUMMARY' | 'TRACE';

export type ProtectionComparisonTab = 'DIFFERENCES' | 'RANKING' | 'TRACE';

export type ProtectionViewMode = 'RUN' | 'COMPARISON';

// =============================================================================
// Polish Labels (100% PL)
// =============================================================================

export const PROTECTION_TAB_LABELS: Record<ProtectionResultsTab, string> = {
  EVALUATIONS: 'Oceny',
  SUMMARY: 'Podsumowanie',
  TRACE: 'Ślad obliczeń',
};

export const PROTECTION_COMPARISON_TAB_LABELS: Record<ProtectionComparisonTab, string> = {
  DIFFERENCES: 'Różnice',
  RANKING: 'Ranking problemów',
  TRACE: 'Ślad porównania',
};

export const TRIP_STATE_LABELS: Record<string, string> = {
  TRIPS: 'Zadziała',
  NO_TRIP: 'Nie zadziała',
  INVALID: 'Nieprawidłowe',
};

export const TRIP_STATE_COLORS: Record<string, string> = {
  TRIPS: 'text-emerald-600 bg-emerald-50',
  NO_TRIP: 'text-amber-600 bg-amber-50',
  INVALID: 'text-rose-600 bg-rose-50',
};

export const RESULT_STATUS_LABELS: Record<string, string> = {
  NONE: 'Brak wyników',
  FRESH: 'Aktualne',
  OUTDATED: 'Nieaktualne',
};

export const RESULT_STATUS_SEVERITY: Record<string, 'info' | 'success' | 'warning'> = {
  NONE: 'info',
  FRESH: 'success',
  OUTDATED: 'warning',
};
