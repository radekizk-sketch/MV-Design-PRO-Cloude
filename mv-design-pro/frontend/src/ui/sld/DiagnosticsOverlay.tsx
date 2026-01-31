/**
 * SLD Diagnostics Overlay Component
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Overlay as separate layer (never modifies model)
 * - powerfactory_ui_parity.md: PowerFactory-like diagnostics visualization
 *
 * FEATURES:
 * - Renders diagnostic markers on SLD elements with sanity check results
 * - Color-coded by severity: ERROR (red), WARN (amber), INFO (blue)
 * - Click on marker selects the element (syncs with Inspector)
 * - Severity filter (All / Errors only / Errors + Warnings)
 * - Tooltip with diagnostic details
 *
 * RULES:
 * - READ-ONLY: No model mutations, no calculations
 * - Markers are pointer-events-auto (clickable)
 * - Uses existing sanity check data from fixture/store
 *
 * 100% POLISH UI
 */

import { useMemo, useCallback } from 'react';
import type { AnySldSymbol, Position } from '../sld-editor/types';
import type { ViewportState } from './types';
import type { ElementType, SelectedElement } from '../types';
import { buildOverlayPositionMaps } from './overlayUtils';
import {
  type ElementDiagnostics,
  type DiagnosticsSeverityFilter,
  SEVERITY_COLORS,
  SEVERITY_LABELS_PL,
  SANITY_CHECK_CODE_LABELS_PL,
} from '../protection';
import { useFilteredSanityChecks } from '../protection';
import { DiagnosticsLegend } from './DiagnosticsLegend';

// =============================================================================
// Constants
// =============================================================================

/**
 * Marker size config.
 */
const MARKER_SIZE = 20;
const MARKER_OFFSET_X = 35; // Offset from element center
const MARKER_OFFSET_Y = -15;

// =============================================================================
// DiagnosticsMarker Component
// =============================================================================

interface DiagnosticsMarkerProps {
  /** Element diagnostics data */
  diagnostics: ElementDiagnostics;

  /** Screen position for the marker */
  position: Position;

  /** Whether this element is selected */
  isSelected: boolean;

  /** Whether this element should show focus pulse */
  hasFocusPulse: boolean;

  /** Click handler to select element */
  onMarkerClick: (elementId: string, elementType: ElementType, elementName: string) => void;
}

/**
 * Single diagnostic marker rendered on an element.
 */
