/**
 * SLD View Page — Full-page Read-Only SLD Viewer
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md: SLD ↔ selection synchronization
 * - powerfactory_ui_parity.md: PowerFactory-like presentation
 *
 * PAGE INTEGRATION:
 * - Uses symbols from SldEditorStore (shared with SldEditor)
 * - Syncs selection with URL / Project Tree / Inspector
 * - Diagnostics panel with jump-to-element
 * - Element inspector panel (PR-SLD-07)
 * - Read-only mode (no editing)
 * - 100% Polish UI
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SLDView } from './SLDView';
import { useSldEditorStore } from '../sld-editor/SldEditorStore';
import { useSelectionStore } from '../selection/store';
import { ProtectionDiagnosticsPanel } from '../results/ProtectionDiagnosticsPanel';
import { SldInspectorPanel } from './inspector';
import type { AnySldSymbol } from '../sld-editor/types';

/**
 * Demo symbols for development/testing.
 * In production, these come from the network model via SldEditorStore.
 */
const DEMO_SYMBOLS: AnySldSymbol[] = [
  {
    id: 'bus_main',
    elementId: 'bus_main',
    elementType: 'Bus',
    elementName: 'Szyna główna SN',
    position: { x: 400, y: 200 },
    inService: true,
    width: 100,
    height: 10,
  } as any,
  {
    id: 'bus_dist',
    elementId: 'bus_dist',
    elementType: 'Bus',
    elementName: 'Szyna dystrybucyjna',
    position: { x: 400, y: 350 },
    inService: true,
    width: 80,
    height: 8,
  } as any,
  {
    id: 'source_grid',
    elementId: 'source_grid',
    elementType: 'Source',
    elementName: 'Sieć zasilająca',
    position: { x: 400, y: 40 },
    inService: true,
    connectedToNodeId: 'bus_main',
  } as any,
  {
    id: 'trafo_1',
    elementId: 'trafo_1',
    elementType: 'TransformerBranch',
    elementName: 'TR1 110/15kV',
    position: { x: 400, y: 150 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'bus_dist',
    points: [],
  } as any,
  {
    id: 'line_1',
    elementId: 'line_1',
    elementType: 'LineBranch',
    elementName: 'Linia L1',
    position: { x: 300, y: 275 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'bus_dist',
    points: [],
  } as any,
  {
    id: 'line_2',
    elementId: 'line_2',
    elementType: 'LineBranch',
    elementName: 'Linia L2',
    position: { x: 500, y: 275 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'bus_dist',
    points: [],
  } as any,
  {
    id: 'sw_1',
    elementId: 'sw_1',
    elementType: 'Switch',
    elementName: 'Q1',
    position: { x: 300, y: 230 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'line_1',
    switchState: 'CLOSED',
    switchType: 'BREAKER',
  } as any,
  {
    id: 'sw_2',
    elementId: 'sw_2',
    elementType: 'Switch',
    elementName: 'Q2',
    position: { x: 500, y: 230 },
    inService: true,
    fromNodeId: 'bus_main',
    toNodeId: 'line_2',
    switchState: 'OPEN',
    switchType: 'BREAKER',
  } as any,
  {
    id: 'load_1',
    elementId: 'load_1',
    elementType: 'Load',
    elementName: 'Odbior O1',
    position: { x: 250, y: 420 },
    inService: true,
    connectedToNodeId: 'bus_dist',
  } as any,
  {
    id: 'load_2',
    elementId: 'load_2',
    elementType: 'Load',
    elementName: 'Odbior O2',
    position: { x: 400, y: 420 },
    inService: true,
    connectedToNodeId: 'bus_dist',
  } as any,
  {
    id: 'load_3',
    elementId: 'load_3',
    elementType: 'Load',
    elementName: 'Odbior O3',
    position: { x: 550, y: 420 },
    inService: false,
    connectedToNodeId: 'bus_dist',
  } as any,
];

/**
 * Props for SLDViewPage.
 */
export interface SLDViewPageProps {
  /** Use demo data (for development) */
  useDemo?: boolean;
  /** Show diagnostics panel */
  showDiagnosticsPanel?: boolean;
  /** Show inspector panel (PR-SLD-07) */
  showInspectorPanel?: boolean;
}

/**
 * SLD View Page component.
 * Integrates SLDView with application state.
 */
export const SLDViewPage: React.FC<SLDViewPageProps> = ({
  useDemo = false,
  showDiagnosticsPanel = true,
  showInspectorPanel = true,
}) => {
  // Get symbols from store
  const storeSymbols = useSldEditorStore((state) => Array.from(state.symbols.values()));
  const setSymbols = useSldEditorStore((state) => state.setSymbols);

  // Panel collapsed state
  const [diagnosticsPanelCollapsed, setDiagnosticsPanelCollapsed] = useState(false);
  const [inspectorPanelVisible, setInspectorPanelVisible] = useState(true);

  // Use demo symbols if store is empty and demo mode is enabled
  const symbols = useMemo(() => {
    if (storeSymbols.length > 0) {
      return storeSymbols;
    }
    return useDemo ? DEMO_SYMBOLS : [];
  }, [storeSymbols, useDemo]);

  // Load demo symbols into store on mount if demo mode
  useEffect(() => {
    if (useDemo && storeSymbols.length === 0) {
      setSymbols(DEMO_SYMBOLS);
    }
  }, [useDemo, storeSymbols.length, setSymbols]);

  // Get current selection from store (for synchronization)
  const selectedElement = useSelectionStore((state) => state.selectedElements[0] ?? null);

  // Toggle diagnostics panel
  const toggleDiagnosticsPanel = useCallback(() => {
    setDiagnosticsPanelCollapsed((prev) => !prev);
  }, []);

  // Handle inspector close (PR-SLD-07)
  const handleInspectorClose = useCallback(() => {
    setInspectorPanelVisible(false);
  }, []);

  // Show inspector when selection changes (PR-SLD-07)
  useEffect(() => {
    if (selectedElement) {
      setInspectorPanelVisible(true);
    }
  }, [selectedElement]);

  return (
    <div
      data-testid="sld-view-page"
      className="h-full w-full flex"
    >
      {/* SLD View (main area) */}
      <div className="flex-1 min-w-0">
        <SLDView
          symbols={symbols}
          selectedElement={selectedElement}
          showGrid={true}
          fitOnMount={true}
        />
      </div>

      {/* Inspector Panel (PR-SLD-07) */}
      {showInspectorPanel && inspectorPanelVisible && selectedElement && (
        <SldInspectorPanel
          onClose={handleInspectorClose}
        />
      )}

      {/* Diagnostics Panel (collapsible sidebar) */}
      {showDiagnosticsPanel && (
        <div
          data-testid="sld-diagnostics-sidebar"
          className={`border-l border-gray-200 bg-white transition-all duration-300 ${
            diagnosticsPanelCollapsed ? 'w-10' : 'w-96'
          }`}
        >
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggleDiagnosticsPanel}
            className="w-full px-2 py-2 text-xs text-gray-600 hover:bg-gray-100 border-b border-gray-200 flex items-center justify-center"
            title={diagnosticsPanelCollapsed ? 'Rozwin panel diagnostyki' : 'Zwin panel diagnostyki'}
            aria-label={diagnosticsPanelCollapsed ? 'Rozwin panel diagnostyki' : 'Zwin panel diagnostyki'}
          >
            {diagnosticsPanelCollapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {/* Panel content (hidden when collapsed) */}
          {!diagnosticsPanelCollapsed && (
            <div className="h-[calc(100%-36px)] overflow-hidden">
              <ProtectionDiagnosticsPanel
                projectId="demo-project"
                diagramId="demo-diagram"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
