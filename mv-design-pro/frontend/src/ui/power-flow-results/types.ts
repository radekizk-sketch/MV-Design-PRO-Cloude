/**
 * P20b — Power Flow Results Inspector Types (Frontend)
 *
 * CANONICAL ALIGNMENT:
 * - Matches backend DTOs from P20a power_flow_runs.py
 * - SYSTEM_SPEC.md: READ-ONLY result display
 * - wizard_screens.md: RESULT_VIEW mode
 * - powerfactory_ui_parity.md: Deterministic sorting
 *
 * RULES (BINDING):
 * - These types are READ-ONLY views of backend data
 * - No physics calculations in frontend
 * - Polish labels for UI display
 */

// =============================================================================
// Run Header
// =============================================================================

/**
 * Power flow run header metadata.
 */
export interface PowerFlowRunHeader {
  id: string;
  project_id: string;
  operating_case_id: string;
  status: string;
  result_status: string;
  created_at: string;
  finished_at: string | null;
  input_hash: string;
  converged: boolean | null;
  iterations: number | null;
}

/**
 * Power flow run list response.
 */
export interface PowerFlowRunListResponse {
  runs: PowerFlowRunHeader[];
  total: number;
}

// =============================================================================
// Bus Results (Szyny)
// =============================================================================

/**
 * Single bus result row from PowerFlowResultV1.
 */
export interface PowerFlowBusResult {
  bus_id: string;
  v_pu: number;
  angle_deg: number;
  p_injected_mw: number;
  q_injected_mvar: number;
}

// =============================================================================
// Branch Results (Galezie)
// =============================================================================

/**
 * Single branch result row from PowerFlowResultV1.
 */
export interface PowerFlowBranchResult {
  branch_id: string;
  p_from_mw: number;
  q_from_mvar: number;
  p_to_mw: number;
  q_to_mvar: number;
  losses_p_mw: number;
  losses_q_mvar: number;
}

// =============================================================================
// Summary (Podsumowanie)
// =============================================================================

/**
 * Power flow summary.
 */
export interface PowerFlowSummary {
  total_losses_p_mw: number;
  total_losses_q_mvar: number;
  min_v_pu: number;
  max_v_pu: number;
  slack_p_mw: number;
  slack_q_mvar: number;
}

// =============================================================================
// Full Result (PowerFlowResultV1)
// =============================================================================

/**
 * Complete power flow result (PowerFlowResultV1 from backend).
 */
export interface PowerFlowResultV1 {
  result_version: string;
  converged: boolean;
  iterations_count: number;
  tolerance_used: number;
  base_mva: number;
  slack_bus_id: string;
  bus_results: PowerFlowBusResult[];
  branch_results: PowerFlowBranchResult[];
  summary: PowerFlowSummary;
}

// =============================================================================
// Trace (Slad obliczen)
// =============================================================================

/**
 * Single iteration trace from Newton-Raphson solver.
 */
export interface PowerFlowIterationTrace {
  k: number;
  norm_mismatch: number;
  max_mismatch_pu: number;
  mismatch_per_bus?: Record<string, { delta_p_pu: number; delta_q_pu: number }>;
  jacobian_size?: { rows: number; cols: number };
  pv_to_pq_switches?: string[];
  cause_if_failed?: string | null;
}

/**
 * Complete power flow trace (PowerFlowTrace from backend).
 */
export interface PowerFlowTrace {
  solver_version: string;
  input_hash: string;
  snapshot_id: string | null;
  case_id: string | null;
  run_id: string;
  init_state: Record<string, { v_pu: number; theta_rad: number }>;
  init_method: string;
  tolerance: number;
  max_iterations: number;
  base_mva: number;
  slack_bus_id: string;
  pq_bus_ids: string[];
  pv_bus_ids: string[];
  ybus_trace?: Record<string, unknown>;
  iterations: PowerFlowIterationTrace[];
  converged: boolean;
  final_iterations_count: number;
}

// =============================================================================
// UI State Types
// =============================================================================

/**
 * Active tab in Power Flow Results Inspector.
 */
export type PowerFlowResultsTab = 'BUSES' | 'BRANCHES' | 'SUMMARY' | 'TRACE';

/**
 * Polish tab labels.
 */
export const POWER_FLOW_TAB_LABELS: Record<PowerFlowResultsTab, string> = {
  BUSES: 'Szyny',
  BRANCHES: 'Galezie',
  SUMMARY: 'Podsumowanie',
  TRACE: 'Slad obliczen',
};

/**
 * Result status labels (Polish).
 */
export const RESULT_STATUS_LABELS: Record<string, string> = {
  NONE: 'Brak wynikow',
  FRESH: 'Wyniki aktualne',
  VALID: 'Wyniki aktualne',
  OUTDATED: 'Wyniki nieaktualne',
};

/**
 * Result status severity for visual indication.
 */
export const RESULT_STATUS_SEVERITY: Record<string, 'info' | 'success' | 'warning'> = {
  NONE: 'info',
  FRESH: 'success',
  VALID: 'success',
  OUTDATED: 'warning',
};

/**
 * Convergence status labels (Polish).
 */
export const CONVERGENCE_LABELS: Record<string, string> = {
  true: 'Zbiezny',
  false: 'Niezbiezny',
};
