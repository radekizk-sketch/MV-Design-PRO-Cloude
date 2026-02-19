/**
 * CDSE Context Resolver — deterministic context resolution from SLD elements.
 *
 * Given an elementId and LogicalViews, resolves the full operational context
 * without heuristics. Every resolution is deterministic: same input → same output.
 *
 * INVARIANTS:
 * - NO heuristics, NO guessing
 * - 100% deterministic mapping
 * - Context derived ONLY from LogicalViews (which derive from Snapshot)
 * - No local graph state
 */

/**
 * Resolved context types for SLD click dispatch.
 */
export type CdseContextType =
  | 'TRUNK_TERMINAL'      // End of trunk → can extend trunk
  | 'TRUNK_SEGMENT'       // Middle of trunk → can insert station
  | 'BRANCH_PORT'         // Branch port → can add branch
  | 'RING_PORT'           // Ring connection port
  | 'STATION_DEVICE'      // Device inside station (CB, trafo, etc.)
  | 'BUS_SECTION'         // Bus/busbar section
  | 'LOAD'                // Load element
  | 'SOURCE'              // Grid source / generator
  | 'INVERTER_SOURCE'     // PV / BESS inverter
  | 'PROTECTION_DEVICE'   // Relay / protection
  | 'MEASUREMENT_DEVICE'  // CT / VT
  | 'SWITCH'              // Switch / breaker
  | 'UNKNOWN';            // Fallback (should trigger readiness warning)

/**
 * Full resolved context for an SLD element click.
 *
 * All fields are deterministic — derived from LogicalViews only.
 */
export interface CdseResolvedContext {
  /** Resolved context type */
  contextType: CdseContextType;
  /** Element ID that was clicked */
  elementId: string;
  /** Optional port ID (for port-level clicks) */
  portId?: string;
  /** Trunk ID if element is part of a trunk */
  trunkId?: string;
  /** Segment ID if element is a segment */
  segmentId?: string;
  /** Terminal/bus ID if element is a terminal */
  terminalId?: string;
  /** Branch ID if element is part of a branch */
  branchId?: string;
  /** Station ID if element is inside a station */
  stationId?: string;
  /** Catalog namespace for the element (if applicable) */
  catalogNamespace?: string;
}

/**
 * Minimal LogicalViews projection needed by context resolver.
 * Avoids importing full LogicalViews type for decoupling.
 */
export interface LogicalViewsProjection {
  trunks: Array<{
    trunkId: string;
    segments: Array<{
      segmentId: string;
      fromTerminal: string;
      toTerminal: string;
      elementIds: string[];
    }>;
    terminals: string[];
  }>;
  branches: Array<{
    branchId: string;
    fromTerminal: string;
    elementIds: string[];
  }>;
  stations: Array<{
    stationId: string;
    elementIds: string[];
  }>;
  elementTypeMap: Record<string, string>;
}

/**
 * Element type → CdseContextType mapping.
 * Deterministic, no fallthrough logic.
 */
const ELEMENT_TYPE_TO_CONTEXT: Record<string, CdseContextType> = {
  'Bus': 'BUS_SECTION',
  'LineBranch': 'TRUNK_SEGMENT',
  'CableBranch': 'TRUNK_SEGMENT',
  'TransformerBranch': 'STATION_DEVICE',
  'Switch': 'SWITCH',
  'Breaker': 'SWITCH',
  'Disconnector': 'SWITCH',
  'Load': 'LOAD',
  'ExternalGrid': 'SOURCE',
  'Generator': 'SOURCE',
  'PVInverter': 'INVERTER_SOURCE',
  'BESSInverter': 'INVERTER_SOURCE',
  'Relay': 'PROTECTION_DEVICE',
  'CT': 'MEASUREMENT_DEVICE',
  'VT': 'MEASUREMENT_DEVICE',
};

/**
 * Element type → catalog namespace mapping.
 */
const ELEMENT_TYPE_TO_NAMESPACE: Record<string, string> = {
  'CableBranch': 'KABEL_SN',
  'LineBranch': 'LINIA_SN',
  'TransformerBranch': 'TRAFO_SN_NN',
  'Load': 'OBCIAZENIE',
  'PVInverter': 'ZRODLO_NN_PV',
  'BESSInverter': 'ZRODLO_NN_BESS',
  'CT': 'CT',
  'VT': 'VT',
  'Relay': 'ZABEZPIECZENIE',
};

/**
 * Resolve context for an SLD element.
 *
 * @param elementId - Element ID from SLD click
 * @param portId - Optional port ID (for port-level interactions)
 * @param views - LogicalViews projection from Snapshot
 * @returns Fully resolved context, deterministic
 */
export function resolveContext(
  elementId: string,
  portId: string | undefined,
  views: LogicalViewsProjection,
): CdseResolvedContext {
  const elementType = views.elementTypeMap[elementId] ?? '';
  const baseContextType = ELEMENT_TYPE_TO_CONTEXT[elementType] ?? 'UNKNOWN';
  const catalogNamespace = ELEMENT_TYPE_TO_NAMESPACE[elementType];

  // Find trunk membership
  let trunkId: string | undefined;
  let segmentId: string | undefined;
  let terminalId: string | undefined;
  for (const trunk of views.trunks) {
    for (const seg of trunk.segments) {
      if (seg.elementIds.includes(elementId)) {
        trunkId = trunk.trunkId;
        segmentId = seg.segmentId;
        break;
      }
    }
    if (trunk.terminals.includes(elementId)) {
      trunkId = trunk.trunkId;
      terminalId = elementId;
    }
    if (trunkId) break;
  }

  // Find branch membership
  let branchId: string | undefined;
  for (const branch of views.branches) {
    if (branch.elementIds.includes(elementId)) {
      branchId = branch.branchId;
      break;
    }
  }

  // Find station membership
  let stationId: string | undefined;
  for (const station of views.stations) {
    if (station.elementIds.includes(elementId)) {
      stationId = station.stationId;
      break;
    }
  }

  // Refine context type based on topology position
  let contextType = baseContextType;

  // Terminal at end of trunk → TRUNK_TERMINAL
  if (terminalId && trunkId) {
    const trunk = views.trunks.find((t) => t.trunkId === trunkId);
    if (trunk) {
      const lastTerminal = trunk.terminals[trunk.terminals.length - 1];
      if (terminalId === lastTerminal) {
        contextType = 'TRUNK_TERMINAL';
      }
    }
  }

  // Port-level click on a bus section → BRANCH_PORT or RING_PORT
  if (portId && baseContextType === 'BUS_SECTION') {
    // Determine if this is a ring port or branch port
    // (ring ports connect to existing terminals on the same trunk)
    contextType = 'BRANCH_PORT';
  }

  return {
    contextType,
    elementId,
    portId,
    trunkId,
    segmentId,
    terminalId,
    branchId,
    stationId,
    catalogNamespace,
  };
}
