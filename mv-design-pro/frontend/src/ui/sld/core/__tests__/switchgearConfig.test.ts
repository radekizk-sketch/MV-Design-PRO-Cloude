/**
 * Tests for SwitchgearConfigV1 — kontrakt TS konfiguracji rozdzielnicy.
 *
 * RUN #3I COMMIT 1:
 * - Deterministic hashing (SHA-256, permutation invariant).
 * - Canonical serialization (sorted keys, sorted items).
 * - Validation (stable PL codes, no heuristics).
 * - FE mirror matches BE codes.
 */

import { describe, it, expect } from 'vitest';

import {
  type SwitchgearConfigV1,
  type FieldConfigV1,
  type DeviceConfigV1,
  type CatalogBindingV1,
  type ProtectionBindingV1,
  SWITCHGEAR_CONFIG_VERSION,
  ConfigIssueSeverity,
  FixActionType,
  SwitchgearConfigValidationCode,
  canonicalizeConfig,
  computeConfigHash,
  emptyConfig,
} from '../switchgearConfig';

import { validateSwitchgearConfig } from '../validateSwitchgearConfig';

import {
  FieldRoleV1,
  PoleTypeV1,
  DeviceTypeV1,
  AparatTypeV1,
} from '../fieldDeviceContracts';

// =============================================================================
// HELPERS
// =============================================================================

function makeMinimalLineInConfig(): SwitchgearConfigV1 {
  return {
    configVersion: SWITCHGEAR_CONFIG_VERSION,
    stationId: 'station_1',
    fields: [
      {
        fieldId: 'field_1',
        poleType: PoleTypeV1.POLE_LINIOWE_SN,
        fieldRole: FieldRoleV1.LINE_IN,
        busSectionId: 'bus_1',
      },
    ],
    devices: [
      {
        deviceId: 'dev_cb_1',
        fieldId: 'field_1',
        deviceType: DeviceTypeV1.CB,
        aparatType: AparatTypeV1.WYLACZNIK,
      },
      {
        deviceId: 'dev_ch_1',
        fieldId: 'field_1',
        deviceType: DeviceTypeV1.CABLE_HEAD,
        aparatType: AparatTypeV1.GLOWICA_KABLOWA,
      },
    ],
    catalogBindings: [
      {
        deviceId: 'dev_cb_1',
        catalogId: 'cat_cb_001',
        catalogName: 'Wylacznik ABB 24kV',
        manufacturer: null,
        catalogVersion: null,
      },
      {
        deviceId: 'dev_ch_1',
        catalogId: 'cat_ch_001',
        catalogName: 'Glowica kablowa 24kV',
        manufacturer: null,
        catalogVersion: null,
      },
    ],
    protectionBindings: [],
  };
}

