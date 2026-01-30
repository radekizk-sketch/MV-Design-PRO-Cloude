/**
 * P11b — Results Inspector API Client
 *
 * CANONICAL ALIGNMENT:
 * - Consumes P11a backend endpoints
 * - READ-ONLY: No mutations, no physics
 * - Deterministic: Same inputs → same outputs
 *
 * ENDPOINTS (P11a Backend):
 * - GET /analysis-runs/{run_id}/results/index
 * - GET /analysis-runs/{run_id}/results/buses
 * - GET /analysis-runs/{run_id}/results/branches
 * - GET /analysis-runs/{run_id}/results/short-circuit
 * - GET /analysis-runs/{run_id}/results/trace
 * - GET /projects/{project_id}/sld/{diagram_id}/overlay?run_id={run_id}
 */

import type {
  BranchResults,
  BusResults,
  ExtendedTrace,
  ResultsIndex,
  ShortCircuitResults,
  SldResultOverlay,
} from './types';

const API_BASE = '/api';

/**
 * Fetch results index for a run.
 *
 * Returns available tables with column metadata.
 */
export async function fetchResultsIndex(runId: string): Promise<ResultsIndex> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/index`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania indeksu wyników: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch bus/node results for a run.
 *
 * Results are deterministically sorted by (name, bus_id).
 */
export async function fetchBusResults(runId: string): Promise<BusResults> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/buses`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania wyników węzłowych: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch branch results for a run.
 *
 * Results are deterministically sorted by (name, branch_id).
 */
export async function fetchBranchResults(runId: string): Promise<BranchResults> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/branches`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania wyników gałęziowych: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch short-circuit results for a run.
 *
 * Only available for short_circuit_sn analysis type.
 * Results are deterministically sorted by target_id.
 */
export async function fetchShortCircuitResults(runId: string): Promise<ShortCircuitResults> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/short-circuit`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania wyników zwarciowych: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch extended trace (white_box_trace) for a run.
 *
 * Returns trace with run context for audit.
 */
export async function fetchExtendedTrace(runId: string): Promise<ExtendedTrace> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/trace`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania śladu obliczeń: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch SLD result overlay for a diagram.
 *
 * Maps analysis results to SLD symbols for visualization.
 * READ-ONLY: Does not mutate model or diagram.
 */
export async function fetchSldOverlay(
  projectId: string,
  diagramId: string,
  runId: string
): Promise<SldResultOverlay> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/sld/${diagramId}/overlay?run_id=${runId}`
  );
  if (!response.ok) {
    throw new Error(`Błąd pobierania nakładki SLD: ${response.statusText}`);
  }
  return response.json();
}

// =============================================================================
// P20b: Power Flow API Functions
// =============================================================================

import type {
  PowerFlowRunsListResponse,
  PowerFlowResultV1,
  PowerFlowTrace,
} from './types';

/**
 * P20b: Fetch Power Flow runs list for project.
 *
 * Returns paginated, deterministically sorted list (created_at DESC).
 */
export async function fetchPowerFlowRuns(
  projectId: string,
  limit = 50,
  offset = 0
): Promise<PowerFlowRunsListResponse> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/power-flow-runs?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) {
    throw new Error(`Błąd pobierania historii rozpływów mocy: ${response.statusText}`);
  }
  return response.json();
}

/**
 * P20b: Fetch Power Flow results for a specific run.
 *
 * Returns PowerFlowResultV1 with bus/branch results and summary.
 */
export async function fetchPowerFlowResults(runId: string): Promise<PowerFlowResultV1> {
  const response = await fetch(`${API_BASE}/power-flow-runs/${runId}/results`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania wyników rozpływu mocy: ${response.statusText}`);
  }
  return response.json();
}

/**
 * P20b: Fetch Power Flow trace (Newton-Raphson iterations).
 *
 * Returns full white-box trace for audit.
 */
export async function fetchPowerFlowTrace(runId: string): Promise<PowerFlowTrace> {
  const response = await fetch(`${API_BASE}/power-flow-runs/${runId}/trace`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania śladu obliczeń rozpływu mocy: ${response.statusText}`);
  }
  return response.json();
}

/**
 * P20b: Fetch Power Flow run metadata.
 */
export async function fetchPowerFlowRunMeta(runId: string): Promise<{
  id: string;
  status: string;
  converged: boolean | null;
  iterations: number | null;
  created_at: string;
  finished_at: string | null;
}> {
  const response = await fetch(`${API_BASE}/power-flow-runs/${runId}`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania metadanych rozpływu mocy: ${response.statusText}`);
  }
  return response.json();
}
