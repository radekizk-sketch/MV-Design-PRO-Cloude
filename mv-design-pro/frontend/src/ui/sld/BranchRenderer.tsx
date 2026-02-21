/**
 * BranchRenderer — Renderer odgalezienia od toru glownego
 *
 * Renderuje L-shape: pozioma linia od junction dot na torze glownym do wejscia stacji.
 *
 * Elementy SVG:
 * 1. Junction dot na torze glownym
 * 2. Symbol aparatu odgaleznego (disconnector) z etykieta
 * 3. Linia do stacji (kabel=ciagla, napowietrzna=przerywana) z parametrami
 * 4. Junction dot na wejsciu stacji
 * 5. Strzalka kierunku mocy
 * 6. Etykieta lokalizacji (ZK/SO)
 *
 * CANONICAL: IEC 61082, IEC 81346 designations
 */
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
}

export const BranchRenderer: React.FC<BranchRendererProps> = ({
  branch,
  color = ETAP_VOLTAGE_COLORS.SN,
}) => {
  const { position } = branch;
  const branchEndX = position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 200;
  const midY = position.y;
  const dashArray = branch.branchLine.isOverhead ? OVERHEAD_DASH_ARRAY : undefined;

  return (
    <g
      data-sld-role="branch-point"
      data-branch-id={branch.branchId}
    >
      {/* Junction dot at trunk */}
      <JunctionDot x={position.x} y={midY} color={color} />

      {/* Horizontal line from trunk to branch apparatus */}
      <line
        x1={position.x}
        y1={midY}
        x2={position.x + STATION_FIELD_OFFSET_X}
        y2={midY}
        stroke={color}
        strokeWidth={BRANCH_LINE_STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Branch apparatus symbol (disconnector) */}
      <g data-sld-role="branch-apparatus">
        <JunctionDot
          x={position.x + STATION_FIELD_OFFSET_X}
          y={midY}
          color={color}
        />
        {/* Disconnector blade symbol */}
        <line
          x1={position.x + STATION_FIELD_OFFSET_X}
          y1={midY}
          x2={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH}
          y2={midY}
          stroke={color}
          strokeWidth={BRANCH_LINE_STROKE_WIDTH}
          strokeLinecap="round"
        />
        <line
          x1={position.x + STATION_FIELD_OFFSET_X + 10}
          y1={midY - 8}
          x2={position.x + STATION_FIELD_OFFSET_X + 30}
          y2={midY + 8}
          stroke={color}
          strokeWidth={BRANCH_LINE_STROKE_WIDTH}
        />
        <JunctionDot
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH}
          y={midY}
          color={color}
        />
        {/* Apparatus label */}
        <text
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH / 2}
          y={midY - 12}
          textAnchor="middle"
          className="sld-iec-designation"
        >
          {branch.branchApparatus.designation}
        </text>
        <text
          x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH / 2}
          y={midY + 20}
          textAnchor="middle"
          className="sld-apparatus-params"
        >
          In={branch.branchApparatus.ratedCurrent_A}A Ur={branch.branchApparatus.ratedVoltage_kV}kV
        </text>
      </g>

      {/* Branch line to station */}
      <line
        x1={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH}
        y1={midY}
        x2={branchEndX}
        y2={midY}
        stroke={color}
        strokeWidth={BRANCH_LINE_STROKE_WIDTH}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />

      {/* Junction dot at station entry */}
      <JunctionDot x={branchEndX} y={midY} color={color} />

      {/* Power flow arrow */}
      <polygon
        points={`0,-${POWER_ARROW_SIZE / 2} ${POWER_ARROW_SIZE},0 0,${POWER_ARROW_SIZE / 2}`}
        fill={color}
        transform={`translate(${position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 80},${midY})`}
      />

      {/* Branch line parameters */}
      <text
        x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 40}
        y={midY - 12}
        className="sld-segment-label"
      >
        {branch.branchLine.designation}: {branch.branchLine.cableType}
      </text>
      <text
        x={position.x + STATION_FIELD_OFFSET_X + BRANCH_APPARATUS_WIDTH + 40}
        y={midY - 0}
        className="sld-segment-params"
      >
        L={branch.branchLine.lengthKm.toFixed(3)}km R={branch.branchLine.resistance_ohm.toFixed(3)}&Omega; X={branch.branchLine.reactance_ohm.toFixed(3)}&Omega;
      </text>

      {/* Physical location label */}
      <text
        x={position.x + STATION_FIELD_OFFSET_X}
        y={midY + 34}
        className="sld-apparatus-label"
      >
        {branch.physicalLocation === 'ZK' ? 'Zlacze kablowe' : 'Slup odgalezny'} {branch.physicalLocationId}
      </text>
    </g>
  );
};
