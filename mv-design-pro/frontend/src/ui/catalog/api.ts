/**
 * Type Catalog API Client
 *
 * CANONICAL ALIGNMENT:
 * - backend/src/application/network_wizard/service.py (NetworkWizardService)
 * - backend/src/network_model/catalog/repository.py
 *
 * API endpoints for fetching and assigning catalog types.
 * All endpoints are read-only except assign/clear operations.
 */

import type {
  LineType,
  CableType,
  TransformerType,
  SwitchEquipmentType,
  TypeCategory,
} from './types';

/**
 * API Error with HTTP status and detail from response.
 */
export class CatalogApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly detail: string | null,
    public readonly endpoint: string
  ) {
    super(`${status} ${statusText}: ${detail ?? 'No detail'}`);
    this.name = 'CatalogApiError';
  }
}

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let detail: string | null = null;
    try {
      const body = await response.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      // Response body not JSON or empty
    }
    throw new CatalogApiError(response.status, response.statusText, detail, endpoint);
  }

  // Handle 204 No Content (assign/clear operations return no body)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Fetch all line types from catalog.
 * GET /api/catalog/line-types
 */
export async function fetchLineTypes(): Promise<LineType[]> {
  const endpoint = '/api/catalog/line-types';
  const response = await fetch(endpoint);
  return handleResponse<LineType[]>(response, endpoint);
}

/**
 * Fetch all cable types from catalog.
 * GET /api/catalog/cable-types
 */
export async function fetchCableTypes(): Promise<CableType[]> {
  const endpoint = '/api/catalog/cable-types';
  const response = await fetch(endpoint);
  return handleResponse<CableType[]>(response, endpoint);
}

/**
 * Fetch all transformer types from catalog.
 * GET /api/catalog/transformer-types
 */
export async function fetchTransformerTypes(): Promise<TransformerType[]> {
  const endpoint = '/api/catalog/transformer-types';
  const response = await fetch(endpoint);
  return handleResponse<TransformerType[]>(response, endpoint);
}

/**
 * Fetch all switch equipment types from catalog.
 * GET /api/catalog/switch-equipment-types
 */
export async function fetchSwitchEquipmentTypes(): Promise<SwitchEquipmentType[]> {
  const endpoint = '/api/catalog/switch-equipment-types';
  const response = await fetch(endpoint);
  return handleResponse<SwitchEquipmentType[]>(response, endpoint);
}

/**
 * Fetch types by category (deterministic helper).
 *
 * Returns sorted list (deterministic order):
 * 1. manufacturer (ascending, nulls last)
 * 2. name (ascending)
 * 3. id (ascending)
 */
export async function fetchTypesByCategory(
  category: TypeCategory
): Promise<(LineType | CableType | TransformerType | SwitchEquipmentType)[]> {
  let types: any[];

  switch (category) {
    case 'LINE':
      types = await fetchLineTypes();
      break;
    case 'CABLE':
      types = await fetchCableTypes();
      break;
    case 'TRANSFORMER':
      types = await fetchTransformerTypes();
      break;
    case 'SWITCH_EQUIPMENT':
      types = await fetchSwitchEquipmentTypes();
      break;
    default:
      throw new Error(`Unknown category: ${category}`);
  }

  // Deterministic sort: manufacturer → name → id (nulls last)
  return types.sort((a, b) => {
    // manufacturer (nulls last)
    const hasA = a.manufacturer != null;
    const hasB = b.manufacturer != null;
    if (!hasA && !hasB) {
      // Both null - skip to name comparison
    } else if (!hasA) {
      return 1; // a (null) goes after b
    } else if (!hasB) {
      return -1; // a goes before b (null)
    } else {
      // Both have manufacturer - compare
      if (a.manufacturer < b.manufacturer) return -1;
      if (a.manufacturer > b.manufacturer) return 1;
    }

    // name
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;

    // id (tie-breaker)
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;

    return 0;
  });
}

/**
 * Assign type_ref to a branch (LineBranch).
 * POST /api/projects/{project_id}/branches/{branch_id}/type-ref
 *
 * @param projectId - Project UUID
 * @param branchId - Branch UUID
 * @param typeId - Type UUID (from catalog)
 */
export async function assignTypeToBranch(
  projectId: string,
  branchId: string,
  typeId: string
): Promise<void> {
  const endpoint = `/api/projects/${projectId}/branches/${branchId}/type-ref`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type_id: typeId }),
  });
  await handleResponse<void>(response, endpoint);
}

/**
 * Assign type_ref to a transformer (TransformerBranch).
 * POST /api/projects/{project_id}/transformers/{transformer_id}/type-ref
 */
export async function assignTypeToTransformer(
  projectId: string,
  transformerId: string,
  typeId: string
): Promise<void> {
  const endpoint = `/api/projects/${projectId}/transformers/${transformerId}/type-ref`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type_id: typeId }),
  });
  await handleResponse<void>(response, endpoint);
}

/**
 * Assign equipment_type to a switch.
 * POST /api/projects/{project_id}/switches/{switch_id}/equipment-type
 */
export async function assignEquipmentTypeToSwitch(
  projectId: string,
  switchId: string,
  typeId: string
): Promise<void> {
  const endpoint = `/api/projects/${projectId}/switches/${switchId}/equipment-type`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type_id: typeId }),
  });
  await handleResponse<void>(response, endpoint);
}

/**
 * Clear type_ref from a branch (set to null).
 * DELETE /api/projects/{project_id}/branches/{branch_id}/type-ref
 */
export async function clearTypeFromBranch(
  projectId: string,
  branchId: string
): Promise<void> {
  const endpoint = `/api/projects/${projectId}/branches/${branchId}/type-ref`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
  });
  await handleResponse<void>(response, endpoint);
}

/**
 * Clear type_ref from a transformer.
 * DELETE /api/projects/{project_id}/transformers/{transformer_id}/type-ref
 */
export async function clearTypeFromTransformer(
  projectId: string,
  transformerId: string
): Promise<void> {
  const endpoint = `/api/projects/${projectId}/transformers/${transformerId}/type-ref`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
  });
  await handleResponse<void>(response, endpoint);
}

/**
 * Clear equipment_type from a switch.
 * DELETE /api/projects/{project_id}/switches/{switch_id}/equipment-type
 */
export async function clearEquipmentTypeFromSwitch(
  projectId: string,
  switchId: string
): Promise<void> {
  const endpoint = `/api/projects/${projectId}/switches/${switchId}/equipment-type`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
  });
  await handleResponse<void>(response, endpoint);
}
