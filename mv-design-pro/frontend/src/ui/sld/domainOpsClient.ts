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

function canonicalStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function hashFNV1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Deterministyczny klucz idempotencji ENM_OP.
 * Ten sam opName + snapshotBaseHash + payload daje ten sam klucz.
 */
export function buildDeterministicIdempotencyKey(
  opName: CanonicalOpName,
  payload: Record<string, unknown>,
  snapshotBaseHash: string = '',
): string {
  const canonicalPayload = canonicalStringify(payload);
  const payloadHash = hashFNV1a32(canonicalPayload);
  const snapshotToken = snapshotBaseHash.trim() === '' ? 'root' : snapshotBaseHash;
  return buildIdempotencyKey(opName, `${snapshotToken}:${payloadHash}`);
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
        idempotencyKey ?? buildDeterministicIdempotencyKey(canonicalName, payload, snapshotBaseHash),
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
