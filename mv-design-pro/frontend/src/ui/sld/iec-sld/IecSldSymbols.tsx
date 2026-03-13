/**
 * IEC SLD Symbol Components — ABB/ETAP Industrial-Grade SVG Primitives
 *
 * Symbole zgodne z IEC 60617 / ETAP / ABB dla schematów ideowych SN.
 *
 * KONTRAKT:
 * - Każdy symbol to czysty komponent SVG (<g>)
 * - Brak stanu wewnętrznego — rendering z props
 * - Brak fizyki — to warstwa prezentacji
 * - 100% Polish labels w UI-facing strings
 *
 * CANONICAL ALIGNMENT:
 * - iecSldColors.ts — jedyne źródło kolorów
 * - sldEtapStyle.ts — referencja ogólna (nieruchoma)
 */

import React from 'react';
import { IEC_COLORS, IEC_TYPOGRAPHY } from './iecSldColors';

// =============================================================================
// PARAMETER BOX — Etykieta parametrów z nieprzezroczystym tłem
// =============================================================================

export interface ParameterBoxProps {
  x: number;
  y: number;
  title: string;
  params: string;
  align?: 'left' | 'right' | 'center';
}

export const ParameterBox: React.FC<ParameterBoxProps> = ({
  x,
  y,
  title,
  params,
  align = 'left',
}) => {
  const width = 200;
  const height = 44;
  const rx = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  const ry = y - height / 2;
  return (
    <g transform={`translate(${rx}, ${ry})`}>
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill={IEC_COLORS.bg}
        stroke={IEC_COLORS.grid}
        strokeWidth="1"
        rx="4"
      />
      <text
        x="10"
        y="18"
        fontFamily={IEC_TYPOGRAPHY.fontFamily}
        fontSize={IEC_TYPOGRAPHY.fontSize.label}
        fontWeight={IEC_TYPOGRAPHY.fontWeight.semibold}
        fill={IEC_COLORS.hvBus}
      >
        {title}
      </text>
      <text
        x="10"
        y="34"
        fontFamily={IEC_TYPOGRAPHY.monoFontFamily}
        fontSize={IEC_TYPOGRAPHY.fontSize.param}
        fontWeight={IEC_TYPOGRAPHY.fontWeight.medium}
        fill={IEC_COLORS.secondaryText}
      >
        {params}
      </text>
    </g>
  );
};

// =============================================================================
// IEC BREAKER — Wyłącznik wg norm IEC / ETAP
// =============================================================================

export interface IECBreakerProps {
  x: number;
  y: number;
  status?: 'closed' | 'open';
  label: string;
}

export const IECBreaker: React.FC<IECBreakerProps> = ({
  x,
  y,
  status = 'closed',
  label,
}) => {
  const color =
    status === 'closed' ? IEC_COLORS.breakerClosed : IEC_COLORS.breakerOpen;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="-6"
        y="-6"
        width="12"
        height="12"
        fill={status === 'closed' ? color : IEC_COLORS.bg}
        stroke={color}
        strokeWidth="2"
      />
      {status === 'closed' && (
        <path
          d="M -4 -4 L 4 4 M -4 4 L 4 -4"
          stroke={IEC_COLORS.bg}
          strokeWidth="1.5"
        />
      )}
      <text
        x="14"
        y="3"
        fontFamily={IEC_TYPOGRAPHY.monoFontFamily}
        fontSize={IEC_TYPOGRAPHY.fontSize.param}
        fontWeight={IEC_TYPOGRAPHY.fontWeight.bold}
        fill={IEC_COLORS.primaryText}
      >
        {label}
      </text>
    </g>
  );
};

// =============================================================================
// IEC LOAD BREAK SWITCH — Rozłącznik / Rozłącznik bezpiecznikowy
// =============================================================================

export interface IECLoadBreakSwitchProps {
  x: number;
  y: number;
  label: string;
  fused?: boolean;
}

