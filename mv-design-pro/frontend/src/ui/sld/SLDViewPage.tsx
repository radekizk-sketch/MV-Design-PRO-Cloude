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
 * - Read-only mode (no editing)
 * - 100% Polish UI
 */

import React, { useEffect, useMemo } from 'react';
import { SLDView } from './SLDView';
import { useSldEditorStore } from '../sld-editor/SldEditorStore';
import { useSelectionStore } from '../selection/store';
import type { AnySldSymbol } from '../sld-editor/types';

/**
 * Demo symbols for development/testing.
 * In production, these come from the network model via SldEditorStore.
 */
const DEMO_SYMBOLS: AnySldSymbol[] = [
  {
    id: 'bus_pcc',
    elementId: 'bus_pcc',
    elementType: 'Bus',
    elementName: 'PCC (Punkt wspólnego przyłączenia)',
    position: { x: 400, y: 100 },
    inService: true,
    width: 120,
    height: 12,
  } as any,
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
    connectedToNodeId: 'bus_pcc',
  } as any,
  {
    id: 'trafo_1',
    elementId: 'trafo_1',
    elementType: 'TransformerBranch',
    elementName: 'TR1 110/15kV',
    position: { x: 400, y: 150 },
    inService: true,
    fromNodeId: 'bus_pcc',
    toNodeId: 'bus_main',
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
}

/**
 * SLD View Page component.
 * Integrates SLDView with application state.
 */
export const SLDViewPage: React.FC<SLDViewPageProps> = ({ useDemo = false }) => {
  // Get symbols from store
  const storeSymbols = useSldEditorStore((state) => Array.from(state.symbols.values()));
  const setSymbols = useSldEditorStore((state) => state.setSymbols);

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

  return (
    <div
      data-testid="sld-view-page"
      className="h-full w-full"
    >
      <SLDView
        symbols={symbols}
        selectedElement={selectedElement}
        showGrid={true}
        fitOnMount={true}
      />
    </div>
  );
};
