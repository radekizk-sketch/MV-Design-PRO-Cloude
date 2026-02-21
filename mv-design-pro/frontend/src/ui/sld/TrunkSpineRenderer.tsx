/**
 * TrunkSpineRenderer — Renderer toru glownego magistrali SLD
 *
 * Renderuje:
 * 1. Gruba linie pionowa (tor glowny) — TRUNK_STROKE_WIDTH
 * 2. Wezly Nxx z etykietami po lewej (km, U, Ik3)
 * 3. Oznaczenia segmentow (typ kabla/linii, parametry) miedzy wezlami
 * 4. Kropki (junction dots) w miejscach odgalezien
 *
 * CANONICAL: IEC 61082, ETAP/PowerFactory visual parity
 */
import React from 'react';
import type {
  TrunkNodeAnnotationV1,
  TrunkSegmentAnnotationV1,
} from './core/layoutResult';
import { JunctionDot } from './symbols/JunctionDot';
import {
  TRUNK_STROKE_WIDTH,
  NODE_LABEL_OFFSET_X,
  OVERHEAD_DASH_ARRAY,
} from './IndustrialAesthetics';
import { ETAP_VOLTAGE_COLORS } from './sldEtapStyle';

export interface TrunkSpineRendererProps {
  nodes: readonly TrunkNodeAnnotationV1[];
  segments: readonly TrunkSegmentAnnotationV1[];
  trunkId?: string;
  color?: string;
}

export const TrunkSpineRenderer: React.FC<TrunkSpineRendererProps> = ({
  nodes,
  segments,
  trunkId = 'M1',
  color = ETAP_VOLTAGE_COLORS.SN,
}) => {
  if (nodes.length === 0) return null;

  // Calculate trunk spine extent (min/max Y from nodes)
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const yMin = sortedNodes[0].position.y;
  const yMax = sortedNodes[sortedNodes.length - 1].position.y;
  const trunkX = sortedNodes[0].position.x;

  return (
    <g data-sld-role="trunk-spine" data-trunk-id={trunkId}>
      {/* Main trunk line */}
      <line
        x1={trunkX}
        y1={yMin}
        x2={trunkX}
        y2={yMax}
        stroke={color}
        strokeWidth={TRUNK_STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Nodes with labels */}
      {sortedNodes.map((node) => (
        <g key={node.nodeId} data-sld-role="trunk-node" data-node-id={node.nodeId}>
          <JunctionDot x={trunkX} y={node.position.y} color={color} />
          <text
            x={trunkX + NODE_LABEL_OFFSET_X}
            y={node.position.y - 4}
            textAnchor="end"
            className="sld-node-label"
          >
            {node.nodeId}: {node.kmFromGPZ.toFixed(1)}km
          </text>
          <text
            x={trunkX + NODE_LABEL_OFFSET_X}
            y={node.position.y + 10}
            textAnchor="end"
            className="sld-segment-params"
          >
            {node.voltageKV.toFixed(2)}kV {node.ikss3p.toFixed(1)}kA
          </text>
        </g>
      ))}

      {/* Segment annotations */}
      {segments.map((seg) => {
        // Find the two nodes bounding this segment
        const segIndex = segments.indexOf(seg);
        const nodeAbove = sortedNodes[segIndex];
        const nodeBelow = sortedNodes[segIndex + 1];
        if (!nodeAbove || !nodeBelow) return null;
        const midY = (nodeAbove.position.y + nodeBelow.position.y) / 2;

        return (
          <g key={seg.segmentId} data-sld-role="trunk-segment" data-segment-id={seg.segmentId}>
            {/* Overhead line dash overlay */}
            {seg.isOverhead && (
              <line
                x1={trunkX}
                y1={nodeAbove.position.y}
                x2={trunkX}
                y2={nodeBelow.position.y}
                stroke={color}
                strokeWidth={TRUNK_STROKE_WIDTH}
                strokeDasharray={OVERHEAD_DASH_ARRAY}
                strokeLinecap="round"
              />
            )}
            {/* Segment label (right side) */}
            <text
              x={trunkX + 15}
              y={midY}
              className="sld-segment-label"
            >
              {seg.designation}: {seg.cableType} L={seg.lengthKm.toFixed(3)}km
            </text>
            <text
              x={trunkX + 15}
              y={midY + 14}
              className="sld-segment-params"
            >
              R={seg.resistance_ohm.toFixed(3)}&Omega; X={seg.reactance_ohm.toFixed(3)}&Omega; Iz={seg.ampacity_A}A
            </text>
          </g>
        );
      })}
    </g>
  );
};
