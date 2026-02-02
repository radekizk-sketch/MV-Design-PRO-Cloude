/**
 * UnifiedSymbolRenderer — Wspólny renderer symboli dla edytora i podglądu SLD
 *
 * PR-SLD-04: Unifikacja symboli w edytorze do standardu ETAP
 *
 * CANONICAL ALIGNMENT:
 * - etap_symbols/*: Źródło prawdy dla kształtów symboli
 * - SymbolResolver.ts: Mapowanie element → symbol
 * - EtapSymbolRenderer.tsx: Komponenty SVG dla symboli ETAP
 *
 * BINDING CONTRACT:
 * - Edytor i podgląd używają tego samego renderera symboli
 * - Porty są spójne z definicjami w SymbolResolver.ts
 * - Fallback tylko dla nieobsłużonych typów (Load, nieznane)
 *
 * ETAP PARITY:
 * - Wszystkie symbole mają viewBox 0 0 100 100
 * - Stroke: #000000, stroke-width: 3 (main), 2 (details)
 * - Symbole renderowane ze skalą względem docelowego rozmiaru
 */

import React, { useCallback } from 'react';
import type { AnySldSymbol, BranchSymbol, SwitchSymbol, Position } from '../../sld-editor/types';
import type { ElementType } from '../../types';
import type { IssueSeverity } from '../../types';
import { resolveSymbol, type ResolvedSymbol } from '../SymbolResolver';
import { EtapSymbol, type SwitchState } from '../EtapSymbolRenderer';

/**
 * Symbol size configuration.
 * ETAP symbols use viewBox 100x100, scaled to these sizes.
 */
export const SYMBOL_SIZES: Record<ElementType, { width: number; height: number }> = {
  Bus: { width: 80, height: 40 },
  LineBranch: { width: 60, height: 40 },
  TransformerBranch: { width: 40, height: 50 },
  Switch: { width: 40, height: 50 },
  Source: { width: 50, height: 60 },
  Load: { width: 30, height: 30 }, // Fallback only
};

/**
 * Visual state for symbol rendering.
 */
export interface SymbolVisualState {
  /** Whether the symbol is selected */
  selected: boolean;
  /** Whether the element is in service */
  inService: boolean;
  /** Whether the element is energized (for viewer) */
  energized?: boolean;
  /** Highlight severity (for validation issues) */
  highlightSeverity?: IssueSeverity | null;
  /** Whether the symbol is highlighted */
  highlighted?: boolean;
}

/**
 * Interaction handlers for symbol.
 */
export interface SymbolInteractionHandlers {
  onMouseDown?: (symbolId: string, position: Position) => void;
  onClick?: (symbolId: string, mode: 'single' | 'add' | 'toggle') => void;
}

/**
 * Props for unified symbol renderer.
 */
export interface UnifiedSymbolRendererProps {
  /** Symbol to render */
  symbol: AnySldSymbol;
  /** Visual state */
  visualState: SymbolVisualState;
  /** Interaction handlers (optional, for editor) */
  handlers?: SymbolInteractionHandlers;
  /** Whether to show label */
  showLabel?: boolean;
  /** Custom label offset Y */
  labelOffsetY?: number;
}

/**
 * Calculate stroke color based on visual state.
 */
function getStrokeColor(state: SymbolVisualState): string {
  const { selected, inService, energized = true, highlighted, highlightSeverity } = state;

  // Highlight takes priority
  if (highlighted && highlightSeverity) {
    switch (highlightSeverity) {
      case 'HIGH':
        return '#dc2626'; // red-600
      case 'WARN':
        return '#f59e0b'; // amber-500
      case 'INFO':
        return '#3b82f6'; // blue-500
    }
  }

  // Selection
  if (selected) {
    return '#3b82f6'; // blue-500
  }

  // Energization
  const isEnergized = energized && inService;
  return isEnergized ? '#1f2937' : '#9ca3af';
}

/**
 * Calculate stroke width based on visual state.
 */
function getStrokeWidth(state: SymbolVisualState): number {
  const { selected, highlighted, highlightSeverity } = state;

  if (highlighted && highlightSeverity) {
    return highlightSeverity === 'INFO' ? 2 : 3;
  }

  return selected ? 3.5 : 3;
}

/**
 * Calculate opacity based on visual state.
 */
function getOpacity(state: SymbolVisualState): number {
  const { inService, energized = true } = state;

  if (!inService) {
    return 0.5;
  }

  return energized ? 1 : 0.6;
}

