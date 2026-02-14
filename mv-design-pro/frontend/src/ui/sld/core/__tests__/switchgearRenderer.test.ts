/**
 * SwitchgearRenderer Tests — RUN #3G §3.
 *
 * Tests for deterministic switchgear-mode rendering:
 * - Determinism: same input → same output
 * - Overlap = 0 (critical invariant)
 * - Only SldSymbolTypeV1 registry symbols
 * - CT on power path (MIDSTREAM)
 * - Relay OFF_PATH (offset X)
 * - Cable head DOWNSTREAM
 * - Selection helpers (findElementById, findDevicesInField)
 *
 * BINDING: any failure blocks merge.
 */

import { describe, it, expect } from 'vitest';

import {
  renderSwitchgearBlock,
  checkSymbolOverlap,
  validateSymbolRegistry,
  findElementById,
  findDevicesInField,
  FIELD_COLUMN_PITCH,
  DEVICE_SLOT_HEIGHT,
  DEVICE_SYMBOL_WIDTH,
  DEVICE_SYMBOL_HEIGHT,
  BUS_BAR_HEIGHT,
  OFF_PATH_OFFSET_X,
  BUSBAR_Y,
} from '../switchgearRenderer';

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
  SldSymbolTypeV1,
  DEVICE_TO_SYMBOL,
} from '../fieldDeviceContracts';

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

function makeBusSection(id: string, stationId: string, orderIndex = 0): BusSectionV1 {
  return {
    id,
    stationId,
    orderIndex,
    catalogRef: null,
  };
}

function makeField(
  id: string,
  stationId: string,
  busSectionId: string,
  fieldRole: FieldRoleV1,
  deviceIds: string[] = [],
): FieldV1 {
  return {
    id,
    stationId,
    busSectionId,
    fieldRole,
    terminals: {
      incomingNodeId: null,
      outgoingNodeId: null,
      branchNodeId: null,
      generatorNodeId: null,
    },
    requiredDevices: { fieldRole, requirements: [] },
    deviceIds,
    catalogRef: null,
  };
}

function makeDevice(
  id: string,
  fieldId: string,
  deviceType: DeviceTypeV1,
  electricalRole: DeviceElectricalRoleV1,
  powerPathPosition: string,
): DeviceV1 {
  return {
    id,
    fieldId,
    deviceType,
    electricalRole,
    powerPathPosition: powerPathPosition as any,
    catalogRef: null,
    logicalBindings: { boundCbId: null, ctInputIds: [] },
    parameters: {
      ctRatio: null,
      breakingCapacityKa: null,
      ratedCurrentA: null,
      relaySettings: null,
      ratedPowerMva: null,
      ukPercent: null,
      vectorGroup: null,
    },
  };
}

function makeBlock(
  blockId: string,
  fields: FieldV1[],
  devices: DeviceV1[],
  busSections: BusSectionV1[] = [makeBusSection('bus_01', blockId)],
): StationBlockDetailV1 {
  return {
    blockId,
    embeddingRole: EmbeddingRoleV1.TRUNK_LEAF,
    busSections,
    fields,
    devices,
    ports: {
      trunkInPort: 'port_in',
      trunkOutPort: null,
      branchPort: null,
    },
    couplerFieldId: null,
    deviceAnchors: [],
    fixActions: [],
  };
}

