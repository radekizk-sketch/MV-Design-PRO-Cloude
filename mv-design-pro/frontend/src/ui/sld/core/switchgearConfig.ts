/**
 * SwitchgearConfigV1 — Konfiguracja rozdzielnicy (pola/aparaty/katalogi/ochrona).
 *
 * RUN #3I COMMIT 1: Kontrakt TS 1:1 z backendem (domain/switchgear_config.py).
 *
 * CANONICAL CONTRACT (BINDING):
 * - Immutable (readonly).
 * - Deterministic: sortowanie po id, kanoniczny hash (FNV-1a), permutation invariant.
 * - ZAKAZ auto-uzupelnien: brak danych -> FixAction (stabilny kod PL).
 * - ZAKAZ domyslnych parametrow urzadzen — brak = ValidationIssue + FixAction.
 * - PV/BESS zawsze przez transformator (SN/nN lub blokowy).
 * - catalogRef wymagany dla kazdego aparatu — brak -> CATALOG_REF_MISSING.
 *
 * ALIGNMENT:
 * - backend: domain/switchgear_config.py
 * - frontend: fieldDeviceContracts.ts (PoleTypeV1, AparatTypeV1, FieldRoleV1, DeviceTypeV1)
 */

import {
  type DeviceTypeV1,
  DeviceTypeV1 as DT,
  type FieldRoleV1,
  FieldRoleV1 as FR,
  type PoleTypeV1,
  type AparatTypeV1,
} from './fieldDeviceContracts';

// =============================================================================
// VERSION
// =============================================================================

export const SWITCHGEAR_CONFIG_VERSION = '1.0' as const;

// =============================================================================
// CONFIG ISSUE SEVERITY
// =============================================================================

export const ConfigIssueSeverity = {
  BLOCKER: 'BLOCKER',
  WARNING: 'WARNING',
} as const;

export type ConfigIssueSeverity =
  (typeof ConfigIssueSeverity)[keyof typeof ConfigIssueSeverity];

// =============================================================================
// VALIDATION ISSUE
// =============================================================================

export interface ConfigValidationIssueV1 {
  readonly code: string;
  readonly severity: ConfigIssueSeverity;
  readonly messagePl: string;
  readonly elementId: string | null;
  readonly fieldId: string | null;
  readonly deviceId: string | null;
}

// =============================================================================
// FIX ACTION TYPE
// =============================================================================

export const FixActionType = {
  NAVIGATE_TO_WIZARD_FIELD: 'NAVIGATE_TO_WIZARD_FIELD',
  NAVIGATE_TO_WIZARD_DEVICE: 'NAVIGATE_TO_WIZARD_DEVICE',
  NAVIGATE_TO_WIZARD_CATALOG_PICKER: 'NAVIGATE_TO_WIZARD_CATALOG_PICKER',
  NAVIGATE_TO_WIZARD_PROTECTION: 'NAVIGATE_TO_WIZARD_PROTECTION',
} as const;

export type FixActionType =
  (typeof FixActionType)[keyof typeof FixActionType];

// =============================================================================
// FIX ACTION
// =============================================================================

export interface ConfigFixActionV1 {
  readonly code: string;
  readonly action: FixActionType;
  readonly messagePl: string;
  readonly stationId: string;
  readonly fieldId: string | null;
  readonly deviceId: string | null;
}

// =============================================================================
// CATALOG BINDING V1
// =============================================================================

export interface CatalogBindingV1 {
  readonly deviceId: string;
  readonly catalogId: string;
  readonly catalogName: string;
  readonly manufacturer: string | null;
  readonly catalogVersion: string | null;
}

// =============================================================================
// PROTECTION BINDING V1
// =============================================================================

export interface ProtectionBindingV1 {
  readonly relayDeviceId: string;
  readonly cbDeviceId: string;
}

// =============================================================================
// DEVICE CONFIG V1
// =============================================================================

export interface DeviceConfigV1 {
  readonly deviceId: string;
  readonly fieldId: string;
  readonly deviceType: DeviceTypeV1;
  readonly aparatType: AparatTypeV1;
}

// =============================================================================
// FIELD CONFIG V1
// =============================================================================

export interface FieldConfigV1 {
  readonly fieldId: string;
  readonly poleType: PoleTypeV1;
  readonly fieldRole: FieldRoleV1;
  readonly busSectionId: string | null;
}

// =============================================================================
// SWITCHGEAR CONFIG V1
// =============================================================================

export interface SwitchgearConfigV1 {
  readonly configVersion: string;
  readonly stationId: string;
  readonly fields: readonly FieldConfigV1[];
  readonly devices: readonly DeviceConfigV1[];
  readonly catalogBindings: readonly CatalogBindingV1[];
  readonly protectionBindings: readonly ProtectionBindingV1[];
}

// =============================================================================
// VALIDATION RESULT
// =============================================================================

export interface SwitchgearConfigValidationResultV1 {
  readonly valid: boolean;
  readonly issues: readonly ConfigValidationIssueV1[];
  readonly fixActions: readonly ConfigFixActionV1[];
}

// =============================================================================
// VALIDATION CODES (stable PL — 1:1 with backend)
// =============================================================================