export const IECLoadBreakSwitch: React.FC<IECLoadBreakSwitchProps> = ({
  x,
  y,
  label,
  fused = false,
}) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="-6" r="2" fill={IEC_COLORS.primaryText} />
      <line
        x1="0"
        y1="-6"
        x2="8"
        y2="4"
        stroke={IEC_COLORS.primaryText}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {fused && (
        <rect
          x="-3"
          y="6"
          width="6"
          height="12"
          fill={IEC_COLORS.bg}
          stroke={IEC_COLORS.primaryText}
          strokeWidth="1.5"
        />
      )}
      <text
        x="14"
        y="4"
        fontFamily={IEC_TYPOGRAPHY.monoFontFamily}
        fontSize={IEC_TYPOGRAPHY.fontSize.param}
        fontWeight={IEC_TYPOGRAPHY.fontWeight.bold}
        fill={IEC_COLORS.primaryText}
      >
        {label}
      </text>
    </g>
  );
};

// =============================================================================
// TRANSFORMER — Symbol transformatora
// =============================================================================

export interface TransformerProps {
  x: number;
  y: number;
  specs?: string;
}

export const Transformer: React.FC<TransformerProps> = ({ x, y, specs }) => (
  <g transform={`translate(${x}, ${y})`}>
    <circle
      cx="0"
      cy="-8"
      r="10"
      fill={IEC_COLORS.bg}
      stroke={IEC_COLORS.primaryText}
      strokeWidth="2"
    />
    <circle
      cx="0"
      cy="8"
      r="10"
      fill={IEC_COLORS.bg}
      stroke={IEC_COLORS.primaryText}
      strokeWidth="2"
    />
    {specs && (
      <text
        x="16"
        y="4"
        fontFamily={IEC_TYPOGRAPHY.fontFamily}
        fontSize={IEC_TYPOGRAPHY.fontSize.param}
        fontWeight={IEC_TYPOGRAPHY.fontWeight.medium}
        fill={IEC_COLORS.secondaryText}
      >
        {specs}
      </text>
    )}
  </g>
);

// =============================================================================
// DER ICON — Piktogramy zasobów rozproszonych (DER)
// =============================================================================

export interface DerIconProps {
  x: number;
  y: number;
  type: 'load' | 'pv' | 'bess';
  value: string;
}

export const DerIcon: React.FC<DerIconProps> = ({ x, y, type, value }) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Linia podłączeniowa do szyny nN */}
      <line
        x1="0"
        y1="-15"
        x2="0"
        y2="0"
        stroke={IEC_COLORS.secondaryText}
        strokeWidth="1.5"
      />

      {type === 'load' && (
        <g transform="translate(0, 5)">
          <polygon points="-5,0 5,0 0,6" fill={IEC_COLORS.derLoad} />
          <rect x="-2" y="6" width="4" height="4" fill={IEC_COLORS.derLoad} />
        </g>
      )}
      {type === 'pv' && (
        <g transform="translate(-6, 2)">
          <rect
            x="0"
            y="0"
            width="12"
            height="10"
            fill={IEC_COLORS.derPv}
          />
          <line
            x1="6"
            y1="0"
            x2="6"
            y2="10"
            stroke={IEC_COLORS.primaryText}
            strokeWidth="0.5"
          />
          <line
            x1="0"
            y1="5"
            x2="12"
            y2="5"
            stroke={IEC_COLORS.primaryText}
            strokeWidth="0.5"
          />
        </g>
      )}
      {type === 'bess' && (
        <g transform="translate(-5, 0)">
          <rect
            x="0"
            y="0"
            width="10"
            height="14"
            fill="none"
            stroke={IEC_COLORS.derBess}
            strokeWidth="1.5"
          />
          <rect x="2" y="6" width="6" height="6" fill={IEC_COLORS.derBess} />
          <rect x="3" y="-2" width="4" height="2" fill={IEC_COLORS.derBess} />
        </g>
      )}
      <text
        x="0"
        y="24"
        fontFamily={IEC_TYPOGRAPHY.monoFontFamily}
        fontSize={IEC_TYPOGRAPHY.fontSize.small}
        fontWeight={IEC_TYPOGRAPHY.fontWeight.semibold}
        fill={IEC_COLORS.primaryText}
        textAnchor="middle"
      >
        {value}
      </text>
    </g>
  );
};

