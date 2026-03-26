/**
 * EngineeringLabels V1 — Deterministic engineering label placement for SLD.
 *
 * Phase 5 of LayoutPipeline: positions technical annotations on the diagram.
 *
 * 3 label modes (from sldLabelLayer.ts):
 * - MINIMALNY: element name, state only
 * - TECHNICZNY: voltage, power, current, loading, cable type, length
 * - ANALITYCZNY: impedance Z=R+jX, power flow P→/Q→, Δu%, Ik3p
 *
 * INVARIANTS:
 * - NO physics calculations — placement and formatting only
 * - Deterministic (sorted by reference ID, no randomness)
 * - Immutable interfaces (readonly)
 * - FNV-1a hash for verification
 * - All values with units (always visible)
 */

import type { PointV1, NodePlacementV1, EdgeRouteV1 } from './layoutResult';
import type { LabelMode } from '../sldLabelLayer';

// =============================================================================
// LABEL ANCHOR
// =============================================================================

export const LabelAnchorSide = {
  RIGHT: 'RIGHT',
  LEFT: 'LEFT',
  BELOW: 'BELOW',
  ABOVE: 'ABOVE',
} as const;

export type LabelAnchorSide = (typeof LabelAnchorSide)[keyof typeof LabelAnchorSide];

// =============================================================================
// LABEL LINE
// =============================================================================

export interface EngineeringLabelLineV1 {
  readonly text: string;
  readonly unit: string;
  readonly color: string;
  readonly bold?: boolean;
}

// =============================================================================
// ENGINEERING LABEL V1
// =============================================================================

export interface EngineeringLabelV1 {
  /** Reference ID — nodeId or edgeId */
  readonly referenceId: string;
  /** Reference type */
  readonly referenceType: 'node' | 'edge';
  /** Label position in world coordinates */
  readonly position: PointV1;
  /** Anchor side relative to element */
  readonly anchorSide: LabelAnchorSide;
  /** Label lines (text + unit + styling) */
  readonly lines: readonly EngineeringLabelLineV1[];
  /** Active label mode */
  readonly labelMode: LabelMode;
  /** Collision group ID (for anti-overlap detection) */
  readonly collisionGroupId: string;
  /** Bounding box for collision detection */
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface EngineeringLabelConfigV1 {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly maxWidth: number;
  readonly padding: number;
  readonly anchorOffsetPx: number;
  readonly preferredSide: LabelAnchorSide;
}

export const DEFAULT_LABEL_CONFIG: EngineeringLabelConfigV1 = {
  fontSize: 10,
  lineHeight: 14,
  maxWidth: 120,
  padding: 4,
  anchorOffsetPx: 8,
  preferredSide: LabelAnchorSide.RIGHT,
};

// =============================================================================
// PLACEMENT RESULT
// =============================================================================

export interface LabelPlacementResultV1 {
  readonly labels: readonly EngineeringLabelV1[];
  readonly collisionCount: number;
  readonly hash: string;
}

// =============================================================================
// NODE DATA FOR LABEL CONTENT
// =============================================================================

export interface NodeLabelDataV1 {
  readonly elementName: string;
  readonly elementType: string;
  readonly voltageKv?: number;
  readonly voltagePu?: number;
  readonly ratedPowerKva?: number;
  readonly ratedPowerMva?: number;
  readonly currentA?: number;
  readonly loadingPct?: number;
  readonly ik3pKa?: number;
  readonly deltaUPercent?: number;
  readonly inService?: boolean;
  readonly switchState?: string;
}

export interface BranchLabelDataV1 {
  readonly elementName: string;
  readonly elementType: string;
  readonly branchType?: string;
  readonly cableType?: string;
  readonly lengthM?: number;
  readonly rOhm?: number;
  readonly xOhm?: number;
  readonly loadingPct?: number;
  readonly pKw?: number;
  readonly qKvar?: number;
  readonly lossesKw?: number;
  readonly ampacityA?: number;
  readonly currentA?: number;
}

// =============================================================================
// COLORS
// =============================================================================

const LABEL_COLORS = {
  DEFAULT: '#1e293b',
  HIGH_LOADING: '#dc2626',
  MED_LOADING: '#d97706',
  OK_LOADING: '#16a34a',
  NOP: '#7c3aed',
  IMPEDANCE: '#6366f1',
  POWER_FLOW: '#0891b2',
  PROTECTION: '#c026d3',
  MUTED: '#94a3b8',
} as const;

function loadingColor(pct: number): string {
  if (pct >= 80) return LABEL_COLORS.HIGH_LOADING;
  if (pct >= 50) return LABEL_COLORS.MED_LOADING;
  return LABEL_COLORS.OK_LOADING;
}

// =============================================================================
// ANCHOR COMPUTATION
// =============================================================================

function computeAnchorPosition(
  placement: NodePlacementV1,
  side: LabelAnchorSide,
  config: EngineeringLabelConfigV1,
): PointV1 {
  const { bounds } = placement;
  const offset = config.anchorOffsetPx;

  switch (side) {
    case LabelAnchorSide.RIGHT:
      return { x: bounds.x + bounds.width + offset, y: bounds.y + bounds.height / 2 };
    case LabelAnchorSide.LEFT:
      return { x: bounds.x - offset, y: bounds.y + bounds.height / 2 };
    case LabelAnchorSide.BELOW:
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + offset };
    case LabelAnchorSide.ABOVE:
      return { x: bounds.x + bounds.width / 2, y: bounds.y - offset };
  }
}

