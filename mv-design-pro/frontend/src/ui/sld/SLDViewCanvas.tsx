/**
 * SLD View Canvas — Read-Only SVG Rendering with ETAP Symbols
 *
 * PR-SLD-04: Unifikacja symboli w edytorze do standardu ETAP
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A.2: Symbol types (Bus, Line, Transformer, etc.)
 * - sld_rules.md § D.1: Visual state encoding (in_service, selected)
 * - powerfactory_ui_parity.md: PowerFactory-like presentation
 * - etap_symbols/*: ETAP-parity symbol library
 * - AUDYT_SLD_ETAP.md N-02: hierarchiczne auto-rozmieszczenie
 * - AUDYT_SLD_ETAP.md N-04: edytor używa tego samego renderera co podgląd (ETAP)
 *
 * READ-ONLY canvas:
 * - No drag/drop
 * - No lasso selection
 * - No editing
 * - Click → selection only
 * - AUTOMATYCZNE auto-rozmieszczenie (bez przycisku)
 *
 * ETAP SYMBOL INTEGRATION (via UnifiedSymbolRenderer):
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
import type { AnySldSymbol } from '../sld-editor/types';
import type { ElementType } from '../types';
import type { SLDViewCanvasProps, ViewportState } from './types';
import { calculateEnergization } from './energization';
import { ConnectionsLayer } from './ConnectionRenderer';
import { generateConnections } from '../sld-editor/utils/connectionRouting';
import { useAutoLayout } from '../sld-editor/hooks/useAutoLayout';
import { UnifiedSymbolRenderer, type SymbolVisualState, type SymbolInteractionHandlers } from './symbols';
import { TrunkSpineRenderer } from './TrunkSpineRenderer';
import { BranchRenderer } from './BranchRenderer';
import { StationFieldRenderer } from './StationFieldRenderer';
import { JunctionDotLayer } from './JunctionDotLayer';
import { ETAP_GRID, ETAP_TYPOGRAPHY, ETAP_CANVAS } from './sldEtapStyle';
import './sld-canonical.css';

/**
 * Read-only symbol renderer using UnifiedSymbolRenderer.
 *
 * PR-SLD-04: Uses the same renderer as editor for consistency.
 */
interface SymbolProps {
  symbol: AnySldSymbol;
  selected: boolean;
  onClick: (symbolId: string, elementType: ElementType, elementName: string) => void;
  energized: boolean;
}

/**
 * Main symbol component using unified ETAP symbols.
 */
const Symbol: React.FC<SymbolProps> = ({ symbol, selected, onClick, energized }) => {
  // Handle click - adapts the unified renderer's interface to viewer's onClick
  const handleClick = useCallback(
    (symbolId: string) => {
      onClick(symbolId, symbol.elementType, symbol.elementName);
    },
    [symbol.elementType, symbol.elementName, onClick]
  );

  // Build visual state for unified renderer
  const visualState: SymbolVisualState = {
    selected,
    inService: symbol.inService,
    energized,
    highlighted: false,
    highlightSeverity: null,
  };

  // Build interaction handlers - viewer only needs onClick
  const handlers: SymbolInteractionHandlers = {
    onClick: handleClick,
  };

  return (
    <UnifiedSymbolRenderer
      symbol={symbol}
      visualState={visualState}
      handlers={handlers}
      showLabel={true}
    />
  );
};

/**
 * Grid background for canvas.
 * ETAP style: subdued, not dominant. Major grid every N cells.
 * Technical drawing paper aesthetic — warm, professional.
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

  // Calculate which lines are major (every N cells)
  const getMajorIndex = (value: number) => Math.round(value / scaledGridSize);

  // Vertical lines
  for (let x = startX; x <= endX; x += scaledGridSize) {
    const screenX = x + viewport.offsetX;
    if (screenX >= 0 && screenX <= width) {
      const gridIndex = getMajorIndex(x);
      const isMajor = gridIndex % ETAP_GRID.majorEvery === 0;
      const isAxis = gridIndex === 0;
      lines.push(
        <line
          key={`v-${x}`}
          x1={screenX}
          y1={0}
          x2={screenX}
          y2={height}
          stroke={isAxis ? ETAP_GRID.axisColor : isMajor ? ETAP_GRID.majorColor : ETAP_GRID.minorColor}
          strokeWidth={isAxis ? ETAP_GRID.axisStrokeWidth : isMajor ? ETAP_GRID.majorStrokeWidth : ETAP_GRID.minorStrokeWidth}
          opacity={ETAP_GRID.opacity}
        />
      );
    }
  }

  // Horizontal lines
  for (let y = startY; y <= endY; y += scaledGridSize) {
    const screenY = y + viewport.offsetY;
    if (screenY >= 0 && screenY <= height) {
      const gridIndex = getMajorIndex(y);
      const isMajor = gridIndex % ETAP_GRID.majorEvery === 0;
      const isAxis = gridIndex === 0;
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={screenY}
          x2={width}
          y2={screenY}
          stroke={isAxis ? ETAP_GRID.axisColor : isMajor ? ETAP_GRID.majorColor : ETAP_GRID.minorColor}
          strokeWidth={isAxis ? ETAP_GRID.axisStrokeWidth : isMajor ? ETAP_GRID.majorStrokeWidth : ETAP_GRID.minorStrokeWidth}
          opacity={ETAP_GRID.opacity}
        />
      );
    }
  }

  return <g data-testid="sld-grid">{lines}</g>;
};

/**
 * Main SLD View Canvas component (read-only) with ETAP symbols.
 *
 * AUTO-LAYOUT (N-02):
 * - Layout jest wyliczany AUTOMATYCZNIE przy kazdej zmianie topologii
 * - Brak przycisku "Rozmiesc automatycznie"
 * - Deterministyczny (ten sam model -> ten sam uklad)
 * - Stabilny (mala zmiana nie powoduje "przeskoku")
 */
