/**
 * SLD View Canvas — Read-Only SVG Rendering with ETAP Symbols
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A.2: Symbol types (Bus, Line, Transformer, etc.)
 * - sld_rules.md § D.1: Visual state encoding (in_service, selected)
 * - powerfactory_ui_parity.md: PowerFactory-like presentation
 * - etap_symbols/*: ETAP-parity symbol library
 *
 * READ-ONLY canvas:
 * - No drag/drop
 * - No lasso selection
 * - No editing
 * - Click → selection only
 *
 * ETAP SYMBOL INTEGRATION:
 * - Bus → busbar
 * - LineBranch (LINE) → line_overhead (solid)
 * - LineBranch (CABLE) → line_cable (dashed)
 * - TransformerBranch → transformer_2w
 * - Switch (BREAKER) → circuit_breaker
 * - Switch (DISCONNECTOR) → disconnector
 * - Source → utility_feeder
 * - Load → fallback (trójkąt, brak symbolu ETAP)
 */

import React, { useCallback, useMemo } from 'react';
import type { AnySldSymbol, BranchSymbol, SwitchSymbol } from '../sld-editor/types';
import type { ElementType } from '../types';
import type { SLDViewCanvasProps, ViewportState } from './types';
import { resolveSymbol, type ResolvedSymbol } from './SymbolResolver';
import { EtapSymbol, type SwitchState } from './EtapSymbolRenderer';
import { calculateEnergization } from './energization';

/**
 * Symbol size configuration.
 * ETAP symbols use viewBox 100x100, scaled to these sizes.
 */
const SYMBOL_SIZES = {
  Bus: { width: 80, height: 40 },
  LineBranch: { width: 60, height: 40 },
  TransformerBranch: { width: 40, height: 50 },
  Switch: { width: 40, height: 50 },
  Source: { width: 50, height: 60 },
  Load: { width: 30, height: 30 }, // Fallback only
} as const;

/**
 * Read-only symbol renderer.
 */
interface SymbolProps {
  symbol: AnySldSymbol;
  selected: boolean;
  onClick: (symbolId: string, elementType: ElementType, elementName: string) => void;
  energized: boolean;
}

/**
 * Render ETAP symbol with styling.
 */
const EtapSymbolWrapper: React.FC<{
  resolvedSymbol: ResolvedSymbol;
  selected: boolean;
  inService: boolean;
  size: { width: number; height: number };
  switchState?: SwitchState;
  energized?: boolean;
}> = ({ resolvedSymbol, selected, inService, size, switchState, energized = true }) => {
  // Visual styling - base layer with energization
  // Energized: normal stroke, Not energized: grayed out
  const isEnergized = energized && inService;
  const baseStroke = isEnergized ? '#1f2937' : '#9ca3af';
  const stroke = selected ? '#3b82f6' : baseStroke;
  const fill = selected ? '#dbeafe' : '#ffffff';
  // Not energized: reduced opacity
  const opacity = inService ? (isEnergized ? 1 : 0.6) : 0.5;

  return (
    <EtapSymbol
      symbolId={resolvedSymbol.symbolId}
      stroke={stroke}
      fill={fill}
      strokeWidth={selected ? 3.5 : 3}
      opacity={opacity}
      size={Math.max(size.width, size.height)}
      switchState={switchState}
    />
  );
};

/**
 * Fallback renderer for Load (brak symbolu ETAP).
 * Zachowany oryginalny trójkąt.
 */
const LoadFallback: React.FC<{
  selected: boolean;
  inService: boolean;
  elementName: string;
  energized?: boolean;
}> = ({ selected, inService, elementName, energized = true }) => {
  // Energization affects base color
  const isEnergized = energized && inService;
  const baseStroke = isEnergized ? '#1f2937' : '#9ca3af';
  const stroke = selected ? '#3b82f6' : baseStroke;
  const strokeWidth = selected ? 2.5 : 1.5;
  const opacity = inService ? (isEnergized ? 1 : 0.6) : 0.5;

  return (
    <>
      <polygon
        points="0,-14 12,10 -12,10"
        fill={selected ? '#dbeafe' : '#e0f2fe'}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
      <text
        x={0}
        y={-20}
        textAnchor="middle"
        fontSize="10"
        fontWeight={selected ? 600 : 400}
        fill="#1f2937"
      >
        {elementName}
      </text>
    </>
  );
};

