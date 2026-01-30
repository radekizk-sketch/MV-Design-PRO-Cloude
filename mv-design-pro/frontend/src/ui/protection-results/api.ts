/**
 * P15c — Protection Results API Client
 *
 * READ-ONLY API client for fetching protection analysis results.
 * All endpoints are GET-only (no mutations).
 */

import type {
  ProtectionRunHeader,
  ProtectionResult,
  ProtectionTrace,
  ProtectionComparisonResult,
  ProtectionSldOverlay,
} from './types';

const API_BASE = '/api';

/**
 * Fetch protection run header (metadata)
 */
export async function fetchProtectionRunHeader(runId: string): Promise<ProtectionRunHeader> {
  const response = await fetch(`${API_BASE}/protection-runs/${runId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch protection run header: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch protection run results (evaluations + summary)
 */
export async function fetchProtectionResults(runId: string): Promise<ProtectionResult> {
  const response = await fetch(`${API_BASE}/protection-runs/${runId}/results`);
  if (!response.ok) {
    throw new Error(`Failed to fetch protection results: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch protection run trace (audit trail)
 */
export async function fetchProtectionTrace(runId: string): Promise<ProtectionTrace> {
  const response = await fetch(`${API_BASE}/protection-runs/${runId}/trace`);
  if (!response.ok) {
    throw new Error(`Failed to fetch protection trace: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Compare two protection runs (A/B comparison)
 */
export async function compareProtectionRuns(
  runAId: string,
  runBId: string
): Promise<ProtectionComparisonResult> {
  const response = await fetch(`${API_BASE}/comparison/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_a_id: runAId, run_b_id: runBId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to compare protection runs: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch SLD overlay for protection results
 */
export async function fetchProtectionSldOverlay(
  projectId: string,
  diagramId: string,
  runId: string
): Promise<ProtectionSldOverlay> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/sld/${diagramId}/protection-overlay?run_id=${runId}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch protection SLD overlay: ${response.statusText}`);
  }
  return response.json();
}

/**
 * List protection runs for a project
 */
export async function listProtectionRuns(projectId: string): Promise<ProtectionRunHeader[]> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/analysis-runs?analysis_type=protection`
  );
  if (!response.ok) {
    throw new Error(`Failed to list protection runs: ${response.statusText}`);
  }
  const data = await response.json();
  return data.items || [];
}
