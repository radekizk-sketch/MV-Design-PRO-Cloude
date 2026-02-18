/**
 * Domain API V1 — klient operacji domenowych ENM.
 *
 * Kanoniczny endpoint: POST /api/cases/{caseId}/enm/ops
 * Zwraca DomainOpResponseV1 z pełnym snapshotem + logical_views + readiness.
 *
 * SLD odświeża się z odpowiedzi — brak konieczności osobnego reload.
 */

import type { DomainOpResponseV1 } from '../../types/enm';

const API_BASE = '/api/cases';

class DomainApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public detail: unknown,
    public endpoint: string,
  ) {
    super(`API ${status} ${statusText}: ${endpoint}`);
  }
}

/**
 * Wykonaj operację domenową V1.
 *
 * @param caseId - ID studium przypadku
 * @param opName - kanonyczna nazwa operacji (np. "add_grid_source_sn")
 * @param payload - dane operacji
 * @returns DomainOpResponseV1 — pełna odpowiedź z snapshotem
 */
export async function executeDomainOp(
  caseId: string,
  opName: string,
  payload: Record<string, unknown>,
): Promise<DomainOpResponseV1> {
  const endpoint = `${API_BASE}/${caseId}/enm/ops`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: opName, data: payload }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => res.statusText);
    throw new DomainApiError(res.status, res.statusText, detail, endpoint);
  }

  return res.json();
}