/**
 * Unknown symbol fallback - minimal indicator.
 * Per BINDING: nie placeholder, tylko minimalny znak + console warning.
 */
const UnknownSymbolFallback: React.FC<{
  elementType: ElementType;
  elementName: string;
  selected: boolean;
  inService: boolean;
}> = ({ elementType, elementName, selected, inService }) => {
  const stroke = selected ? '#3b82f6' : inService ? '#ef4444' : '#9ca3af';
  const opacity = inService ? 1 : 0.5;

  return (
    <>
      {/* Minimal "?" indicator */}
      <circle
        cx={0}
        cy={0}
        r={12}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
        strokeDasharray="4,2"
      />
      <text
        x={0}
        y={5}
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill={stroke}
        opacity={opacity}
      >
        ?
      </text>
      <text
        x={0}
        y={-18}
        textAnchor="middle"
        fontSize="8"
        fill="#6b7280"
      >
        {elementType}
      </text>
      <text
        x={0}
        y={22}
        textAnchor="middle"
        fontSize="9"
        fill="#1f2937"
      >
        {elementName}
      </text>
    </>
  );
};

/**
 * Main symbol component using ETAP symbols.
 */
const Symbol: React.FC<SymbolProps> = ({ symbol, selected, onClick, energized }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick(symbol.id, symbol.elementType, symbol.elementName);
    },
    [symbol.id, symbol.elementType, symbol.elementName, onClick]
  );

  const { position, inService, elementType, elementName } = symbol;

  // Try to resolve ETAP symbol
  const resolvedSymbol = resolveSymbol(symbol);

  // Get symbol size
  const size = SYMBOL_SIZES[elementType] ?? { width: 40, height: 40 };

  // Calculate offset to center the symbol
  const offsetX = -size.width / 2;
  const offsetY = -size.height / 2;

  // Label position offset
  const labelOffsetY = elementType === 'Bus' ? -size.height / 2 - 8 : -size.height / 2 - 5;

  // Build data-testid attributes
  const testIdAttrs: Record<string, string> = {
    'data-testid': `sld-symbol-${symbol.id}`,
    'data-element-type': elementType,
  };

  // Add symbol-specific data attributes
  if (resolvedSymbol) {
    testIdAttrs['data-etap-symbol'] = resolvedSymbol.symbolId;
  }

  // Add switch state if applicable
  if (elementType === 'Switch') {
    const switchSymbol = symbol as SwitchSymbol;
    testIdAttrs['data-switch-state'] = switchSymbol.switchState;
    testIdAttrs['data-switch-type'] = switchSymbol.switchType;
  }

  // Add branch type if applicable
  if (elementType === 'LineBranch') {
    const branchSymbol = symbol as BranchSymbol;
    testIdAttrs['data-branch-type'] = branchSymbol.branchType ?? 'CABLE';
  }

  // Add energization state
  testIdAttrs['data-energized'] = energized ? 'true' : 'false';

  const cursor = 'pointer';

  // Handle Load fallback (no ETAP symbol)
  if (elementType === 'Load') {
    return (
      <g
        {...testIdAttrs}
        transform={`translate(${position.x}, ${position.y})`}
        onClick={handleClick}
        style={{ cursor }}
      >
        <LoadFallback
          selected={selected}
          inService={inService}
          elementName={elementName}
          energized={energized}
        />
      </g>
    );
  }

  // Handle unknown symbols (no ETAP mapping)
  if (!resolvedSymbol) {
    console.warn(`[SLDViewCanvas] Brak mapowania ETAP dla elementu: ${elementType} (${elementName})`);
    return (
      <g
        {...testIdAttrs}
        transform={`translate(${position.x}, ${position.y})`}
        onClick={handleClick}
        style={{ cursor }}
      >
        <UnknownSymbolFallback
          elementType={elementType}
          elementName={elementName}
          selected={selected}
          inService={inService}
        />
      </g>
    );
  }

  // Get switch state for CB/DS elements
  const switchState: SwitchState | undefined =
    elementType === 'Switch'
      ? ((symbol as SwitchSymbol).switchState as SwitchState) ?? 'UNKNOWN'
      : undefined;

  // Render ETAP symbol
  return (
    <g
      {...testIdAttrs}
      transform={`translate(${position.x}, ${position.y})`}
      onClick={handleClick}
      style={{ cursor }}
    >
      {/* ETAP Symbol centered */}
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        <EtapSymbolWrapper
          resolvedSymbol={resolvedSymbol}
          selected={selected}
          inService={inService}
          size={size}
          switchState={switchState}
          energized={energized}
        />
      </g>

      {/* Label */}
      <text
        x={0}
        y={labelOffsetY}
        textAnchor="middle"
        fontSize={elementType === 'Bus' ? '11' : '10'}
        fontWeight={selected ? 600 : 400}
        fill="#1f2937"
      >
        {elementName}
      </text>
    </g>
  );
};

