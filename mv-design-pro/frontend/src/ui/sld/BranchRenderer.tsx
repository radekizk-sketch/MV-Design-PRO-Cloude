import React from 'react';
import type { BranchPointV1 } from './core/layoutResult';
import { JunctionDot } from './symbols/JunctionDot';
import {
  BRANCH_LINE_STROKE_WIDTH,
  OVERHEAD_DASH_ARRAY,
  BRANCH_APPARATUS_WIDTH,
  POWER_ARROW_SIZE,
  STATION_FIELD_OFFSET_X,
} from './IndustrialAesthetics';
import { ETAP_VOLTAGE_COLORS } from './sldEtapStyle';

export interface BranchRendererProps {
  branch: BranchPointV1;
  color?: string;
  showTechnicalLabels?: boolean;
}

/**
 * ABB-standard branch renderer.
 * Clean, compact layout with clear apparatus designation.
 * Feeder exits vertically from horizontal trunk busbar.
 */
export const BranchRenderer: React.FC<BranchRendererProps> = ({
  branch,
  color = ETAP_VOLTAGE_COLORS.SN,
  showTechnicalLabels = false,
}) => {
  const { position } = branch;
  const branchEndX = position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 260;
  const midY = position.y;
  const dropY = midY + 80;
  const dashArray = branch.branchLine.isOverhead ? OVERHEAD_DASH_ARRAY : undefined;
  const apparatusX = position.x + STATION_FIELD_OFFSET_X;

  return (
    <g data-sld-role="branch-point" data-branch-id={branch.branchId}>
      {/* Bay outline — ABB compact compartment */}
      <rect
        x={apparatusX - 12}
        y={midY - 28}
        width={BRANCH_APPARATUS_WIDTH + 24}
        height={56}
        rx={4}
        ry={4}
        fill="rgba(255, 255, 255, 0.45)"
        stroke="#CBD5E1"
        strokeWidth={0.8}
        strokeDasharray="3 2"
      />

      {/* Trunk-to-apparatus horizontal connection */}
      <JunctionDot x={position.x} y={midY} color={color} />
      <line
        x1={position.x}
        y1={midY}
        x2={apparatusX}
        y2={midY}
        stroke={color}
        strokeWidth={BRANCH_LINE_STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Branch apparatus (CB) */}
      <g data-sld-role="branch-apparatus">
        <JunctionDot x={apparatusX} y={midY} color={color} />
        <line
          x1={apparatusX}
          y1={midY}
          x2={apparatusX + BRANCH_APPARATUS_WIDTH}
          y2={midY}
          stroke={color}
          strokeWidth={BRANCH_LINE_STROKE_WIDTH}
          strokeLinecap="round"
        />
        {/* CB symbol — diagonal slash */}
        <line
          x1={apparatusX + 10}
          y1={midY - 7}
          x2={apparatusX + 30}
          y2={midY + 7}
          stroke={color}
          strokeWidth={BRANCH_LINE_STROKE_WIDTH + 0.5}
        />
        <JunctionDot x={apparatusX + BRANCH_APPARATUS_WIDTH} y={midY} color={color} />

        {/* ANSI code tag — ABB convention */}
        <rect
          x={apparatusX + BRANCH_APPARATUS_WIDTH / 2 - 8}
          y={midY + 6}
          width={16}
          height={12}
          rx={2}
          ry={2}
          fill="rgba(255, 255, 255, 0.95)"
          stroke="#475569"
          strokeWidth={0.8}
        />
        <text
          x={apparatusX + BRANCH_APPARATUS_WIDTH / 2}
          y={midY + 15}
          textAnchor="middle"
          className="sld-abb-ansi-tag-text"
        >
          52
        </text>

        {/* Apparatus designation — above */}
        <text
          x={apparatusX + BRANCH_APPARATUS_WIDTH / 2}
          y={midY - 14}
          textAnchor="middle"
          className="sld-label-iec-designation"
        >
          {branch.branchApparatus.designation}
        </text>

        {/* Field name — below bay */}
        <text
          x={apparatusX + BRANCH_APPARATUS_WIDTH / 2}
          y={midY + 30}
          textAnchor="middle"
          className="sld-label-params"
        >
          Pole {branch.physicalLocation}
        </text>
      </g>

      {/* Branch feeder line — horizontal run */}
      <line
        x1={apparatusX + BRANCH_APPARATUS_WIDTH}
        y1={midY}
        x2={branchEndX}
        y2={midY}
        stroke={color}
        strokeWidth={BRANCH_LINE_STROKE_WIDTH}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />

      {/* Vertical drop at branch end — feeder exit */}
      <line
        x1={branchEndX}
        y1={midY}
        x2={branchEndX}
        y2={dropY}
        stroke={color}
        strokeWidth={BRANCH_LINE_STROKE_WIDTH}
        strokeDasharray={dashArray}
      />

      <JunctionDot x={branchEndX} y={midY} color={color} />
      <JunctionDot x={branchEndX} y={dropY} color={color} />

      {/* Power flow direction arrow */}
      <polygon
        points={`0,-${POWER_ARROW_SIZE / 2} ${POWER_ARROW_SIZE},0 0,${POWER_ARROW_SIZE / 2}`}
        fill={color}
        transform={`translate(${apparatusX + BRANCH_APPARATUS_WIDTH + 60},${midY})`}
      />

      {/* Branch line label — right of apparatus, compact */}
      <text
        x={apparatusX + BRANCH_APPARATUS_WIDTH + 36}
        y={midY - 10}
        className="sld-label-segment"
      >
        {branch.branchLine.designation}
      </text>
      <text
        x={apparatusX + BRANCH_APPARATUS_WIDTH + 36}
        y={midY + 4}
        className="sld-label-params"
      >
        {branch.branchLine.cableType} • {branch.branchLine.lengthKm.toFixed(3)} km
      </text>
      {showTechnicalLabels && (
        <text
          x={apparatusX + BRANCH_APPARATUS_WIDTH + 36}
          y={midY + 16}
          className="sld-label-params"
        >
          R={branch.branchLine.resistance_ohm.toFixed(3)}&Omega; X={branch.branchLine.reactance_ohm.toFixed(3)}&Omega;
        </text>
      )}

      {/* Protection relay bubble — ABB ANSI style */}
      <g transform={`translate(${apparatusX + BRANCH_APPARATUS_WIDTH + 14}, ${midY - 24})`}>
        <circle
          r={9}
          fill="rgba(255, 255, 255, 0.95)"
          stroke="#475569"
          strokeWidth={0.8}
        />
        <text textAnchor="middle" y={3} className="sld-abb-relay-bubble-text">
          50/51
        </text>
      </g>
    </g>
  );
};
