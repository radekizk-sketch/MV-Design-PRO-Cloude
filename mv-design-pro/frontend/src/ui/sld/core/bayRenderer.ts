/**
 * bayRenderer.ts — Switchgear Bay Renderer (Computational Geometry)
 *
 * CANONICAL CONTRACT (BINDING):
 * - Version: V1
 * - COMPUTATIONAL LOGIC ONLY — no React components, no physics.
 * - Deterministic: sorted by ID, no randomness.
 * - Immutable interfaces (readonly).
 * - Imports types from fieldDeviceContracts.ts and layoutResult.ts.
 *
 * ARCHITECTURE:
 * - APPLICATION LAYER: visualization geometry only.
 * - NO physics calculations.
 * - NO model mutation.
 *
 * ETAP-GRADE bay layout algorithm:
 * - Fields sorted by canonical role priority.
 * - Devices placed vertically within bay by powerPathPosition.
 * - OFF_PATH devices offset horizontally.
 * - Busbar geometry spans all bays.
 * - LOCAL_SECTIONAL coupler geometry placed between bus sections.
 * - Internal connections: vertical lines for sequential power-path devices.
 * - All arrays sorted by ID for determinism.
 */

import type {
  StationBlockDetailV1,
  FieldV1,
  DeviceV1,
  FieldRoleV1,
  EmbeddingRoleV1,
} from './fieldDeviceContracts';
import {
  DevicePowerPathPositionV1,
  DeviceElectricalRoleV1,
  DeviceTypeV1,
} from './fieldDeviceContracts';
import type { PointV1, RectangleV1 } from './layoutResult';
import type { EtapSymbolId } from '../SymbolResolver';

// =============================================================================
// GEOMETRY CONSTANTS
// =============================================================================

/** Minimum bay width in pixels. */
const MIN_BAY_WIDTH = 60;

/** Height of busbar area at top of block. */
const BUSBAR_HEIGHT = 10;

/** Top and bottom margin inside block. */
const BLOCK_MARGIN = 10;

/** Vertical gap from busbar connection to first device (UPSTREAM). */
const DEVICE_Y_FROM_BUSBAR = 20;

/** Vertical step between sequential power-path devices. */
const DEVICE_VERTICAL_STEP = 30;

/** Horizontal offset for OFF_PATH devices (relative to bay center). */
const OFF_PATH_X_OFFSET = 25;

/** Default device size in pixels. */
const DEVICE_DEFAULT_WIDTH = 20;
const DEVICE_DEFAULT_HEIGHT = 20;

/** Larger device size for transformers and generators. */
const DEVICE_LARGE_WIDTH = 28;
const DEVICE_LARGE_HEIGHT = 28;

// =============================================================================
// FIELD ROLE PRIORITY ORDER (canonical, deterministic)
// =============================================================================

/**
 * Canonical sort order for field roles within a bay layout.
 *
 * Follows ETAP convention: primary supply bays on the left, then
 * transformers, then source bays, then couplers/ties, then LV bays.
 */
const FIELD_ROLE_PRIORITY: Record<string, number> = {
  LINE_IN: 0,
  LINE_OUT: 1,
  TRANSFORMER_SN_NN: 2,
  COUPLER_SN: 3,
  LINE_BRANCH: 4,
  PV_SN: 5,
  BESS_SN: 6,
  BUS_TIE: 7,
  MAIN_NN: 8,
  FEEDER_NN: 9,
  PV_NN: 10,
  BESS_NN: 11,
};

// =============================================================================
// DEVICE SIZE HELPERS
// =============================================================================

/**
 * Returns the rendered size for a given device type.
 * Large symbols are used for transformers and generators.
 */
function deviceSize(deviceType: DeviceTypeV1): { width: number; height: number } {
  switch (deviceType) {
    case DeviceTypeV1.TRANSFORMER_DEVICE:
    case DeviceTypeV1.GENERATOR_PV:
    case DeviceTypeV1.GENERATOR_BESS:
    case DeviceTypeV1.PCS:
    case DeviceTypeV1.BATTERY:
      return { width: DEVICE_LARGE_WIDTH, height: DEVICE_LARGE_HEIGHT };
    default:
      return { width: DEVICE_DEFAULT_WIDTH, height: DEVICE_DEFAULT_HEIGHT };
  }
}

