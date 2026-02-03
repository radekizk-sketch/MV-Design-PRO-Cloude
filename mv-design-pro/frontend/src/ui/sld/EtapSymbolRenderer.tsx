/**
 * EtapSymbolRenderer — Komponenty SVG dla symboli ETAP
 *
 * CANONICAL ALIGNMENT:
 * - etap_symbols/*.svg: Źródło prawdy dla kształtów symboli
 * - ports.json: Definicje portów
 * - SymbolResolver.ts: Mapowanie element → symbol
 *
 * ETAP PARITY:
 * - Wszystkie symbole mają viewBox 0 0 100 100
 * - Stroke: currentColor (dziedziczy z CSS), stroke-width: 3 (main), 2 (details)
 * - Kolory mogą być nadpisywane przez props (stroke, fill)
 */

import React from 'react';
import type { EtapSymbolId } from './SymbolResolver';

/**
 * Switch state for CB/DS elements.
 * ETAP-like visual representation:
 * - OPEN: gap/break in circuit (rozwarcie)
 * - CLOSED: continuous symbol (połączenie)
 * - UNKNOWN: indeterminate state (stan nieznany)
 */
export type SwitchState = 'OPEN' | 'CLOSED' | 'UNKNOWN';

/**
 * Props dla renderera symbolu ETAP.
 */
export interface EtapSymbolProps {
  /** ID symbolu ETAP */
  symbolId: EtapSymbolId;
  /** Kolor obrysu (domyślnie currentColor - dziedziczy z CSS) */
  stroke?: string;
  /** Kolor wypełnienia (domyślnie none) */
  fill?: string;
  /** Grubość obrysu (domyślnie 3) */
  strokeWidth?: number;
  /** Przezroczystość (0-1) */
  opacity?: number;
  /** Wzór kreski (dla linii) */
  strokeDasharray?: string;
  /** Skala symbolu (w pikselach, domyślnie 40) */
  size?: number;
  /** Stan łączeniowy dla CB/DS (ETAP-like) */
  switchState?: SwitchState;
}

/**
 * Busbar / Szyna zbiorcza
 * Horizontal thick bar representing electrical busbar.
 */
const BusbarSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    <rect
      x="5"
      y="45"
      width="90"
      height="10"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
    />
  </>
);

/**
 * Circuit Breaker / Wyłącznik
 * ETAP-like visual representation:
 * - CLOSED: Square with X pattern, continuous connections
 * - OPEN: Square with X pattern, gap in bottom connection showing break
 * - UNKNOWN: Dashed outline indicating indeterminate state
 */
const CircuitBreakerSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
  switchState = 'CLOSED',
}) => {
  const isOpen = switchState === 'OPEN';
  const isUnknown = switchState === 'UNKNOWN';

  // UNKNOWN state: dashed outline
  const rectDasharray = isUnknown ? '4,2' : undefined;

  return (
    <>
      <rect
        x="30"
        y="30"
        width="40"
        height="40"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={rectDasharray}
        opacity={opacity}
        data-testid="sld-switch-state-cb-rect"
      />
      <line x1="30" y1="30" x2="70" y2="70" stroke={stroke} strokeWidth={2} opacity={opacity} />
      <line x1="70" y1="30" x2="30" y2="70" stroke={stroke} strokeWidth={2} opacity={opacity} />
      {/* Top connection - always connected */}
      <line x1="50" y1="0" x2="50" y2="30" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
      {/* Bottom connection - OPEN shows gap, CLOSED shows continuous */}
      {isOpen ? (
        <>
          {/* Gap indicator - disconnected at y=75 */}
          <line x1="50" y1="70" x2="50" y2="75" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
          {/* Bottom stub with gap */}
          <line x1="50" y1="85" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
          {/* Open indicator marks */}
          <line x1="45" y1="77" x2="55" y2="83" stroke={stroke} strokeWidth={2} opacity={opacity} />
        </>
      ) : (
        <line x1="50" y1="70" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
      )}
    </>
  );
};

