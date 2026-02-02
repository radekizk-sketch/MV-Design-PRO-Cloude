/**
 * FIX-12 — Protection Coordination API Client
 *
 * API client for protection coordination analysis endpoints.
 */

import type {
  RunCoordinationRequest,
  CoordinationSummaryResponse,
  CoordinationResult,
  TCCCurve,
  FaultMarker,
  TraceStep,
  SensitivityCheck,
  SelectivityCheck,
  OverloadCheck,
} from './types';

const API_BASE = '/api/protection-coordination';

/**
 * Run protection coordination analysis.
 */
export async function runCoordinationAnalysis(
  projectId: string,
  request: RunCoordinationRequest
): Promise<CoordinationSummaryResponse> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get full coordination analysis result.
 */
export async function getCoordinationResult(
  runId: string
): Promise<CoordinationResult> {
  const response = await fetch(`${API_BASE}/${runId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Not found' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get TCC data for visualization.
 */
export async function getTCCData(
  runId: string
): Promise<{ curves: TCCCurve[]; fault_markers: FaultMarker[] }> {
  const response = await fetch(`${API_BASE}/${runId}/tcc`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Not found' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get WHITE BOX trace.
 */
export async function getCoordinationTrace(
  runId: string
): Promise<{ run_id: string; trace_steps: TraceStep[]; created_at: string }> {
  const response = await fetch(`${API_BASE}/${runId}/trace`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Not found' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get sensitivity checks.
 */
export async function getSensitivityChecks(
  runId: string
): Promise<SensitivityCheck[]> {
  const response = await fetch(`${API_BASE}/${runId}/checks/sensitivity`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Not found' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get selectivity checks.
 */
export async function getSelectivityChecks(
  runId: string
): Promise<SelectivityCheck[]> {
  const response = await fetch(`${API_BASE}/${runId}/checks/selectivity`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Not found' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get overload checks.
 */
export async function getOverloadChecks(
  runId: string
): Promise<OverloadCheck[]> {
  const response = await fetch(`${API_BASE}/${runId}/checks/overload`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Not found' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Export coordination result to PDF.
 */
export function getExportPdfUrl(runId: string): string {
  return `${API_BASE}/${runId}/export/pdf`;
}

/**
 * Export coordination result to DOCX.
 */
export function getExportDocxUrl(runId: string): string {
  return `${API_BASE}/${runId}/export/docx`;
}