/**
 * Returns rotation (degrees) for a device in a vertical bay.
 * CT and VT are oriented horizontally (90°) when placed inline.
 * All others are 0° (vertical orientation).
 */
function deviceRotation(deviceType: DeviceTypeV1): number {
  switch (deviceType) {
    case DeviceTypeV1.CT:
    case DeviceTypeV1.VT:
      return 90;
    default:
      return 0;
  }
}

// =============================================================================
// DEVICE TYPE → ETAP SYMBOL ID MAPPING
// =============================================================================

/**
 * Maps DeviceTypeV1 to EtapSymbolId.
 *
 * BINDING: every DeviceTypeV1 must have a canonical symbol.
 * Fallback: 'circuit_breaker' for unrecognised types.
 */
export function mapDeviceTypeToSymbolId(deviceType: DeviceTypeV1): EtapSymbolId {
  switch (deviceType) {
    case DeviceTypeV1.CB:
      return 'circuit_breaker';
    case DeviceTypeV1.DS:
      return 'disconnector';
    case DeviceTypeV1.CT:
      return 'ct';
    case DeviceTypeV1.VT:
      return 'vt';
    case DeviceTypeV1.RELAY:
      return 'relay';
    case DeviceTypeV1.FUSE:
      return 'fuse';
    case DeviceTypeV1.ES:
      return 'earthing_switch';
    case DeviceTypeV1.TRANSFORMER_DEVICE:
      return 'transformer_2w';
    case DeviceTypeV1.GENERATOR_PV:
      return 'pv';
    case DeviceTypeV1.GENERATOR_BESS:
      return 'bess';
    case DeviceTypeV1.ACB:
      return 'circuit_breaker';
    case DeviceTypeV1.CABLE_HEAD:
      return 'ground';
    case DeviceTypeV1.PCS:
      return 'inverter';
    case DeviceTypeV1.BATTERY:
      return 'bess';
    case DeviceTypeV1.LOAD_SWITCH:
      return 'circuit_breaker';
  }
}

// =============================================================================
// INTERFACE DEFINITIONS
// =============================================================================

/**
 * Geometry of a single device within a bay.
 *
 * All coordinates are in world pixels, absolute within the station block.
 */
export interface BayDeviceGeometryV1 {
  /** Stable device ID (= DeviceV1.id). */
  readonly deviceId: string;
  /** Device type. */
  readonly deviceType: DeviceTypeV1;
  /** ETAP symbol ID resolved from deviceType. */
  readonly symbolId: EtapSymbolId;
  /** Center position of the device within the bay (world coords). */
  readonly position: PointV1;
  /** Rendered size of the device symbol. */
  readonly size: { readonly width: number; readonly height: number };
  /** Rotation in degrees (0 = vertical, 90 = horizontal). */
  readonly rotation: number;
  /**
   * Whether this device is on the main power path.
   * POWER_PATH, MEASUREMENT, and TERMINATION roles = true.
   * PROTECTION / OFF_PATH = false.
   */
  readonly isOnPowerPath: boolean;
  /**
   * Absolute connection points at top/bottom of device symbol center.
   * Used to draw internal connections between sequential devices.
   */
  readonly connectionPoints: {
    readonly top: PointV1;
    readonly bottom: PointV1;
  };
}

/**
 * Geometry of a single switchgear bay (= FieldV1).
 *
 * A bay is a vertical column within the station block, containing one field's
 * devices arranged top-to-bottom from busbar to cable exit.
 */
export interface BayGeometryV1 {
  /** Bay ID equals the FieldV1.id. */
  readonly bayId: string;
  /** Parent station ID. */
  readonly stationId: string;
  /** Field role of this bay. */
  readonly fieldRole: FieldRoleV1;
  /** Bounding box of the bay within the station block (world coords). */
  readonly bounds: RectangleV1;
  /** Y-coordinate of the busbar connection point for this bay. */
  readonly busbarY: number;
  /** Devices within this bay, sorted by deviceId for determinism. */
  readonly devices: readonly BayDeviceGeometryV1[];
  /** Point where the line/cable connects to this bay (bottom of bay). */
  readonly cableExitPoint: PointV1;
  /** Incoming trunk port position (null if not applicable). */
  readonly portIn: PointV1 | null;
  /** Outgoing trunk port position (null if not applicable). */
  readonly portOut: PointV1 | null;
}