// =============================================================================
// STATION ENCLOSURE — Ramka stacji
// =============================================================================

export interface StationEnclosureProps {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
}

export const StationEnclosure: React.FC<StationEnclosureProps> = ({
  x,
  y,
  width,
  height,
  title,
  subtitle,
}) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect
      x="0"
      y="0"
      width={width}
      height={height}
      fill={IEC_COLORS.boxFill}
      stroke={IEC_COLORS.boxBorder}
      strokeWidth="1.5"
      strokeDasharray="6 4"
      rx="8"
    />
    <rect
      x="0"
      y="0"
      width={width}
      height="36"
      fill="rgba(226, 232, 240, 0.5)"
      rx="8"
    />
    <text
      x="16"
      y="20"
      fontFamily={IEC_TYPOGRAPHY.monoFontFamily}
      fontSize={IEC_TYPOGRAPHY.fontSize.title}
      fontWeight={IEC_TYPOGRAPHY.fontWeight.bold}
      fill={IEC_COLORS.primaryText}
    >
      {title}
    </text>
    <text
      x="16"
      y="30"
      fontFamily={IEC_TYPOGRAPHY.fontFamily}
      fontSize={IEC_TYPOGRAPHY.fontSize.subtitle}
      fontWeight={IEC_TYPOGRAPHY.fontWeight.medium}
      fill={IEC_COLORS.secondaryText}
    >
      {subtitle}
    </text>
  </g>
);

// =============================================================================
// RELAY — Zabezpieczenie (Przekaźnik)
// =============================================================================

export interface RelayProps {
  x: number;
  y: number;
  code: string;
}

export const Relay: React.FC<RelayProps> = ({ x, y, code }) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect
      x="-16"
      y="-10"
      width="32"
      height="20"
      fill={IEC_COLORS.bg}
      stroke={IEC_COLORS.secondaryText}
      strokeWidth="1"
      rx="4"
    />
    <text
      x="0"
      y="3"
      fontFamily={IEC_TYPOGRAPHY.monoFontFamily}
      fontSize={IEC_TYPOGRAPHY.fontSize.param}
      fontWeight={IEC_TYPOGRAPHY.fontWeight.bold}
      fill={IEC_COLORS.primaryText}
      textAnchor="middle"
    >
      {code}
    </text>
  </g>
);

// =============================================================================
// IEC SLD LEGEND — Legenda systemu
// =============================================================================

