/**
 * CONNECTION RENDERER — Komponent renderowania polaczen SLD (ETAP-style)
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 4: Polaczenia
 * - AUDYT_SLD_ETAP.md: N-01, N-05
 *
 * FEATURES:
 * - Renderowanie polaczen jako polyline SVG
 * - Styl ETAP: jednolita grubosc, czyste zakonczenia
 * - Podswietlenie przy kliknieciu
 * - Powiekszona strefa klikniecia (hitbox)
 */

import React, { useCallback, useMemo } from 'react';
import type { Connection, Position } from '../sld-editor/types';

// =============================================================================
// STALE STYLIZACJI
// =============================================================================

/** Grubosc linii polaczenia (px) */
const CONNECTION_STROKE_WIDTH = 2;

/** Grubosc linii podswietlonej (px) */
const CONNECTION_STROKE_WIDTH_SELECTED = 3.5;

/** Grubosc niewidocznej strefy klikniecia (px) */
const HITBOX_STROKE_WIDTH = 12;

/** Kolory polaczen */
const CONNECTION_COLORS = {
  default: '#1f2937',       // gray-800
  deenergized: '#9ca3af',   // gray-400
  selected: '#3b82f6',      // blue-500
  hover: '#60a5fa',         // blue-400
} as const;

// =============================================================================
// KOMPONENT POLACZENIA
// =============================================================================

export interface ConnectionRendererProps {
  /** Polaczenie do renderowania */
  connection: Connection;
  /** Czy polaczenie jest zaznaczone */
  selected?: boolean;
  /** Czy polaczenie jest aktywne (pod napieciem) */
  energized?: boolean;
  /** Callback przy kliknieciu */
  onClick?: (connectionId: string, event: React.MouseEvent) => void;
  /** Callback przy najechaniu */
  onMouseEnter?: (connectionId: string) => void;
  /** Callback przy zjechaniu */
  onMouseLeave?: (connectionId: string) => void;
}

/**
 * Konwertuj sciezke na string dla SVG polyline.
 */
function pathToPoints(path: Position[]): string {
  return path.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * Komponent renderowania polaczenia.
 */
export const ConnectionRenderer: React.FC<ConnectionRendererProps> = ({
  connection,
  selected = false,
  energized = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { id, path, connectionType } = connection;

  // Jesli sciezka jest pusta lub ma mniej niz 2 punkty, nie renderuj
  if (!path || path.length < 2) {
    return null;
  }

  // Styl linii
  const strokeColor = selected
    ? CONNECTION_COLORS.selected
    : energized
    ? CONNECTION_COLORS.default
    : CONNECTION_COLORS.deenergized;

  const strokeWidth = selected
    ? CONNECTION_STROKE_WIDTH_SELECTED
    : CONNECTION_STROKE_WIDTH;

  const opacity = energized ? 1 : 0.6;

  // Punkty dla polyline
  const points = useMemo(() => pathToPoints(path), [path]);

  // Handlery
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(id, e);
    },
    [id, onClick]
  );

  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.(id);
  }, [id, onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave?.(id);
  }, [id, onMouseLeave]);

  return (
    <g
      data-testid={`sld-connection-${id}`}
      data-connection-type={connectionType}
      data-connection-selected={selected}
      data-connection-energized={energized}
    >
      {/* Niewidoczna strefa klikniecia (hitbox) */}
      <polyline
        points={points}
        fill="none"
        stroke="transparent"
        strokeWidth={HITBOX_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Widoczna linia polaczenia */}
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
};

// =============================================================================
// KOMPONENT GRUPY POLACZEN
// =============================================================================

export interface ConnectionsLayerProps {
  /** Lista polaczen do renderowania */
  connections: Connection[];
  /** ID zaznaczonego polaczenia */
  selectedConnectionId?: string | null;
  /** Mapa energizacji (connectionId -> boolean) */
  energizationMap?: Map<string, boolean>;
  /** Callback przy kliknieciu polaczenia */
  onConnectionClick?: (connectionId: string, event: React.MouseEvent) => void;
  /** Callback przy najechaniu na polaczenie */
  onConnectionHover?: (connectionId: string | null) => void;
}

/**
 * Warstwa renderowania wszystkich polaczen.
 * Polaczenia sa renderowane pod symbolami.
 */
export const ConnectionsLayer: React.FC<ConnectionsLayerProps> = ({
  connections,
  selectedConnectionId,
  energizationMap,
  onConnectionClick,
  onConnectionHover,
}) => {
  // DETERMINIZM: Sortuj polaczenia po ID
  const sortedConnections = useMemo(
    () => [...connections].sort((a, b) => a.id.localeCompare(b.id)),
    [connections]
  );

  const handleMouseEnter = useCallback(
    (connectionId: string) => {
      onConnectionHover?.(connectionId);
    },
    [onConnectionHover]
  );

  const handleMouseLeave = useCallback(() => {
    onConnectionHover?.(null);
  }, [onConnectionHover]);

  return (
    <g data-testid="sld-connections-layer">
      {sortedConnections.map((connection) => (
        <ConnectionRenderer
          key={connection.id}
          connection={connection}
          selected={connection.id === selectedConnectionId}
          energized={energizationMap?.get(connection.id) ?? true}
          onClick={onConnectionClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      ))}
    </g>
  );
};

// =============================================================================
// EKSPORT DOMYSLNY
// =============================================================================

export default ConnectionRenderer;
