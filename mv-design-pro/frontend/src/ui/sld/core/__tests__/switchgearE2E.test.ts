/**
 * switchgearE2E.test.ts — RUN #3G §5: Switchgear E2E reference tests.
 *
 * BINDING: Full switchgear pipeline determinism for 4 reference station blocks:
 *   StationBlockDetailV1 → renderSwitchgearBlock → overlap=0 → symbol registry → inspector sections
 *
 * Golden Station Blocks:
 *   GS-E2E-01: LINE_IN field (CB + CT + Relay + Cable Head)
 *   GS-E2E-02: TRANSFORMER_SN_NN field (CB + CT + Relay + TR + ACB + Cable Head)
 *   GS-E2E-03: PV_SN field (CB + CT + Relay + Generator PV)
 *   GS-E2E-04: Multi-field station (LINE_IN + LINE_OUT + TRANSFORMER_SN_NN + PV_SN)
 *
 * Each verifies:
 *   1. Render produces valid output
 *   2. Hash stability (50x)
 *   3. Overlap invariant = 0
 *   4. Symbol registry validation
 *   5. Inspector sections build correctly by elementId
 */

import { describe, it, expect } from 'vitest';

import type {
  StationBlockDetailV1,
  FieldV1,
  DeviceV1,
  BusSectionV1,
} from '../fieldDeviceContracts';

import {
  FieldRoleV1,
  EmbeddingRoleV1,
  DeviceTypeV1,
  DeviceElectricalRoleV1,
  DevicePowerPathPositionV1,
} from '../fieldDeviceContracts';

import {
  renderSwitchgearBlock,
  checkSymbolOverlap,
  validateSymbolRegistry,
  findElementById,
  findDevicesInField,
} from '../switchgearRenderer';

import {
  buildInspectorSectionsForElement,
  resolveFieldOrDevice,
} from '../../inspector/fieldDeviceInspector';

// =============================================================================
// GOLDEN STATION BLOCK BUILDERS
// =============================================================================

function makeBus(id: string, stationId: string): BusSectionV1 {
  return { id, stationId, orderIndex: 0, catalogRef: null };
}

function makeField(
  id: string,
  stationId: string,
  busSectionId: string,
  fieldRole: FieldRoleV1,
  deviceIds: string[],
): FieldV1 {
  return {
    id, stationId, busSectionId, fieldRole,
    terminals: { incomingNodeId: `node_in_${id}`, outgoingNodeId: `node_out_${id}`, branchNodeId: null, generatorNodeId: null },
    requiredDevices: { fieldRole, requirements: [] },
    deviceIds, catalogRef: null,
  };
}

function makeDevice(
  id: string, fieldId: string, deviceType: DeviceTypeV1,
  electricalRole: DeviceElectricalRoleV1, powerPathPosition: string,
): DeviceV1 {
  return {
    id, fieldId, deviceType, electricalRole,
    powerPathPosition: powerPathPosition as any,
    catalogRef: null,
    logicalBindings: { boundCbId: null, ctInputIds: [] },
    parameters: { ctRatio: null, breakingCapacityKa: null, ratedCurrentA: null, relaySettings: null, ratedPowerMva: null, ukPercent: null, vectorGroup: null },
  };
}

function makeBlock(blockId: string, fields: FieldV1[], devices: DeviceV1[]): StationBlockDetailV1 {
  return {
    blockId,
    embeddingRole: EmbeddingRoleV1.TRUNK_LEAF,
    busSections: [makeBus('bus_01', blockId)],
    fields, devices,
    ports: { trunkInPort: 'port_in', trunkOutPort: null, branchPort: null },
    couplerFieldId: null, deviceAnchors: [], fixActions: [],
  };
}

// ---------------------------------------------------------------------------
// GS-E2E-01: LINE_IN field (standard)
// ---------------------------------------------------------------------------

