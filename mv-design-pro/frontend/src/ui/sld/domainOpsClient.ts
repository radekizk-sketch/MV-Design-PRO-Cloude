/**
 * domainOpsClient — klient API operacji domenowych.
 *
 * Pojedynczy punkt komunikacji z backendem.
 * Tłumaczy aliasy na nazwy kanoniczne.
 * Buduje envelope zgodny z kontraktem API.
 */
import type {
  DomainOpEnvelope,
  DomainOpResponse,
  CanonicalOpName,
} from '../../types/domainOps';
import { ALIAS_MAP } from '../../types/domainOps';

const API_BASE = '/api/cases';

/**
 * Rozwiąż alias do nazwy kanonicznej.
 */
export function resolveCanonicalName(name: string): CanonicalOpName {
  return (ALIAS_MAP[name] ?? name) as CanonicalOpName;
}

/**
 * Zbuduj idempotency key z nazwy operacji i stabilnego seed.
 */
export function buildIdempotencyKey(
  opName: CanonicalOpName,
  seed: string,
): string {
  return `op:${opName}:${seed}`;
}

/**
 * Wykonaj operację domenową.
 *
 * Buduje envelope, wysyła POST, zwraca odpowiedź.
 * Aliasy tłumaczone automatycznie.
 */
export async function executeDomainOp(
  caseId: string,
  opName: string,
  payload: Record<string, unknown>,
  snapshotBaseHash: string = '',
  idempotencyKey?: string,
): Promise<DomainOpResponse> {
  const canonicalName = resolveCanonicalName(opName);

  const envelope: DomainOpEnvelope = {
    project_id: caseId,
    snapshot_base_hash: snapshotBaseHash,
    operation: {
      name: canonicalName,
      idempotency_key:
        idempotencyKey ?? buildIdempotencyKey(canonicalName, `${Date.now()}`),
      payload,
    },
  };

  const response = await fetch(`${API_BASE}/${caseId}/enm/domain-ops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Operacja ${canonicalName} nie powiodła się: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Pobierz aktualny snapshot ENM.
 */
export async function fetchSnapshot(
  caseId: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}/${caseId}/enm`);
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać snapshot: ${response.status}`);
  }
  return response.json();
}

/**
 * Pobierz stan gotowości.
 */
export async function fetchReadiness(
  caseId: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}/${caseId}/enm/readiness`);
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać gotowości: ${response.status}`);
  }
  return response.json();
}

/**
 * Pobierz inżynierską gotowość z fix_actions.
 */
export async function fetchEngineeringReadiness(
  caseId: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}/${caseId}/engineering-readiness`);
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać inżynierskiej gotowości: ${response.status}`);
  }
  return response.json();
}
