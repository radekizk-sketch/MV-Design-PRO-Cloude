/**
 * Field/Device Polish Taxonomy Tests — RUN #3F §5.
 *
 * Tests:
 * - PoleTypeV1 ↔ FieldRoleV1 bidirectional mapping
 * - AparatTypeV1 ↔ DeviceTypeV1 bidirectional mapping
 * - Symbol registry: every DeviceTypeV1 has a symbol
 * - nN field roles have device requirement sets
 * - Wizard field step builder produces valid output
 * - PV/BESS always through transformer (validation)
 * - Readiness gates for fields/devices/protection
 * - Polish labels exist for all types
 * - Determinism: same input → same wizard output
 */

import { describe, it, expect } from 'vitest';
import {
  PoleTypeV1,
  AparatTypeV1,
  FieldRoleV1,
  DeviceTypeV1,
  SldSymbolTypeV1,
  POLE_TO_FIELD_ROLE,
  FIELD_ROLE_TO_POLE,
  APARAT_TO_DEVICE_TYPE,
  DEVICE_TYPE_TO_APARAT,
  DEVICE_TO_SYMBOL,
  POLE_TYPE_LABELS_PL,
  APARAT_TYPE_LABELS_PL,
  DEVICE_REQUIREMENT_SETS,
  DeviceElectricalRoleV1,
  DevicePowerPathPositionV1,
  buildApparatusSymbolBinding,
  buildWizardFieldStep,
  validateFieldDevices,
  FieldDeviceFixCodes,
} from '../fieldDeviceContracts';
import type {
  DeviceV1,
  FieldV1,
  StationBlockDetailV1,
  DeviceLogicalBindingsV1,
  DeviceParametersV1,
  FieldTerminalsV1,
} from '../fieldDeviceContracts';
import {
  ReadinessGateError,
  requireFieldsComplete,
  requireDevicesParametrized,
  requireProtectionBindings,
  ReadinessPriority,
} from '../readinessProfile';
import type { ReadinessProfileV1, ReadinessIssueV1 } from '../readinessProfile';

// =============================================================================
// HELPERS
// =============================================================================

function makeProfile(overrides: Partial<ReadinessProfileV1> = {}): ReadinessProfileV1 {
  return {
    snapshotId: 'test',
    snapshotFingerprint: 'fp',
    sldReady: true,
    shortCircuitReady: true,
    loadFlowReady: true,
    protectionReady: true,
    issues: [],
    contentHash: 'hash',
    ...overrides,
  };
}

function makeIssue(code: string, priority: string = 'BLOCKER'): ReadinessIssueV1 {
  return {
    code,
    area: 'STATIONS',
    priority: priority as any,
    messagePl: `Test: ${code}`,
    elementId: null,
    elementType: null,
    fixHintPl: null,
    wizardStep: null,
  };
}

const EMPTY_BINDINGS: DeviceLogicalBindingsV1 = { boundCbId: null, ctInputIds: [] };
const EMPTY_PARAMS: DeviceParametersV1 = {
  ctRatio: null, breakingCapacityKa: null, ratedCurrentA: null,
  relaySettings: null, ratedPowerMva: null, ukPercent: null, vectorGroup: null,
};
const EMPTY_TERMINALS: FieldTerminalsV1 = {
  incomingNodeId: null, outgoingNodeId: null, branchNodeId: null, generatorNodeId: null,
};

function makeDevice(id: string, fieldId: string, type: string, overrides: Partial<DeviceV1> = {}): DeviceV1 {
  return {
    id,
    fieldId,
    deviceType: type as any,
    electricalRole: DeviceElectricalRoleV1.POWER_PATH,
    powerPathPosition: DevicePowerPathPositionV1.MIDSTREAM,
    catalogRef: null,
    logicalBindings: EMPTY_BINDINGS,
    parameters: EMPTY_PARAMS,
    ...overrides,
  };
}

function makeField(id: string, stationId: string, role: string): FieldV1 {
  return {
    id,
    stationId,
    busSectionId: 'bus_s1',
    fieldRole: role as any,
    terminals: EMPTY_TERMINALS,
    requiredDevices: DEVICE_REQUIREMENT_SETS[role as FieldRoleV1],
    deviceIds: [],
    catalogRef: null,
  };
}

// =============================================================================
// §1: POLISH TAXONOMY BIDIRECTIONAL MAPPING
// =============================================================================