/**
 * Calculate fill color based on visual state.
 */
function getFillColor(state: SymbolVisualState): string {
  return state.selected ? '#dbeafe' : '#ffffff';
}

/**
 * ETAP Symbol Wrapper — applies styling and scaling.
 */
const EtapSymbolWrapper: React.FC<{
  resolvedSymbol: ResolvedSymbol;
  visualState: SymbolVisualState;
  size: { width: number; height: number };
  switchState?: SwitchState;
}> = ({ resolvedSymbol, visualState, size, switchState }) => {
  const stroke = getStrokeColor(visualState);
  const strokeWidth = getStrokeWidth(visualState);
  const opacity = getOpacity(visualState);
  const fill = getFillColor(visualState);

  return (
    <EtapSymbol
      symbolId={resolvedSymbol.symbolId}
      stroke={stroke}
      fill={fill}
      strokeWidth={strokeWidth}
      opacity={opacity}
      size={Math.max(size.width, size.height)}
      switchState={switchState}
    />
  );
};

/**
 * Load Fallback — triangle symbol for Load elements (no ETAP symbol).
 * Marked as FALLBACK per PR-SLD-04.
 */
const LoadFallback: React.FC<{
  visualState: SymbolVisualState;
  elementName: string;
}> = ({ visualState, elementName }) => {
  const stroke = getStrokeColor(visualState);
  const strokeWidth = visualState.selected ? 2.5 : 1.5;
  const opacity = getOpacity(visualState);
  const fill = getFillColor(visualState);

  return (
    <>
      {/* FALLBACK: Load triangle - brak symbolu ETAP */}
      <polygon
        points="0,-14 12,10 -12,10"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        data-testid="sld-fallback-load"
        data-fallback="true"
      />
      <text
        x={0}
        y={-20}
        textAnchor="middle"
        fontSize="10"
        fontWeight={visualState.selected ? 600 : 400}
        fill="#1f2937"
      >
        {elementName}
      </text>
    </>
  );
};

/**
 * Unknown Symbol Fallback — minimal indicator for unsupported element types.
 * Marked as FALLBACK per PR-SLD-04.
 */