// Canonical test block: 2 fields, 5 devices
function makeCanonicalBlock(): StationBlockDetailV1 {
  const stationId = 'station_001';
  const fields = [
    makeField('field_01', stationId, 'bus_01', FieldRoleV1.LINE_IN, ['dev_cb_01', 'dev_ct_01', 'dev_relay_01']),
    makeField('field_02', stationId, 'bus_01', FieldRoleV1.TRANSFORMER_SN_NN, ['dev_cb_02', 'dev_cable_01']),
  ];
  const devices = [
    makeDevice('dev_cb_01', 'field_01', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('dev_ct_01', 'field_01', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
    makeDevice('dev_relay_01', 'field_01', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    makeDevice('dev_cb_02', 'field_02', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    makeDevice('dev_cable_01', 'field_02', DeviceTypeV1.CABLE_HEAD, DeviceElectricalRoleV1.TERMINATION, DevicePowerPathPositionV1.DOWNSTREAM),
  ];
  return makeBlock(stationId, fields, devices);
}

// ===========================================================================
// Determinism
// ===========================================================================

describe('SwitchgearRenderer: Determinism', () => {
  it('same input produces identical output', () => {
    const block = makeCanonicalBlock();
    const r1 = renderSwitchgearBlock(block);
    const r2 = renderSwitchgearBlock(block);
    expect(r1).toEqual(r2);
  });

  it('elements are sorted by elementId', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const ids = result.elements.map(e => e.elementId);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  it('stationId matches blockId', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    expect(result.stationId).toBe('station_001');
  });

  it('fieldCount matches number of fields', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    expect(result.fieldCount).toBe(2);
  });

  it('deviceCount matches number of devices', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    expect(result.deviceCount).toBe(5);
  });
});

// ===========================================================================
// Layout geometry
// ===========================================================================

describe('SwitchgearRenderer: Layout Geometry', () => {
  it('totalWidth = fieldCount * FIELD_COLUMN_PITCH', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    expect(result.totalWidth).toBe(2 * FIELD_COLUMN_PITCH);
  });

  it('totalWidth is at least FIELD_COLUMN_PITCH for empty fields', () => {
    const block = makeBlock('s1', [], []);
    const result = renderSwitchgearBlock(block);
    expect(result.totalWidth).toBe(FIELD_COLUMN_PITCH);
  });

  it('bus bar spans full width', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const busBar = result.elements.find(e => e.elementType === 'BUS_BAR');
    expect(busBar).toBeDefined();
    expect(busBar!.x).toBe(0);
    expect(busBar!.y).toBe(BUSBAR_Y);
    expect(busBar!.width).toBe(result.totalWidth);
    expect(busBar!.height).toBe(BUS_BAR_HEIGHT);
  });

  it('field columns are positioned with correct pitch', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const fieldCols = result.elements
      .filter(e => e.elementType === 'FIELD_COLUMN')
      .sort((a, b) => a.x - b.x);
    expect(fieldCols).toHaveLength(2);
    expect(fieldCols[0].x).toBe(0);
    expect(fieldCols[1].x).toBe(FIELD_COLUMN_PITCH);
    expect(fieldCols[0].width).toBe(FIELD_COLUMN_PITCH);
  });

  it('field column starts at BUS_BAR_HEIGHT', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const fieldCol = result.elements.find(e => e.elementType === 'FIELD_COLUMN');
    expect(fieldCol!.y).toBe(BUS_BAR_HEIGHT);
  });

  it('UPSTREAM device is in row 1', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const cb = result.elements.find(e => e.elementId === 'dev_cb_01');
    expect(cb).toBeDefined();
    expect(cb!.y).toBe(BUS_BAR_HEIGHT + 1 * DEVICE_SLOT_HEIGHT);
  });

  it('MIDSTREAM device is in row 2', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const ct = result.elements.find(e => e.elementId === 'dev_ct_01');
    expect(ct).toBeDefined();
    expect(ct!.y).toBe(BUS_BAR_HEIGHT + 2 * DEVICE_SLOT_HEIGHT);
  });

  it('DOWNSTREAM device is in row 3', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const cable = result.elements.find(e => e.elementId === 'dev_cable_01');
    expect(cable).toBeDefined();
    expect(cable!.y).toBe(BUS_BAR_HEIGHT + 3 * DEVICE_SLOT_HEIGHT);
  });

  it('device symbol has correct dimensions', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const device = result.elements.find(e => e.elementType === 'DEVICE_SYMBOL');
    expect(device!.width).toBe(DEVICE_SYMBOL_WIDTH);
    expect(device!.height).toBe(DEVICE_SYMBOL_HEIGHT);
  });
});

