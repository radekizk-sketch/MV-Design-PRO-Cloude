/**
 * catalogContract.test.ts — RUN #3E §4: No empty devices contract.
 *
 * BINDING: every device without catalogRef → CATALOG_REF_MISSING FixAction.
 * BINDING: no fabricated catalog refs (never 'default', 'auto', 'unknown').
 */
import { describe, it, expect } from 'vitest';
import {
  validateFieldDevices,
  FieldDeviceFixCodes,
  FieldRoleV1,
  DeviceTypeV1,
  DeviceElectricalRoleV1,
  DevicePowerPathPositionV1,
  DEVICE_REQUIREMENT_SETS,
} from '../fieldDeviceContracts';
import type { FieldV1, DeviceV1 } from '../fieldDeviceContracts';

function makeField(overrides: Partial<FieldV1> = {}): FieldV1 {
  return {
    id: 'field_001',
    stationId: 'sta_001',
    busSectionId: 'bus_001',
    fieldRole: FieldRoleV1.LINE_IN,
    terminals: { fromNodeId: 'bus_001', toNodeId: null },
    requiredDevices: DEVICE_REQUIREMENT_SETS[FieldRoleV1.LINE_IN],
    deviceIds: ['dev_001'],
    catalogRef: null,
    ...overrides,
  };
}

function makeDevice(overrides: Partial<DeviceV1> = {}): DeviceV1 {
  return {
    id: 'dev_001',
    fieldId: 'field_001',
    deviceType: DeviceTypeV1.CB,
    electricalRole: DeviceElectricalRoleV1.PROTECTION,
    powerPathPosition: DevicePowerPathPositionV1.MAIN_PATH,
    catalogRef: null,
    logicalBindings: { boundCbId: null, ctInputIds: [] },
    parameters: { ratedCurrentA: null, ratedVoltageKv: null, breakingCapacityKa: null },
    ...overrides,
  };
}

describe('No empty devices contract — §4', () => {
  it('device without catalogRef → CATALOG_REF_MISSING FixAction', () => {
    const field = makeField();
    const devices = [makeDevice({ id: 'dev_no_cat', fieldId: field.id, catalogRef: null })];
    const fixActions = validateFieldDevices(field, devices, false, false);

    const catMissing = fixActions.filter(
      f => f.code === FieldDeviceFixCodes.CATALOG_REF_MISSING,
    );
    expect(catMissing.length).toBeGreaterThanOrEqual(1);
    expect(catMissing[0].elementId).toBe('dev_no_cat');
  });

  it('device WITH catalogRef → no CATALOG_REF_MISSING', () => {
    const field = makeField({ deviceIds: ['dev_with_cat'] });
    const devices = [makeDevice({
      id: 'dev_with_cat',
      fieldId: field.id,
      catalogRef: {
        catalogId: 'cat_001',
        manufacturer: 'ABB',
        modelName: 'VD4',
        ratings: null,
      },
    })];
    const fixActions = validateFieldDevices(field, devices, false, false);

    const catMissing = fixActions.filter(
      f => f.code === FieldDeviceFixCodes.CATALOG_REF_MISSING,
    );
    expect(catMissing.length).toBe(0);
  });

  it('multiple devices — only those without catalogRef get FixAction', () => {
    const field = makeField({ deviceIds: ['dev_1', 'dev_2', 'dev_3'] });
    const devices = [
      makeDevice({ id: 'dev_1', fieldId: field.id, catalogRef: null }),
      makeDevice({
        id: 'dev_2',
        fieldId: field.id,
        catalogRef: {
          catalogId: 'cat_002',
          manufacturer: 'Siemens',
          modelName: '3AH3',
          ratings: null,
        },
      }),
      makeDevice({ id: 'dev_3', fieldId: field.id, catalogRef: null }),
    ];
    const fixActions = validateFieldDevices(field, devices, false, false);

    const catMissing = fixActions.filter(
      f => f.code === FieldDeviceFixCodes.CATALOG_REF_MISSING,
    );
    expect(catMissing.length).toBe(2);
    const ids = catMissing.map(f => f.elementId).sort();
    expect(ids).toEqual(['dev_1', 'dev_3']);
  });

  it('FixAction for missing catalogRef has Polish message', () => {
    const field = makeField();
    const devices = [makeDevice({ id: 'dev_pl', fieldId: field.id, catalogRef: null })];
    const fixActions = validateFieldDevices(field, devices, false, false);

    const catMissing = fixActions.find(
      f => f.code === FieldDeviceFixCodes.CATALOG_REF_MISSING,
    );
    expect(catMissing).toBeDefined();
    expect(catMissing!.message.length).toBeGreaterThan(0);
  });
});