/**
 * Disconnector / Rozłącznik
 * ETAP-like visual representation:
 * - OPEN: Blade angled away (łopatka otwarta)
 * - CLOSED: Blade vertical connecting contacts (łopatka zamknięta)
 * - UNKNOWN: Dashed blade indicating indeterminate state
 */
const DisconnectorSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  strokeWidth = 3,
  opacity = 1,
  switchState = 'CLOSED',
}) => {
  const isOpen = switchState === 'OPEN';
  const isUnknown = switchState === 'UNKNOWN';

  // UNKNOWN state: dashed blade
  const bladeDasharray = isUnknown ? '4,2' : undefined;

  return (
    <>
      {/* Top connection */}
      <line x1="50" y1="0" x2="50" y2="35" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
      {/* Bottom connection */}
      <line x1="50" y1="65" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
      {/* Blade - OPEN: angled, CLOSED: vertical */}
      {isOpen ? (
        <line
          x1="50"
          y1="35"
          x2="70"
          y2="50"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={bladeDasharray}
          opacity={opacity}
          data-testid="sld-switch-state-ds-blade-open"
        />
      ) : (
        <line
          x1="50"
          y1="35"
          x2="50"
          y2="65"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={bladeDasharray}
          opacity={opacity}
          data-testid="sld-switch-state-ds-blade-closed"
        />
      )}
      {/* Fixed contact points */}
      <circle cx="50" cy="35" r="4" fill={stroke} stroke="none" opacity={opacity} />
      <circle cx="50" cy="65" r="4" fill={stroke} stroke="none" opacity={opacity} />
    </>
  );
};

/**
 * Overhead Line / Linia napowietrzna
 * Solid continuous line.
 */
const LineOverheadSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    <line x1="0" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Cable Line / Linia kablowa
 * Dashed line pattern.
 */
const LineCableSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    <line
      x1="0"
      y1="50"
      x2="100"
      y2="50"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray="8,4"
      opacity={opacity}
    />
  </>
);

/**
 * Two-Winding Transformer / Transformator 2-uzwojeniowy
 * Two overlapping circles (primary and secondary windings).
 */
const Transformer2wSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    <circle cx="50" cy="35" r="20" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <circle cx="50" cy="65" r="20" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Connection stubs */}
    <line x1="50" y1="0" x2="50" y2="15" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="50" y1="85" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Three-Winding Transformer / Transformator 3-uzwojeniowy
 * Three overlapping circles.
 */
const Transformer3wSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    <circle cx="50" cy="30" r="18" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <circle cx="32" cy="62" r="18" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <circle cx="68" cy="62" r="18" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Connection stubs */}
    <line x1="50" y1="0" x2="50" y2="12" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="14" y1="62" x2="0" y2="62" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="86" y1="62" x2="100" y2="62" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Generator / Generator synchroniczny
 * Circle with G letter inside.
 */
const GeneratorSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    <circle cx="50" cy="40" r="30" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <text x="50" y="48" textAnchor="middle" fontSize="24" fontWeight="bold" fill={stroke} opacity={opacity}>
      G
    </text>
    {/* Connection stub */}
    <line x1="50" y1="70" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Photovoltaic / Fotowoltaika
 * Solar panel symbol with sun rays.
 */
const PvSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Panel rectangle */}
    <rect x="20" y="20" width="60" height="40" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Grid lines inside panel */}
    <line x1="20" y1="40" x2="80" y2="40" stroke={stroke} strokeWidth={1.5} opacity={opacity} />
    <line x1="40" y1="20" x2="40" y2="60" stroke={stroke} strokeWidth={1.5} opacity={opacity} />
    <line x1="60" y1="20" x2="60" y2="60" stroke={stroke} strokeWidth={1.5} opacity={opacity} />
    {/* Sun rays (arrow pointing to panel) */}
    <line x1="10" y1="10" x2="25" y2="25" stroke={stroke} strokeWidth={2} opacity={opacity} />
    <path d="M 10 10 L 10 18 M 10 10 L 18 10" stroke={stroke} strokeWidth={2} fill="none" opacity={opacity} />
    {/* Connection stub */}
    <line x1="50" y1="60" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Wind Farm / Farma wiatrowa
 * Wind turbine symbol.
 */
const FwSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Turbine hub (circle) */}
    <circle cx="50" cy="30" r="8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Three blades */}
    <line x1="50" y1="30" x2="50" y2="5" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="50" y1="30" x2="28" y2="45" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="50" y1="30" x2="72" y2="45" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Tower */}
    <line x1="50" y1="38" x2="50" y2="70" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Base */}
    <line x1="35" y1="70" x2="65" y2="70" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Connection stub */}
    <line x1="50" y1="70" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Battery Energy Storage System / Magazyn energii
 * Battery symbol.
 */
const BessSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Battery outline */}
    <rect x="25" y="25" width="50" height="45" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Battery cap */}
    <rect x="40" y="18" width="20" height="7" fill={fill} stroke={stroke} strokeWidth={2} opacity={opacity} />
    {/* Plus/minus indicators */}
    <text x="50" y="42" textAnchor="middle" fontSize="16" fontWeight="bold" fill={stroke} opacity={opacity}>
      +
    </text>
    <text x="50" y="62" textAnchor="middle" fontSize="20" fontWeight="bold" fill={stroke} opacity={opacity}>
      −
    </text>
    {/* Connection stub */}
    <line x1="50" y1="70" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Utility Feeder / Zasilanie z sieci
 * Grid symbol with arrows pointing down.
 */
const UtilityFeederSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Three vertical lines */}
    <line x1="30" y1="15" x2="30" y2="55" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="50" y1="15" x2="50" y2="55" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="70" y1="15" x2="70" y2="55" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Top bar connecting lines */}
    <line x1="30" y1="15" x2="70" y2="15" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Arrows at bottom of each line */}
    <path d="M 30 55 L 25 45 M 30 55 L 35 45" stroke={stroke} strokeWidth={2} fill="none" opacity={opacity} />
    <path d="M 50 55 L 45 45 M 50 55 L 55 45" stroke={stroke} strokeWidth={2} fill="none" opacity={opacity} />
    <path d="M 70 55 L 65 45 M 70 55 L 75 45" stroke={stroke} strokeWidth={2} fill="none" opacity={opacity} />
    {/* Connection stub */}
    <line x1="50" y1="55" x2="50" y2="100" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Ground / Uziemienie
 * Standard ground symbol.
 */
const GroundSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Vertical line from top */}
    <line x1="50" y1="0" x2="50" y2="40" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Three horizontal lines (ground symbol) */}
    <line x1="25" y1="40" x2="75" y2="40" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="32" y1="55" x2="68" y2="55" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="40" y1="70" x2="60" y2="70" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Current Transformer / Przekładnik prądowy
 * CT symbol (circle with CT marking).
 */
const CtSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Main circle */}
    <circle cx="50" cy="50" r="25" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* CT label */}
    <text x="50" y="56" textAnchor="middle" fontSize="16" fontWeight="bold" fill={stroke} opacity={opacity}>
      CT
    </text>
    {/* Connection stubs */}
    <line x1="0" y1="50" x2="25" y2="50" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="75" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Voltage Transformer / Przekładnik napięciowy
 * VT symbol (circle with VT marking).
 */
const VtSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Main circle */}
    <circle cx="50" cy="50" r="25" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* VT label */}
    <text x="50" y="56" textAnchor="middle" fontSize="16" fontWeight="bold" fill={stroke} opacity={opacity}>
      VT
    </text>
    {/* Connection stubs */}
    <line x1="0" y1="50" x2="25" y2="50" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="75" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