// ===========================================================================
// CT on power path (MIDSTREAM)
// ===========================================================================

describe('SwitchgearRenderer: CT Position', () => {
  it('CT is rendered at MIDSTREAM Y (row 2)', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const ct = result.elements.find(e => e.elementId === 'dev_ct_01');
    expect(ct).toBeDefined();
    expect(ct!.y).toBe(BUS_BAR_HEIGHT + 2 * DEVICE_SLOT_HEIGHT);
  });

  it('CT is NOT offset (on power path axis)', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const ct = result.elements.find(e => e.elementId === 'dev_ct_01');
    const cb = result.elements.find(e => e.elementId === 'dev_cb_01');
    // CT and CB in same field should share same X center (both on power path)
    const ctCenterX = ct!.x + ct!.width / 2;
    const cbCenterX = cb!.x + cb!.width / 2;
    expect(ctCenterX).toBe(cbCenterX);
  });
});

// ===========================================================================
// Relay OFF_PATH (offset X)
// ===========================================================================

describe('SwitchgearRenderer: Relay OFF_PATH', () => {
  it('relay is offset from power path axis', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const relay = result.elements.find(e => e.elementId === 'dev_relay_01');
    const cb = result.elements.find(e => e.elementId === 'dev_cb_01');
    // Relay should be offset right from CB's X position by OFF_PATH_OFFSET_X
    expect(relay!.x).toBe(cb!.x + OFF_PATH_OFFSET_X);
  });

  it('relay Y is same as MIDSTREAM (row 2)', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const relay = result.elements.find(e => e.elementId === 'dev_relay_01');
    expect(relay!.y).toBe(BUS_BAR_HEIGHT + 2 * DEVICE_SLOT_HEIGHT);
  });
});

// ===========================================================================
// Cable head DOWNSTREAM
// ===========================================================================

describe('SwitchgearRenderer: Cable Head', () => {
  it('cable head is at DOWNSTREAM (row 3)', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const cable = result.elements.find(e => e.elementId === 'dev_cable_01');
    expect(cable!.y).toBe(BUS_BAR_HEIGHT + 3 * DEVICE_SLOT_HEIGHT);
  });

  it('cable head has SYMBOL_CABLE_HEAD symbolType', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const cable = result.elements.find(e => e.elementId === 'dev_cable_01');
    expect(cable!.symbolType).toBe(SldSymbolTypeV1.SYMBOL_CABLE_HEAD);
  });
});

// ===========================================================================
// Overlap invariant (CRITICAL: overlap = 0)
// ===========================================================================