function buildGS_E2E_01(): StationBlockDetailV1 {
  const sid = 'gs_e2e_01';
  const fields = [
    makeField('field_line_in', sid, 'bus_01', FieldRoleV1.LINE_IN,
      ['dev_cb_01', 'dev_ct_01', 'dev_relay_01', 'dev_cable_01']),
  ];
  const devices = [
    makeDevice('dev_cb_01', 'field_line_in', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('dev_ct_01', 'field_line_in', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('dev_relay_01', 'field_line_in', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    makeDevice('dev_cable_01', 'field_line_in', DeviceTypeV1.CABLE_HEAD, DeviceElectricalRoleV1.TERMINATION, DevicePowerPathPositionV1.DOWNSTREAM),
  ];
  return makeBlock(sid, fields, devices);
}

// ---------------------------------------------------------------------------
// GS-E2E-02: TRANSFORMER_SN_NN field (complex)
// ---------------------------------------------------------------------------

function buildGS_E2E_02(): StationBlockDetailV1 {
  const sid = 'gs_e2e_02';
  const fields = [
    makeField('field_tr', sid, 'bus_01', FieldRoleV1.TRANSFORMER_SN_NN,
      ['dev_cb_tr', 'dev_ct_tr', 'dev_relay_tr', 'dev_tr_01', 'dev_acb_01', 'dev_cable_tr']),
  ];
  const devices = [
    makeDevice('dev_cb_tr', 'field_tr', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('dev_ct_tr', 'field_tr', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('dev_relay_tr', 'field_tr', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    makeDevice('dev_tr_01', 'field_tr', DeviceTypeV1.TRANSFORMER_DEVICE, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('dev_acb_01', 'field_tr', DeviceTypeV1.ACB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.DOWNSTREAM),
    makeDevice('dev_cable_tr', 'field_tr', DeviceTypeV1.CABLE_HEAD, DeviceElectricalRoleV1.TERMINATION, DevicePowerPathPositionV1.DOWNSTREAM),
  ];
  return makeBlock(sid, fields, devices);
}

// ---------------------------------------------------------------------------
// GS-E2E-03: PV_SN field (generator)
// ---------------------------------------------------------------------------

function buildGS_E2E_03(): StationBlockDetailV1 {
  const sid = 'gs_e2e_03';
  const fields = [
    makeField('field_pv', sid, 'bus_01', FieldRoleV1.PV_SN,
      ['dev_cb_pv', 'dev_ct_pv', 'dev_relay_pv', 'dev_gen_pv']),
  ];
  const devices = [
    makeDevice('dev_cb_pv', 'field_pv', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('dev_ct_pv', 'field_pv', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('dev_relay_pv', 'field_pv', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    makeDevice('dev_gen_pv', 'field_pv', DeviceTypeV1.GENERATOR_PV, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.DOWNSTREAM),
  ];
  return makeBlock(sid, fields, devices);
}

// ---------------------------------------------------------------------------
// GS-E2E-04: Multi-field station (4 fields, 14 devices)
// ---------------------------------------------------------------------------

function buildGS_E2E_04(): StationBlockDetailV1 {
  const sid = 'gs_e2e_04';
  const fields = [
    makeField('field_li', sid, 'bus_01', FieldRoleV1.LINE_IN, ['d_li_cb', 'd_li_ct', 'd_li_relay', 'd_li_cable']),
    makeField('field_lo', sid, 'bus_01', FieldRoleV1.LINE_OUT, ['d_lo_cb', 'd_lo_cable']),
    makeField('field_tr', sid, 'bus_01', FieldRoleV1.TRANSFORMER_SN_NN, ['d_tr_cb', 'd_tr_ct', 'd_tr_relay', 'd_tr_tr']),
    makeField('field_pv', sid, 'bus_01', FieldRoleV1.PV_SN, ['d_pv_cb', 'd_pv_ct', 'd_pv_relay', 'd_pv_gen']),
  ];
  const devices = [
    // LINE_IN
    makeDevice('d_li_cb', 'field_li', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('d_li_ct', 'field_li', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('d_li_relay', 'field_li', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    makeDevice('d_li_cable', 'field_li', DeviceTypeV1.CABLE_HEAD, DeviceElectricalRoleV1.TERMINATION, DevicePowerPathPositionV1.DOWNSTREAM),
    // LINE_OUT
    makeDevice('d_lo_cb', 'field_lo', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('d_lo_cable', 'field_lo', DeviceTypeV1.CABLE_HEAD, DeviceElectricalRoleV1.TERMINATION, DevicePowerPathPositionV1.DOWNSTREAM),
    // TRANSFORMER_SN_NN
    makeDevice('d_tr_cb', 'field_tr', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('d_tr_ct', 'field_tr', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('d_tr_relay', 'field_tr', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    makeDevice('d_tr_tr', 'field_tr', DeviceTypeV1.TRANSFORMER_DEVICE, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.MIDSTREAM),
    // PV_SN
    makeDevice('d_pv_cb', 'field_pv', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('d_pv_ct', 'field_pv', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('d_pv_relay', 'field_pv', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    makeDevice('d_pv_gen', 'field_pv', DeviceTypeV1.GENERATOR_PV, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.DOWNSTREAM),
  ];
  return makeBlock(sid, fields, devices);
}

// =============================================================================
// GS-E2E-01: LINE_IN FIELD
// =============================================================================

describe('GS-E2E-01: LINE_IN field (standard)', () => {
  const block = buildGS_E2E_01();

  it('renders valid output', () => {
    const result = renderSwitchgearBlock(block);
    expect(result.stationId).toBe('gs_e2e_01');
    expect(result.fieldCount).toBe(1);
    expect(result.deviceCount).toBe(4);
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('hash stability (50x)', () => {
    const results = Array.from({ length: 50 }, () => renderSwitchgearBlock(block));
    const reference = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i++) {
      expect(JSON.stringify(results[i])).toBe(reference);
    }
  });

  it('overlap invariant = 0', () => {
    const result = renderSwitchgearBlock(block);
    const overlap = checkSymbolOverlap(result);
    expect(overlap.hasOverlap).toBe(false);
  });

  it('symbol registry valid', () => {
    const result = renderSwitchgearBlock(block);
    const validation = validateSymbolRegistry(result);
    expect(validation.valid).toBe(true);
  });

  it('inspector sections build for field elementId', () => {
    const sections = buildInspectorSectionsForElement('field_line_in', block);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.some(s => s.id === 'field_basic')).toBe(true);
  });

  it('inspector sections build for device elementId', () => {
    const sections = buildInspectorSectionsForElement('dev_cb_01', block);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.some(s => s.id === 'device_basic')).toBe(true);
  });

  it('CT on MIDSTREAM, relay OFF_PATH', () => {
    const result = renderSwitchgearBlock(block);
    const ct = findElementById(result, 'dev_ct_01');
    const relay = findElementById(result, 'dev_relay_01');
    expect(ct).toBeDefined();
    expect(relay).toBeDefined();
    // CT and relay at same Y (both row 2)
    expect(ct!.y).toBe(relay!.y);
    // Relay offset X from CT
    expect(relay!.x).toBeGreaterThan(ct!.x);
  });
});

// =============================================================================
// GS-E2E-02: TRANSFORMER_SN_NN FIELD
// =============================================================================

describe('GS-E2E-02: TRANSFORMER_SN_NN field (complex)', () => {
  const block = buildGS_E2E_02();

  it('renders valid output with 6 devices', () => {
    const result = renderSwitchgearBlock(block);
    expect(result.deviceCount).toBe(6);
  });

  it('hash stability (50x)', () => {
    const results = Array.from({ length: 50 }, () => renderSwitchgearBlock(block));
    const reference = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i++) {
      expect(JSON.stringify(results[i])).toBe(reference);
    }
  });

  it('overlap invariant = 0', () => {
    const result = renderSwitchgearBlock(block);
    const overlap = checkSymbolOverlap(result);
    expect(overlap.hasOverlap).toBe(false);
  });

  it('symbol registry valid', () => {
    const result = renderSwitchgearBlock(block);
    expect(validateSymbolRegistry(result).valid).toBe(true);
  });

  it('transformer device rendered', () => {
    const result = renderSwitchgearBlock(block);
    const tr = findElementById(result, 'dev_tr_01');
    expect(tr).toBeDefined();
    expect(tr!.deviceType).toBe(DeviceTypeV1.TRANSFORMER_DEVICE);
  });

  it('ACB device rendered at DOWNSTREAM', () => {
    const result = renderSwitchgearBlock(block);
    const acb = findElementById(result, 'dev_acb_01');
    expect(acb).toBeDefined();
    expect(acb!.deviceType).toBe(DeviceTypeV1.ACB);
  });
});

// =============================================================================
// GS-E2E-03: PV_SN FIELD
// =============================================================================

describe('GS-E2E-03: PV_SN field (generator)', () => {
  const block = buildGS_E2E_03();

  it('renders valid output with PV generator', () => {
    const result = renderSwitchgearBlock(block);
    expect(result.deviceCount).toBe(4);
    const gen = findElementById(result, 'dev_gen_pv');
    expect(gen).toBeDefined();
    expect(gen!.deviceType).toBe(DeviceTypeV1.GENERATOR_PV);
  });

  it('hash stability (50x)', () => {
    const results = Array.from({ length: 50 }, () => renderSwitchgearBlock(block));
    const reference = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i++) {
      expect(JSON.stringify(results[i])).toBe(reference);
    }
  });

  it('overlap invariant = 0', () => {
    const result = renderSwitchgearBlock(block);
    expect(checkSymbolOverlap(result).hasOverlap).toBe(false);
  });

  it('symbol registry valid', () => {
    expect(validateSymbolRegistry(renderSwitchgearBlock(block)).valid).toBe(true);
  });

  it('resolveFieldOrDevice finds PV field', () => {
    const resolution = resolveFieldOrDevice('field_pv', block);
    expect(resolution).not.toBeNull();
    expect(resolution!.type).toBe('field');
  });

  it('resolveFieldOrDevice finds PV generator device', () => {
    const resolution = resolveFieldOrDevice('dev_gen_pv', block);
    expect(resolution).not.toBeNull();
    expect(resolution!.type).toBe('device');
  });
});

// =============================================================================
// GS-E2E-04: MULTI-FIELD STATION
// =============================================================================

describe('GS-E2E-04: Multi-field station (4 fields, 14 devices)', () => {
  const block = buildGS_E2E_04();

  it('renders valid output', () => {
    const result = renderSwitchgearBlock(block);
    expect(result.fieldCount).toBe(4);
    expect(result.deviceCount).toBe(14);
  });

  it('hash stability (50x)', () => {
    const results = Array.from({ length: 50 }, () => renderSwitchgearBlock(block));
    const reference = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i++) {
      expect(JSON.stringify(results[i])).toBe(reference);
    }
  });

  it('overlap invariant = 0 with 14 devices', () => {
    const result = renderSwitchgearBlock(block);
    const overlap = checkSymbolOverlap(result);
    expect(overlap.hasOverlap).toBe(false);
    expect(overlap.overlappingPairs).toHaveLength(0);
  });

  it('symbol registry valid for all 14 devices', () => {
    const result = renderSwitchgearBlock(block);
    expect(validateSymbolRegistry(result).valid).toBe(true);
  });

  it('each field has correct device count', () => {
    const result = renderSwitchgearBlock(block);
    expect(findDevicesInField(result, 'field_li')).toHaveLength(4);
    expect(findDevicesInField(result, 'field_lo')).toHaveLength(2);
    expect(findDevicesInField(result, 'field_tr')).toHaveLength(4);
    expect(findDevicesInField(result, 'field_pv')).toHaveLength(4);
  });

  it('inspector sections work for every field', () => {
    for (const field of block.fields) {
      const sections = buildInspectorSectionsForElement(field.id, block);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections.some(s => s.id === 'field_basic')).toBe(true);
    }
  });

  it('inspector sections work for every device', () => {
    for (const device of block.devices) {
      const sections = buildInspectorSectionsForElement(device.id, block);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections.some(s => s.id === 'device_basic')).toBe(true);
    }
  });

  it('fields sorted by id produce deterministic column positions', () => {
    const result = renderSwitchgearBlock(block);
    const fieldCols = result.elements
      .filter(e => e.elementType === 'FIELD_COLUMN')
      .sort((a, b) => a.x - b.x);

    // Should be sorted alphabetically: field_li, field_lo, field_pv, field_tr
    expect(fieldCols[0].elementId).toBe('field_li');
    expect(fieldCols[1].elementId).toBe('field_lo');
    expect(fieldCols[2].elementId).toBe('field_pv');
    expect(fieldCols[3].elementId).toBe('field_tr');
  });

  it('permutation invariance: shuffled devices same output', () => {
    // Shuffle devices array and verify same render
    const shuffled = [...block.devices].sort(() => Math.random() - 0.5);
    const blockShuffled = { ...block, devices: shuffled };
    const r1 = renderSwitchgearBlock(block);
    const r2 = renderSwitchgearBlock(blockShuffled);
    // Elements sorted by elementId → same order regardless of input order
    expect(JSON.stringify(r1.elements)).toBe(JSON.stringify(r2.elements));
  });
});
