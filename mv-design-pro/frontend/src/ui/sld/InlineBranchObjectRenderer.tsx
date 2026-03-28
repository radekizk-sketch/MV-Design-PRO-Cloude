/**
 * InlineBranchObjectRenderer — Renderer SVG dla obiektów wbudowanych na torze SN.
 *
 * Renderuje:
 * - Słup rozgałęźny (branch_pole): mały romb na torze z wychodzącą linią odgałęzienia.
 *   Wizualnie liniowy, NIE blok stacji.
 * - ZKSN (zksn): mały prostokąt na torze z portami odgałęzienia.
 *   Explicit enclosure, NIE blok stacji.
 *
 * BINDING: 100% PL etykiety.
 */

import React from 'react';
import type { InlineBranchObjectV1 } from './core/layoutResult';
import { ETAP_VOLTAGE_COLORS, ETAP_TYPOGRAPHY } from './sldEtapStyle';

export interface InlineBranchObjectRendererProps {
  obj: InlineBranchObjectV1;
  /** Czy element jest zaznaczony */
  selected?: boolean;
  /** Callback po kliknięciu — przekazuje ID węzła */
  onClick?: (nodeId: string) => void;
  showTechnicalLabels?: boolean;
}

const SN_COLOR = ETAP_VOLTAGE_COLORS.SN;
const SELECTED_COLOR = '#2563EB'; // blue-600

// ─── Branch Pole Symbol ───────────────────────────────────────────────────────
// Mały romb na linii głównej. Odgałęzienie wychodzi prostopadle w prawo.
const BranchPoleSymbol: React.FC<{
  x: number;
  y: number;
  selected: boolean;
  label: string;
  branchPortCount: number;
  showTechnicalLabels: boolean;
}> = ({ x, y, selected, label, showTechnicalLabels }) => {
  const stroke = selected ? SELECTED_COLOR : SN_COLOR;
  const r = 7; // half-size of diamond
  const diamond = `M${x},${y - r} L${x + r},${y} L${x},${y + r} L${x - r},${y} Z`;

  return (
    <g data-sld-role="inline-branch-pole" data-node-id={label}>
      {/* Diamond marker na torze głównym */}
      <path
        d={diamond}
        fill={selected ? '#DBEAFE' : 'white'}
        stroke={stroke}
        strokeWidth={selected ? 2 : 1.5}
        data-testid={`sld-branch-pole-${label}`}
      />
      {/* Port BRANCH — linia odgałęzienia wychodząca w prawo */}
      <line
        x1={x + r}
        y1={y}
        x2={x + r + 18}
        y2={y}
        stroke={stroke}
        strokeWidth={1.2}
        strokeDasharray="3 2"
      />
      {/* Strzałka na końcu portu BRANCH */}
      <polygon
        points={`${x + r + 18},${y - 3} ${x + r + 24},${y} ${x + r + 18},${y + 3}`}
        fill={stroke}
        stroke="none"
      />
      {/* Etykieta */}
      {showTechnicalLabels && (
        <text
          x={x}
          y={y - r - 4}
          textAnchor="middle"
          fontFamily={ETAP_TYPOGRAPHY.fontFamily}
          fontSize={ETAP_TYPOGRAPHY.fontSize.xsmall}
          fill={ETAP_TYPOGRAPHY.secondaryColor}
        >
          SO
        </text>
      )}
      <text
        x={x}
        y={y + r + 12}
        textAnchor="middle"
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.small}
        fill={selected ? SELECTED_COLOR : ETAP_TYPOGRAPHY.labelColor}
        fontWeight={selected ? ETAP_TYPOGRAPHY.fontWeight.semibold : ETAP_TYPOGRAPHY.fontWeight.normal}
      >
        {label}
      </text>
    </g>
  );
};