function DiagnosticsMarker({
  diagnostics,
  position,
  isSelected,
  hasFocusPulse,
  onMarkerClick,
}: DiagnosticsMarkerProps) {
  const severity = diagnostics.max_severity;
  const colors = SEVERITY_COLORS[severity];
  const severityLabel = SEVERITY_LABELS_PL[severity];

  // Build tooltip content
  const tooltipContent = useMemo(() => {
    const lines: string[] = [];

    if (diagnostics.error_count > 0) {
      lines.push(`Bledy: ${diagnostics.error_count}`);
    }
    if (diagnostics.warn_count > 0) {
      lines.push(`Ostrzezenia: ${diagnostics.warn_count}`);
    }
    if (diagnostics.info_count > 0) {
      lines.push(`Informacje: ${diagnostics.info_count}`);
    }

    // Add first few result messages
    const topResults = diagnostics.results.slice(0, 3);
    for (const result of topResults) {
      const label = SANITY_CHECK_CODE_LABELS_PL[result.code] || result.code;
      lines.push(`- ${label}`);
    }

    if (diagnostics.results.length > 3) {
      lines.push(`... i ${diagnostics.results.length - 3} wiecej`);
    }

    return lines.join('\n');
  }, [diagnostics]);

  // Get element name for selection
  const elementName = useMemo(() => {
    // Try to get name from first result (if evidence has it) or use element_id
    return diagnostics.element_id;
  }, [diagnostics]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkerClick(
        diagnostics.element_id,
        diagnostics.element_type,
        elementName
      );
    },
    [diagnostics.element_id, diagnostics.element_type, elementName, onMarkerClick]
  );

  // Calculate marker icon based on severity
  const icon = severity === 'ERROR' ? '!' : severity === 'WARN' ? '?' : 'i';

  return (
    <div
      data-testid={`sld-diagnostics-marker-${diagnostics.element_id}-${diagnostics.results[0]?.code || 'multi'}`}
      className={`
        absolute z-30 cursor-pointer
        flex items-center justify-center
        rounded-full border-2 shadow-md
        transition-all duration-150
        hover:scale-110 hover:shadow-lg
        ${colors.marker} ${colors.border} text-white
        ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
        ${hasFocusPulse ? 'animate-pulse ring-4 ring-blue-500 ring-opacity-75' : ''}
      `}
      style={{
        left: `${position.x + MARKER_OFFSET_X}px`,
        top: `${position.y + MARKER_OFFSET_Y}px`,
        width: `${MARKER_SIZE}px`,
        height: `${MARKER_SIZE}px`,
        transform: 'translate(-50%, -50%)',
      }}
      title={`${severityLabel}\n${tooltipContent}`}
      onClick={handleClick}
      role="button"
      aria-label={`Diagnostyka: ${diagnostics.error_count} bledow, ${diagnostics.warn_count} ostrzezen`}
      data-focus-pulse={hasFocusPulse ? 'true' : undefined}
    >
      <span className="text-xs font-bold">{icon}</span>

      {/* Badge with count if multiple results */}
      {diagnostics.results.length > 1 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center
                     min-w-[14px] h-[14px] px-0.5 rounded-full
                     bg-white text-xs font-semibold border"
          style={{
            color: colors.marker.replace('bg-', 'text-').replace('-500', '-700'),
            borderColor: colors.marker.replace('bg-', 'border-'),
          }}
        >
          {diagnostics.results.length}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// DiagnosticsOverlay Component
// =============================================================================

export interface DiagnosticsOverlayProps {
  /** SLD symbols for position mapping */
  symbols: AnySldSymbol[];

  /** Current viewport state */
  viewport: ViewportState;

  /** Currently selected element ID */
  selectedElementId?: string | null;

  /** ID of element that should show focus pulse effect */
  focusPulseElementId?: string | null;

  /** Overlay visibility */
  visible: boolean;

  /** Severity filter */
  filter: DiagnosticsSeverityFilter;

  /** Callback when marker is clicked (for selection + center) */
  onMarkerClick: (element: SelectedElement) => void;

  /** Project ID for data fetching */
  projectId: string;

  /** Diagram ID for data fetching */
  diagramId: string;

  /** Show legend */
  showLegend?: boolean;
}

/**
 * SLD Diagnostics Overlay.
 * Renders diagnostic markers on elements with sanity check results.
 */
export function DiagnosticsOverlay({
  symbols,
  viewport,
  selectedElementId,
  focusPulseElementId,
  visible,
  filter,
  onMarkerClick,
  projectId,
  diagramId,
  showLegend = true,
}: DiagnosticsOverlayProps) {
  // Get filtered sanity checks
  const {
    filteredByElement,
    errorCount,
    warnCount,
    infoCount,
    hasResults,
  } = useFilteredSanityChecks(projectId, diagramId, filter);

  // Build position maps from symbols
  const { nodePositions, branchPositions } = useMemo(
    () => buildOverlayPositionMaps(symbols, viewport),
    [symbols, viewport]
  );

  // Build markers data
  const markers = useMemo(() => {
    if (!visible || !hasResults) return [];

    const result: Array<{
      diagnostics: ElementDiagnostics;
      position: Position;
      isSelected: boolean;
      hasFocusPulse: boolean;
    }> = [];

    for (const diagnostics of filteredByElement.values()) {
      // Find position for this element
      let position: Position | undefined;

      // Try node positions first (Bus, Source, Load)
      position = nodePositions.get(diagnostics.element_id);

      // Then try branch positions (Line, Transformer, Switch)
      if (!position) {
        position = branchPositions.get(diagnostics.element_id);
      }

      // Also check by symbol ID (some symbols use different ID schemes)
      if (!position) {
        for (const symbol of symbols) {
          if (
            symbol.elementId === diagnostics.element_id ||
            symbol.id === diagnostics.element_id
          ) {
            position = {
              x: symbol.position.x * viewport.zoom + viewport.offsetX,
              y: symbol.position.y * viewport.zoom + viewport.offsetY,
            };
            break;
          }
        }
      }

      if (position) {
        result.push({
          diagnostics,
          position,
          isSelected: selectedElementId === diagnostics.element_id,
          hasFocusPulse: focusPulseElementId === diagnostics.element_id,
        });
      }
    }

    // Sort by severity (ERROR first, then WARN, then INFO)
    result.sort((a, b) => {
      const aOrder = a.diagnostics.max_severity === 'ERROR' ? 0 : a.diagnostics.max_severity === 'WARN' ? 1 : 2;
      const bOrder = b.diagnostics.max_severity === 'ERROR' ? 0 : b.diagnostics.max_severity === 'WARN' ? 1 : 2;
      return aOrder - bOrder;
    });

    return result;
  }, [
    visible,
    hasResults,
    filteredByElement,
    nodePositions,
    branchPositions,
    symbols,
    viewport,
    selectedElementId,
    focusPulseElementId,
  ]);

  // Handle marker click - convert to SelectedElement
  const handleMarkerClick = useCallback(
    (elementId: string, elementType: ElementType, elementName: string) => {
      onMarkerClick({
        id: elementId,
        type: elementType,
        name: elementName,
      });
    },
    [onMarkerClick]
  );

  // Don't render if not visible or no results
  if (!visible) return null;

  return (
    <div
      data-testid="sld-diagnostics-overlay"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Markers (pointer-events-auto for click) */}
      {markers.map(({ diagnostics, position, isSelected, hasFocusPulse }) => (
        <DiagnosticsMarker
          key={diagnostics.element_id}
          diagnostics={diagnostics}
          position={position}
          isSelected={isSelected}
          hasFocusPulse={hasFocusPulse}
          onMarkerClick={handleMarkerClick}
        />
      ))}

      {/* Legend (when visible and has results) */}
      {showLegend && hasResults && (
        <DiagnosticsLegend
          errorCount={errorCount}
          warnCount={warnCount}
          infoCount={infoCount}
          filter={filter}
        />
      )}
    </div>
  );
}

export default DiagnosticsOverlay;