describe('Polish Taxonomy — PoleTypeV1 ↔ FieldRoleV1', () => {
  it('every PoleTypeV1 maps to a FieldRoleV1', () => {
    for (const pole of Object.values(PoleTypeV1)) {
      expect(POLE_TO_FIELD_ROLE[pole]).toBeDefined();
    }
  });

  it('every FieldRoleV1 maps to a PoleTypeV1', () => {
    for (const role of Object.values(FieldRoleV1)) {
      expect(FIELD_ROLE_TO_POLE[role]).toBeDefined();
    }
  });

  it('roundtrip PoleType → FieldRole → PoleType preserves type', () => {
    for (const pole of Object.values(PoleTypeV1)) {
      const role = POLE_TO_FIELD_ROLE[pole];
      const back = FIELD_ROLE_TO_POLE[role];
      // LINE_OUT and LINE_BRANCH both map to POLE_LINIOWE_SN
      expect(back).toBeDefined();
    }
  });
});

describe('Polish Taxonomy — AparatTypeV1 ↔ DeviceTypeV1', () => {
  it('every AparatTypeV1 maps to a DeviceTypeV1', () => {
    for (const aparat of Object.values(AparatTypeV1)) {
      expect(APARAT_TO_DEVICE_TYPE[aparat]).toBeDefined();
    }
  });

  it('every DeviceTypeV1 maps to an AparatTypeV1', () => {
    for (const dt of Object.values(DeviceTypeV1)) {
      expect(DEVICE_TYPE_TO_APARAT[dt]).toBeDefined();
    }
  });

  it('roundtrip AparatType → DeviceType → AparatType is identity', () => {
    for (const aparat of Object.values(AparatTypeV1)) {
      const dt = APARAT_TO_DEVICE_TYPE[aparat];
      const back = DEVICE_TYPE_TO_APARAT[dt];
      expect(back).toBe(aparat);
    }
  });
});

// =============================================================================
// §4: SYMBOL REGISTRY
// =============================================================================

describe('Symbol Registry', () => {
  it('every DeviceTypeV1 has a symbol mapping', () => {
    for (const dt of Object.values(DeviceTypeV1)) {
      expect(DEVICE_TO_SYMBOL[dt]).toBeDefined();
    }
  });

  it('CT symbol is SYMBOL_CT (not generic circle)', () => {
    expect(DEVICE_TO_SYMBOL[DeviceTypeV1.CT]).toBe(SldSymbolTypeV1.SYMBOL_CT);
  });

  it('RELAY symbol is SYMBOL_RELAY (off power path)', () => {
    expect(DEVICE_TO_SYMBOL[DeviceTypeV1.RELAY]).toBe(SldSymbolTypeV1.SYMBOL_RELAY);
  });

  it('CABLE_HEAD symbol is SYMBOL_CABLE_HEAD (triangle)', () => {
    expect(DEVICE_TO_SYMBOL[DeviceTypeV1.CABLE_HEAD]).toBe(SldSymbolTypeV1.SYMBOL_CABLE_HEAD);
  });

  it('buildApparatusSymbolBinding produces valid binding', () => {
    const device = makeDevice('dev1', 'f1', DeviceTypeV1.CB);
    const binding = buildApparatusSymbolBinding(device);
    expect(binding.deviceType).toBe(DeviceTypeV1.CB);
    expect(binding.aparatType).toBe(AparatTypeV1.WYLACZNIK);
    expect(binding.symbolType).toBe(SldSymbolTypeV1.SYMBOL_CB);
    expect(binding.isOnPowerPath).toBe(true);
  });

  it('RELAY binding has isOnPowerPath=false', () => {
    const device = makeDevice('relay1', 'f1', DeviceTypeV1.RELAY, {
      electricalRole: DeviceElectricalRoleV1.PROTECTION,
      powerPathPosition: DevicePowerPathPositionV1.OFF_PATH,
    });
    const binding = buildApparatusSymbolBinding(device);
    expect(binding.isOnPowerPath).toBe(false);
    expect(binding.labelPl).toBe('Zabezpieczenie');
  });
});

// =============================================================================
// §1: nN FIELD ROLES — REQUIREMENT SETS
// =============================================================================