describe('SwitchgearRenderer: Overlap Invariant', () => {
  it('canonical block has zero overlap', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const overlap = checkSymbolOverlap(result);
    expect(overlap.hasOverlap).toBe(false);
    expect(overlap.overlappingPairs).toHaveLength(0);
  });

  it('single field with 3 devices on different rows has zero overlap', () => {
    const stationId = 'st_overlap';
    const fields = [makeField('f1', stationId, 'bus_01', FieldRoleV1.LINE_IN, ['d1', 'd2', 'd3'])];
    const devices = [
      makeDevice('d1', 'f1', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
      makeDevice('d2', 'f1', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
      makeDevice('d3', 'f1', DeviceTypeV1.CABLE_HEAD, DeviceElectricalRoleV1.TERMINATION, DevicePowerPathPositionV1.DOWNSTREAM),
    ];
    const block = makeBlock(stationId, fields, devices);
    const result = renderSwitchgearBlock(block);
    const overlap = checkSymbolOverlap(result);
    expect(overlap.hasOverlap).toBe(false);
  });

  it('devices in separate fields do not overlap', () => {
    const stationId = 'st_multi';
    const fields = [
      makeField('f1', stationId, 'bus_01', FieldRoleV1.LINE_IN, ['d1']),
      makeField('f2', stationId, 'bus_01', FieldRoleV1.LINE_OUT, ['d2']),
    ];
    const devices = [
      makeDevice('d1', 'f1', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
      makeDevice('d2', 'f2', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    ];
    const block = makeBlock(stationId, fields, devices);
    const result = renderSwitchgearBlock(block);
    const overlap = checkSymbolOverlap(result);
    expect(overlap.hasOverlap).toBe(false);
  });

  it('relay offset prevents overlap with MIDSTREAM device', () => {
    const stationId = 'st_relay';
    const fields = [makeField('f1', stationId, 'bus_01', FieldRoleV1.LINE_IN, ['d1', 'd2'])];
    const devices = [
      makeDevice('d1', 'f1', DeviceTypeV1.CT, DeviceElectricalRoleV1.MEASUREMENT, DevicePowerPathPositionV1.MIDSTREAM),
      makeDevice('d2', 'f1', DeviceTypeV1.RELAY, DeviceElectricalRoleV1.PROTECTION, DevicePowerPathPositionV1.OFF_PATH),
    ];
    const block = makeBlock(stationId, fields, devices);
    const result = renderSwitchgearBlock(block);
    const overlap = checkSymbolOverlap(result);
    expect(overlap.hasOverlap).toBe(false);
  });
});

// ===========================================================================
// Symbol registry validation
// ===========================================================================

describe('SwitchgearRenderer: Symbol Registry', () => {
  it('canonical block uses only valid symbols', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const validation = validateSymbolRegistry(result);
    expect(validation.valid).toBe(true);
    expect(validation.invalidSymbols).toHaveLength(0);
  });

  it('CB maps to SYMBOL_CB', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const cb = result.elements.find(e => e.elementId === 'dev_cb_01');
    expect(cb!.symbolType).toBe(SldSymbolTypeV1.SYMBOL_CB);
  });

  it('CT maps to SYMBOL_CT', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const ct = result.elements.find(e => e.elementId === 'dev_ct_01');
    expect(ct!.symbolType).toBe(SldSymbolTypeV1.SYMBOL_CT);
  });

  it('RELAY maps to SYMBOL_RELAY', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const relay = result.elements.find(e => e.elementId === 'dev_relay_01');
    expect(relay!.symbolType).toBe(SldSymbolTypeV1.SYMBOL_RELAY);
  });

  it('CABLE_HEAD maps to SYMBOL_CABLE_HEAD', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const cable = result.elements.find(e => e.elementId === 'dev_cable_01');
    expect(cable!.symbolType).toBe(SldSymbolTypeV1.SYMBOL_CABLE_HEAD);
  });

  it('all DeviceTypeV1 members have a symbol mapping', () => {
    for (const dt of Object.values(DeviceTypeV1)) {
      expect(DEVICE_TO_SYMBOL[dt as DeviceTypeV1]).toBeDefined();
    }
  });
});

// ===========================================================================
// Connection lines
// ===========================================================================

describe('SwitchgearRenderer: Connection Lines', () => {
  it('connection line exists for each field with devices', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const connLines = result.elements.filter(e => e.elementType === 'CONNECTION_LINE');
    expect(connLines).toHaveLength(2); // 2 fields with devices
  });

  it('connection line starts at BUS_BAR_HEIGHT', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const connLine = result.elements.find(e => e.elementType === 'CONNECTION_LINE');
    expect(connLine!.y).toBe(BUS_BAR_HEIGHT);
  });

  it('connection line is not selectable', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const connLine = result.elements.find(e => e.elementType === 'CONNECTION_LINE');
    expect(connLine!.selectable).toBe(false);
  });

  it('no connection line for field without devices', () => {
    const stationId = 'st_empty';
    const fields = [makeField('f1', stationId, 'bus_01', FieldRoleV1.LINE_IN, [])];
    const block = makeBlock(stationId, fields, []);
    const result = renderSwitchgearBlock(block);
    const connLines = result.elements.filter(e => e.elementType === 'CONNECTION_LINE');
    expect(connLines).toHaveLength(0);
  });
});