/**
 * Grid background for canvas.
 */
interface GridProps {
  width: number;
  height: number;
  gridSize: number;
  viewport: ViewportState;
}

const Grid: React.FC<GridProps> = ({ width, height, gridSize, viewport }) => {
  const lines: React.ReactNode[] = [];
  const scaledGridSize = gridSize * viewport.zoom;

  // Calculate visible grid area
  const startX = Math.floor(-viewport.offsetX / scaledGridSize) * scaledGridSize;
  const startY = Math.floor(-viewport.offsetY / scaledGridSize) * scaledGridSize;
  const endX = width;
  const endY = height;

  // Vertical lines
  for (let x = startX; x <= endX; x += scaledGridSize) {
    const screenX = x + viewport.offsetX;
    if (screenX >= 0 && screenX <= width) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={screenX}
          y1={0}
          x2={screenX}
          y2={height}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      );
    }
  }

  // Horizontal lines
  for (let y = startY; y <= endY; y += scaledGridSize) {
    const screenY = y + viewport.offsetY;
    if (screenY >= 0 && screenY <= height) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={screenY}
          x2={width}
          y2={screenY}
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      );
    }
  }

  return <g data-testid="sld-grid">{lines}</g>;
};

/**
 * Main SLD View Canvas component (read-only) with ETAP symbols.
 */
export const SLDViewCanvas: React.FC<SLDViewCanvasProps> = ({
  symbols,
  selectedId,
  onSymbolClick,
  viewport,
  showGrid,
  width,
  height,
}) => {
  // Sort symbols for deterministic rendering (by ID)
  const sortedSymbols = [...symbols].sort((a, b) => a.id.localeCompare(b.id));

  // Calculate energization state (UI-only, deterministic)
  const energizationState = useMemo(() => calculateEnergization(symbols), [symbols]);

  return (
    <svg
      data-testid="sld-view-canvas"
      width={width}
      height={height}
      className="bg-white"
      style={{ display: 'block' }}
    >
      {/* Grid background */}
      {showGrid && <Grid width={width} height={height} gridSize={20} viewport={viewport} />}

      {/* Transformed content group */}
      <g
        transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.zoom})`}
        data-testid="sld-content-group"
      >
        {/* Render symbols with energization state */}
        {sortedSymbols.map((symbol) => (
          <Symbol
            key={symbol.id}
            symbol={symbol}
            selected={symbol.id === selectedId || symbol.elementId === selectedId}
            onClick={onSymbolClick}
            energized={energizationState.energizedElements.get(symbol.id) ?? true}
          />
        ))}
      </g>

      {/* Empty state */}
      {symbols.length === 0 && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fontSize="14"
          fill="#9ca3af"
          data-testid="sld-empty-state"
        >
          Brak elementow do wyswietlenia
        </text>
      )}
    </svg>
  );
};