export const IecSldLegend: React.FC = () => {
  return (
    <g transform="translate(60, 40)">
      <rect
        x="0"
        y="0"
        width="220"
        height="280"
        fill={IEC_COLORS.bg}
        stroke={IEC_COLORS.boxBorder}
        strokeWidth="1"
        rx="4"
      />
      <rect
        x="0"
        y="0"
        width="220"
        height="30"
        fill={IEC_COLORS.grid}
        rx="4"
      />
      <text
        x="10"
        y="20"
        fontFamily={IEC_TYPOGRAPHY.monoFontFamily}
        fontSize={IEC_TYPOGRAPHY.fontSize.title}
        fontWeight={IEC_TYPOGRAPHY.fontWeight.bold}
        fill={IEC_COLORS.primaryText}
      >
        LEGENDA SYSTEMU
      </text>

      <g transform="translate(10, 50)">
        {/* Szyna SN */}
        <line
          x1="0"
          y1="0"
          x2="20"
          y2="0"
          stroke={IEC_COLORS.hvBus}
          strokeWidth="4"
        />
        <text
          x="30"
          y="4"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Szyna / Linia SN (15kV)
        </text>

        {/* Odgałęzienie */}
        <line
          x1="0"
          y1="20"
          x2="20"
          y2="20"
          stroke={IEC_COLORS.branch}
          strokeWidth="3"
        />
        <text
          x="30"
          y="24"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Odgalezienie SN
        </text>

        {/* Szyna nN */}
        <line
          x1="0"
          y1="40"
          x2="20"
          y2="40"
          stroke={IEC_COLORS.lvBus}
          strokeWidth="4"
        />
        <text
          x="30"
          y="44"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Szyna Zbiorcza nN (0.4kV)
        </text>

        {/* CB zamknięty */}
        <g transform="translate(10, 70)">
          <rect
            x="-6"
            y="-6"
            width="12"
            height="12"
            fill={IEC_COLORS.breakerClosed}
            stroke={IEC_COLORS.breakerClosed}
            strokeWidth="2"
          />
          <path d="M -4 -4 L 4 4 M -4 4 L 4 -4" stroke={IEC_COLORS.bg} strokeWidth="1.5" />
        </g>
        <text
          x="30"
          y="74"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Wylacznik Zamkniety
        </text>

        {/* CB otwarty */}
        <g transform="translate(10, 95)">
          <rect
            x="-6"
            y="-6"
            width="12"
            height="12"
            fill={IEC_COLORS.bg}
            stroke={IEC_COLORS.breakerOpen}
            strokeWidth="2"
          />
        </g>
        <text
          x="30"
          y="99"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Wylacznik Otwarty
        </text>

        {/* LBS */}
        <g transform="translate(10, 125)">
          <circle cx="0" cy="-6" r="2" fill={IEC_COLORS.primaryText} />
          <line
            x1="0"
            y1="-6"
            x2="8"
            y2="4"
            stroke={IEC_COLORS.primaryText}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <text
          x="30"
          y="124"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Rozlacznik (LBS)
        </text>

        {/* LBS z bezpiecznikiem */}
        <g transform="translate(10, 150)">
          <circle cx="0" cy="-6" r="2" fill={IEC_COLORS.primaryText} />
          <line
            x1="0"
            y1="-6"
            x2="8"
            y2="4"
            stroke={IEC_COLORS.primaryText}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="-3"
            y="6"
            width="6"
            height="12"
            fill={IEC_COLORS.bg}
            stroke={IEC_COLORS.primaryText}
            strokeWidth="1.5"
          />
        </g>
        <text
          x="30"
          y="149"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Rozlacznik z bezpiecznikiem
        </text>

        {/* Odbiór */}
        <g transform="translate(10, 180)">
          <polygon points="-5,0 5,0 0,6" fill={IEC_COLORS.derLoad} />
          <rect x="-2" y="6" width="4" height="4" fill={IEC_COLORS.derLoad} />
        </g>
        <text
          x="30"
          y="184"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Odbior Mocy
        </text>

        {/* PV */}
        <g transform="translate(4, 198)">
          <rect x="0" y="0" width="12" height="10" fill={IEC_COLORS.derPv} />
          <line
            x1="6"
            y1="0"
            x2="6"
            y2="10"
            stroke={IEC_COLORS.primaryText}
            strokeWidth="0.5"
          />
          <line
            x1="0"
            y1="5"
            x2="12"
            y2="5"
            stroke={IEC_COLORS.primaryText}
            strokeWidth="0.5"
          />
        </g>
        <text
          x="30"
          y="208"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Generacja PV (OZE)
        </text>

        {/* BESS */}
        <g transform="translate(5, 222)">
          <rect
            x="0"
            y="0"
            width="10"
            height="14"
            fill="none"
            stroke={IEC_COLORS.derBess}
            strokeWidth="1.5"
          />
          <rect x="2" y="6" width="6" height="6" fill={IEC_COLORS.derBess} />
          <rect x="3" y="-2" width="4" height="2" fill={IEC_COLORS.derBess} />
        </g>
        <text
          x="30"
          y="232"
          fontFamily={IEC_TYPOGRAPHY.fontFamily}
          fontSize={IEC_TYPOGRAPHY.fontSize.param}
          fill={IEC_COLORS.primaryText}
        >
          Magazyn Energii (BESS)
        </text>
      </g>
    </g>
  );
};