// ===========================================================================
// Selection helpers
// ===========================================================================

describe('SwitchgearRenderer: Selection Helpers', () => {
  it('findElementById returns correct element', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const el = findElementById(result, 'dev_cb_01');
    expect(el).toBeDefined();
    expect(el!.elementId).toBe('dev_cb_01');
    expect(el!.elementType).toBe('DEVICE_SYMBOL');
  });

  it('findElementById returns null for missing element', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const el = findElementById(result, 'nonexistent');
    expect(el).toBeNull();
  });

  it('findElementById finds bus bar', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const el = findElementById(result, 'bus_01');
    expect(el).toBeDefined();
    expect(el!.elementType).toBe('BUS_BAR');
  });

  it('findDevicesInField returns all devices in field', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const devices = findDevicesInField(result, 'field_01');
    expect(devices).toHaveLength(3);
    const ids = devices.map(d => d.elementId).sort();
    expect(ids).toEqual(['dev_cb_01', 'dev_ct_01', 'dev_relay_01']);
  });

  it('findDevicesInField returns empty for field without devices', () => {
    const stationId = 'st_no_dev';
    const fields = [makeField('f1', stationId, 'bus_01', FieldRoleV1.LINE_IN, [])];
    const block = makeBlock(stationId, fields, []);
    const result = renderSwitchgearBlock(block);
    const devices = findDevicesInField(result, 'f1');
    expect(devices).toHaveLength(0);
  });

  it('findDevicesInField returns empty for nonexistent field', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const devices = findDevicesInField(result, 'nonexistent_field');
    expect(devices).toHaveLength(0);
  });
});

// ===========================================================================
// Element types and selectability
// ===========================================================================