/**
 * Geometry of the busbar running across the station block.
 *
 * For LOCAL_SECTIONAL stations there are two bus sections; for all others
 * there is a single section spanning all bays.
 */
export interface BusbarGeometryV1 {
  /** Y-coordinate of the busbar in world coords. */
  readonly y: number;
  /** Left x-coordinate of the busbar span. */
  readonly x1: number;
  /** Right x-coordinate of the busbar span. */
  readonly x2: number;
  /** Bus sections (one per BusSectionV1, sorted by sectionId). */
  readonly sections: readonly {
    readonly x1: number;
    readonly x2: number;
    readonly sectionId: string;
  }[];
}

/**
 * Geometry of the bus coupler device for LOCAL_SECTIONAL stations.
 *
 * The coupler is placed centrally between the two bus sections.
 */
export interface CouplerGeometryV1 {
  /** ID of the coupler field (= StationBlockDetailV1.couplerFieldId). */
  readonly couplerFieldId: string;
  /** Center position of the coupler device. */
  readonly position: PointV1;
  /** Rendered size of the coupler. */
  readonly size: { readonly width: number; readonly height: number };
  /** Y-coordinate of busbar section 1 (left). */
  readonly busbar1Y: number;
  /** Y-coordinate of busbar section 2 (right). */
  readonly busbar2Y: number;
}

/**
 * Complete bay layout result for a station block.
 *
 * Top-level output of computeBayLayout(). Consumed by the SLD renderer
 * to draw station internals. Contains no physics — geometry only.
 */
export interface StationBayLayoutV1 {
  /** Station ID (= StationBlockDetailV1.blockId). */
  readonly stationId: string;
  /** Embedding role determining layout variant. */
  readonly embeddingRole: EmbeddingRoleV1;
  /** Total bounding box of the station block. */
  readonly totalBounds: RectangleV1;
  /** Busbar geometry. */
  readonly busbarGeometry: BusbarGeometryV1;
  /** All bays, sorted by bayId for determinism. */
  readonly bays: readonly BayGeometryV1[];
  /** Coupler geometry for LOCAL_SECTIONAL stations; null otherwise. */
  readonly couplerGeometry: CouplerGeometryV1 | null;
  /**
   * Internal vertical connections between sequential power-path devices
   * within each bay. Sorted by from.x, then from.y for determinism.
   */
  readonly internalConnections: readonly { readonly from: PointV1; readonly to: PointV1 }[];
}

// =============================================================================
// MAIN ALGORITHM
// =============================================================================

/**
 * Sort fields by canonical role priority, then by field ID as stable tiebreak.
 */
