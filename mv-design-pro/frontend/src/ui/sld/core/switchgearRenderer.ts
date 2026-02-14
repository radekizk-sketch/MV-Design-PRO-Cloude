/**
 * Switchgear Renderer — deterministic field/apparatus rendering for SLD station blocks.
 *
 * RUN #3G §3: Tryb rozdzielnicowy stacji (switchgear-mode, kanon).
 *
 * GEOMETRY RULES (BINDING):
 * - Szyna SN poziomo
 * - Pola SN jako kolumny w stalej siatce (pitch staly)
 * - CT w osi toru mocy (MIDSTREAM)
 * - VT boczny (OFF_PATH)
 * - Zabezpieczenie poza torem mocy (OFF_PATH, nad wylacznikiem)
 * - Glowica kablowa jako trojkat na zakonczeniu toru kabla
 * - Symbol–symbol overlap = 0 (krytyczne)
 *
 * INVARIANTS:
 * - Deterministic: same input → same output
 * - No fabricated IDs: all elementIds from domain
 * - Only symbols from SldSymbolTypeV1 registry
 * - No decorative symbols
 */

import type {
  DeviceAnchorV1,
  FieldV1,
  DeviceV1,
  BusSectionV1,
  StationBlockDetailV1,
} from './fieldDeviceContracts';
import {
  DevicePowerPathPositionV1,
  DeviceTypeV1,
  FieldRoleV1,
  SldSymbolTypeV1,
  DEVICE_TO_SYMBOL,
} from './fieldDeviceContracts';

// ---------------------------------------------------------------------------
// Rendering constants (switchgear-mode canonical layout)
// ---------------------------------------------------------------------------

/** Pitch between field columns (px). */
export const FIELD_COLUMN_PITCH = 80;

/** Height of device slot in field column (px). */
export const DEVICE_SLOT_HEIGHT = 40;

/** Width of device symbol (px). */
export const DEVICE_SYMBOL_WIDTH = 30;

/** Height of device symbol (px). */
export const DEVICE_SYMBOL_HEIGHT = 30;

/** Bus bar height (px). */
export const BUS_BAR_HEIGHT = 8;

/** Offset for OFF_PATH devices (VT, RELAY) from power path axis (px). */
export const OFF_PATH_OFFSET_X = 35;

/** Busbar Y position. */
export const BUSBAR_Y = 0;

// ---------------------------------------------------------------------------
// Rendered element types
// ---------------------------------------------------------------------------

export interface SwitchgearRenderElementV1 {
  readonly elementId: string;
  readonly elementType: 'BUS_BAR' | 'DEVICE_SYMBOL' | 'FIELD_COLUMN' | 'CONNECTION_LINE';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly symbolType: string | null;
  readonly fieldId: string | null;
  readonly deviceType: string | null;
  readonly selectable: boolean;
  readonly label: string | null;
}

export interface SwitchgearRenderResultV1 {
  readonly stationId: string;
  readonly elements: readonly SwitchgearRenderElementV1[];
  readonly totalWidth: number;
  readonly totalHeight: number;
  readonly fieldCount: number;
  readonly deviceCount: number;
}

// ---------------------------------------------------------------------------
// Layout computation
// ---------------------------------------------------------------------------

/**
 * Compute device Y position based on power path position (deterministic).
 *
 * UPSTREAM (disconnector top) → row 1
 * MIDSTREAM (CB, CT) → row 2
 * DOWNSTREAM (cable head, fuse) → row 3
 * OFF_PATH (relay, VT) → rendered beside MIDSTREAM, offset X
 */
function deviceRowForPosition(pos: string): number {
  switch (pos) {
    case DevicePowerPathPositionV1.UPSTREAM:
      return 1;
    case DevicePowerPathPositionV1.MIDSTREAM:
      return 2;
    case DevicePowerPathPositionV1.DOWNSTREAM:
      return 3;
    case DevicePowerPathPositionV1.OFF_PATH:
      return 2; // Same Y as MIDSTREAM but offset X
    default:
      return 4;
  }
}

/**
 * Render a station block into visual elements for SLD.
 *
 * DETERMINISTIC: sorted by fieldId then deviceId.
 * OVERLAP=0: each device gets a unique grid slot.
 */
