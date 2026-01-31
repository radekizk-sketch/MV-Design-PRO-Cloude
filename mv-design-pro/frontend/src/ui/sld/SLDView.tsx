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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SLDViewCanvas } from './SLDViewCanvas';
import { ResultsOverlay } from './ResultsOverlay';
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
import { updateUrlWithSelection } from '../navigation/urlState';

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

  // Zoom percentage for display
  const zoomPercent = Math.round(viewport.zoom * 100);

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
        <div>
          Przeciagaj srodkowym/prawym przyciskiem myszy | Scroll: zoom
        </div>
      </div>
    </div>
  );
};