function sortFieldsByRolePriority(fields: readonly FieldV1[]): readonly FieldV1[] {
  return [...fields].sort((a, b) => {
    const pa = FIELD_ROLE_PRIORITY[a.fieldRole] ?? 99;
    const pb = FIELD_ROLE_PRIORITY[b.fieldRole] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Returns the power-path ordering index for a device position.
 * Used to sort devices top-to-bottom within a bay.
 */
function powerPathOrder(pos: string): number {
  switch (pos) {
    case DevicePowerPathPositionV1.UPSTREAM:
      return 0;
    case DevicePowerPathPositionV1.MIDSTREAM:
      return 1;
    case DevicePowerPathPositionV1.DOWNSTREAM:
      return 2;
    case DevicePowerPathPositionV1.OFF_PATH:
      return 3;
    default:
      return 9;
  }
}

/**
 * Returns true if the device is considered "on the power path" for the
 * purpose of isOnPowerPath and internal connection drawing.
 */
function isDeviceOnPowerPath(device: DeviceV1): boolean {
  return (
    device.electricalRole === DeviceElectricalRoleV1.POWER_PATH ||
    device.electricalRole === DeviceElectricalRoleV1.MEASUREMENT ||
    device.electricalRole === DeviceElectricalRoleV1.TERMINATION
  );
}

/**
 * Build BayDeviceGeometryV1 for all devices in a single field.
 *
 * Devices are placed vertically:
 *   UPSTREAM   → busbarY + DEVICE_Y_FROM_BUSBAR
 *   MIDSTREAM  → previous + DEVICE_VERTICAL_STEP
 *   DOWNSTREAM → previous + DEVICE_VERTICAL_STEP
 *   OFF_PATH   → same y as MIDSTREAM slot, but x offset by OFF_PATH_X_OFFSET
 *
 * All positions are world coordinates within the station block.
 */
function buildBayDevices(
  fieldDevices: readonly DeviceV1[],
  bayCenterX: number,
  busbarY: number,
): readonly BayDeviceGeometryV1[] {
  // Sort devices: by power-path position order, then stable by device ID.
  const sorted = [...fieldDevices].sort((a, b) => {
    const pa = powerPathOrder(a.powerPathPosition);
    const pb = powerPathOrder(b.powerPathPosition);
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });

  const devices: BayDeviceGeometryV1[] = [];

  // Track the current Y for sequential on-path devices.
  let currentPathY = busbarY + DEVICE_Y_FROM_BUSBAR;
  // Track the MIDSTREAM Y for OFF_PATH alignment (off-path uses the midstream slot y).
  let midstreamY = busbarY + DEVICE_Y_FROM_BUSBAR + DEVICE_VERTICAL_STEP;

  // Pre-scan to find the midstream Y slot for OFF_PATH devices.
  // If there is a MIDSTREAM device, use its computed Y; otherwise use the slot.
  let upstreamFound = false;
  let midstreamFound = false;
  let computedMidstreamY = midstreamY;
  let tempY = busbarY + DEVICE_Y_FROM_BUSBAR;
  for (const d of sorted) {
    if (d.powerPathPosition === DevicePowerPathPositionV1.UPSTREAM) {
      if (!upstreamFound) {
        upstreamFound = true;
        computedMidstreamY = tempY + DEVICE_VERTICAL_STEP;
        tempY += DEVICE_VERTICAL_STEP;
      }
    } else if (d.powerPathPosition === DevicePowerPathPositionV1.MIDSTREAM) {
      if (!midstreamFound) {
        midstreamFound = true;
        computedMidstreamY = tempY;
        tempY += DEVICE_VERTICAL_STEP;
      }
    } else if (d.powerPathPosition === DevicePowerPathPositionV1.DOWNSTREAM) {
      tempY += DEVICE_VERTICAL_STEP;
    }
  }

  // Reset and build actual device geometry.
  currentPathY = busbarY + DEVICE_Y_FROM_BUSBAR;

  for (const device of sorted) {
    const sym = mapDeviceTypeToSymbolId(device.deviceType);
    const sz = deviceSize(device.deviceType);
    const rot = deviceRotation(device.deviceType);
    const onPath = isDeviceOnPowerPath(device);

    let cx: number;
    let cy: number;

    if (device.powerPathPosition === DevicePowerPathPositionV1.OFF_PATH) {
      // OFF_PATH: placed to the right of the bay center at the midstream Y level.
      cx = bayCenterX + OFF_PATH_X_OFFSET;
      cy = computedMidstreamY;
    } else {
      // On-path: placed centered in bay, stepped down.
      cx = bayCenterX;
      cy = currentPathY;
      currentPathY += DEVICE_VERTICAL_STEP;
    }

    const position: PointV1 = { x: cx, y: cy };

    const connectionPoints = {
      top: { x: cx, y: cy - sz.height / 2 },
      bottom: { x: cx, y: cy + sz.height / 2 },
    };

    devices.push({
      deviceId: device.id,
      deviceType: device.deviceType,
      symbolId: sym,
      position,
      size: sz,
      rotation: rot,
      isOnPowerPath: onPath,
      connectionPoints,
    });
  }

  // Sort result by deviceId for determinism.
  return [...devices].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
}

/**
 * Build internal connections (vertical lines) between sequential power-path
 * devices within a single bay. Connections run from the bottom connection
 * point of device[i] to the top connection point of device[i+1], where
 * both devices are on the power path, ordered by powerPathPosition.
 */
function buildInternalConnections(
  bayDevices: readonly BayDeviceGeometryV1[],
): readonly { readonly from: PointV1; readonly to: PointV1 }[] {
  // Filter to on-path devices only, sort by Y (top-to-bottom).
  const onPath = [...bayDevices]
    .filter(d => d.isOnPowerPath)
    .sort((a, b) => a.position.y - b.position.y);

  const connections: { from: PointV1; to: PointV1 }[] = [];

  for (let i = 0; i < onPath.length - 1; i++) {
    const from = onPath[i].connectionPoints.bottom;
    const to = onPath[i + 1].connectionPoints.top;
    // Only add connection if there is an actual vertical gap.
    if (to.y > from.y) {
      connections.push({ from, to });
    }
  }

  return connections;
}

/**
 * Compute trunk port positions from the station block's port declarations
 * and the bay's cable exit point.
 *
 * Port directions:
 * - trunkInPort → top center of the bay (aligned with busbar).
 * - trunkOutPort → bottom center of the bay (cable exit).
 * - branchPort → bottom center (same as cable exit for branch fields).
 *
 * Only LINE_IN / LINE_OUT / LINE_BRANCH fields carry trunk ports.
 */
function resolveBayPorts(
  field: FieldV1,
  blockPorts: StationBlockDetailV1['ports'],
  bayCenterX: number,
  busbarY: number,
  cableExitY: number,
): { portIn: PointV1 | null; portOut: PointV1 | null } {
  let portIn: PointV1 | null = null;
  let portOut: PointV1 | null = null;

  if (field.fieldRole === 'LINE_IN' && blockPorts.trunkInPort) {
    portIn = { x: bayCenterX, y: busbarY };
  }
  if (field.fieldRole === 'LINE_OUT' && blockPorts.trunkOutPort) {
    portOut = { x: bayCenterX, y: cableExitY };
  }
  if (field.fieldRole === 'LINE_BRANCH' && blockPorts.branchPort) {
    portOut = { x: bayCenterX, y: cableExitY };
  }

  return { portIn, portOut };
}

/**
 * Compute the full bay layout for a station block.
 *
 * Algorithm (deterministic, ETAP-grade):
 *
 * 1. Sort fields by role priority (LINE_IN, LINE_OUT, TRANSFORMER_SN_NN, ...).
 * 2. Compute bay width = blockBounds.width / max(fields.length, 1), min 60px.
 * 3. Busbar Y = blockBounds.y + BLOCK_MARGIN.
 * 4. For each field:
 *    a. Bay bounds = (blockBounds.x + i * bayWidth, blockBounds.y, bayWidth, bayHeight).
 *    b. bayCenterX = bayBounds.x + bayWidth / 2.
 *    c. Build devices vertically within bay.
 *    d. cableExitPoint = bottom of bay center.
 *    e. Resolve trunk ports.
 * 5. Busbar geometry spans all bays at busbarY.
 * 6. For LOCAL_SECTIONAL: compute coupler geometry between bus sections.
 * 7. Collect all internal connections.
 * 8. Sort bays by bayId, internalConnections by from.x then from.y.
 *
 * @param detail - StationBlockDetailV1 with full field/device/anchor data.
 * @param blockBounds - Bounding box of the station block in world coords.
 * @returns StationBayLayoutV1 — immutable, deterministic layout result.
 */
export function computeBayLayout(
  detail: StationBlockDetailV1,
  blockBounds: RectangleV1,
): StationBayLayoutV1 {
  const sortedFields = sortFieldsByRolePriority(detail.fields);
  const fieldCount = Math.max(sortedFields.length, 1);

  // Bay dimensions
  const rawBayWidth = blockBounds.width / fieldCount;
  const bayWidth = Math.max(rawBayWidth, MIN_BAY_WIDTH);

  const busbarY = blockBounds.y + BLOCK_MARGIN;
  const bayAreaHeight = blockBounds.height - BUSBAR_HEIGHT - BLOCK_MARGIN * 2;
  const cableExitY = blockBounds.y + blockBounds.height - BLOCK_MARGIN;

  // Build a map of deviceId → DeviceV1 for efficient lookup.
  const deviceById = new Map<string, DeviceV1>(detail.devices.map(d => [d.id, d]));

  // Build bays (unsorted; sort at end).
  const bays: BayGeometryV1[] = [];
  const allInternalConnections: { from: PointV1; to: PointV1 }[] = [];

  sortedFields.forEach((field, idx) => {
    const bayX = blockBounds.x + idx * bayWidth;
    const bayCenterX = bayX + bayWidth / 2;

    const bayBounds: RectangleV1 = {
      x: bayX,
      y: blockBounds.y,
      width: bayWidth,
      height: bayAreaHeight + BUSBAR_HEIGHT + BLOCK_MARGIN * 2,
    };

    // Collect devices belonging to this field.
    const fieldDevices: DeviceV1[] = field.deviceIds
      .map(id => deviceById.get(id))
      .filter((d): d is DeviceV1 => d !== undefined);

    const deviceGeometries = buildBayDevices(fieldDevices, bayCenterX, busbarY);

    const cableExitPoint: PointV1 = { x: bayCenterX, y: cableExitY };

    const { portIn, portOut } = resolveBayPorts(
      field,
      detail.ports,
      bayCenterX,
      busbarY,
      cableExitY,
    );

    // Internal connections for this bay.
    const bayConnections = buildInternalConnections(deviceGeometries);
    allInternalConnections.push(...bayConnections);

    bays.push({
      bayId: field.id,
      stationId: detail.blockId,
      fieldRole: field.fieldRole,
      bounds: bayBounds,
      busbarY,
      devices: deviceGeometries,
      cableExitPoint,
      portIn,
      portOut,
    });
  });

  // Sort bays by bayId for determinism.
  const sortedBays = [...bays].sort((a, b) => a.bayId.localeCompare(b.bayId));

  // --- Busbar geometry ---
  // The busbar spans from the leftmost to rightmost bay edge.
  const busbarX1 = blockBounds.x;
  const busbarX2 = blockBounds.x + sortedFields.length * bayWidth;

  // Build bus sections from detail.busSections (sorted by id).
  const sortedBusSections = [...detail.busSections].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  let busSections: { x1: number; x2: number; sectionId: string }[];
  if (sortedBusSections.length <= 1) {
    // Single bus section spanning all bays.
    busSections = [
      {
        x1: busbarX1,
        x2: busbarX2,
        sectionId: sortedBusSections[0]?.id ?? detail.blockId,
      },
    ];
  } else {
    // Multiple bus sections: distribute evenly across available width.
    const totalWidth = busbarX2 - busbarX1;
    const sectionWidth = totalWidth / sortedBusSections.length;
    busSections = sortedBusSections.map((sec, i) => ({
      x1: busbarX1 + i * sectionWidth,
      x2: busbarX1 + (i + 1) * sectionWidth,
      sectionId: sec.id,
    }));
  }

  const busbarGeometry: BusbarGeometryV1 = {
    y: busbarY,
    x1: busbarX1,
    x2: busbarX2,
    sections: busSections,
  };

  // --- Coupler geometry (LOCAL_SECTIONAL only) ---
  let couplerGeometry: CouplerGeometryV1 | null = null;

  if (
    detail.embeddingRole === 'LOCAL_SECTIONAL' &&
    detail.couplerFieldId !== null &&
    busSections.length >= 2
  ) {
    const couplerFieldId = detail.couplerFieldId;
    const sec1 = busSections[0];
    const sec2 = busSections[1];

    // Position coupler at the midpoint between the two sections.
    const couplerX = (sec1.x2 + sec2.x1) / 2;
    const couplerY = busbarY + DEVICE_Y_FROM_BUSBAR;

    couplerGeometry = {
      couplerFieldId,
      position: { x: couplerX, y: couplerY },
      size: { width: DEVICE_DEFAULT_WIDTH, height: DEVICE_DEFAULT_HEIGHT },
      busbar1Y: busbarY,
      busbar2Y: busbarY,
    };
  }

  // Sort internal connections by from.x then from.y for determinism.
  const sortedConnections = [...allInternalConnections].sort((a, b) => {
    if (a.from.x !== b.from.x) return a.from.x - b.from.x;
    return a.from.y - b.from.y;
  });

  return {
    stationId: detail.blockId,
    embeddingRole: detail.embeddingRole,
    totalBounds: blockBounds,
    busbarGeometry,
    bays: sortedBays,
    couplerGeometry,
    internalConnections: sortedConnections,
  };
}