// ============================================================================
// Tree-specific symbols (P9 Project Tree ETAP parity)
// ============================================================================

/**
 * Load / Odbiornik
 * Triangle pointing down (standard load symbol).
 */
const LoadSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Connection stub from top */}
    <line x1="50" y1="0" x2="50" y2="25" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Triangle pointing down */}
    <polygon
      points="50,25 25,70 75,70"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      opacity={opacity}
    />
    {/* Horizontal line at bottom */}
    <line x1="25" y1="85" x2="75" y2="85" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Project / Projekt
 * Grid/network symbol representing the project root.
 */
const ProjectSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Outer frame */}
    <rect x="10" y="15" width="80" height="70" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Top bar (title area) */}
    <line x1="10" y1="30" x2="90" y2="30" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Grid inside */}
    <line x1="35" y1="30" x2="35" y2="85" stroke={stroke} strokeWidth={2} opacity={opacity} />
    <line x1="65" y1="30" x2="65" y2="85" stroke={stroke} strokeWidth={2} opacity={opacity} />
    <line x1="10" y1="55" x2="90" y2="55" stroke={stroke} strokeWidth={2} opacity={opacity} />
  </>
);

/**
 * Catalog / Katalog typów
 * Book/library symbol.
 */
const CatalogSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Book outline */}
    <rect x="20" y="15" width="60" height="70" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Spine */}
    <line x1="30" y1="15" x2="30" y2="85" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Page lines */}
    <line x1="40" y1="30" x2="70" y2="30" stroke={stroke} strokeWidth={2} opacity={opacity} />
    <line x1="40" y1="45" x2="70" y2="45" stroke={stroke} strokeWidth={2} opacity={opacity} />
    <line x1="40" y1="60" x2="70" y2="60" stroke={stroke} strokeWidth={2} opacity={opacity} />
  </>
);

/**
 * Study Case / Przypadek obliczeniowy
 * Calculator/document with sigma symbol.
 */
const StudyCaseSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Document outline */}
    <rect x="20" y="10" width="60" height="80" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Sigma symbol (Σ) for calculations */}
    <text x="50" y="60" textAnchor="middle" fontSize="36" fontWeight="bold" fill={stroke} opacity={opacity}>
      Σ
    </text>
  </>
);

/**
 * Results / Wyniki
 * Bar chart symbol representing calculation results.
 */
const ResultsSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Chart frame */}
    <line x1="15" y1="15" x2="15" y2="85" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    <line x1="15" y1="85" x2="85" y2="85" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
    {/* Bar 1 */}
    <rect x="25" y="50" width="12" height="30" fill={fill} stroke={stroke} strokeWidth={2} opacity={opacity} />
    {/* Bar 2 (taller) */}
    <rect x="45" y="30" width="12" height="50" fill={fill} stroke={stroke} strokeWidth={2} opacity={opacity} />
    {/* Bar 3 */}
    <rect x="65" y="45" width="12" height="35" fill={fill} stroke={stroke} strokeWidth={2} opacity={opacity} />
  </>
);

/**
 * Folder / Folder container
 * Simple folder icon for generic containers.
 */
const FolderSymbol: React.FC<Omit<EtapSymbolProps, 'symbolId'>> = ({
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
}) => (
  <>
    {/* Folder tab */}
    <path
      d="M 10 25 L 10 20 L 35 20 L 45 30 L 90 30 L 90 25"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      opacity={opacity}
    />
    {/* Folder body */}
    <rect x="10" y="30" width="80" height="55" fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
  </>
);

/**
 * Mapa komponentów symboli.
 */