function makeTransformerConfig(): SwitchgearConfigV1 {
  return {
    configVersion: SWITCHGEAR_CONFIG_VERSION,
    stationId: 'station_2',
    fields: [
      {
        fieldId: 'field_tr',
        poleType: PoleTypeV1.POLE_TRANSFORMATOROWE_SN_NN,
        fieldRole: FieldRoleV1.TRANSFORMER_SN_NN,
        busSectionId: null,
      },
    ],
    devices: [
      { deviceId: 'dev_cb_tr', fieldId: 'field_tr', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
      { deviceId: 'dev_ct_tr', fieldId: 'field_tr', deviceType: DeviceTypeV1.CT, aparatType: AparatTypeV1.PRZEKLADNIK_PRADOWY },
      { deviceId: 'dev_relay_tr', fieldId: 'field_tr', deviceType: DeviceTypeV1.RELAY, aparatType: AparatTypeV1.ZABEZPIECZENIE },
      { deviceId: 'dev_tr', fieldId: 'field_tr', deviceType: DeviceTypeV1.TRANSFORMER_DEVICE, aparatType: AparatTypeV1.TRANSFORMATOR },
      { deviceId: 'dev_ch_tr', fieldId: 'field_tr', deviceType: DeviceTypeV1.CABLE_HEAD, aparatType: AparatTypeV1.GLOWICA_KABLOWA },
    ],
    catalogBindings: [
      { deviceId: 'dev_cb_tr', catalogId: 'c1', catalogName: 'CB', manufacturer: null, catalogVersion: null },
      { deviceId: 'dev_ct_tr', catalogId: 'c2', catalogName: 'CT', manufacturer: null, catalogVersion: null },
      { deviceId: 'dev_relay_tr', catalogId: 'c3', catalogName: 'Relay', manufacturer: null, catalogVersion: null },
      { deviceId: 'dev_tr', catalogId: 'c4', catalogName: 'TR', manufacturer: null, catalogVersion: null },
      { deviceId: 'dev_ch_tr', catalogId: 'c5', catalogName: 'CH', manufacturer: null, catalogVersion: null },
    ],
    protectionBindings: [
      { relayDeviceId: 'dev_relay_tr', cbDeviceId: 'dev_cb_tr' },
    ],
  };
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// =============================================================================
// VERSION
// =============================================================================

describe('SwitchgearConfig version', () => {
  it('SWITCHGEAR_CONFIG_VERSION is 1.0', () => {
    expect(SWITCHGEAR_CONFIG_VERSION).toBe('1.0');
  });

  it('emptyConfig uses correct version', () => {
    const config = emptyConfig('s1');
    expect(config.configVersion).toBe(SWITCHGEAR_CONFIG_VERSION);
    expect(config.stationId).toBe('s1');
    expect(config.fields).toHaveLength(0);
    expect(config.devices).toHaveLength(0);
  });
});

// =============================================================================
// CANONICALIZATION
// =============================================================================

describe('canonicalizeConfig', () => {
  it('sorts fields by fieldId', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'z_field', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_IN, busSectionId: null },
        { fieldId: 'a_field', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_OUT, busSectionId: null },
      ],
    };
    const canonical = canonicalizeConfig(config);
    expect(canonical.fields[0].fieldId).toBe('a_field');
    expect(canonical.fields[1].fieldId).toBe('z_field');
  });

  it('sorts devices by deviceId', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      devices: [
        { deviceId: 'z_dev', fieldId: 'f1', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
        { deviceId: 'a_dev', fieldId: 'f1', deviceType: DeviceTypeV1.CT, aparatType: AparatTypeV1.PRZEKLADNIK_PRADOWY },
      ],
    };
    const canonical = canonicalizeConfig(config);
    expect(canonical.devices[0].deviceId).toBe('a_dev');
    expect(canonical.devices[1].deviceId).toBe('z_dev');
  });

  it('sorts catalogBindings by deviceId', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      catalogBindings: [
        { deviceId: 'z_dev', catalogId: 'c1', catalogName: 'Z', manufacturer: null, catalogVersion: null },
        { deviceId: 'a_dev', catalogId: 'c2', catalogName: 'A', manufacturer: null, catalogVersion: null },
      ],
    };
    const canonical = canonicalizeConfig(config);
    expect(canonical.catalogBindings[0].deviceId).toBe('a_dev');
    expect(canonical.catalogBindings[1].deviceId).toBe('z_dev');
  });

  it('sorts protectionBindings by relayDeviceId then cbDeviceId', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      protectionBindings: [
        { relayDeviceId: 'r_z', cbDeviceId: 'cb_1' },
        { relayDeviceId: 'r_a', cbDeviceId: 'cb_2' },
      ],
    };
    const canonical = canonicalizeConfig(config);
    expect(canonical.protectionBindings[0].relayDeviceId).toBe('r_a');
    expect(canonical.protectionBindings[1].relayDeviceId).toBe('r_z');
  });
});

// =============================================================================
// DETERMINISTIC HASHING
// =============================================================================