function computeEdgeMidpoint(route: EdgeRouteV1): PointV1 {
  if (route.segments.length === 0) {
    return { x: (route.startPoint.x + route.endPoint.x) / 2, y: (route.startPoint.y + route.endPoint.y) / 2 };
  }
  const midIdx = Math.floor(route.segments.length / 2);
  const seg = route.segments[midIdx];
  return { x: (seg.from.x + seg.to.x) / 2, y: (seg.from.y + seg.to.y) / 2 };
}

function preferredSideForNodeType(elementType: string): LabelAnchorSide {
  switch (elementType) {
    case 'Bus':
    case 'BusNN':
      return LabelAnchorSide.BELOW;
    case 'Source':
    case 'Generator':
      return LabelAnchorSide.RIGHT;
    case 'Station':
      return LabelAnchorSide.RIGHT;
    default:
      return LabelAnchorSide.RIGHT;
  }
}

// =============================================================================
// COLLISION DETECTION
// =============================================================================

interface LabelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function boundsOverlap(a: LabelBounds, b: LabelBounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function computeLabelBounds(
  position: PointV1,
  lineCount: number,
  config: EngineeringLabelConfigV1,
): LabelBounds {
  const height = Math.max(lineCount, 1) * config.lineHeight + config.padding * 2;
  return {
    x: position.x,
    y: position.y - height / 2,
    width: config.maxWidth,
    height,
  };
}

// =============================================================================
// FNV-1a HASH
// =============================================================================

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// =============================================================================
// MAIN: computeEngineeringLabels
// =============================================================================

/**
 * Compute deterministic engineering label placements for nodes and edges.
 *
 * Algorithm:
 * 1. Create labels for each node placement with preferred anchor side
 * 2. Create labels for trunk/branch edges at route midpoints
 * 3. Detect AABB collisions and shift down (max 5 iterations)
 * 4. Sort by referenceId, compute FNV-1a hash
 */
export function computeEngineeringLabels(
  placements: readonly NodePlacementV1[],
  routes: readonly EdgeRouteV1[],
  config: EngineeringLabelConfigV1 = DEFAULT_LABEL_CONFIG,
): LabelPlacementResultV1 {
  const labels: EngineeringLabelV1[] = [];

  // Node labels
  const sortedPlacements = [...placements].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  for (const placement of sortedPlacements) {
    const side = preferredSideForNodeType(''); // Neutral — filled on resolve
    const position = computeAnchorPosition(placement, side, config);
    const bounds = computeLabelBounds(position, 1, config);

    labels.push({
      referenceId: placement.nodeId,
      referenceType: 'node',
      position,
      anchorSide: side,
      lines: [],
      labelMode: 'MINIMALNY',
      collisionGroupId: `node-${placement.nodeId}`,
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    });
  }

  // Edge labels (trunk/branch only)
  const sortedRoutes = [...routes]
    .filter(r => r.edgeType === 'TRUNK' || r.edgeType === 'BRANCH')
    .sort((a, b) => a.edgeId.localeCompare(b.edgeId));

  for (const route of sortedRoutes) {
    const midpoint = computeEdgeMidpoint(route);
    const position: PointV1 = { x: midpoint.x + config.anchorOffsetPx, y: midpoint.y };
    const bounds = computeLabelBounds(position, 1, config);

    labels.push({
      referenceId: route.edgeId,
      referenceType: 'edge',
      position,
      anchorSide: LabelAnchorSide.RIGHT,
      lines: [],
      labelMode: 'MINIMALNY',
      collisionGroupId: `edge-${route.edgeId}`,
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    });
  }

  // Collision resolution — push down overlapping labels (max 5 iterations)
  let collisionCount = 0;
  for (let iteration = 0; iteration < 5; iteration++) {
    let anyCollision = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        if (boundsOverlap(labels[i].bounds, labels[j].bounds)) {
          anyCollision = true;
          collisionCount++;
          const shiftY = config.lineHeight;
          const shifted = labels[j];
          labels[j] = {
            ...shifted,
            position: { x: shifted.position.x, y: shifted.position.y + shiftY },
            bounds: {
              x: shifted.bounds.x,
              y: shifted.bounds.y + shiftY,
              width: shifted.bounds.width,
              height: shifted.bounds.height,
            },
          };
        }
      }
    }
    if (!anyCollision) break;
  }

  // Sort final
  labels.sort((a, b) => a.referenceId.localeCompare(b.referenceId));

  // Hash
  const hashInput = JSON.stringify(
    labels.map(l => ({
      id: l.referenceId,
      x: l.position.x,
      y: l.position.y,
      side: l.anchorSide,
    })),
  );
  const hash = fnv1aHash(hashInput);

  return { labels, collisionCount, hash };
}

