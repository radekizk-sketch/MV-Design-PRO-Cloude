/**
 * P30b — SLD Canvas Component (SVG Rendering)
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A.2: Symbol types (Bus, Line, Transformer, etc.)
 * - sld_rules.md § D.1: Visual state encoding (in_service, selected, hover)
 * - powerfactory_ui_parity.md: ≥110% PowerFactory symbol rendering
 *
 * FEATURES:
 * - SVG rendering of all SLD symbols
 * - Grid background (when enabled)
 * - Lasso selection (drag rectangle)
 * - Drag handles for selected symbols
 * - Mouse interactions (click, drag, lasso)
 */

import React, { useCallback, useRef } from 'react';
import { useSldEditorStore } from './SldEditorStore';
import { useSldDrag } from './hooks/useSldDrag';
import type { AnySldSymbol, Position } from './types';
import { useIsMutationBlocked } from '../selection/store';

/**
 * Symbol rendering component.
 */
interface SymbolRendererProps {
  symbol: AnySldSymbol;
  selected: boolean;
  onMouseDown: (symbolId: string, position: Position) => void;
  onClick: (symbolId: string, mode: 'single' | 'add' | 'toggle') => void;
}

const SymbolRenderer: React.FC<SymbolRendererProps> = ({ symbol, selected, onMouseDown, onClick }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    onMouseDown(symbol.id, position);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mode = e.shiftKey ? 'add' : e.ctrlKey || e.metaKey ? 'toggle' : 'single';
    onClick(symbol.id, mode);
  };

  // Render symbol based on type
  const renderSymbol = () => {
    const { position, inService, elementType } = symbol;
    const stroke = selected ? '#3b82f6' : inService ? '#1f2937' : '#9ca3af';
    const strokeWidth = selected ? 2 : 1;
    const opacity = inService ? 1 : 0.5;
    const strokeDasharray = inService ? undefined : '4,4';

    switch (elementType) {
      case 'Bus':
        // Busbar: horizontal thick line
        const nodeSymbol = symbol as any;
        const width = nodeSymbol.width || 60;
        const height = nodeSymbol.height || 8;
        return (
          <g transform={`translate(${position.x}, ${position.y})`}>
            <rect
              x={-width / 2}
              y={-height / 2}
              width={width}
              height={height}
              fill={selected ? '#dbeafe' : '#e5e7eb'}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeDasharray={strokeDasharray}
              onMouseDown={handleMouseDown}
              onClick={handleClick}
              style={{ cursor: 'move' }}
            />
            <text
              x={0}
              y={-height / 2 - 8}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
            >
              {symbol.elementName}
            </text>
          </g>
        );

      case 'LineBranch':
      case 'TransformerBranch':
        // Line/cable/transformer: simple line for now
        return (
          <g>
            <line
              x1={position.x}
              y1={position.y}
              x2={position.x + 60}
              y2={position.y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeDasharray={strokeDasharray}
              onMouseDown={handleMouseDown}
              onClick={handleClick}
              style={{ cursor: 'move' }}
            />
            <text
              x={position.x + 30}
              y={position.y - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
            >
              {symbol.elementName}
            </text>
          </g>
        );

      case 'Switch':
        // Switch: break symbol
        return (
          <g transform={`translate(${position.x}, ${position.y})`}>
            <circle
              cx={0}
              cy={0}
              r={8}
              fill={selected ? '#dbeafe' : '#ffffff'}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              onMouseDown={handleMouseDown}
              onClick={handleClick}
              style={{ cursor: 'move' }}
            />
            <text
              x={0}
              y={-12}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
            >
              {symbol.elementName}
            </text>
          </g>
        );

      case 'Source':
        // Source: circle with arrow
        return (
          <g transform={`translate(${position.x}, ${position.y})`}>
            <circle
              cx={0}
              cy={0}
              r={12}
              fill={selected ? '#fef3c7' : '#fef9c3'}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              onMouseDown={handleMouseDown}
              onClick={handleClick}
              style={{ cursor: 'move' }}
            />
            <text
              x={0}
              y={-16}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
            >
              {symbol.elementName}
            </text>
          </g>
        );

      case 'Load':
        // Load: triangle
        return (
          <g transform={`translate(${position.x}, ${position.y})`}>
            <polygon
              points="0,-12 10,8 -10,8"
              fill={selected ? '#dbeafe' : '#e0f2fe'}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              onMouseDown={handleMouseDown}
              onClick={handleClick}
              style={{ cursor: 'move' }}
            />
            <text
              x={0}
              y={-16}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
            >
              {symbol.elementName}
            </text>
          </g>
        );

      default:
        return null;
    }
  };

  return <>{renderSymbol()}</>;
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
 */
export const SldCanvas: React.FC = () => {
  const sldStore = useSldEditorStore();
  const isMutationBlocked = useIsMutationBlocked();
  const { startDrag, updateDrag, endDrag } = useSldDrag();

  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const isLassoing = useRef(false);

  const symbols = Array.from(sldStore.symbols.values());
  const selectedIds = sldStore.selectedIds;
  const gridConfig = sldStore.gridConfig;
  const lassoState = sldStore.lassoState;

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

      {/* Symbols */}
      {symbols.map((symbol) => (
        <SymbolRenderer
          key={symbol.id}
          symbol={symbol}
          selected={selectedIds.includes(symbol.id)}
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
