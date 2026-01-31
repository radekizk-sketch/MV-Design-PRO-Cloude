/**
 * SLD View Canvas — Read-Only SVG Rendering
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A.2: Symbol types (Bus, Line, Transformer, etc.)
 * - sld_rules.md § D.1: Visual state encoding (in_service, selected)
 * - powerfactory_ui_parity.md: PowerFactory-like presentation
 *
 * READ-ONLY canvas:
 * - No drag/drop
 * - No lasso selection
 * - No editing
 * - Click → selection only
 */

import React, { useCallback } from 'react';
import type { AnySldSymbol } from '../sld-editor/types';
import type { ElementType } from '../types';
import type { SLDViewCanvasProps, ViewportState } from './types';

/**
 * Read-only symbol renderer.
 */
interface SymbolProps {
  symbol: AnySldSymbol;
  selected: boolean;
  onClick: (symbolId: string, elementType: ElementType, elementName: string) => void;
}

const Symbol: React.FC<SymbolProps> = ({ symbol, selected, onClick }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick(symbol.id, symbol.elementType, symbol.elementName);
    },
    [symbol.id, symbol.elementType, symbol.elementName, onClick]
  );

  const { position, inService, elementType, elementName } = symbol;

  // Visual styling
  const stroke = selected ? '#3b82f6' : inService ? '#1f2937' : '#9ca3af';
  const strokeWidth = selected ? 2.5 : 1.5;
  const opacity = inService ? 1 : 0.5;
  const strokeDasharray = inService ? undefined : '4,4';
  const cursor = 'pointer';

  switch (elementType) {
    case 'Bus': {
      // Szyna / Busbar: horizontal bar
      const nodeSymbol = symbol as any;
      const width = nodeSymbol.width || 80;
      const height = nodeSymbol.height || 10;
      return (
        <g
          data-testid={`sld-symbol-${symbol.id}`}
          data-element-type={elementType}
          transform={`translate(${position.x}, ${position.y})`}
          onClick={handleClick}
          style={{ cursor }}
        >
          <rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            fill={selected ? '#dbeafe' : '#374151'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
            strokeDasharray={strokeDasharray}
            rx={2}
          />
          <text
            x={0}
            y={-height / 2 - 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight={selected ? 600 : 400}
            fill="#1f2937"
          >
            {elementName}
          </text>
        </g>
      );
    }

    case 'LineBranch': {
      // Linia / Line: horizontal line with terminals
      return (
        <g
          data-testid={`sld-symbol-${symbol.id}`}
          data-element-type={elementType}
          onClick={handleClick}
          style={{ cursor }}
        >
          {/* Main line */}
          <line
            x1={position.x - 30}
            y1={position.y}
            x2={position.x + 30}
            y2={position.y}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
            strokeDasharray={strokeDasharray}
          />
          {/* Terminal circles */}
          <circle cx={position.x - 30} cy={position.y} r={3} fill={stroke} opacity={opacity} />
          <circle cx={position.x + 30} cy={position.y} r={3} fill={stroke} opacity={opacity} />
          <text
            x={position.x}
            y={position.y - 12}
            textAnchor="middle"
            fontSize="10"
            fontWeight={selected ? 600 : 400}
            fill="#1f2937"
          >
            {elementName}
          </text>
        </g>
      );
    }

    case 'TransformerBranch': {
      // Transformator / Transformer: two overlapping circles
      return (
        <g
          data-testid={`sld-symbol-${symbol.id}`}
          data-element-type={elementType}
          transform={`translate(${position.x}, ${position.y})`}
          onClick={handleClick}
          style={{ cursor }}
        >
          <circle
            cx={-8}
            cy={0}
            r={14}
            fill={selected ? '#dbeafe' : '#ffffff'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <circle
            cx={8}
            cy={0}
            r={14}
            fill={selected ? '#dbeafe' : '#ffffff'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <text
            x={0}
            y={-22}
            textAnchor="middle"
            fontSize="10"
            fontWeight={selected ? 600 : 400}
            fill="#1f2937"
          >
            {elementName}
          </text>
        </g>
      );
    }

    case 'Switch': {
      // Lacznik / Switch: circuit breaker symbol
      const switchSymbol = symbol as any;
      const isOpen = switchSymbol.switchState === 'OPEN';
      return (
        <g
          data-testid={`sld-symbol-${symbol.id}`}
          data-element-type={elementType}
          data-switch-state={switchSymbol.switchState}
          transform={`translate(${position.x}, ${position.y})`}
          onClick={handleClick}
          style={{ cursor }}
        >
          {/* Switch body */}
          <rect
            x={-10}
            y={-6}
            width={20}
            height={12}
            fill={selected ? '#dbeafe' : '#ffffff'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          {/* Open/closed indicator */}
          {isOpen ? (
            <line x1={-6} y1={0} x2={6} y2={-4} stroke={stroke} strokeWidth={2} opacity={opacity} />
          ) : (
            <line x1={-6} y1={0} x2={6} y2={0} stroke={stroke} strokeWidth={2} opacity={opacity} />
          )}
          <text
            x={0}
            y={-14}
            textAnchor="middle"
            fontSize="9"
            fontWeight={selected ? 600 : 400}
            fill="#1f2937"
          >
            {elementName}
          </text>
        </g>
      );
    }

    case 'Source': {
      // Zrodlo / Source: circle with wave
      return (
        <g
          data-testid={`sld-symbol-${symbol.id}`}
          data-element-type={elementType}
          transform={`translate(${position.x}, ${position.y})`}
          onClick={handleClick}
          style={{ cursor }}
        >
          <circle
            cx={0}
            cy={0}
            r={16}
            fill={selected ? '#fef3c7' : '#fef9c3'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          {/* Wave symbol inside */}
          <path
            d="M-8,0 Q-4,-6 0,0 Q4,6 8,0"
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            opacity={opacity}
          />
          <text
            x={0}
            y={-22}
            textAnchor="middle"
            fontSize="10"
            fontWeight={selected ? 600 : 400}
            fill="#1f2937"
          >
            {elementName}
          </text>
        </g>
      );
    }

    case 'Load': {
      // Odbior / Load: downward triangle
      return (
        <g
          data-testid={`sld-symbol-${symbol.id}`}
          data-element-type={elementType}
          transform={`translate(${position.x}, ${position.y})`}
          onClick={handleClick}
          style={{ cursor }}
        >
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
        </g>
      );
    }

    default:
      return null;
  }
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
 * Main SLD View Canvas component (read-only).
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
        {/* Render symbols */}
        {sortedSymbols.map((symbol) => (
          <Symbol
            key={symbol.id}
            symbol={symbol}
            selected={symbol.id === selectedId || symbol.elementId === selectedId}
            onClick={onSymbolClick}
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