// ─── ZKSN Symbol ─────────────────────────────────────────────────────────────
// Mały prostokąt na kablu głównym. 1 lub 2 porty BRANCH wychodzą prostopadle.
const ZksnSymbol: React.FC<{
  x: number;
  y: number;
  selected: boolean;
  label: string;
  branchPortCount: number;
  showTechnicalLabels: boolean;
}> = ({ x, y, selected, label, branchPortCount, showTechnicalLabels }) => {
  const stroke = selected ? SELECTED_COLOR : SN_COLOR;
  const w = 22;
  const h = 14;

  return (
    <g data-sld-role="inline-zksn" data-node-id={label}>
      {/* Prostokąt złączki kablowej */}
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={3}
        ry={3}
        fill={selected ? '#DBEAFE' : '#F8FAFC'}
        stroke={stroke}
        strokeWidth={selected ? 2 : 1.5}
        data-testid={`sld-zksn-${label}`}
      />
      {/* Litera Z identyfikująca ZKSN */}
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.xsmall}
        fontWeight={ETAP_TYPOGRAPHY.fontWeight.bold}
        fill={stroke}
      >
        Z
      </text>
      {/* Port(y) BRANCH — wychodzą prostopadle */}
      {branchPortCount >= 1 && (
        <>
          <line
            x1={x + w / 2}
            y1={y - 3}
            x2={x + w / 2 + 16}
            y2={y - 3}
            stroke={stroke}
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          <polygon
            points={`${x + w / 2 + 16},${y - 6} ${x + w / 2 + 22},${y - 3} ${x + w / 2 + 16},${y}`}
            fill={stroke}
            stroke="none"
          />
        </>
      )}
      {branchPortCount >= 2 && (
        <>
          <line
            x1={x + w / 2}
            y1={y + 3}
            x2={x + w / 2 + 16}
            y2={y + 3}
            stroke={stroke}
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          <polygon
            points={`${x + w / 2 + 16},${y} ${x + w / 2 + 22},${y + 3} ${x + w / 2 + 16},${y + 6}`}
            fill={stroke}
            stroke="none"
          />
        </>
      )}
      {/* Etykieta techniczna */}
      {showTechnicalLabels && (
        <text
          x={x}
          y={y - h / 2 - 4}
          textAnchor="middle"
          fontFamily={ETAP_TYPOGRAPHY.fontFamily}
          fontSize={ETAP_TYPOGRAPHY.fontSize.xsmall}
          fill={ETAP_TYPOGRAPHY.secondaryColor}
        >
          ZK
        </text>
      )}
      <text
        x={x}
        y={y + h / 2 + 12}
        textAnchor="middle"
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.small}
        fill={selected ? SELECTED_COLOR : ETAP_TYPOGRAPHY.labelColor}
        fontWeight={selected ? ETAP_TYPOGRAPHY.fontWeight.semibold : ETAP_TYPOGRAPHY.fontWeight.normal}
      >
        {label}
      </text>
    </g>
  );
};

// ─── Main renderer ────────────────────────────────────────────────────────────

export const InlineBranchObjectRenderer: React.FC<InlineBranchObjectRendererProps> = ({
  obj,
  selected = false,
  onClick,
  showTechnicalLabels = false,
}) => {
  const { nodeId, objectType, label, position, branchPortCount } = obj;
  const { x, y } = position;

  const handleClick = onClick
    ? (e: React.MouseEvent) => { e.stopPropagation(); onClick(nodeId); }
    : undefined;

  return (
    <g
      data-testid={`sld-inline-branch-object-${nodeId}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={handleClick}
    >
      {objectType === 'branch_pole' ? (
        <BranchPoleSymbol
          x={x}
          y={y}
          selected={selected}
          label={label}
          branchPortCount={branchPortCount}
          showTechnicalLabels={showTechnicalLabels}
        />
      ) : (
        <ZksnSymbol
          x={x}
          y={y}
          selected={selected}
          label={label}
          branchPortCount={branchPortCount}
          showTechnicalLabels={showTechnicalLabels}
        />
      )}
    </g>
  );
};

export default InlineBranchObjectRenderer;
