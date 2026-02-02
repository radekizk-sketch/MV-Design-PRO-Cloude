/**
 * P30b — SLD Canvas Component (SVG Rendering)
 *
 * PR-SLD-04: Unifikacja symboli w edytorze do standardu ETAP
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A.2: Symbol types (Bus, Line, Transformer, etc.)
 * - sld_rules.md § D.1: Visual state encoding (in_service, selected, hover)
 * - powerfactory_ui_parity.md: ≥110% PowerFactory symbol rendering
 * - AUDYT_SLD_ETAP.md N-02: hierarchiczne auto-rozmieszczenie
 * - AUDYT_SLD_ETAP.md N-04: edytor używa tego samego renderera co podgląd (ETAP)
 *
 * FEATURES:
 * - SVG rendering of all SLD symbols using ETAP standard
 * - Grid background (when enabled)
 * - Lasso selection (drag rectangle)
 * - Drag handles for selected symbols
 * - Mouse interactions (click, drag, lasso)
 * - AUTOMATYCZNE auto-rozmieszczenie (bez przycisku)
 *
 * ETAP PARITY (N-04):
 * - Edytor i podgląd używają tego samego UnifiedSymbolRenderer
 * - Symbole ETAP zamiast uproszczonych kształtów
 * - Porty spójne z definicjami w SymbolResolver.ts
 */

import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { useSldEditorStore } from './SldEditorStore';
import { useSldDrag } from './hooks/useSldDrag';
import { useAutoLayout } from './hooks/useAutoLayout';
import type { AnySldSymbol, Position } from './types';
import type { IssueSeverity } from '../types';
import { useIsMutationBlocked } from '../selection/store';
import { generateConnections } from './utils/connectionRouting';
import { ConnectionsLayer } from '../sld/ConnectionRenderer';
import { UnifiedSymbolRenderer, type SymbolVisualState, type SymbolInteractionHandlers } from '../sld/symbols';

/**
 * Symbol rendering component using unified ETAP renderer.
 *
 * PR-SLD-04: Replaces simplified shapes with ETAP symbols.
 */
interface SymbolRendererProps {
  symbol: AnySldSymbol;
  selected: boolean;
  highlighted: boolean;
  highlightSeverity: IssueSeverity | null;
  onMouseDown: (symbolId: string, position: Position) => void;
  onClick: (symbolId: string, mode: 'single' | 'add' | 'toggle') => void;
}

const SymbolRenderer: React.FC<SymbolRendererProps> = ({
  symbol,
  selected,
  highlighted,
  highlightSeverity,
  onMouseDown,
  onClick
}) => {
  // Build visual state for unified renderer
  const visualState: SymbolVisualState = {
    selected,
    inService: symbol.inService,
    energized: true, // Editor doesn't calculate energization
    highlighted,
    highlightSeverity,
  };

  // Build interaction handlers
  const handlers: SymbolInteractionHandlers = {
    onMouseDown,
    onClick,
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
 * Grid background component.
 */
interface GridBackgroundProps {
  width: number;
  height: number;
  gridSize: number;
  visible: boolean;
}

const GridBackground: React.FC<GridBackgroundProps> = ({ width, height, gridSize, visible }) => {
  if (!visible) return null;

  const lines = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    );
  }

  return <g>{lines}</g>;
};

/**
 * Lasso selection rectangle.
 */
interface LassoRectangleProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const LassoRectangle: React.FC<LassoRectangleProps> = ({ startX, startY, endX, endY }) => {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(59, 130, 246, 0.1)"
      stroke="#3b82f6"
      strokeWidth="1"
      strokeDasharray="4,4"
    />
  );
};

/**
 * Main SLD Canvas component.
 *
 * AUTO-LAYOUT (N-02):
 * - Layout jest wyliczany AUTOMATYCZNIE przy kazdej zmianie topologii
 * - Brak przycisku "Rozmiesc automatycznie"
 * - Deterministyczny (ten sam model -> ten sam uklad)
 * - Stabilny (mala zmiana nie powoduje "przeskoku")
 */
