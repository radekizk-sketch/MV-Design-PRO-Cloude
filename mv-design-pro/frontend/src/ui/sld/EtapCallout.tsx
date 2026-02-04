/**
 * ETAP CALLOUT — Result display blocks with leader lines
 *
 * PR-SLD-ETAP-STYLE-02: ETAP 1:1 Visual Parity
 *
 * CANONICAL ALIGNMENT:
 * - sldEtapStyle.ts: Single source of truth for styling
 * - ETAP software visual standards
 *
 * FEATURES:
 * - Standard result fields: Un, Ik", Sk", ip, Ith/Ithr
 * - Leader line from node
 * - White background with subtle border
 * - Consistent field order and formatting
 *
 * RULES:
 * - READ-ONLY: No model mutations
 * - Deterministic rendering
 * - Fixed field order (ETAP standard)
 */

import React, { useMemo } from 'react';
import {
  ETAP_CALLOUT,
  ETAP_CALLOUT_ANCHORS,
  ETAP_TYPOGRAPHY,
} from './sldEtapStyle';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result data for callout display.
 * All fields optional — only non-null fields are rendered.
 */
export interface CalloutResultData {
  /** Node ID for identification */
  nodeId: string;
  /** Nominal voltage (kV) */
  Un?: number;
  /** Initial short-circuit current (kA) */
  Ikss?: number;
  /** Short-circuit power (MVA) */
  Skss?: number;
  /** Peak short-circuit current (kA) */
  ip?: number;
  /** Thermal equivalent current (kA) */
  Ith?: number;
  /** Thermal equivalent current ratio */
  Ithr?: number;
}

/**
 * Position of callout block.
 */
export interface CalloutPosition {
  x: number;
  y: number;
}

/**
 * Props for callout component.
 */
export interface EtapCalloutProps {
  /** Result data to display */
  data: CalloutResultData;
  /** Node position (center) */
  nodePosition: CalloutPosition;
  /** Whether callout is for selected element */
  isSelected?: boolean;
  /** Anchor direction override */
  anchorDirection?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
}

// =============================================================================
// FORMATTERS
// =============================================================================

/**
 * Format voltage value.
 */
function formatVoltage(value: number | undefined): string {
  if (value === undefined) return '';
  return value.toFixed(2);
}

/**
 * Format current value (kA).
 */
function formatCurrent(value: number | undefined): string {
  if (value === undefined) return '';
  return value.toFixed(2);
}

/**
 * Format power value (MVA).
 */
function formatPower(value: number | undefined): string {
  if (value === undefined) return '';
  return value.toFixed(1);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Single row in callout block.
 */
interface CalloutRowProps {
  label: string;
  value: string;
  unit: string;
  y: number;
}

const CalloutRow: React.FC<CalloutRowProps> = ({ label, value, unit, y }) => {
  const { colors, labelValueGap } = ETAP_CALLOUT;
  const labelX = ETAP_CALLOUT.block.padding;
  const valueX = labelX + 28;
  const unitX = valueX + labelValueGap + 32;

  return (
    <g transform={`translate(0, ${y})`}>
      <text
        x={labelX}
        y={ETAP_CALLOUT.rowHeight * 0.75}
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.small}
        fontWeight={ETAP_TYPOGRAPHY.fontWeight.medium}
        fill={colors.text}
      >
        {label}
      </text>
      <text
        x={valueX}
        y={ETAP_CALLOUT.rowHeight * 0.75}
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.small}
        fontWeight={ETAP_TYPOGRAPHY.fontWeight.semibold}
        fill={colors.value}
        textAnchor="end"
      >
        {value}
      </text>
      <text
        x={unitX}
        y={ETAP_CALLOUT.rowHeight * 0.75}
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.xsmall}
        fill={colors.unit}
      >
        {unit}
      </text>
    </g>
  );
};

/**
 * Leader line from node to callout block.
 */
interface LeaderLineProps {
  nodePosition: CalloutPosition;
  blockPosition: CalloutPosition;
  anchorDirection: string;
}