const SYMBOL_COMPONENTS: Record<EtapSymbolId, React.FC<Omit<EtapSymbolProps, 'symbolId'>>> = {
  busbar: BusbarSymbol,
  circuit_breaker: CircuitBreakerSymbol,
  disconnector: DisconnectorSymbol,
  line_overhead: LineOverheadSymbol,
  line_cable: LineCableSymbol,
  transformer_2w: Transformer2wSymbol,
  transformer_3w: Transformer3wSymbol,
  generator: GeneratorSymbol,
  pv: PvSymbol,
  fw: FwSymbol,
  bess: BessSymbol,
  utility_feeder: UtilityFeederSymbol,
  ground: GroundSymbol,
  ct: CtSymbol,
  vt: VtSymbol,
  // Tree-specific symbols
  load: LoadSymbol,
  project: ProjectSymbol,
  catalog: CatalogSymbol,
  study_case: StudyCaseSymbol,
  results: ResultsSymbol,
  folder: FolderSymbol,
};

/**
 * Główny komponent renderujący symbol ETAP.
 *
 * Użycie:
 * ```tsx
 * <g transform={`translate(${x}, ${y}) scale(${scale})`}>
 *   <EtapSymbol symbolId="circuit_breaker" stroke="#1f2937" switchState="OPEN" />
 * </g>
 * ```
 */
export const EtapSymbol: React.FC<EtapSymbolProps> = ({
  symbolId,
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 3,
  opacity = 1,
  size = 40,
  switchState,
}) => {
  const SymbolComponent = SYMBOL_COMPONENTS[symbolId];

  if (!SymbolComponent) {
    console.warn(`[EtapSymbol] Nieznany symbolId: ${symbolId}`);
    return null;
  }

  // Scale: viewBox is 100x100, we scale to desired size
  const scale = size / 100;

  return (
    <g transform={`scale(${scale})`} data-etap-symbol={symbolId} data-switch-state={switchState}>
      <SymbolComponent
        stroke={stroke}
        fill={fill}
        strokeWidth={strokeWidth / scale} // Compensate for scaling
        opacity={opacity}
        switchState={switchState}
      />
    </g>
  );
};

/**
 * Pobierz komponent symbolu po ID (dla zaawansowanego użycia).
 */
export function getSymbolComponent(
  symbolId: EtapSymbolId
): React.FC<Omit<EtapSymbolProps, 'symbolId'>> | null {
  return SYMBOL_COMPONENTS[symbolId] || null;
}

/**
 * Renderuj symbol jako SVG string (dla eksportu/testów).
 */
