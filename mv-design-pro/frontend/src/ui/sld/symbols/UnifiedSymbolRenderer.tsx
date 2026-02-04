/**
 * UnifiedSymbolRenderer — Wspólny renderer symboli dla edytora i podglądu SLD
 *
 * PR-SLD-04: Unifikacja symboli w edytorze do standardu ETAP
 * PR-SLD-ETAP-STYLE-02: ETAP 1:1 Visual Parity
 *
 * CANONICAL ALIGNMENT:
 * - sldEtapStyle.ts: Single source of truth for visual styling
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
 * - Stroke hierarchy: busbar > feeder > symbol > aux > leader
 * - Colors: voltage-based (WN/SN/nN) with state modifiers
 * - Symbole renderowane ze skalą względem docelowego rozmiaru
 */

import React, { useCallback } from 'react';
import type { AnySldSymbol, BranchSymbol, SwitchSymbol, Position } from '../../sld-editor/types';
import type { ElementType } from '../../types';
import type { IssueSeverity } from '../../types';
import { resolveSymbol, type ResolvedSymbol } from '../SymbolResolver';
import { EtapSymbol, type SwitchState } from '../EtapSymbolRenderer';
import {
  ETAP_STROKE,
  ETAP_STROKE_SELECTED,
  ETAP_SYMBOL_SIZES,
  ETAP_TYPOGRAPHY,
  ETAP_STATE_COLORS,
  ETAP_FILL_COLORS,
  getEtapLabelAnchor,
} from '../sldEtapStyle';

/**
 * Symbol size configuration.
 * ETAP symbols use viewBox 100x100, scaled to these sizes.
 * Uses ETAP_SYMBOL_SIZES from sldEtapStyle.ts as source of truth.
 */
export const SYMBOL_SIZES: Record<ElementType, { width: number; height: number }> = {
  Bus: ETAP_SYMBOL_SIZES.Bus,
  LineBranch: ETAP_SYMBOL_SIZES.LineBranch,
  TransformerBranch: ETAP_SYMBOL_SIZES.TransformerBranch,
  Switch: ETAP_SYMBOL_SIZES.Switch,
  Source: ETAP_SYMBOL_SIZES.Source,
  Load: ETAP_SYMBOL_SIZES.Load,
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
 * Uses ETAP_STATE_COLORS from sldEtapStyle.ts.
 */
function getStrokeColor(state: SymbolVisualState): string {
  const { selected, inService, energized = true, highlighted, highlightSeverity } = state;

  // Highlight takes priority (validation issues)
  if (highlighted && highlightSeverity) {
    switch (highlightSeverity) {
      case 'HIGH':
        return ETAP_STATE_COLORS.error;
      case 'WARN':
        return ETAP_STATE_COLORS.warning;
      case 'INFO':
        return ETAP_STATE_COLORS.info;
    }
  }

  // Selection
  if (selected) {
    return ETAP_STATE_COLORS.selected;
  }

  // Out of service
  if (!inService) {
    return ETAP_STATE_COLORS.outOfService;
  }

  // De-energized
  if (!energized) {
    return ETAP_STATE_COLORS.deenergized;
  }

  // Normal energized — use default symbol color
  return ETAP_TYPOGRAPHY.labelColor;
}

/**
 * Calculate stroke width based on visual state and element type.
 * Uses ETAP_STROKE hierarchy from sldEtapStyle.ts.
 */
function getStrokeWidth(state: SymbolVisualState, elementType?: ElementType): number {
  const { selected, highlighted, highlightSeverity } = state;

  // Determine base stroke by element type
  let baseStroke: number = ETAP_STROKE.symbol;
  if (elementType === 'Bus') {
    baseStroke = ETAP_STROKE.busbar;
  } else if (elementType === 'LineBranch') {
    baseStroke = ETAP_STROKE.feeder;
  }

  // Highlight overrides
  if (highlighted && highlightSeverity) {
    return highlightSeverity === 'INFO' ? ETAP_STROKE.aux : baseStroke;
  }

  // Selected gets slightly thicker stroke
  if (selected) {
    if (elementType === 'Bus') {
      return ETAP_STROKE_SELECTED.busbar;
    } else if (elementType === 'LineBranch') {
      return ETAP_STROKE_SELECTED.feeder;
    }
    return ETAP_STROKE_SELECTED.symbol;
  }

  return baseStroke;
}

/**
 * Calculate opacity based on visual state.
 */
function getOpacity(state: SymbolVisualState): number {
  const { inService, energized = true } = state;

  if (!inService) {
    return 0.5;
  }

  return energized ? 1 : 0.7;
}

/**
 * Calculate fill color based on visual state.
 * Uses ETAP_FILL_COLORS from sldEtapStyle.ts.
 */
function getFillColor(state: SymbolVisualState): string {
  const { selected, energized = true, inService = true } = state;

  if (selected) {
    return ETAP_FILL_COLORS.selected;
  }

  if (!energized || !inService) {
    return ETAP_FILL_COLORS.deenergized;
  }

  return ETAP_FILL_COLORS.normal;
}

/**
 * ETAP Symbol Wrapper — applies styling and scaling.
 * Uses ETAP stroke hierarchy for proper visual weight.
 */
const EtapSymbolWrapper: React.FC<{
  resolvedSymbol: ResolvedSymbol;
  visualState: SymbolVisualState;
  size: { width: number; height: number };
  elementType: ElementType;
  switchState?: SwitchState;
}> = ({ resolvedSymbol, visualState, size, elementType, switchState }) => {
  const stroke = getStrokeColor(visualState);
  const strokeWidth = getStrokeWidth(visualState, elementType);
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
 * Uses ETAP typography and stroke hierarchy.
 */
const LoadFallback: React.FC<{
  visualState: SymbolVisualState;
  elementName: string;
}> = ({ visualState, elementName }) => {
  const stroke = getStrokeColor(visualState);
  const strokeWidth = visualState.selected ? ETAP_STROKE_SELECTED.symbol : ETAP_STROKE.symbol;
  const opacity = getOpacity(visualState);
  const fill = getFillColor(visualState);
  const labelAnchor = getEtapLabelAnchor('Load');

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
        x={labelAnchor.offsetX}
        y={labelAnchor.offsetY + 10}
        textAnchor={labelAnchor.textAnchor}
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.medium}
        fontWeight={visualState.selected ? ETAP_TYPOGRAPHY.fontWeight.semibold : ETAP_TYPOGRAPHY.fontWeight.normal}
        fill={ETAP_TYPOGRAPHY.labelColor}
      >
        {elementName}
      </text>
    </>
  );
};