describe('computeConfigHash', () => {
  it('returns 64-char hex string (SHA-256)', () => {
    const config = makeMinimalLineInConfig();
    const hash = computeConfigHash(config);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same config produces same hash 100x', () => {
    const config = makeTransformerConfig();
    const reference = computeConfigHash(config);
    for (let i = 0; i < 100; i++) {
      expect(computeConfigHash(config)).toBe(reference);
    }
  });

  it('permutation invariance: fields in different order = same hash (50x)', () => {
    for (let iter = 0; iter < 50; iter++) {
      const fields: FieldConfigV1[] = Array.from({ length: 5 }, (_, i) => ({
        fieldId: `f_${i}`,
        poleType: PoleTypeV1.POLE_LINIOWE_SN,
        fieldRole: FieldRoleV1.LINE_IN,
        busSectionId: null,
      }));

      const configA: SwitchgearConfigV1 = { ...emptyConfig('s1'), fields: shuffleArray(fields) };
      const configB: SwitchgearConfigV1 = { ...emptyConfig('s1'), fields: [...fields].reverse() };

      expect(computeConfigHash(configA)).toBe(computeConfigHash(configB));
    }
  });

  it('permutation invariance: devices in different order = same hash (50x)', () => {
    for (let iter = 0; iter < 50; iter++) {
      const devices: DeviceConfigV1[] = Array.from({ length: 5 }, (_, i) => ({
        deviceId: `d_${i}`,
        fieldId: 'f_0',
        deviceType: DeviceTypeV1.CB,
        aparatType: AparatTypeV1.WYLACZNIK,
      }));

      const configA: SwitchgearConfigV1 = { ...emptyConfig('s1'), devices: shuffleArray(devices) };
      const configB: SwitchgearConfigV1 = { ...emptyConfig('s1'), devices: [...devices].reverse() };

      expect(computeConfigHash(configA)).toBe(computeConfigHash(configB));
    }
  });

  it('permutation invariance: catalog bindings in different order = same hash (50x)', () => {
    for (let iter = 0; iter < 50; iter++) {
      const bindings: CatalogBindingV1[] = Array.from({ length: 5 }, (_, i) => ({
        deviceId: `d_${i}`,
        catalogId: `c_${i}`,
        catalogName: `name_${i}`,
        manufacturer: null,
        catalogVersion: null,
      }));

      const configA: SwitchgearConfigV1 = { ...emptyConfig('s1'), catalogBindings: shuffleArray(bindings) };
      const configB: SwitchgearConfigV1 = { ...emptyConfig('s1'), catalogBindings: [...bindings].reverse() };

      expect(computeConfigHash(configA)).toBe(computeConfigHash(configB));
    }
  });

  it('different configs produce different hashes', () => {
    const hashA = computeConfigHash(makeMinimalLineInConfig());
    const hashB = computeConfigHash(makeTransformerConfig());
    expect(hashA).not.toBe(hashB);
  });
});

// =============================================================================
// VALIDATION
// =============================================================================

