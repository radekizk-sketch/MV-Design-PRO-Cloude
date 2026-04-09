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
 * - GET /analysis-runs/{run_id}/overlay?diagram_id={diagram_id}
 */

import type {
  BranchResults,
  BusResults,
  ExtendedTrace,
  ResultsRunSnapshot,
  ResultsIndex,
  ShortCircuitResults,
  SldResultOverlay,
} from './types';
import type { EnergyNetworkModel } from '../../types/enm';

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
 * Fetch canonical snapshot used for the run.
 */
export async function fetchRunSnapshot(runId: string): Promise<ResultsRunSnapshot> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/snapshot`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania migawki uruchomienia: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch current ENM snapshot for the active case.
 */
export async function fetchCurrentCaseSnapshot(caseId: string): Promise<EnergyNetworkModel> {
  const response = await fetch(`${API_BASE}/cases/${caseId}/enm`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania bieżącego modelu: ${response.statusText}`);
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
  _projectId: string,
  diagramId: string,
  runId: string
): Promise<SldResultOverlay> {
  const response = await fetch(
    `${API_BASE}/analysis-runs/${runId}/overlay?diagram_id=${diagramId}`
  );
  if (!response.ok) {
    throw new Error(`Błąd pobierania nakładki SLD: ${response.statusText}`);
  }
  const payload = await response.json();

  if ('nodes' in payload && 'branches' in payload) {
    return payload as SldResultOverlay;
  }

  const nodes = Array.isArray(payload.bus_overlays) ? payload.bus_overlays : [];
  const branches = Array.isArray(payload.branch_overlays) ? payload.branch_overlays : [];
  return {
    diagram_id: diagramId,
    run_id: runId,
    result_status: 'VALID',
    nodes,
    buses: nodes,
    branches,
  };
}
