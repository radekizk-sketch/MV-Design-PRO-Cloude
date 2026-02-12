/**
 * Results Workspace API — PR-22
 *
 * API client for unified results workspace projection endpoint.
 *
 * INVARIANTS:
 * - Read-only data fetching
 * - No physics calculations
 * - No model mutations
 */

import type { WorkspaceProjection } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Fetch workspace projection for a study case.
 *
 * @param studyCaseId - Study case UUID
 * @returns WorkspaceProjection with runs, batches, comparisons
 */
export async function fetchWorkspaceProjection(
  studyCaseId: string
): Promise<WorkspaceProjection> {
  const response = await fetch(
    `${API_BASE}/api/results-workspace/${studyCaseId}`
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Błąd pobierania projekcji przestrzeni roboczej: ${response.status} ${errorBody}`
    );
  }

  return response.json();
}