const LeaderLine: React.FC<LeaderLineProps> = ({ nodePosition, blockPosition, anchorDirection }) => {
  const { leader } = ETAP_CALLOUT;

  // Calculate leader line path (orthogonal routing)
  const startX = nodePosition.x;
  const startY = nodePosition.y;
  const endX = blockPosition.x;
  const endY = blockPosition.y;

  // Offset from node center
  const offsetX = anchorDirection.includes('Right') ? leader.nodeOffset : -leader.nodeOffset;
  const offsetY = anchorDirection.includes('top') ? -leader.nodeOffset : leader.nodeOffset;

  // Intermediate point for orthogonal routing
  const midX = startX + offsetX;
  const midY = startY + offsetY;

  // Path points
  const pathD = `M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`;

  return (
    <path
      d={pathD}
      fill="none"
      stroke={leader.strokeColor}
      strokeWidth={leader.strokeWidth}
      strokeDasharray={leader.dashArray}
      markerEnd="none"
    />
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ETAP Callout Block — displays calculation results with leader line.
 *
 * Standard fields (in order):
 * - Un (nominal voltage)
 * - Ik" (initial short-circuit current)
 * - Sk" (short-circuit power)
 * - ip (peak short-circuit current)
 * - Ith (thermal equivalent current)
 *
 * @example
 * ```tsx
 * <EtapCallout
 *   data={{ nodeId: 'bus1', Un: 20, Ikss: 12.5, Skss: 433, ip: 31.8, Ith: 12.2 }}
 *   nodePosition={{ x: 200, y: 100 }}
 * />
 * ```
 */
export const EtapCallout: React.FC<EtapCalloutProps> = ({
  data,
  nodePosition,
  isSelected = false,
  anchorDirection,
}) => {
  // Determine anchor position
  const anchor = anchorDirection
    ? ETAP_CALLOUT_ANCHORS.alternatives.find((a) => a.direction === anchorDirection) ??
      ETAP_CALLOUT_ANCHORS.default
    : ETAP_CALLOUT_ANCHORS.default;

  // Calculate block position
  const blockPosition = useMemo(
    () => ({
      x: nodePosition.x + anchor.offsetX,
      y: nodePosition.y + anchor.offsetY,
    }),
    [nodePosition, anchor]
  );

  // Build rows from data (only non-undefined fields)
  const rows = useMemo(() => {
    const result: Array<{ label: string; value: string; unit: string }> = [];

    if (data.Un !== undefined) {
      result.push({ label: 'Un', value: formatVoltage(data.Un), unit: 'kV' });
    }
    if (data.Ikss !== undefined) {
      result.push({ label: "Ik''", value: formatCurrent(data.Ikss), unit: 'kA' });
    }
    if (data.Skss !== undefined) {
      result.push({ label: "Sk''", value: formatPower(data.Skss), unit: 'MVA' });
    }
    if (data.ip !== undefined) {
      result.push({ label: 'ip', value: formatCurrent(data.ip), unit: 'kA' });
    }
    if (data.Ith !== undefined) {
      result.push({ label: 'Ith', value: formatCurrent(data.Ith), unit: 'kA' });
    }

    return result;
  }, [data]);

  // Don't render if no data
  if (rows.length === 0) return null;

  // Calculate block dimensions
  const { block, colors, rowHeight } = ETAP_CALLOUT;
  const blockHeight = rows.length * rowHeight + block.padding * 2;
  const blockWidth = block.minWidth;

  // Selection styling
  const borderColor = isSelected ? '#2563EB' : colors.border;
  const borderWidth = isSelected ? 2 : block.borderWidth;

  return (
    <g data-testid={`sld-callout-${data.nodeId}`} data-callout-node={data.nodeId}>
      {/* Leader line */}
      <LeaderLine
        nodePosition={nodePosition}
        blockPosition={blockPosition}
        anchorDirection={anchor.direction}
      />

      {/* Callout block */}
      <g transform={`translate(${blockPosition.x}, ${blockPosition.y})`}>
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={blockWidth}
          height={blockHeight}
          rx={block.borderRadius}
          ry={block.borderRadius}
          fill={colors.background}
          stroke={borderColor}
          strokeWidth={borderWidth}
        />

        {/* Content rows */}
        <g transform={`translate(0, ${block.padding})`}>
          {rows.map((row, index) => (
            <CalloutRow
              key={row.label}
              label={row.label}
              value={row.value}
              unit={row.unit}
              y={index * rowHeight}
            />
          ))}
        </g>
      </g>
    </g>
  );
};

// =============================================================================
// CALLOUT LAYER
// =============================================================================

/**
 * Props for callout layer.
 */
export interface EtapCalloutLayerProps {
  /** Array of result data for each node */
  results: CalloutResultData[];
  /** Map of node IDs to positions */
  nodePositions: Map<string, CalloutPosition>;
  /** Currently selected node ID */
  selectedNodeId?: string | null;
  /** Whether callouts are visible */
  visible?: boolean;
}

/**
 * Layer for rendering all callouts on SLD.
 */
export const EtapCalloutLayer: React.FC<EtapCalloutLayerProps> = ({
  results,
  nodePositions,
  selectedNodeId,
  visible = true,
}) => {
  if (!visible || results.length === 0) return null;

  // Sort results for deterministic rendering
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    [results]
  );

  return (
    <g data-testid="sld-callout-layer">
      {sortedResults.map((data) => {
        const position = nodePositions.get(data.nodeId);
        if (!position) return null;

        return (
          <EtapCallout
            key={data.nodeId}
            data={data}
            nodePosition={position}
            isSelected={data.nodeId === selectedNodeId}
          />
        );
      })}
    </g>
  );
};

// =============================================================================
// EXPORT
// =============================================================================

export default EtapCallout;
