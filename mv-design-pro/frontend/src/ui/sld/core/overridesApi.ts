/**
 * SLD Overrides API — klient HTTP dla nadpisan geometrii (RUN #3H §3).
 *
 * Endpoints:
 * - GET  /api/study-cases/{caseId}/sld-overrides        → OverridesResponse
 * - PUT  /api/study-cases/{caseId}/sld-overrides        → OverridesResponse
 * - POST /api/study-cases/{caseId}/sld-overrides/validate → ValidateResponse
 * - POST /api/study-cases/{caseId}/sld-overrides/reset   → OverridesResponse
 */

import type {
  ProjectGeometryOverridesV1,
  GeometryOverrideItemV1,
  OverrideValidationResultV1,
} from './geometryOverrides';
import {
  OVERRIDES_VERSION,
  OverrideScopeV1,
  OverrideOperationV1,
} from './geometryOverrides';

// =============================================================================
// API TYPES
// =============================================================================

export interface OverridesApiResponse {
  readonly overrides_version: string;
  readonly study_case_id: string;
  readonly snapshot_hash: string;
  readonly items: readonly {
    readonly element_id: string;
    readonly scope: string;
    readonly operation: string;
    readonly payload: Record<string, unknown>;
  }[];
  readonly overrides_hash: string;
}

export interface ValidateApiResponse {
  readonly valid: boolean;
  readonly errors: readonly {
    readonly element_id: string;
    readonly code: string;
    readonly message: string;
  }[];
  readonly overrides_hash: string;
}

// =============================================================================
// API BASE
// =============================================================================

const API_BASE = '/api/study-cases';

class OverridesApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
    public endpoint: string,
  ) {
    super(`SLD Overrides API ${status}: ${endpoint}`);
  }
}

async function handleResponse<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) {
    const detail = await res.json().catch(() => res.statusText);
    throw new OverridesApiError(res.status, detail, endpoint);
  }
  return res.json();
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/** Pobierz aktualne nadpisania geometrii dla przypadku. */
export async function fetchSldOverrides(caseId: string): Promise<OverridesApiResponse> {
  const endpoint = `${API_BASE}/${caseId}/sld-overrides`;
  const res = await fetch(endpoint);
  return handleResponse<OverridesApiResponse>(res, endpoint);
}

/** Zapisz nadpisania geometrii (deterministycznie). */
export async function saveSldOverrides(
  caseId: string,
  snapshotHash: string,
  items: readonly GeometryOverrideItemV1[],
): Promise<OverridesApiResponse> {
  const endpoint = `${API_BASE}/${caseId}/sld-overrides`;
  const body = {
    snapshot_hash: snapshotHash,
    items: items.map((item) => ({
      element_id: item.elementId,
      scope: item.scope,
      operation: item.operation,
      payload: item.payload,
    })),
  };
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<OverridesApiResponse>(res, endpoint);
}

/** Waliduj nadpisania bez zapisu. */
export async function validateSldOverrides(
  caseId: string,
  snapshotHash: string,
  items: readonly GeometryOverrideItemV1[],
  knownNodeIds: readonly string[],
  knownBlockIds: readonly string[],
): Promise<ValidateApiResponse> {
  const endpoint = `${API_BASE}/${caseId}/sld-overrides/validate`;
  const body = {
    snapshot_hash: snapshotHash,
    items: items.map((item) => ({
      element_id: item.elementId,
      scope: item.scope,
      operation: item.operation,
      payload: item.payload,
    })),
    known_node_ids: knownNodeIds,
    known_block_ids: knownBlockIds,
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<ValidateApiResponse>(res, endpoint);
}

/** Reset nadpisan do pustych. */
export async function resetSldOverrides(caseId: string): Promise<OverridesApiResponse> {
  const endpoint = `${API_BASE}/${caseId}/sld-overrides/reset`;
  const res = await fetch(endpoint, { method: 'POST' });
  return handleResponse<OverridesApiResponse>(res, endpoint);
}

// =============================================================================
// RESPONSE → DOMAIN MAPPING
// =============================================================================

/** Konwertuj odpowiedz API na domenowy model ProjectGeometryOverridesV1. */
export function mapResponseToOverrides(
  response: OverridesApiResponse,
): ProjectGeometryOverridesV1 {
  return {
    overridesVersion: OVERRIDES_VERSION,
    studyCaseId: response.study_case_id,
    snapshotHash: response.snapshot_hash,
    items: response.items.map((item) => ({
      elementId: item.element_id,
      scope: item.scope as OverrideScopeV1,
      operation: item.operation as OverrideOperationV1,
      payload: item.payload as GeometryOverrideItemV1['payload'],
    })),
  };
}

/** Konwertuj odpowiedz walidacji na domenowy model. */
export function mapValidateResponse(
  response: ValidateApiResponse,
): OverrideValidationResultV1 {
  return {
    valid: response.valid,
    errors: response.errors.map((e) => ({
      elementId: e.element_id,
      code: e.code,
      message: e.message,
    })),
  };
}