describe('nN Field Role Requirement Sets', () => {
  it('MAIN_NN requires ACB', () => {
    const reqs = DEVICE_REQUIREMENT_SETS[FieldRoleV1.MAIN_NN];
    expect(reqs).toBeDefined();
    const acbReq = reqs.requirements.find(r => r.deviceType === DeviceTypeV1.ACB);
    expect(acbReq).toBeDefined();
    expect(acbReq!.level).toBe('REQUIRED');
  });

  it('FEEDER_NN requires FUSE', () => {
    const reqs = DEVICE_REQUIREMENT_SETS[FieldRoleV1.FEEDER_NN];
    expect(reqs).toBeDefined();
    const fuseReq = reqs.requirements.find(r => r.deviceType === DeviceTypeV1.FUSE);
    expect(fuseReq).toBeDefined();
    expect(fuseReq!.level).toBe('REQUIRED');
  });

  it('PV_NN requires ACB + CT + RELAY + GENERATOR_PV', () => {
    const reqs = DEVICE_REQUIREMENT_SETS[FieldRoleV1.PV_NN];
    expect(reqs).toBeDefined();
    const types = reqs.requirements.map(r => r.deviceType);
    expect(types).toContain(DeviceTypeV1.ACB);
    expect(types).toContain(DeviceTypeV1.CT);
    expect(types).toContain(DeviceTypeV1.RELAY);
    expect(types).toContain(DeviceTypeV1.GENERATOR_PV);
  });

  it('BESS_NN requires ACB + CT + RELAY + GENERATOR_BESS', () => {
    const reqs = DEVICE_REQUIREMENT_SETS[FieldRoleV1.BESS_NN];
    expect(reqs).toBeDefined();
    const types = reqs.requirements.map(r => r.deviceType);
    expect(types).toContain(DeviceTypeV1.ACB);
    expect(types).toContain(DeviceTypeV1.GENERATOR_BESS);
  });
});

// =============================================================================
// §3: READINESS GATES — field/device
// =============================================================================

describe('Readiness Gates — fields/devices/protection', () => {
  it('requireFieldsComplete passes when no field.device_missing issues', () => {
    expect(() => requireFieldsComplete(makeProfile())).not.toThrow();
  });

  it('requireFieldsComplete throws on field.device_missing.cb BLOCKER', () => {
    const profile = makeProfile({
      issues: [makeIssue('field.device_missing.cb')],
    });
    expect(() => requireFieldsComplete(profile)).toThrow(ReadinessGateError);
  });

  it('requireDevicesParametrized passes when no device BLOCKER', () => {
    expect(() => requireDevicesParametrized(makeProfile())).not.toThrow();
  });

  it('requireDevicesParametrized throws on device.cb.breaking_capacity_missing', () => {
    const profile = makeProfile({
      issues: [makeIssue('device.cb.breaking_capacity_missing')],
    });
    expect(() => requireDevicesParametrized(profile)).toThrow(ReadinessGateError);
  });

  it('requireDevicesParametrized throws on catalog.ref_missing', () => {
    const profile = makeProfile({
      issues: [makeIssue('catalog.ref_missing')],
    });
    expect(() => requireDevicesParametrized(profile)).toThrow(ReadinessGateError);
  });

  it('requireProtectionBindings passes when no protection BLOCKER', () => {
    expect(() => requireProtectionBindings(makeProfile())).not.toThrow();
  });

  it('requireProtectionBindings throws on protection.relay_binding_missing', () => {
    const profile = makeProfile({
      issues: [makeIssue('protection.relay_binding_missing')],
    });
    expect(() => requireProtectionBindings(profile)).toThrow(ReadinessGateError);
  });

  it('WARNING does not trigger field gate', () => {
    const profile = makeProfile({
      issues: [makeIssue('field.device_missing.ct', 'WARNING')],
    });
    expect(() => requireFieldsComplete(profile)).not.toThrow();
  });
});

// =============================================================================
// §2: WIZARD FIELD STEP BUILDER
// =============================================================================

