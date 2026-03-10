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

export const BranchRenderer: React.FC<BranchRendererProps> = ({
  branch,
  color = ETAP_VOLTAGE_COLORS.SN,
  showTechnicalLabels = false,
}) => {
  const { position } = branch;
  const branchEndX = position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 380;
  const midY = position.y;
  const dropY = midY + 104;
  const dashArray = branch.branchLine.isOverhead ? OVERHEAD_DASH_ARRAY : undefined;

  return (
    <g data-sld-role="branch-point" data-branch-id={branch.branchId}>
      <rect
        x={position.x + STATION_FIELD_OFFSET_X - 30}
        y={midY - 42}
        width={BRANCH_APPARATUS_WIDTH + 432}
        height={104}
        className="sld-abb-bay"
        rx={5}
        ry={5}
      />

      <JunctionDot x={position.x} y={midY} color={color} />

      <line
        x1={position.x}
        y1={midY}
        x2={position.x + STATION_FIELD_OFFSET_X}
        y2={midY}
        stroke={color}
        strokeWidth={BRANCH_LINE_STROKE_WIDTH + 0.9}
        strokeLinecap="round"
      />

      <g data-sld-role="branch-apparatus">
        <JunctionDot x={position.x + STATION_FIELD_OFFSET_X} y={midY} color={color} />
        <line
          x1={position.x + STATION_FIELD_OFFSET_X}
          y1={midY}
          x2={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH}
          y2={midY}
          stroke={color}
          strokeWidth={BRANCH_LINE_STROKE_WIDTH + 0.6}
          strokeLinecap="round"
        />
        <line
          x1={position.x + STATION_FIELD_OFFSET_X + 10}
          y1={midY - 8}
          x2={position.x + STATION_FIELD_OFFSET_X + 30}
          y2={midY + 8}
          stroke={color}
          strokeWidth={BRANCH_LINE_STROKE_WIDTH + 0.8}
        />
        <JunctionDot x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH} y={midY} color={color} />

        <rect
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH / 2 - 9}
          y={midY + 4}
          width={18}
          height={14}
          className="sld-abb-ansi-tag"
          rx={2}
          ry={2}
        />
        <text
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH / 2}
          y={midY + 14}
          textAnchor="middle"
          className="sld-abb-ansi-tag-text"
        >
          52
        </text>
        <text
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH / 2}
          y={midY - 12}
          textAnchor="middle"
          className="sld-info-primary sld-iec-designation"
        >
          {branch.branchApparatus.designation}
        </text>
        <text
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH / 2}
          y={midY + 34}
          textAnchor="middle"
          className="sld-info-secondary sld-apparatus-label"
        >
          Pole odgałęźne {branch.physicalLocation} {branch.physicalLocationId}
        </text>
        {showTechnicalLabels && (
          <text
            x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH / 2}
            y={midY + 50}
            textAnchor="middle"
            className="sld-info-tertiary sld-apparatus-params"
          >
            In={branch.branchApparatus.ratedCurrent_A} A • Ur={branch.branchApparatus.ratedVoltage_kV} kV
          </text>
        )}
      </g>

      <line
        x1={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH}
        y1={midY}
        x2={branchEndX}
        y2={midY}
        stroke={color}
        strokeWidth={BRANCH_LINE_STROKE_WIDTH + 0.8}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />

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

      <polygon
        points={`0,-${POWER_ARROW_SIZE / 2} ${POWER_ARROW_SIZE},0 0,${POWER_ARROW_SIZE / 2}`}
        fill={color}
        transform={`translate(${position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 92},${midY})`}
      />

      <text
        x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 48}
        y={midY - 14}
        className="sld-info-primary sld-segment-label"
      >
        {branch.branchLine.designation}
      </text>
      <text
        x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 48}
        y={midY + 2}
        className="sld-info-secondary sld-segment-label"
      >
        Linia odgałęźna {branch.branchLine.cableType} • {branch.branchLine.lengthKm.toFixed(3)} km
      </text>
      {showTechnicalLabels && (
        <text
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 48}
          y={midY + 18}
          className="sld-info-tertiary sld-segment-params"
        >
          R={branch.branchLine.resistance_ohm.toFixed(3)}&Omega; • X={branch.branchLine.reactance_ohm.toFixed(3)}&Omega; • Iz={branch.branchLine.ampacity_A} A
        </text>
      )}

      <g transform={`translate(${position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 14}, ${midY - 31})`}>
        <circle r={10} className="sld-abb-relay-bubble" />
        <text textAnchor="middle" y={4} className="sld-abb-relay-bubble-text">
          50/51
        </text>
      </g>
    </g>
  );
};
