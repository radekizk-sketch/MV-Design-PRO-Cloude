/**
 * P20b — Power Flow Results Inspector API Client
 *
 * CANONICAL ALIGNMENT:
 * - Consumes P20a/P20b backend endpoints
 * - READ-ONLY: No mutations, no physics
 * - Deterministic: Same inputs → same outputs
 *
 * ENDPOINTS (P20a/P20b Backend):
 * - GET /projects/{project_id}/power-flow-runs (list)
 * - GET /power-flow-runs/{run_id} (metadata)
 * - GET /power-flow-runs/{run_id}/results (PowerFlowResultV1)
 * - GET /power-flow-runs/{run_id}/trace (PowerFlowTrace)
 */

import type {
  PowerFlowRunListResponse,
  PowerFlowRunHeader,
  PowerFlowResultV1,
  PowerFlowTrace,
} from './types';

const API_BASE = '/api';

/**
 * Fetch list of power flow runs for a project.
 *
 * Results are deterministically sorted by created_at DESC.
 */
export async function fetchPowerFlowRuns(
  projectId: string,
  status?: string
): Promise<PowerFlowRunListResponse> {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }
  const queryString = params.toString();
  const url = `${API_BASE}/projects/${projectId}/power-flow-runs${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Blad pobierania listy rozpywow: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch power flow run metadata.
 */
export async function fetchPowerFlowRunHeader(runId: string): Promise<PowerFlowRunHeader> {
  const response = await fetch(`${API_BASE}/power-flow-runs/${runId}`);
  if (!response.ok) {
    throw new Error(`Blad pobierania metadanych run: ${response.statusText}`);
  }
  const data = await response.json();
  // Map API response to PowerFlowRunHeader
  return {
    id: data.id,
    project_id: data.project_id,
    operating_case_id: data.operating_case_id,
    status: data.status,
    result_status: data.result_status,
    created_at: data.created_at,
    finished_at: data.finished_at,
    input_hash: data.input_hash,
    converged: data.converged,
    iterations: data.iterations,
  };
}

/**
 * Fetch power flow results (PowerFlowResultV1).
 *
 * Results are deterministically sorted by bus_id/branch_id.
 */
export async function fetchPowerFlowResults(runId: string): Promise<PowerFlowResultV1> {
  const response = await fetch(`${API_BASE}/power-flow-runs/${runId}/results`);
  if (!response.ok) {
    throw new Error(`Blad pobierania wynikow rozpywu: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch power flow trace (PowerFlowTrace).
 *
 * Returns white-box trace with per-iteration details.
 */
export async function fetchPowerFlowTrace(runId: string): Promise<PowerFlowTrace> {
  const response = await fetch(`${API_BASE}/power-flow-runs/${runId}/trace`);
  if (!response.ok) {
    throw new Error(`Blad pobierania sladu obliczen: ${response.statusText}`);
  }
  return response.json();
}