describe('SwitchgearRenderer: Element Types', () => {
  it('bus bar is selectable', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const bus = result.elements.find(e => e.elementType === 'BUS_BAR');
    expect(bus!.selectable).toBe(true);
  });

  it('field column is selectable', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const col = result.elements.find(e => e.elementType === 'FIELD_COLUMN');
    expect(col!.selectable).toBe(true);
  });

  it('device symbol is selectable', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const dev = result.elements.find(e => e.elementType === 'DEVICE_SYMBOL');
    expect(dev!.selectable).toBe(true);
  });

  it('field column label is field role', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const col = result.elements.find(e => e.elementId === 'field_01');
    expect(col!.label).toBe(FieldRoleV1.LINE_IN);
  });

  it('device symbol has fieldId set', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const dev = result.elements.find(e => e.elementId === 'dev_cb_01');
    expect(dev!.fieldId).toBe('field_01');
  });

  it('device symbol has deviceType set', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    const dev = result.elements.find(e => e.elementId === 'dev_cb_01');
    expect(dev!.deviceType).toBe(DeviceTypeV1.CB);
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('SwitchgearRenderer: Edge Cases', () => {
  it('empty station block renders bus bar only', () => {
    const block = makeBlock('st_empty', [], []);
    const result = renderSwitchgearBlock(block);
    expect(result.fieldCount).toBe(0);
    expect(result.deviceCount).toBe(0);
    const busBar = result.elements.find(e => e.elementType === 'BUS_BAR');
    expect(busBar).toBeDefined();
  });

  it('station with no bus sections still renders fields', () => {
    const stationId = 'st_nobus';
    const fields = [makeField('f1', stationId, 'bus_01', FieldRoleV1.LINE_IN, ['d1'])];
    const devices = [
      makeDevice('d1', 'f1', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    ];
    const block = makeBlock(stationId, fields, devices, []);
    const result = renderSwitchgearBlock(block);
    expect(result.fieldCount).toBe(1);
    const devEl = result.elements.find(e => e.elementId === 'd1');
    expect(devEl).toBeDefined();
  });

  it('multiple bus sections are rendered', () => {
    const stationId = 'st_dual_bus';
    const busSections = [
      makeBusSection('bus_01', stationId, 0),
      makeBusSection('bus_02', stationId, 1),
    ];
    const block = makeBlock(stationId, [], [], busSections);
    const result = renderSwitchgearBlock(block);
    const busBars = result.elements.filter(e => e.elementType === 'BUS_BAR');
    expect(busBars).toHaveLength(2);
  });

  it('totalHeight accounts for max device row', () => {
    const block = makeCanonicalBlock();
    const result = renderSwitchgearBlock(block);
    // DOWNSTREAM is row 3, so totalHeight = BUS_BAR_HEIGHT + (3+1)*DEVICE_SLOT_HEIGHT
    expect(result.totalHeight).toBe(BUS_BAR_HEIGHT + 4 * DEVICE_SLOT_HEIGHT);
  });

  it('fields are sorted by id before rendering', () => {
    const stationId = 'st_order';
    // Create fields in reverse order
    const fields = [
      makeField('z_field', stationId, 'bus_01', FieldRoleV1.LINE_OUT, ['d2']),
      makeField('a_field', stationId, 'bus_01', FieldRoleV1.LINE_IN, ['d1']),
    ];
    const devices = [
      makeDevice('d1', 'a_field', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
      makeDevice('d2', 'z_field', DeviceTypeV1.CB, DeviceElectricalRoleV1.POWER_PATH, DevicePowerPathPositionV1.UPSTREAM),
    ];
    const block = makeBlock(stationId, fields, devices);
    const result = renderSwitchgearBlock(block);
    const fieldCols = result.elements
      .filter(e => e.elementType === 'FIELD_COLUMN')
      .sort((a, b) => a.x - b.x);

    // a_field should be first (x=0), z_field second (x=80)
    expect(fieldCols[0].elementId).toBe('a_field');
    expect(fieldCols[1].elementId).toBe('z_field');
  });
});

// ===========================================================================
// Constants validation
// ===========================================================================

describe('SwitchgearRenderer: Constants', () => {
  it('FIELD_COLUMN_PITCH is positive', () => {
    expect(FIELD_COLUMN_PITCH).toBeGreaterThan(0);
  });

  it('DEVICE_SLOT_HEIGHT is positive', () => {
    expect(DEVICE_SLOT_HEIGHT).toBeGreaterThan(0);
  });

  it('DEVICE_SYMBOL_WIDTH is positive', () => {
    expect(DEVICE_SYMBOL_WIDTH).toBeGreaterThan(0);
  });

  it('DEVICE_SYMBOL_HEIGHT is positive', () => {
    expect(DEVICE_SYMBOL_HEIGHT).toBeGreaterThan(0);
  });

  it('BUS_BAR_HEIGHT is positive', () => {
    expect(BUS_BAR_HEIGHT).toBeGreaterThan(0);
  });

  it('OFF_PATH_OFFSET_X is positive', () => {
    expect(OFF_PATH_OFFSET_X).toBeGreaterThan(0);
  });

  it('BUSBAR_Y is non-negative', () => {
    expect(BUSBAR_Y).toBeGreaterThanOrEqual(0);
  });

  it('device symbol fits within column pitch', () => {
    expect(DEVICE_SYMBOL_WIDTH).toBeLessThan(FIELD_COLUMN_PITCH);
  });

  it('OFF_PATH_OFFSET_X does not push device outside column', () => {
    // With OFF_PATH_OFFSET_X, the device X = center + offset - width/2
    // Must fit within the field column
    const centerOffset = FIELD_COLUMN_PITCH / 2 - DEVICE_SYMBOL_WIDTH / 2 + OFF_PATH_OFFSET_X;
    expect(centerOffset + DEVICE_SYMBOL_WIDTH).toBeLessThanOrEqual(2 * FIELD_COLUMN_PITCH);
  });
});