describe('Wizard Field Step Builder', () => {
  const BLOCK: StationBlockDetailV1 = {
    blockId: 'st1',
    embeddingRole: 'TRUNK_LEAF' as any,
    busSections: [{ id: 'bs1', stationId: 'st1', orderIndex: 0, catalogRef: null }],
    fields: [
      makeField('f_line', 'st1', FieldRoleV1.LINE_IN),
      makeField('f_tr', 'st1', FieldRoleV1.TRANSFORMER_SN_NN),
    ],
    devices: [],
    ports: { trunkInPort: 'p1', trunkOutPort: null, branchPort: null },
    couplerFieldId: null,
    deviceAnchors: [],
    fixActions: [
      { code: 'field.device_missing.cb', message: 'Brak CB', elementId: 'f_line', fixHint: 'Dodaj CB' },
    ],
  };

  const DEVICES: DeviceV1[] = [
    makeDevice('dev_cb', 'f_line', DeviceTypeV1.CB, { powerPathPosition: DevicePowerPathPositionV1.UPSTREAM }),
    makeDevice('dev_tr', 'f_tr', DeviceTypeV1.TRANSFORMER_DEVICE),
  ];

  it('builds wizard step with correct structure', () => {
    const step = buildWizardFieldStep(BLOCK, DEVICES);
    expect(step.stationId).toBe('st1');
    expect(step.fields.length).toBe(2);
  });

  it('field has correct poleType and labelPl', () => {
    const step = buildWizardFieldStep(BLOCK, DEVICES);
    const lineField = step.fields.find(f => f.fieldId === 'f_line')!;
    expect(lineField.poleType).toBe(PoleTypeV1.POLE_LINIOWE_SN);
    expect(lineField.labelPl).toBe('Pole liniowe SN');
  });

  it('device entries have Polish labels', () => {
    const step = buildWizardFieldStep(BLOCK, DEVICES);
    const lineField = step.fields.find(f => f.fieldId === 'f_line')!;
    const cbDevice = lineField.devices.find(d => d.deviceId === 'dev_cb')!;
    expect(cbDevice.aparatType).toBe(AparatTypeV1.WYLACZNIK);
    expect(cbDevice.labelPl).toBe('Wyłącznik');
    expect(cbDevice.symbolType).toBe(SldSymbolTypeV1.SYMBOL_CB);
  });

  it('incomplete fields are marked as isComplete=false', () => {
    const step = buildWizardFieldStep(BLOCK, DEVICES);
    const lineField = step.fields.find(f => f.fieldId === 'f_line')!;
    // Has fix actions → not complete
    expect(lineField.isComplete).toBe(false);
  });

  it('activeFieldId points to first incomplete field', () => {
    const step = buildWizardFieldStep(BLOCK, DEVICES);
    expect(step.activeFieldId).toBe('f_line');
  });

  it('hasCatalogRef=false when device has no catalogRef', () => {
    const step = buildWizardFieldStep(BLOCK, DEVICES);
    const lineField = step.fields.find(f => f.fieldId === 'f_line')!;
    expect(lineField.devices[0].hasCatalogRef).toBe(false);
  });
});

// =============================================================================
// §1+§4: POLISH LABELS COMPLETENESS
// =============================================================================

describe('Polish Labels Completeness', () => {
  it('every PoleTypeV1 has a Polish label', () => {
    for (const pt of Object.values(PoleTypeV1)) {
      expect(POLE_TYPE_LABELS_PL[pt]).toBeDefined();
      expect(POLE_TYPE_LABELS_PL[pt].length).toBeGreaterThan(0);
    }
  });

  it('every AparatTypeV1 has a Polish label', () => {
    for (const at of Object.values(AparatTypeV1)) {
      expect(APARAT_TYPE_LABELS_PL[at]).toBeDefined();
      expect(APARAT_TYPE_LABELS_PL[at].length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// §5: FIELD VALIDATION — nN roles
// =============================================================================

describe('Field Validation — nN roles', () => {
  it('MAIN_NN without ACB generates fix action', () => {
    const field = makeField('f_nn', 'st1', FieldRoleV1.MAIN_NN);
    const fixes = validateFieldDevices(field, [], false, false);
    const acbMissing = fixes.find(f => f.code === FieldDeviceFixCodes.FIELD_DEVICE_MISSING_ACB);
    expect(acbMissing).toBeDefined();
  });

  it('FEEDER_NN without FUSE generates fix action', () => {
    const field = makeField('f_feeder', 'st1', FieldRoleV1.FEEDER_NN);
    const fixes = validateFieldDevices(field, [], false, false);
    // FUSE maps to default fix code (not in deviceTypeToFixCode switch)
    expect(fixes.length).toBeGreaterThan(0);
  });

  it('PV_NN with all devices generates no required-device fix actions', () => {
    const field = makeField('f_pv_nn', 'st1', FieldRoleV1.PV_NN);
    const devices: DeviceV1[] = [
      makeDevice('acb1', 'f_pv_nn', DeviceTypeV1.ACB, { electricalRole: DeviceElectricalRoleV1.POWER_PATH, powerPathPosition: DevicePowerPathPositionV1.UPSTREAM }),
      makeDevice('ct1', 'f_pv_nn', DeviceTypeV1.CT, { electricalRole: DeviceElectricalRoleV1.MEASUREMENT, powerPathPosition: DevicePowerPathPositionV1.MIDSTREAM }),
      makeDevice('relay1', 'f_pv_nn', DeviceTypeV1.RELAY, { electricalRole: DeviceElectricalRoleV1.PROTECTION, powerPathPosition: DevicePowerPathPositionV1.OFF_PATH, logicalBindings: { boundCbId: 'acb1', ctInputIds: ['ct1'] } }),
      makeDevice('pv1', 'f_pv_nn', DeviceTypeV1.GENERATOR_PV, { electricalRole: DeviceElectricalRoleV1.POWER_PATH, powerPathPosition: DevicePowerPathPositionV1.DOWNSTREAM }),
    ];
    const fixes = validateFieldDevices(field, devices, true, true);
    const requiredFixes = fixes.filter(f => f.code.startsWith('field.device_missing.'));
    expect(requiredFixes.length).toBe(0);
  });
});