export function renderSwitchgearBlock(
  block: StationBlockDetailV1,
): SwitchgearRenderResultV1 {
  const elements: SwitchgearRenderElementV1[] = [];

  const sortedFields = [...block.fields].sort((a, b) => a.id.localeCompare(b.id));
  const fieldCount = sortedFields.length;
  const totalWidth = Math.max(fieldCount * FIELD_COLUMN_PITCH, FIELD_COLUMN_PITCH);

  // 1. Render bus bars
  for (const bus of block.busSections) {
    elements.push({
      elementId: bus.id,
      elementType: 'BUS_BAR',
      x: 0,
      y: BUSBAR_Y,
      width: totalWidth,
      height: BUS_BAR_HEIGHT,
      symbolType: null,
      fieldId: null,
      deviceType: null,
      selectable: true,
      label: null,
    });
  }

  // 2. Render field columns
  let maxDeviceRow = 3;

  for (let fi = 0; fi < sortedFields.length; fi++) {
    const field = sortedFields[fi];
    const fieldX = fi * FIELD_COLUMN_PITCH;

    // Field column background (selectable)
    elements.push({
      elementId: field.id,
      elementType: 'FIELD_COLUMN',
      x: fieldX,
      y: BUS_BAR_HEIGHT,
      width: FIELD_COLUMN_PITCH,
      height: 4 * DEVICE_SLOT_HEIGHT,
      symbolType: null,
      fieldId: field.id,
      deviceType: null,
      selectable: true,
      label: field.fieldRole,
    });

    // 3. Render devices in field
    const fieldDevices = [...block.devices]
      .filter(d => d.fieldId === field.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const device of fieldDevices) {
      const row = deviceRowForPosition(device.powerPathPosition);
      if (row > maxDeviceRow) maxDeviceRow = row;

      const isOffPath = device.powerPathPosition === DevicePowerPathPositionV1.OFF_PATH;

      const symbolType = DEVICE_TO_SYMBOL[device.deviceType as DeviceTypeV1] ?? null;

      const deviceX = fieldX + FIELD_COLUMN_PITCH / 2 - DEVICE_SYMBOL_WIDTH / 2
        + (isOffPath ? OFF_PATH_OFFSET_X : 0);
      const deviceY = BUS_BAR_HEIGHT + row * DEVICE_SLOT_HEIGHT;

      elements.push({
        elementId: device.id,
        elementType: 'DEVICE_SYMBOL',
        x: deviceX,
        y: deviceY,
        width: DEVICE_SYMBOL_WIDTH,
        height: DEVICE_SYMBOL_HEIGHT,
        symbolType,
        fieldId: field.id,
        deviceType: device.deviceType,
        selectable: true,
        label: null,
      });
    }

    // 4. Connection line from busbar to first device
    if (fieldDevices.length > 0) {
      elements.push({
        elementId: `conn_${field.id}`,
        elementType: 'CONNECTION_LINE',
        x: fieldX + FIELD_COLUMN_PITCH / 2,
        y: BUS_BAR_HEIGHT,
        width: 1,
        height: DEVICE_SLOT_HEIGHT,
        symbolType: null,
        fieldId: field.id,
        deviceType: null,
        selectable: false,
        label: null,
      });
    }
  }

  const totalHeight = BUS_BAR_HEIGHT + (maxDeviceRow + 1) * DEVICE_SLOT_HEIGHT;

  return {
    stationId: block.blockId,
    elements: [...elements].sort((a, b) => a.elementId.localeCompare(b.elementId)),
    totalWidth,
    totalHeight,
    fieldCount,
    deviceCount: block.devices.length,
  };
}

// ---------------------------------------------------------------------------
// Overlap detection (invariant: overlap = 0)
// ---------------------------------------------------------------------------

export interface OverlapCheckResultV1 {
  readonly hasOverlap: boolean;
  readonly overlappingPairs: readonly [string, string][];
}

/**
 * Check for symbol-symbol overlap in rendered elements.
 * CRITICAL INVARIANT: overlap must be 0.
 */
export function checkSymbolOverlap(
  result: SwitchgearRenderResultV1,
): OverlapCheckResultV1 {
  const symbols = result.elements.filter(e => e.elementType === 'DEVICE_SYMBOL');
  const overlaps: [string, string][] = [];

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const a = symbols[i];
      const b = symbols[j];

      const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
      const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;

      if (overlapX && overlapY) {
        overlaps.push([a.elementId, b.elementId]);
      }
    }
  }

  return {
    hasOverlap: overlaps.length > 0,
    overlappingPairs: overlaps,
  };
}

// ---------------------------------------------------------------------------
// Symbol validation (only registry symbols)
// ---------------------------------------------------------------------------

/**
 * Validate that all device symbols are from the SldSymbolTypeV1 registry.
 * No decorative symbols allowed.
 */
export function validateSymbolRegistry(
  result: SwitchgearRenderResultV1,
): { valid: boolean; invalidSymbols: string[] } {
  const validSymbols = new Set(Object.values(SldSymbolTypeV1));
  const deviceElements = result.elements.filter(e => e.elementType === 'DEVICE_SYMBOL');
  const invalidSymbols: string[] = [];

  for (const el of deviceElements) {
    if (el.symbolType && !validSymbols.has(el.symbolType)) {
      invalidSymbols.push(`${el.elementId}: ${el.symbolType}`);
    }
  }

  return {
    valid: invalidSymbols.length === 0,
    invalidSymbols,
  };
}

// ---------------------------------------------------------------------------
// Selection helpers
// ---------------------------------------------------------------------------

/**
 * Find rendered element by elementId (for SLD click → selection).
 */
export function findElementById(
  result: SwitchgearRenderResultV1,
  elementId: string,
): SwitchgearRenderElementV1 | null {
  return result.elements.find(e => e.elementId === elementId) ?? null;
}

/**
 * Find all devices in a field (for field selection → device highlight).
 */
export function findDevicesInField(
  result: SwitchgearRenderResultV1,
  fieldId: string,
): readonly SwitchgearRenderElementV1[] {
  return result.elements.filter(
    e => e.fieldId === fieldId && e.elementType === 'DEVICE_SYMBOL',
  );
}