describe('validateSwitchgearConfig', () => {
  it('valid minimal LINE_IN config', () => {
    const result = validateSwitchgearConfig(makeMinimalLineInConfig());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('valid transformer config with relay', () => {
    const result = validateSwitchgearConfig(makeTransformerConfig());
    expect(result.valid).toBe(true);
    const blockers = result.issues.filter(i => i.severity === ConfigIssueSeverity.BLOCKER);
    expect(blockers).toHaveLength(0);
  });

  it('empty config is valid', () => {
    const result = validateSwitchgearConfig(emptyConfig('s1'));
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('CATALOG_REF_MISSING: device without catalog binding', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'f1', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_IN, busSectionId: null },
      ],
      devices: [
        { deviceId: 'dev_cb', fieldId: 'f1', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
        { deviceId: 'dev_ch', fieldId: 'f1', deviceType: DeviceTypeV1.CABLE_HEAD, aparatType: AparatTypeV1.GLOWICA_KABLOWA },
      ],
      catalogBindings: [], // No bindings!
    };

    const result = validateSwitchgearConfig(config);
    expect(result.valid).toBe(false);

    const catalogIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.CATALOG_REF_MISSING,
    );
    expect(catalogIssues).toHaveLength(2);

    const catalogFixes = result.fixActions.filter(
      fa => fa.code === SwitchgearConfigValidationCode.CATALOG_REF_MISSING,
    );
    expect(catalogFixes).toHaveLength(2);
    expect(catalogFixes.every(fa => fa.action === FixActionType.NAVIGATE_TO_WIZARD_CATALOG_PICKER)).toBe(true);
  });

  it('FIELD_MISSING_REQUIRED_DEVICE: LINE_IN without CB', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'f1', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_IN, busSectionId: null },
      ],
      devices: [], // No devices!
    };

    const result = validateSwitchgearConfig(config);
    expect(result.valid).toBe(false);

    const missingIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.FIELD_MISSING_REQUIRED_DEVICE,
    );
    // LINE_IN requires CB + CABLE_HEAD
    expect(missingIssues).toHaveLength(2);
  });

  it('PROTECTION_BINDING_MISSING: relay without binding', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'f1', poleType: PoleTypeV1.POLE_TRANSFORMATOROWE_SN_NN, fieldRole: FieldRoleV1.TRANSFORMER_SN_NN, busSectionId: null },
      ],
      devices: [
        { deviceId: 'dev_cb', fieldId: 'f1', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
        { deviceId: 'dev_ct', fieldId: 'f1', deviceType: DeviceTypeV1.CT, aparatType: AparatTypeV1.PRZEKLADNIK_PRADOWY },
        { deviceId: 'dev_relay', fieldId: 'f1', deviceType: DeviceTypeV1.RELAY, aparatType: AparatTypeV1.ZABEZPIECZENIE },
        { deviceId: 'dev_tr', fieldId: 'f1', deviceType: DeviceTypeV1.TRANSFORMER_DEVICE, aparatType: AparatTypeV1.TRANSFORMATOR },
        { deviceId: 'dev_ch', fieldId: 'f1', deviceType: DeviceTypeV1.CABLE_HEAD, aparatType: AparatTypeV1.GLOWICA_KABLOWA },
      ],
      catalogBindings: [
        { deviceId: 'dev_cb', catalogId: 'c1', catalogName: 'CB', manufacturer: null, catalogVersion: null },
        { deviceId: 'dev_ct', catalogId: 'c2', catalogName: 'CT', manufacturer: null, catalogVersion: null },
        { deviceId: 'dev_relay', catalogId: 'c3', catalogName: 'Relay', manufacturer: null, catalogVersion: null },
        { deviceId: 'dev_tr', catalogId: 'c4', catalogName: 'TR', manufacturer: null, catalogVersion: null },
        { deviceId: 'dev_ch', catalogId: 'c5', catalogName: 'CH', manufacturer: null, catalogVersion: null },
      ],
      protectionBindings: [], // No bindings!
    };

    const result = validateSwitchgearConfig(config);
    expect(result.valid).toBe(false);

    const protIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.PROTECTION_BINDING_MISSING,
    );
    expect(protIssues).toHaveLength(1);
    expect(protIssues[0].deviceId).toBe('dev_relay');
  });

  it('PV_BESS_TRANSFORMER_MISSING: PV_SN without transformer (BLOCKER)', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'f_pv', poleType: PoleTypeV1.POLE_ZRODLA_PV_SN, fieldRole: FieldRoleV1.PV_SN, busSectionId: null },
      ],
      devices: [
        { deviceId: 'dev_cb', fieldId: 'f_pv', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
        { deviceId: 'dev_ct', fieldId: 'f_pv', deviceType: DeviceTypeV1.CT, aparatType: AparatTypeV1.PRZEKLADNIK_PRADOWY },
        { deviceId: 'dev_relay', fieldId: 'f_pv', deviceType: DeviceTypeV1.RELAY, aparatType: AparatTypeV1.ZABEZPIECZENIE },
        { deviceId: 'dev_pv', fieldId: 'f_pv', deviceType: DeviceTypeV1.GENERATOR_PV, aparatType: AparatTypeV1.GENERATOR_PV },
        { deviceId: 'dev_ch', fieldId: 'f_pv', deviceType: DeviceTypeV1.CABLE_HEAD, aparatType: AparatTypeV1.GLOWICA_KABLOWA },
      ],
      catalogBindings: ['dev_cb', 'dev_ct', 'dev_relay', 'dev_pv', 'dev_ch'].map(id => ({
        deviceId: id, catalogId: `c_${id}`, catalogName: `Cat ${id}`, manufacturer: null, catalogVersion: null,
      })),
      protectionBindings: [
        { relayDeviceId: 'dev_relay', cbDeviceId: 'dev_cb' },
      ],
    };

    const result = validateSwitchgearConfig(config);
    // Should be invalid (BLOCKER — PV/BESS always requires transformer)
    expect(result.valid).toBe(false);

    const pvIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.PV_BESS_TRANSFORMER_MISSING,
    );
    expect(pvIssues).toHaveLength(1);
    expect(pvIssues[0].severity).toBe(ConfigIssueSeverity.BLOCKER);

    // FixAction present
    const pvFixes = result.fixActions.filter(
      fa => fa.code === SwitchgearConfigValidationCode.PV_BESS_TRANSFORMER_MISSING,
    );
    expect(pvFixes).toHaveLength(1);
    expect(pvFixes[0].action).toBe(FixActionType.NAVIGATE_TO_WIZARD_FIELD);
  });

  it('DEVICE_ORPHAN: device referencing non-existent field', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [],
      devices: [
        { deviceId: 'dev_cb', fieldId: 'nonexistent', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
      ],
    };

    const result = validateSwitchgearConfig(config);
    expect(result.valid).toBe(false);

    const orphanIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.DEVICE_ORPHAN,
    );
    expect(orphanIssues).toHaveLength(1);
  });

  it('FIELD_DUPLICATE_ID: duplicate field IDs', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'dup', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_IN, busSectionId: null },
        { fieldId: 'dup', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_OUT, busSectionId: null },
      ],
    };

    const result = validateSwitchgearConfig(config);
    expect(result.valid).toBe(false);

    const dupIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.FIELD_DUPLICATE_ID,
    );
    expect(dupIssues).toHaveLength(1);
  });

  it('DEVICE_DUPLICATE_ID: duplicate device IDs', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'f1', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_IN, busSectionId: null },
      ],
      devices: [
        { deviceId: 'dup', fieldId: 'f1', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
        { deviceId: 'dup', fieldId: 'f1', deviceType: DeviceTypeV1.CT, aparatType: AparatTypeV1.PRZEKLADNIK_PRADOWY },
      ],
    };

    const result = validateSwitchgearConfig(config);
    expect(result.valid).toBe(false);

    const dupIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.DEVICE_DUPLICATE_ID,
    );
    expect(dupIssues).toHaveLength(1);
  });

  it('orphan catalog binding (WARNING)', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      catalogBindings: [
        { deviceId: 'nonexistent', catalogId: 'c1', catalogName: 'test', manufacturer: null, catalogVersion: null },
      ],
    };

    const result = validateSwitchgearConfig(config);
    const orphanIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.CATALOG_BINDING_ORPHAN,
    );
    expect(orphanIssues).toHaveLength(1);
    expect(orphanIssues[0].severity).toBe(ConfigIssueSeverity.WARNING);
  });

  it('orphan protection binding (WARNING)', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      protectionBindings: [
        { relayDeviceId: 'nonexistent_r', cbDeviceId: 'nonexistent_cb' },
      ],
    };

    const result = validateSwitchgearConfig(config);
    const orphanIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.PROTECTION_BINDING_ORPHAN,
    );
    expect(orphanIssues).toHaveLength(2);
  });

  it('issues sorted deterministically', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('s1'),
      fields: [
        { fieldId: 'f1', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_IN, busSectionId: null },
      ],
      devices: [
        { deviceId: 'dev_b', fieldId: 'f1', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
        { deviceId: 'dev_a', fieldId: 'f1', deviceType: DeviceTypeV1.CABLE_HEAD, aparatType: AparatTypeV1.GLOWICA_KABLOWA },
      ],
    };

    const result = validateSwitchgearConfig(config);
    const catalogIssues = result.issues.filter(
      i => i.code === SwitchgearConfigValidationCode.CATALOG_REF_MISSING,
    );
    expect(catalogIssues.length).toBeGreaterThanOrEqual(2);

    const elementIds = catalogIssues.map(i => i.elementId);
    const sorted = [...elementIds].sort();
    expect(elementIds).toEqual(sorted);
  });

  it('fixActions have stationId from config', () => {
    const config: SwitchgearConfigV1 = {
      ...emptyConfig('station_xyz'),
      fields: [
        { fieldId: 'f1', poleType: PoleTypeV1.POLE_LINIOWE_SN, fieldRole: FieldRoleV1.LINE_IN, busSectionId: null },
      ],
      devices: [
        { deviceId: 'dev_1', fieldId: 'f1', deviceType: DeviceTypeV1.CB, aparatType: AparatTypeV1.WYLACZNIK },
      ],
    };

    const result = validateSwitchgearConfig(config);
    for (const fa of result.fixActions) {
      expect(fa.stationId).toBe('station_xyz');
    }
  });
});

