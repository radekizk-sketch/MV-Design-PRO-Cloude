import React from 'react';
import type {
  TrunkNodeAnnotationV1,
  TrunkSegmentAnnotationV1,
} from './core/layoutResult';
import { JunctionDot } from './symbols/JunctionDot';
import {
  TRUNK_STROKE_WIDTH,
  OVERHEAD_DASH_ARRAY,
} from './IndustrialAesthetics';
import { ETAP_VOLTAGE_COLORS } from './sldEtapStyle';

export interface TrunkSpineRendererProps {
  nodes: readonly TrunkNodeAnnotationV1[];
  segments: readonly TrunkSegmentAnnotationV1[];
  trunkId?: string;
  color?: string;
  showTechnicalLabels?: boolean;
}

const LABEL_GUTTER_WIDTH = 170;

export const TrunkSpineRenderer: React.FC<TrunkSpineRendererProps> = ({
  nodes,
  segments,
  trunkId = 'M1',
  color = ETAP_VOLTAGE_COLORS.SN,
  showTechnicalLabels = false,
}) => {
  if (nodes.length === 0) return null;

  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const yMin = sortedNodes[0].position.y;
  const yMax = sortedNodes[sortedNodes.length - 1].position.y;
  const trunkX = sortedNodes[0].position.x;
  const gpzBlockY = yMin - 16;

  return (
    <g data-sld-role="trunk-spine" data-trunk-id={trunkId}>
      <rect
        x={trunkX - 236}
        y={gpzBlockY - 28}
        width={468}
        height={yMax - gpzBlockY + 60}
        className="sld-abb-switchgear-envelope"
        rx={8}
        ry={8}
      />

      <rect
        x={trunkX - 224}
        y={yMin + 8}
        width={LABEL_GUTTER_WIDTH}
        height={yMax - yMin + 12}
        className="sld-abb-info-gutter"
        rx={6}
        ry={6}
      />

      <g data-sld-role="gpz-block">
        <rect
          x={trunkX - 168}
          y={gpzBlockY - 8}
          width={336}
          height={116}
          className="sld-gpz-block"
          rx={10}
          ry={10}
        />
        <text x={trunkX} y={gpzBlockY + 24} textAnchor="middle" className="sld-info-primary sld-gpz-title">
          Główny Punkt Zasilania
        </text>
        <text x={trunkX} y={gpzBlockY + 47} textAnchor="middle" className="sld-info-secondary sld-gpz-subtitle">
          Rozdzielnia SN • pole {trunkId}
        </text>
        <text x={trunkX} y={gpzBlockY + 68} textAnchor="middle" className="sld-info-secondary sld-gpz-subtitle">
          Początek magistrali głównej
        </text>
        {showTechnicalLabels && (
          <text x={trunkX} y={gpzBlockY + 88} textAnchor="middle" className="sld-info-tertiary sld-gpz-subtitle">
            Układ źródłowy GPZ z wyprowadzeniem SN
          </text>
        )}
        <line x1={trunkX} y1={gpzBlockY + 108} x2={trunkX} y2={yMin} stroke={color} strokeWidth={TRUNK_STROKE_WIDTH + 2.2} />
      </g>

      <line
        x1={trunkX}
        y1={yMin + 8}
        x2={trunkX}
        y2={yMax - 8}
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
      />

      <text x={trunkX + 54} y={yMin + 24} className="sld-info-secondary sld-abb-zone-label">
        Magistrala główna SN
      </text>

      {sortedNodes.map((node, idx) => (
        <g key={`field-${node.nodeId}`} data-sld-role="sn-field-module" data-node-id={node.nodeId}>
          <rect
            x={trunkX - 74}
            y={node.position.y - 24}
            width={148}
            height={48}
            className="sld-abb-bay"
            rx={4}
            ry={4}
          />
          <line
            x1={trunkX - 34}
            y1={node.position.y}
            x2={trunkX + 34}
            y2={node.position.y}
            className="sld-sn-busbar"
          />
          <text x={trunkX - 214} y={node.position.y - 8} className="sld-info-primary sld-node-label">
            {node.nodeId}
          </text>
          <text x={trunkX - 214} y={node.position.y + 8} className="sld-info-secondary sld-segment-label">
            Pole {idx + 1} • {node.kmFromGPZ.toFixed(2)} km
          </text>
          {showTechnicalLabels && (
            <text x={trunkX - 214} y={node.position.y + 23} className="sld-info-tertiary sld-segment-params">
              U={node.voltageKV.toFixed(2)} kV • Ik3={node.ikss3p.toFixed(1)} kA • ΔU={node.deltaU_percent.toFixed(2)}%
            </text>
          )}
          <JunctionDot x={trunkX} y={node.position.y} color={color} />
        </g>
      ))}

      {segments.map((seg) => {
        const segIndex = segments.indexOf(seg);
        const nodeAbove = sortedNodes[segIndex];
        const nodeBelow = sortedNodes[segIndex + 1];
        if (!nodeAbove || !nodeBelow) return null;
        const midY = (nodeAbove.position.y + nodeBelow.position.y) / 2;

        return (
          <g key={seg.segmentId} data-sld-role="trunk-segment" data-segment-id={seg.segmentId}>
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
            <text x={trunkX + 20} y={midY - 8} className="sld-info-primary sld-segment-label">
              {seg.designation}
            </text>
            <text x={trunkX + 20} y={midY + 8} className="sld-info-secondary sld-segment-label">
              {seg.cableType} • Długość {seg.lengthKm.toFixed(3)} km
            </text>
            {showTechnicalLabels && (
              <text x={trunkX + 20} y={midY + 23} className="sld-info-tertiary sld-segment-params">
                R={seg.resistance_ohm.toFixed(3)}&Omega; X={seg.reactance_ohm.toFixed(3)}&Omega; Iz={seg.ampacity_A} A
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};
