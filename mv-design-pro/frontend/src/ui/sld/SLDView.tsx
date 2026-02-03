/**
 * SLD View — Read-Only Single Line Diagram Viewer
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md: SLD ↔ selection synchronization
 * - powerfactory_ui_parity.md: PowerFactory-like presentation
 *
 * FEATURES:
 * - Read-only rendering of network topology
 * - Zoom/Pan navigation
 * - Selection sync with URL / Inspector / Project Tree
 * - Fit-to-content
 * - 100% Polish UI
 *
 * NO EDITING: This is a presentation-only view.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SLDViewCanvas } from './SLDViewCanvas';
import { ResultsOverlay } from './ResultsOverlay';
import { DiagnosticsOverlay } from './DiagnosticsOverlay';
import { DiagnosticResultsLayer } from './DiagnosticResultsLayer';
import { SwitchingStateLegend } from './SwitchingStateLegend';
import { useSldModeStore, SLD_MODE_LABELS_PL } from './sldModeStore';
import {
  DEFAULT_VIEWPORT,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  fitToContent,
  type ViewportState,
  type SLDViewProps,
} from './types';
import type { ElementType, SelectedElement } from '../types';
import { useSelectionStore } from '../selection/store';
import { useResultsInspectorStore } from '../results-inspector/store';
import { useDiagnosticsStore } from './diagnosticsStore';
import { updateUrlWithSelection } from '../navigation/urlState';
import { SEVERITY_FILTER_LABELS_PL, type DiagnosticsSeverityFilter } from '../protection';
import { useSanityChecks } from '../protection';
import {
  SldSnapshotExportDialog,
  executeSldExport,
  getCurrentLayerState,
  createExportOptions,
  type ExportFormat,
  type ExportLayerOptions,
  type PngScale,
  type PdfPageSize,
  type PdfOrientation,
  type ExportScope,
} from './export';

/**
 * Default canvas dimensions.
 */
const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 600;

/**
 * Main SLD View component.
 */
