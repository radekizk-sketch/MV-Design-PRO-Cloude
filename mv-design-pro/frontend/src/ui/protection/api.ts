/**
 * Protection Library API Client (P14a - READ-ONLY)
 *
 * Provides functions to fetch protection library types from backend.
 * All endpoints are READ-ONLY (no create/update/delete).
 */

import type {
  ProtectionCategory,
  ProtectionDeviceType,
  ProtectionCurve,
  ProtectionSettingTemplate,
} from './types';

const API_BASE = '/api/catalog/protection';

/**
 * Fetch protection types by category
 */
export async function fetchProtectionTypesByCategory(
  category: ProtectionCategory
): Promise<ProtectionDeviceType[] | ProtectionCurve[] | ProtectionSettingTemplate[]> {
  let endpoint: string;

  switch (category) {
    case 'DEVICE':
      endpoint = `${API_BASE}/device-types`;
      break;
    case 'CURVE':
      endpoint = `${API_BASE}/curves`;
      break;
    case 'TEMPLATE':
      endpoint = `${API_BASE}/templates`;
      break;
    default:
      throw new Error(`Unknown category: ${category}`);
  }

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Failed to fetch protection types: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform backend format {id, name_pl, params} to frontend format
  return data.map((item: any) => ({
    id: item.id,
    name_pl: item.name_pl,
    ...item.params,
  }));
}

/**
 * Fetch single protection device type by ID
 */
export async function fetchProtectionDeviceType(
  deviceTypeId: string
): Promise<ProtectionDeviceType | null> {
  const response = await fetch(`${API_BASE}/device-types/${deviceTypeId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch protection device type: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name_pl: data.name_pl,
    ...data.params,
  };
}

/**
 * Fetch single protection curve by ID
 */
export async function fetchProtectionCurve(curveId: string): Promise<ProtectionCurve | null> {
  const response = await fetch(`${API_BASE}/curves/${curveId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch protection curve: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name_pl: data.name_pl,
    ...data.params,
  };
}

/**
 * Fetch single protection setting template by ID
 */
export async function fetchProtectionSettingTemplate(
  templateId: string
): Promise<ProtectionSettingTemplate | null> {
  const response = await fetch(`${API_BASE}/templates/${templateId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch protection setting template: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name_pl: data.name_pl,
    ...data.params,
  };
}