// =============================================================================
// CONTENT RESOLUTION
// =============================================================================

/**
 * Fill label content based on the active label mode.
 * Returns a new label with populated lines.
 */
export function resolveEngineeringLabelContent(
  label: EngineeringLabelV1,
  mode: LabelMode,
  nodeData?: NodeLabelDataV1,
  branchData?: BranchLabelDataV1,
): EngineeringLabelV1 {
  const lines: EngineeringLabelLineV1[] = [];

  if (label.referenceType === 'node' && nodeData) {
    switch (mode) {
      case 'MINIMALNY':
        if (nodeData.switchState === 'OPEN') {
          lines.push({ text: 'NOP', unit: '', color: LABEL_COLORS.NOP, bold: true });
        }
        if (nodeData.inService === false) {
          lines.push({ text: 'WYŁ.', unit: '', color: LABEL_COLORS.HIGH_LOADING, bold: true });
        }
        break;

      case 'TECHNICZNY':
        if (nodeData.voltageKv !== undefined) {
          lines.push({ text: nodeData.voltageKv.toFixed(2), unit: 'kV', color: LABEL_COLORS.DEFAULT });
        }
        if (nodeData.ratedPowerKva !== undefined) {
          lines.push({ text: nodeData.ratedPowerKva.toFixed(0), unit: 'kVA', color: LABEL_COLORS.DEFAULT });
        }
        if (nodeData.ratedPowerMva !== undefined) {
          lines.push({ text: nodeData.ratedPowerMva.toFixed(2), unit: 'MVA', color: LABEL_COLORS.DEFAULT });
        }
        if (nodeData.currentA !== undefined) {
          lines.push({ text: nodeData.currentA.toFixed(1), unit: 'A', color: LABEL_COLORS.DEFAULT });
        }
        if (nodeData.loadingPct !== undefined) {
          lines.push({
            text: nodeData.loadingPct.toFixed(0),
            unit: '%',
            color: loadingColor(nodeData.loadingPct),
            bold: nodeData.loadingPct >= 80,
          });
        }
        break;

      case 'ANALITYCZNY':
        if (nodeData.voltageKv !== undefined && nodeData.voltagePu !== undefined) {
          const dev = Math.abs(nodeData.voltagePu - 1.0) * 100;
          const color = dev > 5 ? LABEL_COLORS.HIGH_LOADING : dev > 2 ? LABEL_COLORS.MED_LOADING : LABEL_COLORS.OK_LOADING;
          lines.push({
            text: `${nodeData.voltageKv.toFixed(2)} kV (${nodeData.voltagePu.toFixed(3)} p.u.)`,
            unit: '',
            color,
          });
        }
        if (nodeData.ik3pKa !== undefined) {
          lines.push({ text: `Ik3p = ${nodeData.ik3pKa.toFixed(2)}`, unit: 'kA', color: LABEL_COLORS.IMPEDANCE });
        }
        if (nodeData.deltaUPercent !== undefined) {
          lines.push({ text: `Δu = ${nodeData.deltaUPercent.toFixed(2)}`, unit: '%', color: LABEL_COLORS.POWER_FLOW });
        }
        break;
    }
  }

  if (label.referenceType === 'edge' && branchData) {
    switch (mode) {
      case 'MINIMALNY':
        // No extra lines for edges in minimal mode
        break;

      case 'TECHNICZNY':
        if (branchData.cableType) {
          lines.push({ text: branchData.cableType, unit: '', color: LABEL_COLORS.MUTED });
        }
        if (branchData.lengthM !== undefined) {
          lines.push({ text: branchData.lengthM.toFixed(0), unit: 'm', color: LABEL_COLORS.DEFAULT });
        }
        if (branchData.loadingPct !== undefined) {
          lines.push({
            text: branchData.loadingPct.toFixed(0),
            unit: '%',
            color: loadingColor(branchData.loadingPct),
            bold: branchData.loadingPct >= 80,
          });
        }
        if (branchData.currentA !== undefined) {
          lines.push({ text: branchData.currentA.toFixed(1), unit: 'A', color: LABEL_COLORS.DEFAULT });
        }
        break;

      case 'ANALITYCZNY':
        if (branchData.rOhm !== undefined && branchData.xOhm !== undefined) {
          lines.push({
            text: `Z = ${branchData.rOhm.toFixed(3)} + j${branchData.xOhm.toFixed(3)}`,
            unit: 'Ω',
            color: LABEL_COLORS.IMPEDANCE,
          });
        }
        if (branchData.pKw !== undefined) {
          const dir = branchData.pKw >= 0 ? '→' : '←';
          lines.push({
            text: `P${dir}${Math.abs(branchData.pKw).toFixed(1)}`,
            unit: 'kW',
            color: LABEL_COLORS.POWER_FLOW,
          });
        }
        if (branchData.qKvar !== undefined) {
          const dir = branchData.qKvar >= 0 ? '→' : '←';
          lines.push({
            text: `Q${dir}${Math.abs(branchData.qKvar).toFixed(1)}`,
            unit: 'kvar',
            color: LABEL_COLORS.POWER_FLOW,
          });
        }
        if (branchData.lossesKw !== undefined) {
          lines.push({
            text: `ΔP = ${branchData.lossesKw.toFixed(2)}`,
            unit: 'kW',
            color: LABEL_COLORS.MUTED,
          });
        }
        break;
    }
  }

  return {
    ...label,
    labelMode: mode,
    lines,
  };
}