export const SwitchgearConfigValidationCode = {
  CATALOG_REF_MISSING: 'catalog.ref_missing',
  FIELD_MISSING_REQUIRED_DEVICE: 'field.missing_required_device',
  DEVICE_MISSING_REQUIRED_PARAMETER: 'device.missing_required_parameter',
  PROTECTION_BINDING_MISSING: 'protection.binding_missing',
  PV_BESS_TRANSFORMER_MISSING: 'pv_bess.transformer_missing',
  FIELD_DUPLICATE_ID: 'field.duplicate_id',
  DEVICE_DUPLICATE_ID: 'device.duplicate_id',
  DEVICE_ORPHAN: 'device.orphan_no_field',
  CATALOG_BINDING_ORPHAN: 'catalog_binding.orphan_no_device',
  PROTECTION_BINDING_ORPHAN: 'protection_binding.orphan_no_device',
} as const;

export type SwitchgearConfigValidationCode =
  (typeof SwitchgearConfigValidationCode)[keyof typeof SwitchgearConfigValidationCode];

// =============================================================================
// REQUIRED DEVICES per FieldRole (1:1 with backend)
// =============================================================================

export const REQUIRED_DEVICES: Record<FieldRoleV1, readonly DeviceTypeV1[]> = {
  [FR.LINE_IN]: [DT.CB, DT.CABLE_HEAD],
  [FR.LINE_OUT]: [DT.CB, DT.CABLE_HEAD],
  [FR.LINE_BRANCH]: [DT.CB, DT.CABLE_HEAD],
  [FR.TRANSFORMER_SN_NN]: [DT.CB, DT.CT, DT.RELAY, DT.TRANSFORMER_DEVICE, DT.CABLE_HEAD],
  [FR.PV_SN]: [DT.CB, DT.CT, DT.RELAY, DT.GENERATOR_PV, DT.CABLE_HEAD],
  [FR.BESS_SN]: [DT.CB, DT.CT, DT.RELAY, DT.GENERATOR_BESS, DT.CABLE_HEAD],
  [FR.COUPLER_SN]: [DT.CB],
  [FR.BUS_TIE]: [DT.CB],
  [FR.MAIN_NN]: [DT.ACB],
  [FR.FEEDER_NN]: [DT.FUSE],
  [FR.PV_NN]: [DT.ACB, DT.CT, DT.RELAY, DT.GENERATOR_PV],
  [FR.BESS_NN]: [DT.ACB, DT.CT, DT.RELAY, DT.GENERATOR_BESS],
};

// PV/BESS SN field roles that require transformer
export const PV_BESS_SN_ROLES: ReadonlySet<FieldRoleV1> = new Set([
  FR.PV_SN,
  FR.BESS_SN,
]);

// =============================================================================
// CANONICAL SERIALIZATION
// =============================================================================

/**
 * Kanonizuje konfiguracje — sortuje deterministycznie.
 *
 * Sortowanie:
 * - fields: po fieldId
 * - devices: po deviceId
 * - catalogBindings: po deviceId
 * - protectionBindings: po relayDeviceId, cbDeviceId
 */
export function canonicalizeConfig(config: SwitchgearConfigV1): SwitchgearConfigV1 {
  return {
    configVersion: config.configVersion,
    stationId: config.stationId,
    fields: [...config.fields].sort((a, b) => a.fieldId.localeCompare(b.fieldId)),
    devices: [...config.devices].sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
    catalogBindings: [...config.catalogBindings].sort((a, b) =>
      a.deviceId.localeCompare(b.deviceId),
    ),
    protectionBindings: [...config.protectionBindings].sort((a, b) => {
      const cmp = a.relayDeviceId.localeCompare(b.relayDeviceId);
      return cmp !== 0 ? cmp : a.cbDeviceId.localeCompare(b.cbDeviceId);
    }),
  };
}

/**
 * Serializuje konfiguracje do kanonicznego JSON (klucze posortowane).
 *
 * Format identyczny z backendem: sort_keys=True, separators=(",", ":").
 */
function configToCanonicalJson(config: SwitchgearConfigV1): string {
  const canonical = canonicalizeConfig(config);
  const data = {
    catalog_bindings: canonical.catalogBindings.map(b => ({
      catalog_id: b.catalogId,
      catalog_name: b.catalogName,
      catalog_version: b.catalogVersion,
      device_id: b.deviceId,
      manufacturer: b.manufacturer,
    })),
    config_version: canonical.configVersion,
    devices: canonical.devices.map(d => ({
      aparat_type: d.aparatType,
      device_id: d.deviceId,
      device_type: d.deviceType,
      field_id: d.fieldId,
    })),
    fields: canonical.fields.map(f => ({
      bus_section_id: f.busSectionId,
      field_id: f.fieldId,
      field_role: f.fieldRole,
      pole_type: f.poleType,
    })),
    protection_bindings: canonical.protectionBindings.map(p => ({
      cb_device_id: p.cbDeviceId,
      relay_device_id: p.relayDeviceId,
    })),
    station_id: canonical.stationId,
  };
  return JSON.stringify(data);
}

// =============================================================================
// HASHING (FNV-1a 32-bit — consistent with other SLD contracts)
// =============================================================================

/**
 * FNV-1a 32-bit hash — identyczny algorytm jak w visualGraph, geometryOverrides.
 */
function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Oblicza deterministyczny hash konfiguracji.
 *
 * Permutation invariant: kolejnosc pol/aparatow nie wplywa na hash.
 * Kanoniczny JSON z posortowanymi kluczami.
 */
export function computeConfigHash(config: SwitchgearConfigV1): string {
  const json = configToCanonicalJson(config);
  return fnv1a32(json);
}

// =============================================================================
// EMPTY CONFIG FACTORY
// =============================================================================

export function emptyConfig(stationId: string): SwitchgearConfigV1 {
  return {
    configVersion: SWITCHGEAR_CONFIG_VERSION,
    stationId,
    fields: [],
    devices: [],
    catalogBindings: [],
    protectionBindings: [],
  };
}
