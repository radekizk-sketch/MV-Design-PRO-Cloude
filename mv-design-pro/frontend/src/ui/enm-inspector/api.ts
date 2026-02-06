/**
 * API client — diagnostyka ENM (v4.2).
 *
 * Read-only endpoints. Brak side-effects.
 */

import type {
  DiagnosticReport,
  PreflightReport,
  EnmDiffReport,
} from './types';

const API_BASE = '/api';

/**
 * Pobierz raport diagnostyczny ENM dla danego przypadku.
 */
export async function fetchDiagnostics(caseId: string): Promise<DiagnosticReport> {
  const response = await fetch(`${API_BASE}/cases/${caseId}/diagnostics`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania diagnostyki: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Pobierz pre-flight checks — macierz dostępności analiz.
 */
export async function fetchPreflight(caseId: string): Promise<PreflightReport> {
  const response = await fetch(`${API_BASE}/cases/${caseId}/diagnostics/preflight`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania pre-flight: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Pobierz diff dwóch rewizji ENM.
 */
export async function fetchEnmDiff(
  caseId: string,
  fromSnapshotId: string,
  toSnapshotId: string,
): Promise<EnmDiffReport> {
  const params = new URLSearchParams({
    from: fromSnapshotId,
    to: toSnapshotId,
  });
  const response = await fetch(
    `${API_BASE}/cases/${caseId}/enm/diff?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Błąd pobierania diff ENM: ${response.statusText}`);
  }
  return response.json();
}
