/**
 * Protection Library API Client (P14a - READ-ONLY, P14b - GOVERNANCE)
 *
 * Provides functions to fetch protection library types from backend.
 * P14a: READ-ONLY endpoints (list/get)
 * P14b: GOVERNANCE endpoints (export/import with manifest+fingerprint)
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

// ============================================================================
// Protection Library Governance (P14b)
// ============================================================================

export interface ProtectionLibraryManifest {
  library_id: string;
  name_pl: string;
  vendor: string;
  series: string;
  revision: string;
  schema_version: string;
  created_at: string;
  fingerprint: string;
  description_pl?: string;
}

export interface ProtectionLibraryExport {
  manifest: ProtectionLibraryManifest;
  device_types: any[];
  curves: any[];
  templates: any[];
}

export interface ProtectionImportReportItem {
  kind: string;
  id: string;
  name_pl: string;
  reason_code: string;
}

export interface ProtectionImportReport {
  mode: string;
  added: ProtectionImportReportItem[];
  skipped: ProtectionImportReportItem[];
  conflicts: ProtectionImportReportItem[];
  blocked: ProtectionImportReportItem[];
  success: boolean;
}

/**
 * Export protection library with manifest and fingerprint (P14b)
 */
export async function exportProtectionLibrary(params?: {
  library_name_pl?: string;
  vendor?: string;
  series?: string;
  revision?: string;
  description_pl?: string;
}): Promise<ProtectionLibraryExport> {
  const queryParams = new URLSearchParams();
  if (params?.library_name_pl) queryParams.set('library_name_pl', params.library_name_pl);
  if (params?.vendor) queryParams.set('vendor', params.vendor);
  if (params?.series) queryParams.set('series', params.series);
  if (params?.revision) queryParams.set('revision', params.revision);
  if (params?.description_pl) queryParams.set('description_pl', params.description_pl);

  const url = `${API_BASE}/export?${queryParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to export protection library: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Import protection library with conflict detection (P14b)
 */
export async function importProtectionLibrary(
  data: ProtectionLibraryExport,
  mode: 'merge' | 'replace' = 'merge'
): Promise<ProtectionImportReport> {
  const response = await fetch(`${API_BASE}/import?mode=${mode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    // Try to parse error details
    let errorMessage = `Import failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}