export const SLDView: React.FC<SLDViewProps> = ({
  symbols,
  selectedElement: externalSelectedElement,
  onElementClick,
  showGrid = true,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  initialZoom = 1.0,
  fitOnMount = true,
}) => {
  // Viewport state (pan/zoom)
  const [viewport, setViewport] = useState<ViewportState>(() => ({
    ...DEFAULT_VIEWPORT,
    zoom: initialZoom,
  }));

  // Focus pulse state (for marker click visual feedback)
  // Cleared via CSS animationend event (no setTimeout for deterministic E2E)
  const [focusPulseElementId, setFocusPulseElementId] = useState<string | null>(null);

  // Selection store integration
  const selectElement = useSelectionStore((state) => state.selectElement);
  const storeSelectedElement = useSelectionStore((state) => state.selectedElements[0] ?? null);
  const centerSldOnElement = useSelectionStore((state) => state.centerSldOnElement);
  const sldCenterOnElement = useSelectionStore((state) => state.sldCenterOnElement);

  // Results overlay store integration
  const overlayVisible = useResultsInspectorStore((state) => state.overlayVisible);
  const sldOverlay = useResultsInspectorStore((state) => state.sldOverlay);
  const toggleOverlay = useResultsInspectorStore((state) => state.toggleOverlay);
  const hasResults = sldOverlay !== null;

  // Diagnostics overlay store integration
  const diagnosticsVisible = useDiagnosticsStore((state) => state.diagnosticsVisible);
  const diagnosticsFilter = useDiagnosticsStore((state) => state.diagnosticsFilter);
  const toggleDiagnostics = useDiagnosticsStore((state) => state.toggleDiagnostics);
  const setDiagnosticsFilter = useDiagnosticsStore((state) => state.setDiagnosticsFilter);

  // Check if there are any diagnostics results (fixture for now)
  const { hasResults: hasDiagnostics } = useSanityChecks('demo-project', 'demo-diagram');

  // SLD mode store integration (PR-SLD-06)
  const sldMode = useSldModeStore((state) => state.mode);
  const diagnosticLayerVisible = useSldModeStore((state) => state.diagnosticLayerVisible);
  const setMode = useSldModeStore((state) => state.setMode);
  const toggleDiagnosticLayer = useSldModeStore((state) => state.toggleDiagnosticLayer);
  const isResultsMode = sldMode === 'WYNIKI';

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Use external selection if provided, otherwise use store
  const selectedElement = externalSelectedElement !== undefined ? externalSelectedElement : storeSelectedElement;

  // Ref for container (for mouse events)
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  /**
   * Fit to content on mount if enabled.
   */
  useEffect(() => {
    if (fitOnMount && symbols.length > 0) {
      const fittedViewport = fitToContent(symbols, width, height);
      setViewport(fittedViewport);
    }
  }, [fitOnMount, symbols, width, height]);

  /**
   * Center on element when requested by store.
   * Also triggers focus pulse for visual feedback.
   */
  useEffect(() => {
    if (sldCenterOnElement) {
      const symbol = symbols.find(
        (s) => s.id === sldCenterOnElement || s.elementId === sldCenterOnElement
      );
      if (symbol) {
        // Center viewport on symbol
        setViewport((prev) => ({
          ...prev,
          offsetX: width / 2 - symbol.position.x * prev.zoom,
          offsetY: height / 2 - symbol.position.y * prev.zoom,
        }));
        // Trigger focus pulse for visual feedback (no timeout - CSS handles duration)
        setFocusPulseElementId(sldCenterOnElement);
      }
      // Clear the center request
      centerSldOnElement(null);
    }
  }, [sldCenterOnElement, symbols, width, height, centerSldOnElement]);

  /**
   * Handle symbol click — update selection.
   */
  const handleSymbolClick = useCallback(
    (symbolId: string, elementType: ElementType, elementName: string) => {
      // Find the element ID (may be different from symbol ID)
      const symbol = symbols.find((s) => s.id === symbolId);
      const elementId = symbol?.elementId || symbolId;

      const element: SelectedElement = {
        id: elementId,
        type: elementType,
        name: elementName,
      };

      // Update selection store
      selectElement(element);

      // Sync to URL
      updateUrlWithSelection(element);

      // Call external handler if provided
      if (onElementClick) {
        onElementClick(element);
      }
    },
    [symbols, selectElement, onElementClick]
  );

  /**
   * Handle zoom in.
   */
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom + ZOOM_STEP, ZOOM_MAX),
    }));
  }, []);

  /**
   * Handle zoom out.
   */
  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom - ZOOM_STEP, ZOOM_MIN),
    }));
  }, []);

  /**
   * Handle fit to content.
   */
  const handleFitToContent = useCallback(() => {
    const fittedViewport = fitToContent(symbols, width, height);
    setViewport(fittedViewport);
  }, [symbols, width, height]);

  /**
   * Handle reset view.
   */
  const handleResetView = useCallback(() => {
    setViewport({ ...DEFAULT_VIEWPORT, zoom: 1.0 });
  }, []);

  /**
   * Handle mouse wheel (zoom).
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setViewport((prev) => ({
        ...prev,
        zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.zoom + delta)),
      }));
    },
    []
  );

  /**
   * Handle mouse down (start pan).
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with middle mouse button or when holding space (simulated via right-click)
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isPanning.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  /**
   * Handle mouse move (pan).
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      setViewport((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
    }
  }, []);

  /**
   * Handle mouse up (end pan).
   */
  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  /**
   * Prevent context menu.
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  /**
   * Handle diagnostics marker click — select element + center + pulse.
   * Focus pulse is triggered via centerSldOnElement effect.
   */
  const handleDiagnosticsMarkerClick = useCallback(
    (element: SelectedElement) => {
      // Update selection store
      selectElement(element);

      // Sync to URL
      updateUrlWithSelection(element);

      // Center SLD on the element (this also triggers focus pulse via effect)
      centerSldOnElement(element.id);

      // Call external handler if provided
      if (onElementClick) {
        onElementClick(element);
      }
    },
    [selectElement, centerSldOnElement, onElementClick]
  );

  /**
   * Handle focus pulse animation end — clear pulse state.
   * Uses CSS animationend event for deterministic cleanup (no setTimeout flakiness).
   */
  const handleFocusPulseAnimationEnd = useCallback(() => {
    setFocusPulseElementId(null);
  }, []);

  /**
   * Handle diagnostics filter change.
   */
  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setDiagnosticsFilter(e.target.value as DiagnosticsSeverityFilter);
    },
    [setDiagnosticsFilter]
  );

  /**
   * Handle SLD mode toggle (PR-SLD-06).
   */
  const handleModeToggle = useCallback(() => {
    const newMode = sldMode === 'EDYCJA' ? 'WYNIKI' : 'EDYCJA';
    setMode(newMode);
  }, [sldMode, setMode]);

  /**
   * Handle diagnostic layer toggle (PR-SLD-06).
   */
  const handleDiagnosticLayerToggle = useCallback(() => {
    toggleDiagnosticLayer();
  }, [toggleDiagnosticLayer]);

  /**
   * Handle export dialog open.
   */
  const handleExportClick = useCallback(() => {
    setExportDialogOpen(true);
  }, []);

  /**
   * Handle export dialog close.
   */
  const handleExportDialogClose = useCallback(() => {
    setExportDialogOpen(false);
  }, []);

  /**
   * Handle export.
   */
  const handleExport = useCallback(
    async (
      format: ExportFormat,
      options: {
        scale?: PngScale;
        pageSize?: PdfPageSize;
        orientation?: PdfOrientation;
        scope: ExportScope;
        layers: ExportLayerOptions;
      }
    ) => {
      const containerElement = containerRef.current?.closest('[data-testid="sld-view"]');
      if (!containerElement || !(containerElement instanceof HTMLElement)) {
        console.error('[SLDView] Nie znaleziono kontenera SLD do eksportu');
        return;
      }

      setIsExporting(true);

      try {
        const metadata = {
          projectName: 'demo-project', // TODO: Get from context
          caseName: 'demo-case', // TODO: Get from context
          runId: sldOverlay?.run_id,
          zoomPercent: Math.round(viewport.zoom * 100),
          timestamp: new Date().toISOString(),
        };

        const exportOptions =
          format === 'png'
            ? createExportOptions('png', options, metadata)
            : createExportOptions('pdf', options, metadata);

        const result = await executeSldExport(
          {
            containerElement,
            symbols,
            currentViewport: viewport,
            canvasWidth: width,
            canvasHeight: height,
          },
          exportOptions
        );

        if (result.success) {
          setExportDialogOpen(false);
        } else {
          console.error('[SLDView] Błąd eksportu:', result.error);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [symbols, viewport, width, height, sldOverlay]
  );

  /**
   * Current layer state for export dialog defaults.
   */
  const currentLayerState = useMemo(
    () => getCurrentLayerState(overlayVisible, diagnosticsVisible),
    [overlayVisible, diagnosticsVisible]
  );

  /**
   * Export metadata.
   */
  const exportMetadata = useMemo(
    () => ({
      projectName: 'demo-project', // TODO: Get from context
      caseName: 'demo-case', // TODO: Get from context
      runId: sldOverlay?.run_id,
      zoomPercent: Math.round(viewport.zoom * 100),
      timestamp: new Date().toISOString(),
    }),
    [viewport.zoom, sldOverlay]
  );

  // Zoom percentage for display
  const zoomPercent = Math.round(viewport.zoom * 100);

  // Compute focus indicator position (for sld-focus-<element_id> testid)
  const focusIndicatorPosition = useMemo(() => {
    if (!focusPulseElementId) return null;
    const symbol = symbols.find(
      (s) => s.id === focusPulseElementId || s.elementId === focusPulseElementId
    );
    if (!symbol) return null;
    return {
      x: symbol.position.x * viewport.zoom + viewport.offsetX,
      y: symbol.position.y * viewport.zoom + viewport.offsetY,
      elementId: focusPulseElementId,
    };
  }, [focusPulseElementId, symbols, viewport]);

  return (
    <div
      data-testid="sld-view"
      className="flex flex-col h-full bg-gray-50"
    >
      {/* Toolbar */}
      <div
        data-testid="sld-view-toolbar"
        className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">Schemat jednokreskowy</h3>
          <span className="text-xs text-gray-500">
            (tylko podglad)
          </span>
          {/* PR-SLD-06: Mode indicator */}
          <span
            data-testid="sld-mode-indicator"
            className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${
              isResultsMode
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {SLD_MODE_LABELS_PL[sldMode]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={viewport.zoom <= ZOOM_MIN}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pomniejsz"
            data-testid="sld-zoom-out"
          >
            -
          </button>
          <span
            className="text-xs text-gray-600 w-12 text-center"
            data-testid="sld-zoom-level"
          >
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={viewport.zoom >= ZOOM_MAX}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Powieksz"
            data-testid="sld-zoom-in"
          >
            +
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Fit & Reset */}
          <button
            type="button"
            onClick={handleFitToContent}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Dopasuj do zawartosci"
            data-testid="sld-fit-content"
          >
            Dopasuj
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Resetuj widok"
            data-testid="sld-reset-view"
          >
            Reset
          </button>

          {/* Results overlay toggle */}
          {hasResults && (
            <>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                type="button"
                onClick={() => toggleOverlay()}
                className={`px-2 py-1 text-xs rounded ${
                  overlayVisible
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={overlayVisible ? 'Ukryj nakladke wynikow' : 'Pokaz nakladke wynikow'}
                data-testid="sld-overlay-toggle"
              >
                {overlayVisible ? 'Nakladka: Wl.' : 'Nakladka: Wyl.'}
              </button>
            </>
          )}

          {/* Diagnostics overlay toggle and filter */}
          {hasDiagnostics && (
            <>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                type="button"
                onClick={() => toggleDiagnostics()}
                className={`px-2 py-1 text-xs rounded ${
                  diagnosticsVisible
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={diagnosticsVisible ? 'Ukryj diagnostyke' : 'Pokaz diagnostyke'}
                data-testid="sld-diagnostics-toggle"
              >
                {diagnosticsVisible ? 'Diagnostyka: Wl.' : 'Diagnostyka: Wyl.'}
              </button>

              {/* Severity filter (visible only when diagnostics visible) */}
              {diagnosticsVisible && (
                <select
                  value={diagnosticsFilter}
                  onChange={handleFilterChange}
                  className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  title="Filtr severity"
                  data-testid="sld-diagnostics-filter"
                >
                  {Object.entries(SEVERITY_FILTER_LABELS_PL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* PR-SLD-06: Mode toggle */}
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={handleModeToggle}
            className={`px-2 py-1 text-xs rounded ${
              isResultsMode
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isResultsMode ? 'Przelacz na tryb Edycja' : 'Przelacz na tryb Wyniki'}
            data-testid="sld-mode-toggle"
          >
            {isResultsMode ? 'Tryb: Wyniki' : 'Tryb: Edycja'}
          </button>

          {/* PR-SLD-06: Diagnostic layer toggle (only in WYNIKI mode) */}
          {isResultsMode && (
            <button
              type="button"
              onClick={handleDiagnosticLayerToggle}
              className={`px-2 py-1 text-xs rounded ${
                diagnosticLayerVisible
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={diagnosticLayerVisible ? 'Ukryj warstwe diagnostyczna' : 'Pokaz warstwe diagnostyczna'}
              data-testid="sld-diagnostic-layer-toggle"
            >
              {diagnosticLayerVisible ? 'Warstwa: Wl.' : 'Warstwa: Wyl.'}
            </button>
          )}

          {/* Export button */}
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={handleExportClick}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Eksportuj schemat"
            data-testid="sld-export-btn"
          >
            Eksportuj
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{ cursor: isPanning.current ? 'grabbing' : 'default' }}
      >
        <SLDViewCanvas
          symbols={symbols}
          selectedId={selectedElement?.id ?? null}
          onSymbolClick={handleSymbolClick}
          viewport={viewport}
          showGrid={showGrid}
          width={width}
          height={height}
        />

        {/* Results overlay layer */}
        <ResultsOverlay
          symbols={symbols}
          viewport={viewport}
          selectedElementId={selectedElement?.id}
        />

        {/* Focus indicator (for jump-to-element visual feedback) */}
        {focusIndicatorPosition && (
          <div
            data-testid={`sld-focus-${focusIndicatorPosition.elementId}`}
            className="pointer-events-none absolute z-20"
            style={{
              left: `${focusIndicatorPosition.x}px`,
              top: `${focusIndicatorPosition.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            onAnimationEnd={handleFocusPulseAnimationEnd}
          >
            {/* Pulsing ring - animation clears state on end */}
            <div
              className="w-16 h-16 rounded-full border-4 border-blue-500 animate-ping opacity-75"
              style={{ animationIterationCount: 2 }}
              onAnimationEnd={handleFocusPulseAnimationEnd}
            />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-blue-400" />
          </div>
        )}

        {/* Diagnostics overlay layer */}
        <DiagnosticsOverlay
          symbols={symbols}
          viewport={viewport}
          selectedElementId={selectedElement?.id}
          focusPulseElementId={focusPulseElementId}
          visible={diagnosticsVisible}
          filter={diagnosticsFilter}
          onMarkerClick={handleDiagnosticsMarkerClick}
          projectId="demo-project"
          diagramId="demo-diagram"
          showLegend={true}
        />

        {/* Switching state & energization legend (base layer) */}
        <SwitchingStateLegend visible={true} />

        {/* PR-SLD-06: Diagnostic results layer (only in WYNIKI mode) */}
        {isResultsMode && (
          <DiagnosticResultsLayer
            symbols={symbols}
            viewport={viewport}
            visible={diagnosticLayerVisible}
          />
        )}
      </div>

      {/* Status bar */}
      <div
        data-testid="sld-view-status"
        className="flex items-center justify-between px-4 py-1 bg-white border-t border-gray-200 text-xs text-gray-500"
      >
        <div>
          Elementow: {symbols.length}
          {selectedElement && (
            <span className="ml-4">
              Zaznaczono: <span className="font-medium text-gray-700">{selectedElement.name}</span>
              {' '}({selectedElement.type})
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* PR-SLD-06: Mode status in status bar */}
          {isResultsMode && (
            <span
              data-testid="sld-status-results-mode"
              className="font-medium text-gray-700"
            >
              Tryb WYNIKI (tylko odczyt)
            </span>
          )}
          <span>Przeciagaj srodkowym/prawym przyciskiem myszy | Scroll: zoom</span>
        </div>
      </div>

      {/* Export dialog */}
      <SldSnapshotExportDialog
        isOpen={exportDialogOpen}
        onClose={handleExportDialogClose}
        onExport={handleExport}
        currentLayerState={currentLayerState}
        metadata={exportMetadata}
        hasResultsOverlay={hasResults}
        hasDiagnosticsOverlay={hasDiagnostics}
        isExporting={isExporting}
      />
    </div>
  );
};
