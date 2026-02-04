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
import { ProtectionOverlayLayer } from './ProtectionOverlayLayer';
import { SwitchingStateLegend } from './SwitchingStateLegend';
import { useSldModeStore, SLD_MODE_LABELS_PL, type SldMode } from './sldModeStore';
import { useProtectionStatistics } from './protection';
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

  // SLD mode store integration (PR-SLD-06, PR-SLD-09)
  const sldMode = useSldModeStore((state) => state.mode);
  const diagnosticLayerVisible = useSldModeStore((state) => state.diagnosticLayerVisible);
  const protectionLayerVisible = useSldModeStore((state) => state.protectionLayerVisible);
  const setMode = useSldModeStore((state) => state.setMode);
  const toggleDiagnosticLayer = useSldModeStore((state) => state.toggleDiagnosticLayer);
  const toggleProtectionLayer = useSldModeStore((state) => state.toggleProtectionLayer);
  const isResultsMode = sldMode === 'WYNIKI';
  const isProtectionMode = sldMode === 'ZABEZPIECZENIA';
  const isReadOnlyMode = isResultsMode || isProtectionMode;

  // PR-SLD-09: Protection statistics
  const protectionStats = useProtectionStatistics();
  const hasProtectionData = protectionStats.total > 0;

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Legend visibility state (hidden by default, toggleable)
  const [legendVisible, setLegendVisible] = useState(false);

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
   * Keyboard shortcut: F = fit to content (deterministic).
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'f' && event.key !== 'F') return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return;
      }
      event.preventDefault();
      handleFitToContent();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitToContent]);

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
   * Handle SLD mode change (PR-SLD-06, PR-SLD-09).
   * Cycles through: EDYCJA -> WYNIKI -> ZABEZPIECZENIA -> EDYCJA
   */
  const handleModeChange = useCallback((newMode: SldMode) => {
    setMode(newMode);
  }, [setMode]);

  /**
   * Handle diagnostic layer toggle (PR-SLD-06).
   */
  const handleDiagnosticLayerToggle = useCallback(() => {
    toggleDiagnosticLayer();
  }, [toggleDiagnosticLayer]);

  /**
   * Handle protection layer toggle (PR-SLD-09).
   */
  const handleProtectionLayerToggle = useCallback(() => {
    toggleProtectionLayer();
  }, [toggleProtectionLayer]);

  /**
   * Handle protection label click (PR-SLD-09).
   */
  const handleProtectionLabelClick = useCallback(
    (element: SelectedElement) => {
      // Update selection store
      selectElement(element);

      // Sync to URL
      updateUrlWithSelection(element);

      // Center SLD on the element
      centerSldOnElement(element.id);

      // Call external handler if provided
      if (onElementClick) {
        onElementClick(element);
      }
    },
    [selectElement, centerSldOnElement, onElementClick]
  );

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
      className="flex flex-col h-full bg-stone-100"
    >
      {/* Toolbar — ETAP-grade professional */}
      <div
        data-testid="sld-view-toolbar"
        className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700"
      >
        <div className="flex items-center gap-3">
          {/* Logo/Icon */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-100 tracking-wide">Schemat jednokreskowy</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            SLD
          </span>
          {/* PR-SLD-06: Mode indicator */}
          <span
            data-testid="sld-mode-indicator"
            className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              isResultsMode
                ? 'bg-blue-600 text-white'
                : isProtectionMode
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-600 text-slate-200'
            }`}
          >
            {SLD_MODE_LABELS_PL[sldMode]}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls — ETAP-grade */}
          <div className="flex items-center bg-slate-700 rounded overflow-hidden">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={viewport.zoom <= ZOOM_MIN}
              className="px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Pomniejsz"
              data-testid="sld-zoom-out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            <span
              className="text-xs text-slate-100 w-12 text-center font-mono bg-slate-600 py-1.5"
              data-testid="sld-zoom-level"
            >
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={viewport.zoom >= ZOOM_MAX}
              className="px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Powiększ"
              data-testid="sld-zoom-in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="w-px h-5 bg-slate-600 mx-1" />

          {/* Fit & Reset — ETAP-grade buttons */}
          <button
            type="button"
            onClick={handleFitToContent}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            title="Dopasuj do schematu (F)"
            aria-label="Dopasuj do schematu"
            data-testid="sld-fit-content"
          >
            Dopasuj
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
            title="Resetuj widok"
            data-testid="sld-reset-view"
          >
            Reset
          </button>

          {/* Results overlay toggle */}
          {hasResults && (
            <>
              <div className="w-px h-5 bg-slate-600 mx-1" />
              <button
                type="button"
                onClick={() => toggleOverlay()}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  overlayVisible
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
                }`}
                title={overlayVisible ? 'Ukryj nakładkę wyników' : 'Pokaż nakładkę wyników'}
                data-testid="sld-overlay-toggle"
              >
                Wyniki
              </button>
            </>
          )}

          {/* Diagnostics overlay toggle and filter */}
          {hasDiagnostics && (
            <>
              <div className="w-px h-5 bg-slate-600 mx-1" />
              <button
                type="button"
                onClick={() => toggleDiagnostics()}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  diagnosticsVisible
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
                }`}
                title={diagnosticsVisible ? 'Ukryj diagnostykę' : 'Pokaż diagnostykę'}
                data-testid="sld-diagnostics-toggle"
              >
                Diagnostyka
              </button>

              {/* Severity filter (visible only when diagnostics visible) */}
              {diagnosticsVisible && (
                <select
                  value={diagnosticsFilter}
                  onChange={handleFilterChange}
                  className="px-2 py-1.5 text-xs rounded bg-slate-700 text-slate-200 border border-slate-600 hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  title="Filtr"
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

          {/* PR-SLD-06, PR-SLD-09: Mode selector — ETAP-grade tab bar */}
          <div className="w-px h-5 bg-slate-600 mx-2" />
          <div className="flex items-center bg-slate-700 rounded overflow-hidden" data-testid="sld-mode-selector">
            <button
              type="button"
              onClick={() => handleModeChange('EDYCJA')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                sldMode === 'EDYCJA'
                  ? 'bg-slate-500 text-white'
                  : 'text-slate-300 hover:bg-slate-600 hover:text-slate-100'
              }`}
              title="Tryb Edycja"
              data-testid="sld-mode-edit"
            >
              Edycja
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('WYNIKI')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                sldMode === 'WYNIKI'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-600 hover:text-slate-100'
              }`}
              title="Tryb Wyniki"
              data-testid="sld-mode-results"
            >
              Wyniki
            </button>
            {hasProtectionData && (
              <button
                type="button"
                onClick={() => handleModeChange('ZABEZPIECZENIA')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sldMode === 'ZABEZPIECZENIA'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-600 hover:text-slate-100'
                }`}
                title="Tryb Zabezpieczenia"
                data-testid="sld-mode-protection"
              >
                Zabezpieczenia
              </button>
            )}
          </div>

          {/* PR-SLD-06: Diagnostic layer toggle (only in WYNIKI mode) */}
          {isResultsMode && (
            <button
              type="button"
              onClick={handleDiagnosticLayerToggle}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                diagnosticLayerVisible
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
              title={diagnosticLayerVisible ? 'Ukryj warstwę diagnostyczną' : 'Pokaż warstwę diagnostyczną'}
              data-testid="sld-diagnostic-layer-toggle"
            >
              Warstwa
            </button>
          )}

          {/* PR-SLD-09: Protection layer toggle (only in ZABEZPIECZENIA mode) */}
          {isProtectionMode && (
            <button
              type="button"
              onClick={handleProtectionLayerToggle}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                protectionLayerVisible
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
              title={protectionLayerVisible ? 'Ukryj warstwę zabezpieczeń' : 'Pokaż warstwę zabezpieczeń'}
              data-testid="sld-protection-layer-toggle"
            >
              Nastawy
            </button>
          )}

          {/* Export button */}
          <div className="w-px h-5 bg-slate-600 mx-1" />
          <button
            type="button"
            onClick={handleExportClick}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
            title="Eksportuj schemat"
            data-testid="sld-export-btn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
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

        {/* Focus indicator (for jump-to-element visual feedback) — ETAP-grade */}
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
            {/* Professional pulsing ring — subtle, not distracting */}
            <div
              className="w-20 h-20 rounded-full border-2 border-blue-400 animate-ping opacity-60"
              style={{ animationIterationCount: 2, animationDuration: '1.5s' }}
              onAnimationEnd={handleFocusPulseAnimationEnd}
            />
            <div className="absolute inset-0 w-20 h-20 rounded-full border border-blue-300 opacity-40" />
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
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

        {/* Switching state & energization legend (toggled via button) */}
        <SwitchingStateLegend visible={legendVisible} />

        {/* Legend toggle button (bottom-left corner) — ETAP-grade */}
        <button
          type="button"
          onClick={() => setLegendVisible((prev) => !prev)}
          className={`absolute bottom-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg shadow-md transition-all duration-150 ${
            legendVisible
              ? 'bg-slate-800 text-white hover:bg-slate-700'
              : 'bg-white/95 backdrop-blur-sm border border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400'
          }`}
          title={legendVisible ? 'Ukryj legendę' : 'Pokaż legendę'}
          data-testid="sld-legend-toggle"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {legendVisible ? 'Ukryj legendę' : 'Legenda'}
        </button>

        {/* PR-SLD-06: Diagnostic results layer (only in WYNIKI mode) */}
        {isResultsMode && (
          <DiagnosticResultsLayer
            symbols={symbols}
            viewport={viewport}
            visible={diagnosticLayerVisible}
          />
        )}

        {/* PR-SLD-09: Protection overlay layer (only in ZABEZPIECZENIA mode) */}
        {isProtectionMode && (
          <ProtectionOverlayLayer
            symbols={symbols}
            viewport={viewport}
            selectedElementId={selectedElement?.id}
            visible={protectionLayerVisible}
            onLabelClick={handleProtectionLabelClick}
          />
        )}
      </div>

      {/* Status bar — ETAP-grade professional */}
      <div
        data-testid="sld-view-status"
        className="flex items-center justify-between px-4 py-1.5 bg-slate-800 border-t border-slate-700 text-xs"
      >
        <div className="flex items-center gap-4 text-slate-300">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
            </svg>
            <span className="font-mono">{symbols.length}</span> elementów
          </span>
          {selectedElement && (
            <span className="flex items-center gap-1.5 border-l border-slate-600 pl-4">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2z" />
              </svg>
              <span className="font-medium text-slate-100">{selectedElement.name}</span>
              <span className="text-slate-500">({selectedElement.type})</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          {/* PR-SLD-06, PR-SLD-09: Mode status in status bar */}
          {isReadOnlyMode && (
            <span
              data-testid={isResultsMode ? 'sld-status-results-mode' : 'sld-status-protection-mode'}
              className={`flex items-center gap-1.5 font-medium ${isResultsMode ? 'text-blue-400' : 'text-emerald-400'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              {isResultsMode ? 'Tylko odczyt' : 'Tylko odczyt'}
            </span>
          )}
          <span className="text-slate-500">
            Środkowy/prawy przycisk myszy: przesuwanie • Scroll: powiększanie • F: dopasuj
          </span>
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