export function renderSymbolToString(symbolId: EtapSymbolId): string | null {
  const svgContent: Record<EtapSymbolId, string> = {
    busbar: '<rect x="5" y="45" width="90" height="10" fill="none" stroke="#000000" stroke-width="3"/>',
    circuit_breaker: `<rect x="30" y="30" width="40" height="40" fill="none" stroke="#000000" stroke-width="3"/>
      <line x1="30" y1="30" x2="70" y2="70" stroke="#000000" stroke-width="2"/>
      <line x1="70" y1="30" x2="30" y2="70" stroke="#000000" stroke-width="2"/>
      <line x1="50" y1="0" x2="50" y2="30" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="70" x2="50" y2="100" stroke="#000000" stroke-width="3"/>`,
    disconnector: `<line x1="50" y1="0" x2="50" y2="35" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="65" x2="50" y2="100" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="35" x2="70" y2="50" stroke="#000000" stroke-width="3"/>
      <circle cx="50" cy="35" r="4" fill="#000000"/>
      <circle cx="50" cy="65" r="4" fill="#000000"/>`,
    line_overhead: '<line x1="0" y1="50" x2="100" y2="50" stroke="#000000" stroke-width="3"/>',
    line_cable: '<line x1="0" y1="50" x2="100" y2="50" stroke="#000000" stroke-width="3" stroke-dasharray="8,4"/>',
    transformer_2w: `<circle cx="50" cy="35" r="20" fill="none" stroke="#000000" stroke-width="3"/>
      <circle cx="50" cy="65" r="20" fill="none" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="0" x2="50" y2="15" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="85" x2="50" y2="100" stroke="#000000" stroke-width="3"/>`,
    transformer_3w: `<circle cx="50" cy="30" r="18" fill="none" stroke="#000000" stroke-width="3"/>
      <circle cx="32" cy="62" r="18" fill="none" stroke="#000000" stroke-width="3"/>
      <circle cx="68" cy="62" r="18" fill="none" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="0" x2="50" y2="12" stroke="#000000" stroke-width="3"/>
      <line x1="14" y1="62" x2="0" y2="62" stroke="#000000" stroke-width="3"/>
      <line x1="86" y1="62" x2="100" y2="62" stroke="#000000" stroke-width="3"/>`,
    generator: `<circle cx="50" cy="40" r="30" fill="none" stroke="#000000" stroke-width="3"/>
      <text x="50" y="48" text-anchor="middle" font-size="24" font-weight="bold" fill="#000000">G</text>
      <line x1="50" y1="70" x2="50" y2="100" stroke="#000000" stroke-width="3"/>`,
    pv: `<rect x="20" y="20" width="60" height="40" fill="none" stroke="#000000" stroke-width="3"/>
      <line x1="20" y1="40" x2="80" y2="40" stroke="#000000" stroke-width="1.5"/>
      <line x1="40" y1="20" x2="40" y2="60" stroke="#000000" stroke-width="1.5"/>
      <line x1="60" y1="20" x2="60" y2="60" stroke="#000000" stroke-width="1.5"/>
      <line x1="10" y1="10" x2="25" y2="25" stroke="#000000" stroke-width="2"/>
      <path d="M 10 10 L 10 18 M 10 10 L 18 10" stroke="#000000" stroke-width="2" fill="none"/>
      <line x1="50" y1="60" x2="50" y2="100" stroke="#000000" stroke-width="3"/>`,
    fw: `<circle cx="50" cy="30" r="8" fill="none" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="30" x2="50" y2="5" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="30" x2="28" y2="45" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="30" x2="72" y2="45" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="38" x2="50" y2="70" stroke="#000000" stroke-width="3"/>
      <line x1="35" y1="70" x2="65" y2="70" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="70" x2="50" y2="100" stroke="#000000" stroke-width="3"/>`,
    bess: `<rect x="25" y="25" width="50" height="45" fill="none" stroke="#000000" stroke-width="3"/>
      <rect x="40" y="18" width="20" height="7" fill="none" stroke="#000000" stroke-width="2"/>
      <text x="50" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#000000">+</text>
      <text x="50" y="62" text-anchor="middle" font-size="20" font-weight="bold" fill="#000000">−</text>
      <line x1="50" y1="70" x2="50" y2="100" stroke="#000000" stroke-width="3"/>`,
    utility_feeder: `<line x1="30" y1="15" x2="30" y2="55" stroke="#000000" stroke-width="3"/>
      <line x1="50" y1="15" x2="50" y2="55" stroke="#000000" stroke-width="3"/>
      <line x1="70" y1="15" x2="70" y2="55" stroke="#000000" stroke-width="3"/>
      <line x1="30" y1="15" x2="70" y2="15" stroke="#000000" stroke-width="3"/>
      <path d="M 30 55 L 25 45 M 30 55 L 35 45" stroke="#000000" stroke-width="2" fill="none"/>
      <path d="M 50 55 L 45 45 M 50 55 L 55 45" stroke="#000000" stroke-width="2" fill="none"/>
      <path d="M 70 55 L 65 45 M 70 55 L 75 45" stroke="#000000" stroke-width="2" fill="none"/>
      <line x1="50" y1="55" x2="50" y2="100" stroke="#000000" stroke-width="3"/>`,
    ground: `<line x1="50" y1="0" x2="50" y2="40" stroke="#000000" stroke-width="3"/>
      <line x1="25" y1="40" x2="75" y2="40" stroke="#000000" stroke-width="3"/>
      <line x1="32" y1="55" x2="68" y2="55" stroke="#000000" stroke-width="3"/>
      <line x1="40" y1="70" x2="60" y2="70" stroke="#000000" stroke-width="3"/>`,
    ct: `<circle cx="50" cy="50" r="25" fill="none" stroke="#000000" stroke-width="3"/>
      <text x="50" y="56" text-anchor="middle" font-size="16" font-weight="bold" fill="#000000">CT</text>
      <line x1="0" y1="50" x2="25" y2="50" stroke="#000000" stroke-width="3"/>
      <line x1="75" y1="50" x2="100" y2="50" stroke="#000000" stroke-width="3"/>`,
    vt: `<circle cx="50" cy="50" r="25" fill="none" stroke="#000000" stroke-width="3"/>
      <text x="50" y="56" text-anchor="middle" font-size="16" font-weight="bold" fill="#000000">VT</text>
      <line x1="0" y1="50" x2="25" y2="50" stroke="#000000" stroke-width="3"/>
      <line x1="75" y1="50" x2="100" y2="50" stroke="#000000" stroke-width="3"/>`,
    // Tree-specific symbols
    load: `<line x1="50" y1="0" x2="50" y2="25" stroke="#000000" stroke-width="3"/>
      <polygon points="50,25 25,70 75,70" fill="none" stroke="#000000" stroke-width="3" stroke-linejoin="round"/>
      <line x1="25" y1="85" x2="75" y2="85" stroke="#000000" stroke-width="3"/>`,
    project: `<rect x="10" y="15" width="80" height="70" fill="none" stroke="#000000" stroke-width="3"/>
      <line x1="10" y1="30" x2="90" y2="30" stroke="#000000" stroke-width="3"/>
      <line x1="35" y1="30" x2="35" y2="85" stroke="#000000" stroke-width="2"/>
      <line x1="65" y1="30" x2="65" y2="85" stroke="#000000" stroke-width="2"/>
      <line x1="10" y1="55" x2="90" y2="55" stroke="#000000" stroke-width="2"/>`,
    catalog: `<rect x="20" y="15" width="60" height="70" fill="none" stroke="#000000" stroke-width="3"/>
      <line x1="30" y1="15" x2="30" y2="85" stroke="#000000" stroke-width="3"/>
      <line x1="40" y1="30" x2="70" y2="30" stroke="#000000" stroke-width="2"/>
      <line x1="40" y1="45" x2="70" y2="45" stroke="#000000" stroke-width="2"/>
      <line x1="40" y1="60" x2="70" y2="60" stroke="#000000" stroke-width="2"/>`,
    study_case: `<rect x="20" y="10" width="60" height="80" fill="none" stroke="#000000" stroke-width="3"/>
      <text x="50" y="60" text-anchor="middle" font-size="36" font-weight="bold" fill="#000000">Σ</text>`,
    results: `<line x1="15" y1="15" x2="15" y2="85" stroke="#000000" stroke-width="3"/>
      <line x1="15" y1="85" x2="85" y2="85" stroke="#000000" stroke-width="3"/>
      <rect x="25" y="50" width="12" height="30" fill="none" stroke="#000000" stroke-width="2"/>
      <rect x="45" y="30" width="12" height="50" fill="none" stroke="#000000" stroke-width="2"/>
      <rect x="65" y="45" width="12" height="35" fill="none" stroke="#000000" stroke-width="2"/>`,
    folder: `<path d="M 10 25 L 10 20 L 35 20 L 45 30 L 90 30 L 90 25" fill="none" stroke="#000000" stroke-width="3" stroke-linejoin="round"/>
      <rect x="10" y="30" width="80" height="55" fill="none" stroke="#000000" stroke-width="3"/>`,
  };

  return svgContent[symbolId] || null;
}

export default EtapSymbol;
