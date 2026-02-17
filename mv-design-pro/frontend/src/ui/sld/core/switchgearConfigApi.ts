/**
 * Switchgear Config API — klient HTTP dla konfiguracji rozdzielnicy (RUN #3I §2).
 *
 * Endpoints:
 * - GET  /api/switchgear/{stationId}/config      → ConfigResponse
 * - PUT  /api/switchgear/{stationId}/config      → ConfigResponse
 * - POST /api/switchgear/{stationId}/validate    → ValidateResponse
 *
 * Wzorzec identyczny z overridesApi.ts.
 */

import type {
  SwitchgearConfigV1,
  SwitchgearConfigValidationResultV1,
  FieldConfigV1,
  DeviceConfigV1,
} from './switchgearConfig';
import {
  SWITCHGEAR_CONFIG_VERSION as _SWITCHGEAR_CONFIG_VERSION,
  ConfigIssueSeverity,
  FixActionType,
} from './switchgearConfig';

// =============================================================================
// API TYPES
// =============================================================================

export interface ConfigApiResponse {
  readonly config_version: string;
  readonly station_id: string;
  readonly fields: readonly Record<string, unknown>[];
  readonly devices: readonly Record<string, unknown>[];
  readonly catalog_bindings: readonly Record<string, unknown>[];
  readonly protection_bindings: readonly Record<string, unknown>[];
  readonly canonical_hash: string;
}

export interface ValidateConfigApiResponse {
  readonly valid: boolean;
  readonly issues: readonly {
    readonly code: string;
    readonly severity: string;
    readonly message_pl: string;
    readonly element_id: string | null;
    readonly field_id: string | null;
    readonly device_id: string | null;
  }[];
  readonly fix_actions: readonly {
    readonly code: string;
    readonly action: string;
    readonly message_pl: string;
    readonly station_id: string;
    readonly field_id: string | null;
    readonly device_id: string | null;
  }[];
  readonly canonical_hash: string;
}

// =============================================================================
// API BASE
// =============================================================================

const API_BASE = '/api/switchgear';

class ConfigApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
    public endpoint: string,
  ) {
    super(`Switchgear Config API ${status}: ${endpoint}`);
  }
}

async function handleResponse<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) {
    const detail = await res.json().catch(() => res.statusText);
    throw new ConfigApiError(res.status, detail, endpoint);
  }
  return res.json();
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/** Pobierz konfiguracje rozdzielnicy. */
export async function fetchSwitchgearConfig(
  stationId: string,
): Promise<ConfigApiResponse> {
  const endpoint = `${API_BASE}/${stationId}/config`;
  const res = await fetch(endpoint);
  return handleResponse<ConfigApiResponse>(res, endpoint);
}

/** Zapisz konfiguracje rozdzielnicy. */
export async function saveSwitchgearConfig(
  stationId: string,
  config: SwitchgearConfigV1,
): Promise<ConfigApiResponse> {
  const endpoint = `${API_BASE}/${stationId}/config`;
  const body = {
    fields: config.fields.map(f => ({
      field_id: f.fieldId,
      pole_type: f.poleType,
      field_role: f.fieldRole,
      bus_section_id: f.busSectionId,
    })),
    devices: config.devices.map(d => ({
      device_id: d.deviceId,
      field_id: d.fieldId,
      device_type: d.deviceType,
      aparat_type: d.aparatType,
    })),
    catalog_bindings: config.catalogBindings.map(b => ({
      device_id: b.deviceId,
      catalog_id: b.catalogId,
      catalog_name: b.catalogName,
      manufacturer: b.manufacturer,
      catalog_version: b.catalogVersion,
    })),
    protection_bindings: config.protectionBindings.map(p => ({
      relay_device_id: p.relayDeviceId,
      cb_device_id: p.cbDeviceId,
    })),
  };
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<ConfigApiResponse>(res, endpoint);
}

/** Waliduj konfiguracje bez zapisu. */
export async function validateSwitchgearConfigApi(
  stationId: string,
  config: SwitchgearConfigV1,
): Promise<ValidateConfigApiResponse> {
  const endpoint = `${API_BASE}/${stationId}/validate`;
  const body = {
    fields: config.fields.map(f => ({
      field_id: f.fieldId,
      pole_type: f.poleType,
      field_role: f.fieldRole,
      bus_section_id: f.busSectionId,
    })),
    devices: config.devices.map(d => ({
      device_id: d.deviceId,
      field_id: d.fieldId,
      device_type: d.deviceType,
      aparat_type: d.aparatType,
    })),
    catalog_bindings: config.catalogBindings.map(b => ({
      device_id: b.deviceId,
      catalog_id: b.catalogId,
      catalog_name: b.catalogName,
      manufacturer: b.manufacturer,
      catalog_version: b.catalogVersion,
    })),
    protection_bindings: config.protectionBindings.map(p => ({
      relay_device_id: p.relayDeviceId,
      cb_device_id: p.cbDeviceId,
    })),
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<ValidateConfigApiResponse>(res, endpoint);
}

// =============================================================================
// RESPONSE → DOMAIN MAPPING
// =============================================================================

/** Konwertuj odpowiedz API na domenowy SwitchgearConfigV1. */
export function mapConfigResponse(response: ConfigApiResponse): SwitchgearConfigV1 {
  return {
    configVersion: response.config_version,
    stationId: response.station_id,
    fields: response.fields.map(f => ({
      fieldId: f['field_id'] as string,
      poleType: f['pole_type'] as string,
      fieldRole: f['field_role'] as string,
      busSectionId: (f['bus_section_id'] as string | null) ?? null,
    })) as FieldConfigV1[],
    devices: response.devices.map(d => ({
      deviceId: d['device_id'] as string,
      fieldId: d['field_id'] as string,
      deviceType: d['device_type'] as string,
      aparatType: d['aparat_type'] as string,
    })) as DeviceConfigV1[],
    catalogBindings: response.catalog_bindings.map(b => ({
      deviceId: b['device_id'] as string,
      catalogId: b['catalog_id'] as string,
      catalogName: b['catalog_name'] as string,
      manufacturer: (b['manufacturer'] as string | null) ?? null,
      catalogVersion: (b['catalog_version'] as string | null) ?? null,
    })),
    protectionBindings: response.protection_bindings.map(p => ({
      relayDeviceId: p['relay_device_id'] as string,
      cbDeviceId: p['cb_device_id'] as string,
    })),
  };
}

/** Konwertuj odpowiedz walidacji na domenowy model. */
export function mapValidateConfigResponse(
  response: ValidateConfigApiResponse,
): SwitchgearConfigValidationResultV1 {
  return {
    valid: response.valid,
    issues: response.issues.map(i => ({
      code: i.code,
      severity: i.severity as ConfigIssueSeverity,
      messagePl: i.message_pl,
      elementId: i.element_id,
      fieldId: i.field_id,
      deviceId: i.device_id,
    })),
    fixActions: response.fix_actions.map(fa => ({
      code: fa.code,
      action: fa.action as FixActionType,
      messagePl: fa.message_pl,
      stationId: fa.station_id,
      fieldId: fa.field_id,
      deviceId: fa.device_id,
    })),
  };
}