export const SldCanvas: React.FC = () => {
  const sldStore = useSldEditorStore();
  const isMutationBlocked = useIsMutationBlocked();
  const { startDrag, updateDrag, endDrag } = useSldDrag();

  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const isLassoing = useRef(false);

  const rawSymbols = Array.from(sldStore.symbols.values());
  const selectedIds = sldStore.selectedIds;
  const highlightedIds = sldStore.highlightedIds;
  const highlightSeverity = sldStore.highlightSeverity;
  const gridConfig = sldStore.gridConfig;
  const lassoState = sldStore.lassoState;

  // AUTO-LAYOUT (N-02): Automatyczne rozmieszczenie przy kazdej zmianie topologii
  // DETERMINISM: Ten sam model -> ten sam uklad
  // STABILNOSC: Mala zmiana = mala zmiana ukladu
  const {
    layoutSymbols,
    positions: autoLayoutPositions,
    // addOverride - dostepne do implementacji recznego przesuwania
    // debug - dostepne do debugowania
  } = useAutoLayout(rawSymbols, { gridSize: gridConfig.size });

  // Uzyj symboli z auto-layoutem
  const symbols = layoutSymbols;

  // Synchronizuj pozycje z auto-layoutu do store (jednorazowo przy zmianie topologii)
  useEffect(() => {
    if (autoLayoutPositions.size > 0 && rawSymbols.length > 0) {
      // Sprawdz czy pozycje sie zmienily
      let needsUpdate = false;
      for (const [symbolId, pos] of autoLayoutPositions) {
        const existingSymbol = sldStore.symbols.get(symbolId);
        if (existingSymbol && (existingSymbol.position.x !== pos.x || existingSymbol.position.y !== pos.y)) {
          needsUpdate = true;
          break;
        }
      }

      if (needsUpdate) {
        sldStore.updateSymbolsPositions(autoLayoutPositions);
      }
    }
  }, [autoLayoutPositions, rawSymbols.length]); // Reaguj na zmiany topologii (nie na same pozycje)

  // Generate connections (N-01: port-to-port, N-05: orthogonal routing)
  // DETERMINISM: Same symbols -> same connections
  const connections = useMemo(() => generateConnections(symbols), [symbols]);

  // Canvas size (fixed for now, could be dynamic)
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  /**
   * Handle mouse down on canvas (start lasso or deselect).
   */
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isMutationBlocked) return;

      const rect = svgRef.current!.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // If clicking on empty canvas, start lasso or clear selection
      if (e.target === svgRef.current) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          sldStore.clearSelection();
        }
        // Start lasso
        sldStore.startLasso(position);
        isLassoing.current = true;
      }
    },
    [sldStore, isMutationBlocked]
  );

  /**
   * Handle mouse move on canvas (drag or lasso).
   */
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (isDragging.current) {
        updateDrag(position);
      } else if (isLassoing.current && lassoState) {
        sldStore.updateLasso(position);
      }
    },
    [updateDrag, sldStore, lassoState]
  );

  /**
   * Handle mouse up on canvas (end drag or lasso).
   */
  const handleCanvasMouseUp = useCallback(() => {
    if (isDragging.current) {
      endDrag();
      isDragging.current = false;
    } else if (isLassoing.current) {
      sldStore.endLasso();
      isLassoing.current = false;
    }
  }, [endDrag, sldStore]);

  /**
   * Handle symbol mouse down (start drag).
   */
  const handleSymbolMouseDown = useCallback(
    (symbolId: string, position: Position) => {
      if (isMutationBlocked) return;
      startDrag(symbolId, position);
      isDragging.current = true;
    },
    [startDrag, isMutationBlocked]
  );

  /**
   * Handle symbol click (select).
   */
  const handleSymbolClick = useCallback(
    (symbolId: string, mode: 'single' | 'add' | 'toggle') => {
      sldStore.selectSymbol(symbolId, mode);
    },
    [sldStore]
  );

  return (
    <svg
      ref={svgRef}
      data-testid="sld-canvas"
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border border-gray-300 bg-white"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      {/* Grid background */}
      <GridBackground
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        gridSize={gridConfig.size}
        visible={gridConfig.visible}
      />

      {/* Connections layer (rendered UNDER symbols) - N-01, N-05 */}
      <ConnectionsLayer
        connections={connections}
        selectedConnectionId={null}
      />

      {/* Symbols */}
      {symbols.map((symbol) => (
        <SymbolRenderer
          key={symbol.id}
          symbol={symbol}
          selected={selectedIds.includes(symbol.id)}
          highlighted={highlightedIds.includes(symbol.id)}
          highlightSeverity={highlightSeverity}
          onMouseDown={handleSymbolMouseDown}
          onClick={handleSymbolClick}
        />
      ))}

      {/* Lasso rectangle */}
      {lassoState && (
        <LassoRectangle
          startX={lassoState.startPosition.x}
          startY={lassoState.startPosition.y}
          endX={lassoState.currentPosition.x}
          endY={lassoState.currentPosition.y}
        />
      )}
    </svg>
  );
};