/**
 * Unknown Symbol Fallback — minimal indicator for unsupported element types.
 * Marked as FALLBACK per PR-SLD-04.
 * Uses ETAP colors and typography.
 */
const UnknownSymbolFallback: React.FC<{
  elementType: ElementType;
  elementName: string;
  visualState: SymbolVisualState;
}> = ({ elementType, elementName, visualState }) => {
  const stroke = visualState.selected
    ? ETAP_STATE_COLORS.selected
    : visualState.inService
      ? ETAP_STATE_COLORS.error
      : ETAP_STATE_COLORS.outOfService;
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
        strokeWidth={ETAP_STROKE.aux}
        opacity={opacity}
        strokeDasharray="4,2"
        data-testid="sld-fallback-unknown"
        data-fallback="true"
      />
      <text
        x={0}
        y={5}
        textAnchor="middle"
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.medium}
        fontWeight={ETAP_TYPOGRAPHY.fontWeight.bold}
        fill={stroke}
        opacity={opacity}
      >
        ?
      </text>
      <text
        x={0}
        y={-18}
        textAnchor="middle"
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.xsmall}
        fill={ETAP_TYPOGRAPHY.secondaryColor}
      >
        {elementType}
      </text>
      <text
        x={0}
        y={22}
        textAnchor="middle"
        fontFamily={ETAP_TYPOGRAPHY.fontFamily}
        fontSize={ETAP_TYPOGRAPHY.fontSize.small}
        fill={ETAP_TYPOGRAPHY.labelColor}
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

  // Label position — uses ETAP anchor rules
  const labelAnchor = getEtapLabelAnchor(elementType);
  const defaultLabelOffsetY = -size.height / 2 + labelAnchor.offsetY;
  const finalLabelOffsetY = labelOffsetY ?? defaultLabelOffsetY;
  const finalLabelOffsetX = labelAnchor.offsetX;

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
          elementType={elementType}
          switchState={switchState}
        />
      </g>

      {/* Label — ETAP typography */}
      {showLabel && (
        <text
          x={finalLabelOffsetX}
          y={finalLabelOffsetY}
          textAnchor={labelAnchor.textAnchor}
          fontFamily={ETAP_TYPOGRAPHY.fontFamily}
          fontSize={elementType === 'Bus' ? ETAP_TYPOGRAPHY.fontSize.large : ETAP_TYPOGRAPHY.fontSize.medium}
          fontWeight={visualState.selected ? ETAP_TYPOGRAPHY.fontWeight.semibold : ETAP_TYPOGRAPHY.fontWeight.normal}
          fill={ETAP_TYPOGRAPHY.labelColor}
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