export const SLDViewCanvas: React.FC<SLDViewCanvasProps> = ({
  symbols: inputSymbols,
  selectedId,
  onSymbolClick,
  viewport,
  showGrid,
  width,
  height,
  canonicalAnnotations,
}) => {
  // AUTO-LAYOUT (N-02): Automatyczne rozmieszczenie przy kazdej zmianie topologii
  // DETERMINISM: Ten sam model -> ten sam uklad
  // STABILNOSC: Mala zmiana = mala zmiana ukladu
  const { layoutSymbols } = useAutoLayout(inputSymbols);

  // Sort symbols for deterministic rendering (by ID)
  const sortedSymbols = [...layoutSymbols].sort((a, b) => a.id.localeCompare(b.id));

  // Use layout symbols for energization and connections
  const symbols = layoutSymbols;

  // Calculate energization state (UI-only, deterministic)
  const energizationState = useMemo(() => calculateEnergization(symbols), [symbols]);

  // Generate connections (N-01: port-to-port, N-05: orthogonal routing)
  // DETERMINISM: Same symbols -> same connections
  const connections = useMemo(() => generateConnections(symbols), [symbols]);

  // Build energization map for connections
  const connectionEnergizationMap = useMemo(() => {
    const map = new Map<string, boolean>();
    connections.forEach((conn) => {
      // Connection is energized if both endpoints are energized
      const fromEnergized = energizationState.energizedElements.get(conn.fromSymbolId) ?? true;
      const toEnergized = energizationState.energizedElements.get(conn.toSymbolId) ?? true;
      map.set(conn.id, fromEnergized && toEnergized);
    });
    return map;
  }, [connections, energizationState]);

  return (
    <svg
      data-testid="sld-view-canvas"
      width={width}
      height={height}
      style={{ display: 'block' }}
    >
      {/* Defs for gradients and patterns */}
      <defs>
        {/* ETAP-style canvas background gradient (technical drawing paper) */}
        <linearGradient id="etap-canvas-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={ETAP_CANVAS.gradientStart} />
          <stop offset="100%" stopColor={ETAP_CANVAS.gradientEnd} />
        </linearGradient>
        {/* Subtle inner shadow for depth */}
        <filter id="etap-canvas-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor={ETAP_CANVAS.shadowColor} floodOpacity="1" />
        </filter>
      </defs>

      {/* Canvas background — ETAP technical drawing paper */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#etap-canvas-bg)"
        data-testid="sld-canvas-background"
      />

      {/* Grid background — ETAP subdued grid */}
      {showGrid && <Grid width={width} height={height} gridSize={ETAP_GRID.size} viewport={viewport} />}

      {/* Transformed content group */}
      <g
        transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.zoom})`}
        data-testid="sld-content-group"
      >
        {/* Connections layer (rendered UNDER symbols) */}
        <ConnectionsLayer
          connections={connections}
          selectedConnectionId={null}
          energizationMap={connectionEnergizationMap}
        />

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

        {/* Canonical SLD layers (Phase 7) — pointerEvents: none to avoid blocking interaction */}
        {canonicalAnnotations && (
          <>
            <g className="sld-trunk-spines" style={{ pointerEvents: 'none' }}>
              <TrunkSpineRenderer
                nodes={canonicalAnnotations.trunkNodes}
                segments={canonicalAnnotations.trunkSegments}
              />
            </g>
            <g className="sld-branch-points" style={{ pointerEvents: 'none' }}>
              {canonicalAnnotations.branchPoints.map((bp) => (
                <BranchRenderer key={bp.branchId} branch={bp} />
              ))}
            </g>
            <g className="sld-station-fields" style={{ pointerEvents: 'none' }}>
              {canonicalAnnotations.stationChains.map((sc) => (
                <StationFieldRenderer key={sc.stationId} chain={sc} />
              ))}
            </g>
            <g className="sld-junction-dots" style={{ pointerEvents: 'none' }}>
              <JunctionDotLayer annotations={canonicalAnnotations} />
            </g>
          </>
        )}
      </g>

      {/* Empty state — ETAP typography */}
      {symbols.length === 0 && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fontFamily={ETAP_TYPOGRAPHY.fontFamily}
          fontSize={ETAP_TYPOGRAPHY.fontSize.large}
          fill={ETAP_TYPOGRAPHY.secondaryColor}
          data-testid="sld-empty-state"
        >
          Brak elementow do wyswietlenia
        </text>
      )}
    </svg>
  );
};