const UnknownSymbolFallback: React.FC<{
  elementType: ElementType;
  elementName: string;
  visualState: SymbolVisualState;
}> = ({ elementType, elementName, visualState }) => {
  const stroke = visualState.selected ? '#3b82f6' : visualState.inService ? '#ef4444' : '#9ca3af';
  const opacity = getOpacity(visualState);

  return (
    <>
      {/* FALLBACK: Unknown element - dashed circle with "?" */}
      <circle
        cx={0}
        cy={0}
        r={12}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
        strokeDasharray="4,2"
        data-testid="sld-fallback-unknown"
        data-fallback="true"
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
 * Unified Symbol Renderer — renders any SLD symbol using ETAP standard.
 *
 * This is the single entry point for rendering symbols in both
 * the editor (SldCanvas) and the viewer (SLDViewCanvas).
 *
 * @example
 * ```tsx
 * <UnifiedSymbolRenderer
 *   symbol={busSymbol}
 *   visualState={{ selected: false, inService: true, energized: true }}
 *   handlers={{ onClick: handleClick }}
 * />
 * ```
 */
export const UnifiedSymbolRenderer: React.FC<UnifiedSymbolRendererProps> = ({
  symbol,
  visualState,
  handlers,
  showLabel = true,
  labelOffsetY,
}) => {
  const { position, elementType, elementName } = symbol;

  // Resolve ETAP symbol
  const resolvedSymbol = resolveSymbol(symbol);

  // Get symbol size
  const size = SYMBOL_SIZES[elementType] ?? { width: 40, height: 40 };

  // Calculate offset to center the symbol
  const offsetX = -size.width / 2;
  const offsetY = -size.height / 2;

  // Label position
  const defaultLabelOffsetY = elementType === 'Bus' ? -size.height / 2 - 8 : -size.height / 2 - 5;
  const finalLabelOffsetY = labelOffsetY ?? defaultLabelOffsetY;

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!handlers?.onMouseDown) return;
      e.stopPropagation();
      const rect = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
      const mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      handlers.onMouseDown(symbol.id, mousePosition);
    },
    [handlers, symbol.id]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!handlers?.onClick) return;
      e.stopPropagation();
      const mode = e.shiftKey ? 'add' : e.ctrlKey || e.metaKey ? 'toggle' : 'single';
      handlers.onClick(symbol.id, mode);
    },
    [handlers, symbol.id]
  );

  // Build data-testid attributes
  const testIdAttrs: Record<string, string> = {
    'data-testid': `sld-symbol-${symbol.id}`,
    'data-element-type': elementType,
  };

  if (resolvedSymbol) {
    testIdAttrs['data-etap-symbol'] = resolvedSymbol.symbolId;
  }

  // Add switch-specific attributes
  if (elementType === 'Switch') {
    const switchSymbol = symbol as SwitchSymbol;
    testIdAttrs['data-switch-state'] = switchSymbol.switchState;
    testIdAttrs['data-switch-type'] = switchSymbol.switchType;
  }

  // Add branch-specific attributes
  if (elementType === 'LineBranch') {
    const branchSymbol = symbol as BranchSymbol;
    testIdAttrs['data-branch-type'] = branchSymbol.branchType ?? 'CABLE';
  }

  // Add energization state
  if (visualState.energized !== undefined) {
    testIdAttrs['data-energized'] = visualState.energized ? 'true' : 'false';
  }

  const cursor = handlers?.onClick || handlers?.onMouseDown ? 'pointer' : 'default';
  const interactive = !!(handlers?.onClick || handlers?.onMouseDown);

  // Handle Load fallback (no ETAP symbol)
  if (elementType === 'Load') {
    return (
      <g
        {...testIdAttrs}
        transform={`translate(${position.x}, ${position.y})`}
        onMouseDown={interactive ? handleMouseDown : undefined}
        onClick={interactive ? handleClick : undefined}
        style={{ cursor }}
      >
        <LoadFallback visualState={visualState} elementName={elementName} />
      </g>
    );
  }

  // Handle unknown symbols (no ETAP mapping)
  if (!resolvedSymbol) {
    console.warn(`[UnifiedSymbolRenderer] Brak mapowania ETAP dla elementu: ${elementType} (${elementName})`);
    return (
      <g
        {...testIdAttrs}
        transform={`translate(${position.x}, ${position.y})`}
        onMouseDown={interactive ? handleMouseDown : undefined}
        onClick={interactive ? handleClick : undefined}
        style={{ cursor }}
      >
        <UnknownSymbolFallback
          elementType={elementType}
          elementName={elementName}
          visualState={visualState}
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
      onMouseDown={interactive ? handleMouseDown : undefined}
      onClick={interactive ? handleClick : undefined}
      style={{ cursor }}
    >
      {/* ETAP Symbol centered */}
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        <EtapSymbolWrapper
          resolvedSymbol={resolvedSymbol}
          visualState={visualState}
          size={size}
          switchState={switchState}
        />
      </g>

      {/* Label */}
      {showLabel && (
        <text
          x={0}
          y={finalLabelOffsetY}
          textAnchor="middle"
          fontSize={elementType === 'Bus' ? '11' : '10'}
          fontWeight={visualState.selected ? 600 : 400}
          fill="#1f2937"
        >
          {elementName}
        </text>
      )}
    </g>
  );
};

/**
 * Render symbol function — single entry point for symbol rendering.
 *
 * This is the unified API for rendering symbols, to be used by both
 * the editor and the viewer.
 *
 * @param options - Rendering options
 * @returns JSX element
 */
export function renderSymbol(options: {
  symbol: AnySldSymbol;
  selected: boolean;
  inService: boolean;
  energized?: boolean;
  highlighted?: boolean;
  highlightSeverity?: IssueSeverity | null;
  onMouseDown?: (symbolId: string, position: Position) => void;
  onClick?: (symbolId: string, mode: 'single' | 'add' | 'toggle') => void;
  showLabel?: boolean;
}): React.ReactElement {
  const {
    symbol,
    selected,
    inService,
    energized,
    highlighted,
    highlightSeverity,
    onMouseDown,
    onClick,
    showLabel,
  } = options;

  const visualState: SymbolVisualState = {
    selected,
    inService,
    energized,
    highlighted,
    highlightSeverity,
  };

  const handlers: SymbolInteractionHandlers | undefined =
    onMouseDown || onClick ? { onMouseDown, onClick } : undefined;

  return (
    <UnifiedSymbolRenderer
      key={symbol.id}
      symbol={symbol}
      visualState={visualState}
      handlers={handlers}
      showLabel={showLabel}
    />
  );
}

export default UnifiedSymbolRenderer;
