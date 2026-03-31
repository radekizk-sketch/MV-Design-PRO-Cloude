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
import type { InteractionPortRole, SLDViewCanvasProps, ViewportState } from './types';
import { calculateEnergization } from './energization';
import { ConnectionsLayer } from './ConnectionRenderer';
import { generateConnections } from '../sld-editor/utils/connectionRouting';
import { UnifiedSymbolRenderer, type SymbolVisualState, type SymbolInteractionHandlers } from './symbols';
import { TrunkSpineRenderer } from './TrunkSpineRenderer';
import { BranchRenderer } from './BranchRenderer';
import { StationFieldRenderer } from './StationFieldRenderer';
import { InlineBranchObjectRenderer } from './InlineBranchObjectRenderer';
import { JunctionDotLayer } from './JunctionDotLayer';
import { ETAP_GRID, ETAP_TYPOGRAPHY, ETAP_CANVAS } from './sldEtapStyle';
import './sld-canonical.css';

/**
 * Read-only symbol renderer using UnifiedSymbolRenderer.
 *
 * PR-SLD-04: Uses the same renderer as editor for consistency.
 */
type IssueSeverity = 'HIGH' | 'WARN' | 'INFO';

interface SymbolProps {
  symbol: AnySldSymbol;
  selected: boolean;
  onClick: (symbolId: string, elementType: ElementType, elementName: string) => void;
  onHover?: (symbolId: string | null, elementType?: ElementType, elementName?: string) => void;
  energized: boolean;
  /** Severity z readiness blockers — podświetla symbol kolorową obwódką */
  readinessSeverity?: IssueSeverity | null;
}

/**
 * Main symbol component using unified ETAP symbols.
 */
const Symbol: React.FC<SymbolProps> = ({ symbol, selected, onClick, onHover, energized, readinessSeverity }) => {
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
    highlighted: !!readinessSeverity,
    highlightSeverity: readinessSeverity ?? null,
  };

  // Build interaction handlers - viewer only needs onClick
  const handlers: SymbolInteractionHandlers = {
    onClick: handleClick,
  };

  return (
    <g
      onMouseEnter={() => onHover?.(symbol.id, symbol.elementType, symbol.elementName)}
      onMouseLeave={() => onHover?.(null)}
    >
      <UnifiedSymbolRenderer
        symbol={symbol}
        visualState={visualState}
        handlers={handlers}
        showLabel={true}
      />
    </g>
  );
};

function getPortsForSymbol(symbol: AnySldSymbol): InteractionPortRole[] {
  switch (symbol.elementType) {
    case 'Source':
      return ['TRUNK_OUT'];
    case 'Bus':
      return ['TRUNK_IN', 'TRUNK_OUT', 'BRANCH_OUT', 'RING'];
    case 'LineBranch':
      return ['TRUNK_IN', 'TRUNK_OUT'];
    case 'TransformerBranch':
      return ['TRUNK_IN', 'NN_SOURCE'];
    case 'Generator':
      return ['NN_SOURCE'];
    default:
      return [];
  }
}