// =============================================================================
// VALIDATION CODE STABILITY
// =============================================================================

describe('SwitchgearConfigValidationCode stability', () => {
  it('codes match backend values exactly', () => {
    expect(SwitchgearConfigValidationCode.CATALOG_REF_MISSING).toBe('catalog.ref_missing');
    expect(SwitchgearConfigValidationCode.FIELD_MISSING_REQUIRED_DEVICE).toBe('field.missing_required_device');
    expect(SwitchgearConfigValidationCode.DEVICE_MISSING_REQUIRED_PARAMETER).toBe('device.missing_required_parameter');
    expect(SwitchgearConfigValidationCode.PROTECTION_BINDING_MISSING).toBe('protection.binding_missing');
    expect(SwitchgearConfigValidationCode.PV_BESS_TRANSFORMER_MISSING).toBe('pv_bess.transformer_missing');
    expect(SwitchgearConfigValidationCode.FIELD_DUPLICATE_ID).toBe('field.duplicate_id');
    expect(SwitchgearConfigValidationCode.DEVICE_DUPLICATE_ID).toBe('device.duplicate_id');
    expect(SwitchgearConfigValidationCode.DEVICE_ORPHAN).toBe('device.orphan_no_field');
    expect(SwitchgearConfigValidationCode.CATALOG_BINDING_ORPHAN).toBe('catalog_binding.orphan_no_device');
    expect(SwitchgearConfigValidationCode.PROTECTION_BINDING_ORPHAN).toBe('protection_binding.orphan_no_device');
  });
});

// =============================================================================
// FIX ACTION TYPE STABILITY
// =============================================================================

describe('FixActionType stability', () => {
  it('types match backend values', () => {
    expect(FixActionType.NAVIGATE_TO_WIZARD_FIELD).toBe('NAVIGATE_TO_WIZARD_FIELD');
    expect(FixActionType.NAVIGATE_TO_WIZARD_DEVICE).toBe('NAVIGATE_TO_WIZARD_DEVICE');
    expect(FixActionType.NAVIGATE_TO_WIZARD_CATALOG_PICKER).toBe('NAVIGATE_TO_WIZARD_CATALOG_PICKER');
    expect(FixActionType.NAVIGATE_TO_WIZARD_PROTECTION).toBe('NAVIGATE_TO_WIZARD_PROTECTION');
  });
});
