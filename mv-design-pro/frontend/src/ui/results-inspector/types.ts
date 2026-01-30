/**
 * P11b — Results Inspector Types (Frontend)
 *
 * CANONICAL ALIGNMENT:
 * - Matches backend DTOs from application/analysis_run/dtos.py
 * - SYSTEM_SPEC.md: READ-ONLY result display
 * - wizard_screens.md: RESULT_VIEW mode
 * - powerfactory_ui_parity.md: Deterministic sorting
 *
 * RULES (BINDING):
 * - These types are READ-ONLY views of backend data
 * - No physics calculations in frontend
 * - Polish labels for UI display
 */

import type { ResultStatus } from '../types';

// =============================================================================
// Run Header
// =============================================================================

/**
 * Run header metadata (from RunHeaderDTO).
 */
export interface RunHeader {
  run_id: string;
  project_id: string;
  case_id: string;
  snapshot_id: string | null;
  created_at: string;
  status: string;
  result_state: string; // VALID, OUTDATED, NONE
  solver_kind: string; // PF, short_circuit_sn
  input_hash: string;
}

// =============================================================================
// Result Columns
// =============================================================================

/**
 * Column metadata for result tables.
 */
export interface ResultColumn {
  key: string;
  label_pl: string;
  unit?: string;
}

/**
 * Table metadata.
 */
export interface ResultTableMeta {
  table_id: string;
  label_pl: string;
  row_count: number;
  columns: ResultColumn[];
}

/**
 * Results index response.
 */
export interface ResultsIndex {
  run_header: RunHeader;
  tables: ResultTableMeta[];
}

// =============================================================================
// Bus Results (Szyny)
// =============================================================================

/**
 * Single bus result row.
 */
export interface BusResultRow {
  bus_id: string;
  name: string;
  un_kv: number;
  u_kv: number | null;
  u_pu: number | null;
  angle_deg: number | null;
  flags: string[];
}

/**
 * Bus results table.
 */
export interface BusResults {
  run_id: string;
  rows: BusResultRow[];
}

// =============================================================================
// Branch Results (Gałęzie)
// =============================================================================

/**
 * Single branch result row.
 */
export interface BranchResultRow {
  branch_id: string;
  name: string;
  from_bus: string;
  to_bus: string;
  i_a: number | null;
  s_mva: number | null;
  p_mw: number | null;
  q_mvar: number | null;
  loading_pct: number | null;
  flags: string[];
}

/**
 * Branch results table.
 */
export interface BranchResults {
  run_id: string;
  rows: BranchResultRow[];
}

// =============================================================================
// Short-Circuit Results (Zwarcia)
// =============================================================================

/**
 * Single short-circuit result row.
 */
export interface ShortCircuitRow {
  target_id: string;
  target_name: string | null;
  ikss_ka: number | null;
  ip_ka: number | null;
  ith_ka: number | null;
  sk_mva: number | null;
  fault_type: string | null;
  flags: string[];
}

/**
 * Short-circuit results table.
 */
export interface ShortCircuitResults {
  run_id: string;
  rows: ShortCircuitRow[];
}

// =============================================================================
// Extended Trace (Ślad obliczeń)
// =============================================================================

/**
 * Single trace step.
 */