function getPortPosition(symbol: AnySldSymbol, role: InteractionPortRole): { x: number; y: number } {
  const { x, y } = symbol.position;
  switch (role) {
    case 'TRUNK_IN':
      return { x, y: y - 18 };
    case 'TRUNK_OUT':
      return { x, y: y + 18 };
    case 'BRANCH_OUT':
      return { x: x + 18, y };
    case 'RING':
      return { x: x - 18, y };
    case 'NN_SOURCE':
      return { x: x + 18, y: y + 18 };
  }
}

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
  onSymbolHover,
  onCanvasClick,
  onPortClick,
  onPortHover,
  onSegmentClick,
  onSegmentHover,
  selectedConnectionId,
  interactionPreview,
  viewport,
  showGrid,
  width,
  height,
  canonicalAnnotations,
  highlightedElements,
}) => {
  // KANONICZNE ZRÓDŁO GEOMETRII (Step VII.c+):
  // Viewer nie uruchamia lokalnego engine layoutu. Używa wyłącznie geometrii
  // dostarczonej przez pipeline Snapshot -> SLD symbols.
  const symbols = inputSymbols;

  // Sort symbols for deterministic rendering (by ID)
  const sortedSymbols = [...symbols].sort((a, b) => a.id.localeCompare(b.id));

  // Calculate energization state (UI-only, deterministic)
  const energizationState = useMemo(() => calculateEnergization(symbols), [symbols]);

  // Generate connections (N-01: port-to-port, N-05: orthogonal routing)
  // DETERMINISM: Same symbols -> same connections
  const connections = useMemo(() => generateConnections(symbols), [symbols]);

  const showTechnicalCanonicalLabels = viewport.zoom >= 1.35;

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

  const toSegmentKind = useCallback((connection: (typeof connections)[number]): 'TRUNK' | 'BRANCH' | 'RING' | 'SECONDARY' => {
    if (connection.connectionType === 'branch') return 'BRANCH';
    if (connection.connectionType === 'source' || connection.connectionType === 'load' || connection.connectionType === 'switch') {
      return 'SECONDARY';
    }
    return 'TRUNK';
  }, []);

  const buildSegmentTarget = useCallback((connectionId: string) => {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) return null;
    return {
      segment_ref: connection.elementId ?? connection.id,
      edge_id: connection.id,
      from_ref: connection.fromSymbolId,
      to_ref: connection.toSymbolId,
      segment_kind: toSegmentKind(connection),
    };
  }, [connections, toSegmentKind]);

  const previewConnection = useMemo(
    () => interactionPreview?.target_kind === 'segment'
      ? connections.find((conn) => conn.id === interactionPreview.target_id || conn.elementId === interactionPreview.target_id) ?? null
      : null,
    [interactionPreview, connections],
  );

  const previewSymbol = useMemo(
    () => interactionPreview?.target_kind === 'element'
      ? sortedSymbols.find((symbol) => symbol.id === interactionPreview.target_id || symbol.elementId === interactionPreview.target_id) ?? null
      : null,
    [interactionPreview, sortedSymbols],
  );

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
        onClick={onCanvasClick}
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
          selectedConnectionId={selectedConnectionId ?? null}
          energizationMap={connectionEnergizationMap}
          onConnectionClick={(connectionId) => {
            const target = buildSegmentTarget(connectionId);
            if (target) onSegmentClick?.(target);
          }}
          onConnectionHover={(connectionId) => {
            if (!connectionId) {
              onSegmentHover?.(null);
              return;
            }
            const target = buildSegmentTarget(connectionId);
            onSegmentHover?.(target);
          }}
        />

        {previewConnection && (
          <polyline
            points={previewConnection.path.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={interactionPreview?.valid ? '#16a34a' : '#dc2626'}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.25}
            data-testid="sld-preview-segment-overlay"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {previewSymbol && (
          <rect
            x={previewSymbol.position.x - 18}
            y={previewSymbol.position.y - 18}
            width={36}
            height={36}
            rx={6}
            ry={6}
            fill={interactionPreview?.valid ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)'}
            stroke={interactionPreview?.valid ? '#16a34a' : '#dc2626'}
            strokeWidth={1}
            data-testid="sld-preview-element-overlay"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Render symbols with energization + readiness state */}
        {sortedSymbols.map((symbol) => {
          const elementRef = symbol.elementId ?? symbol.id;
          const severity = highlightedElements?.get(elementRef)
            ?? highlightedElements?.get(symbol.id)
            ?? null;
          return (
            <Symbol
              key={symbol.id}
              symbol={symbol}
              selected={symbol.id === selectedId || symbol.elementId === selectedId}
              onClick={onSymbolClick}
              onHover={onSymbolHover}
              energized={energizationState.energizedElements.get(symbol.id) ?? true}
              readinessSeverity={severity}
            />
          );
        })}

        {sortedSymbols
          .filter((symbol) => symbol.id === selectedId || symbol.elementId === selectedId)
          .flatMap((symbol) => getPortsForSymbol(symbol).map((role) => ({ symbol, role })))
          .map(({ symbol, role }) => {
            const portPos = getPortPosition(symbol, role);
            return (
              <g key={`${symbol.id}-${role}`} data-testid={`sld-port-${symbol.id}-${role}`}>
                <circle
                  cx={portPos.x}
                  cy={portPos.y}
                  r={10}
                  fill="rgba(37, 99, 235, 0.16)"
                  stroke="#2563eb"
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onPortClick?.(symbol.id, symbol.elementType, symbol.elementName, role)}
                  onMouseEnter={() => onPortHover?.(symbol.id, symbol.elementType, symbol.elementName, role)}
                  onMouseLeave={() => onPortHover?.(null)}
                />
                <text x={portPos.x + 12} y={portPos.y + 3} fontSize={9} fill="#1d4ed8">
                  {role}
                </text>
              </g>
            );
          })}

        {/* Canonical SLD layers (Phase 7) — pointerEvents: none to avoid blocking interaction */}
        {canonicalAnnotations && (
          <>
            <g className="sld-trunk-spines" style={{ pointerEvents: 'none' }}>
              <TrunkSpineRenderer
                nodes={canonicalAnnotations.trunkNodes}
                segments={canonicalAnnotations.trunkSegments}
                showTechnicalLabels={showTechnicalCanonicalLabels}
              />
            </g>
            <g className="sld-branch-points" style={{ pointerEvents: 'none' }}>
              {canonicalAnnotations.branchPoints.map((bp) => (
                <BranchRenderer key={bp.branchId} branch={bp} showTechnicalLabels={showTechnicalCanonicalLabels} />
              ))}
            </g>
            <g className="sld-station-fields" style={{ pointerEvents: 'none' }}>
              {canonicalAnnotations.stationChains.map((sc) => (
                <StationFieldRenderer key={sc.stationId} chain={sc} showTechnicalLabels={showTechnicalCanonicalLabels} />
              ))}
            </g>
            {(canonicalAnnotations.inlineBranchObjects?.length ?? 0) > 0 && (
              <g className="sld-inline-branch-objects">
                {canonicalAnnotations.inlineBranchObjects!.map((obj) => (
                  <InlineBranchObjectRenderer
                    key={obj.nodeId}
                    obj={obj}
                    selected={obj.nodeId === selectedId}
                    onClick={(nodeId) => onSymbolClick(nodeId, 'Station', obj.label)}
                    showTechnicalLabels={showTechnicalCanonicalLabels}
                  />
                ))}
              </g>
            )}
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

      {interactionPreview && (
        <g data-testid="sld-preview-status-overlay">
          <rect x={12} y={12} width={360} height={24} rx={6} ry={6} fill={interactionPreview.valid ? 'rgba(22,163,74,0.18)' : 'rgba(220,38,38,0.18)'} />
          <text x={20} y={28} fontSize={12} fill={interactionPreview.valid ? '#166534' : '#991b1b'}>
            {interactionPreview.message_pl}
          </text>
        </g>
      )}
    </svg>
  );
};
