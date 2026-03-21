/**
 * PowerDistributionStore — Zustand state for station bay configuration.
 *
 * CANONICAL CONTRACT (BINDING):
 * - Deterministic: sorted by id, stable operations.
 * - No auto-guessing: missing data → validation error.
 * - Polish labels only.
 *
 * ARCHITECTURE:
 * - APPLICATION LAYER: no physics, no model mutation.
 * - Uses existing domain types.
 */

import { create } from 'zustand';
import type {
  StationConfig,
  FieldConfig,
  DeviceConfig,
  FieldValidationResult,
} from './types';
import type { FieldRoleV1, EmbeddingRoleV1 } from '../sld/core/fieldDeviceContracts';
import { BAY_TEMPLATES } from './bayTemplates';
import { REQUIRED_DEVICES } from '../sld/core/switchgearConfig';

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface PowerDistributionState {
  /** Active station configuration. */
  station: StationConfig;
  /** Selected field ID (for inspector). */
  selectedFieldId: string | null;
  /** Selected device ID (for inspector). */
  selectedDeviceId: string | null;
  /** Field counter for deterministic ID generation. */
  fieldCounter: number;
  /** Device counter for deterministic ID generation. */
  deviceCounter: number;

  // --- Actions ---

  /** Set station metadata. */
  setStationName: (name: string) => void;
  setEmbeddingRole: (role: EmbeddingRoleV1) => void;

  /** Add a field from template. */
  addFieldFromTemplate: (fieldRole: FieldRoleV1) => void;
  /** Remove a field by ID. */
  removeField: (fieldId: string) => void;

  /** Add a device to a field. */
  addDevice: (fieldId: string, device: Omit<DeviceConfig, 'deviceId'>) => void;
  /** Remove a device from a field. */
  removeDevice: (fieldId: string, deviceId: string) => void;

  /** Selection. */
  selectField: (fieldId: string | null) => void;
  selectDevice: (deviceId: string | null) => void;

  /** Reset to empty station. */
  resetStation: () => void;

  /** Validate all fields. */
  validateFields: () => readonly FieldValidationResult[];
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

function createEmptyStation(): StationConfig {
  return {
    stationId: 'station-001',
    stationName: 'Stacja SN/nN',
    embeddingRole: 'TRUNK_INLINE',
    fields: [],
    busSectionCount: 1,
  };
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const usePowerDistributionStore = create<PowerDistributionState>((set, get) => ({
  station: createEmptyStation(),
  selectedFieldId: null,
  selectedDeviceId: null,
  fieldCounter: 0,
  deviceCounter: 0,

  setStationName: (name: string) =>
    set((s) => ({
      station: { ...s.station, stationName: name },
    })),

  setEmbeddingRole: (role: EmbeddingRoleV1) =>
    set((s) => ({
      station: {
        ...s.station,
        embeddingRole: role,
        busSectionCount: role === 'LOCAL_SECTIONAL' ? 2 : 1,
      },
    })),

  addFieldFromTemplate: (fieldRole: FieldRoleV1) => {
    const template = BAY_TEMPLATES.get(fieldRole);
    if (!template) return;

    set((s) => {
      const fieldIdx = s.fieldCounter + 1;
      let devIdx = s.deviceCounter;

      const fieldId = `field-${String(fieldIdx).padStart(3, '0')}`;

      const devices: DeviceConfig[] = template.devices
        .filter((d) => d.required)
        .map((d) => {
          devIdx += 1;
          return {
            deviceId: `dev-${String(devIdx).padStart(4, '0')}`,
            deviceType: d.deviceType,
            electricalRole: d.electricalRole,
            powerPathPosition: d.powerPathPosition,
          };
        });

      const newField: FieldConfig = {
        fieldId,
        fieldRole,
        devices,
        busSectionId: 'bus-section-1',
      };

      return {
        station: {
          ...s.station,
          fields: [...s.station.fields, newField].sort((a, b) =>
            a.fieldId.localeCompare(b.fieldId),
          ),
        },
        fieldCounter: fieldIdx,
        deviceCounter: devIdx,
        selectedFieldId: fieldId,
      };
    });
  },

  removeField: (fieldId: string) =>
    set((s) => ({
      station: {
        ...s.station,
        fields: s.station.fields.filter((f) => f.fieldId !== fieldId),
      },
      selectedFieldId: s.selectedFieldId === fieldId ? null : s.selectedFieldId,
      selectedDeviceId: null,
    })),

  addDevice: (fieldId: string, device: Omit<DeviceConfig, 'deviceId'>) =>
    set((s) => {
      const devIdx = s.deviceCounter + 1;
      const deviceId = `dev-${String(devIdx).padStart(4, '0')}`;

      return {
        station: {
          ...s.station,
          fields: s.station.fields.map((f) =>
            f.fieldId === fieldId
              ? {
                  ...f,
                  devices: [...f.devices, { ...device, deviceId }].sort((a, b) =>
                    a.deviceId.localeCompare(b.deviceId),
                  ),
                }
              : f,
          ),
        },
        deviceCounter: devIdx,
      };
    }),

  removeDevice: (fieldId: string, deviceId: string) =>
    set((s) => ({
      station: {
        ...s.station,
        fields: s.station.fields.map((f) =>
          f.fieldId === fieldId
            ? { ...f, devices: f.devices.filter((d) => d.deviceId !== deviceId) }
            : f,
        ),
      },
      selectedDeviceId: s.selectedDeviceId === deviceId ? null : s.selectedDeviceId,
    })),

  selectField: (fieldId: string | null) =>
    set({ selectedFieldId: fieldId, selectedDeviceId: null }),

  selectDevice: (deviceId: string | null) => set({ selectedDeviceId: deviceId }),

  resetStation: () =>
    set({
      station: createEmptyStation(),
      selectedFieldId: null,
      selectedDeviceId: null,
      fieldCounter: 0,
      deviceCounter: 0,
    }),

  validateFields: (): readonly FieldValidationResult[] => {
    const { station } = get();
    return station.fields.map((field) => {
      const required = REQUIRED_DEVICES[field.fieldRole] ?? [];
      const presentTypes = new Set(field.devices.map((d) => d.deviceType));
      const missing = required.filter((dt) => !presentTypes.has(dt));

      return {
        fieldId: field.fieldId,
        isValid: missing.length === 0,
        missingDevices: missing,
        messagePl:
          missing.length === 0
            ? 'Pole kompletne'
            : `Brak wymaganych aparatow: ${missing.join(', ')}`,
      };
    });
  },
}));

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

export function useStation(): StationConfig {
  return usePowerDistributionStore((s) => s.station);
}

export function useSelectedFieldId(): string | null {
  return usePowerDistributionStore((s) => s.selectedFieldId);
}

export function useSelectedDeviceId(): string | null {
  return usePowerDistributionStore((s) => s.selectedDeviceId);
}