export interface TraceStep {
  step_id?: string;
  phase?: string;
  description?: string;
  equation_id?: string;
  inputs?: Record<string, unknown>;
  output?: unknown;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Extended trace with run context.
 */
export interface ExtendedTrace {
  run_id: string;
  snapshot_id: string | null;
  input_hash: string;
  white_box_trace: TraceStep[];
}

// =============================================================================
// SLD Overlay
// =============================================================================

/**
 * SLD node overlay data.
 */
export interface SldOverlayNode {
  symbol_id: string;
  node_id: string;
  u_pu?: number;
  u_kv?: number;
  angle_deg?: number;
  ikss_ka?: number;
  sk_mva?: number;
}

/**
 * SLD branch overlay data.
 */
export interface SldOverlayBranch {
  symbol_id: string;
  branch_id: string;
  p_mw?: number;
  q_mvar?: number;
  i_a?: number;
  loading_pct?: number;
}

/**
 * Complete SLD result overlay.
 */
export interface SldResultOverlay {
  diagram_id: string;
  run_id: string;
  result_status: string;
  nodes: SldOverlayNode[];
  branches: SldOverlayBranch[];
}

// =============================================================================
// UI State Types
// =============================================================================

/**
 * Active tab in Results Inspector.
 */
export type ResultsInspectorTab = 'BUSES' | 'BRANCHES' | 'SHORT_CIRCUIT' | 'TRACE';

/**
 * Polish tab labels.
 */
export const RESULTS_TAB_LABELS: Record<ResultsInspectorTab, string> = {
  BUSES: 'Szyny',
  BRANCHES: 'Gałęzie',
  SHORT_CIRCUIT: 'Zwarcia',
  TRACE: 'Ślad obliczeń',
};

/**
 * Result status labels (Polish).
 */
export const RESULT_STATUS_LABELS: Record<string, string> = {
  NONE: 'Brak wyników',
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
 * Flag labels (Polish).
 */
export const FLAG_LABELS: Record<string, string> = {
  SLACK: 'Węzeł bilansujący',
  VOLTAGE_VIOLATION: 'Naruszenie napięcia',
  OVERLOADED: 'Przeciążenie',
};

/**
 * Solver kind labels (Polish).
 */
export const SOLVER_KIND_LABELS: Record<string, string> = {
  PF: 'Rozpływ mocy',
  short_circuit_sn: 'Zwarcie SN',
  power_flow: 'Rozpływ mocy',
};

// =============================================================================
// P20b: Power Flow Types
// =============================================================================

/**
 * Power Flow run item in history list.
 */
export interface PowerFlowRunItem {
  id: string;
  deterministic_id: string;
  project_id: string;
  operating_case_id: string | null;
  case_name: string | null;
  analysis_type: string;
  status: string;
  result_status: string;
  created_at: string;
  finished_at: string | null;
  input_hash: string;
  converged: boolean | null;
  iterations: number | null;
}

/**
 * Power Flow runs list response.
 */
export interface PowerFlowRunsListResponse {
  project_id: string;
  total: number;
  limit: number;
  offset: number;
  items: PowerFlowRunItem[];
}

/**
 * P20b: Power Flow bus result (single row).
 */
export interface PowerFlowBusResult {
  bus_id: string;
  v_pu: number;
  angle_deg: number;
  p_injected_mw: number;
  q_injected_mvar: number;
}

/**
 * P20b: Power Flow branch result (single row).
 */
export interface PowerFlowBranchResult {
  branch_id: string;
  p_from_mw: number;
  q_from_mvar: number;
  p_to_mw: number;
  q_to_mvar: number;
  losses_p_mw: number;
  losses_q_mvar: number;
  loading_pct?: number;
}

/**
 * P20b: Power Flow summary.
 */
export interface PowerFlowSummary {
  total_losses_p_mw: number;
  total_losses_q_mvar: number;
  min_v_pu: number;
  max_v_pu: number;
  slack_p_mw: number;
  slack_q_mvar: number;
}

/**
 * P20b: Power Flow result v1 response.
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

/**
 * P20b: Power Flow trace iteration (Newton-Raphson).
 */
export interface PowerFlowTraceIteration {
  iteration: number;
  state?: Record<string, number>;
  mismatch?: Record<string, number>;
  norm_mismatch?: number;
  delta_state?: Record<string, number>;
  jacobian_summary?: {
    size: number;
    sparsity?: number;
  };
  converged?: boolean;
}

/**
 * P20b: Power Flow trace response.
 */
export interface PowerFlowTrace {
  solver_version: string;
  input_hash: string;
  snapshot_id: string | null;
  case_id: string | null;
  run_id: string;
  init_state: Record<string, number>;
  init_method: string;
  tolerance: number;
  max_iterations: number;
  base_mva: number;
  slack_bus_id: string;
  pq_bus_ids: string[];
  pv_bus_ids: string[];
  ybus_trace: Record<string, unknown>;
  iterations: PowerFlowTraceIteration[];
  converged: boolean;
  final_iterations_count: number;
}

/**
 * P20b: Power Flow Results Inspector tab.
 */
export type PowerFlowResultsTab = 'PF_BUSES' | 'PF_BRANCHES' | 'PF_SUMMARY' | 'PF_TRACE';

/**
 * P20b: Polish labels for Power Flow tabs.
 */
export const POWER_FLOW_TAB_LABELS: Record<PowerFlowResultsTab, string> = {
  PF_BUSES: 'Szyny',
  PF_BRANCHES: 'Gałęzie',
  PF_SUMMARY: 'Podsumowanie',
  PF_TRACE: 'Ślad obliczeń',
};
