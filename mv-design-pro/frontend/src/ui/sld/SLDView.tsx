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
import { useOverlayRuntime, OverlayLegend } from '../sld-overlay';
import { SldTechLabelsLayer } from './SldTechLabelsLayer';
import { useCanCalculate, useAppStateStore } from '../app-state';
import { resolveClickAction } from './SldModeInteractionHandler';
import { useOperationalModeStore } from './operationalModeStore';
import { EngineeringContextMenu } from '../context-menu/EngineeringContextMenu';
import type { EngineeringContextMenuState } from '../context-menu/EngineeringContextMenu';
import { useLabelModeStore } from './labelModeStore';
import { notify } from '../notifications/store';
import { useModalController, ModalOverlay } from './ModalController';

/**
 * Default canvas dimensions.
 */
const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 600;

/**
 * Default (closed) state for the engineering context menu.
 */
const CONTEXT_MENU_CLOSED: EngineeringContextMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  elementId: '',
  elementType: 'Bus',
  elementName: '',
};

/**
 * Context menu action ID → canonical operation mapping.
 * Bridges context menu builder proxy IDs to modalRegistry canonical operations.
 */
const CONTEXT_MENU_OP_MAP: Record<string, string> = {
  // Properties / parameter editing
  properties: 'update_element_parameters',
  edit_sk3: 'update_element_parameters',
  edit_voltage: 'update_element_parameters',
  edit_rx: 'update_element_parameters',
  edit_impedance: 'update_element_parameters',
  edit_length: 'update_element_parameters',
  edit_load_power: 'update_element_parameters',
  edit_transformer_ratio: 'update_element_parameters',
  edit_parameters: 'update_element_parameters',
  edit_tap: 'update_element_parameters',
  edit_vector_group: 'update_element_parameters',
  edit_power: 'update_element_parameters',
  edit_reactive: 'update_element_parameters',
  edit_kind: 'update_element_parameters',
  edit_connection: 'update_element_parameters',
  edit_control: 'update_element_parameters',
  edit_limits: 'update_element_parameters',
  edit_disconnect: 'update_element_parameters',
  edit_measurement: 'update_element_parameters',
  edit_capacity: 'update_element_parameters',
  edit_soc: 'update_element_parameters',
  edit_mode: 'update_element_parameters',
  edit_strategy: 'update_element_parameters',
  edit_pf: 'update_element_parameters',
  edit_fuel: 'update_element_parameters',
  edit_backup_time: 'update_element_parameters',
  edit_battery: 'update_element_parameters',
  edit_switch: 'update_element_parameters',
  edit_rating: 'update_element_parameters',
  edit_purpose: 'update_element_parameters',
  edit_accuracy: 'update_element_parameters',
  edit_ratio: 'update_element_parameters',
  edit_settings: 'update_element_parameters',
  edit_curve: 'update_element_parameters',
  edit_type: 'update_element_parameters',
  edit_name: 'update_element_parameters',
  edit_description: 'update_element_parameters',
  edit_label: 'update_element_parameters',
  edit_source_params: 'update_element_parameters',
  edit_segment_length: 'update_element_parameters',
  edit_cycles: 'update_element_parameters',
  edit_chemistry: 'update_element_parameters',
  rename: 'update_element_parameters',
  set_normal_state: 'update_element_parameters',
  set_operating_mode: 'update_element_parameters',
  set_time_profile: 'update_element_parameters',
  set_profile: 'update_element_parameters',
  set_source_mode: 'update_element_parameters',
  change_role: 'update_element_parameters',
  change_kind: 'update_element_parameters',
  // Catalog operations
  assign_catalog: 'assign_catalog_to_element',
  assign_tr_catalog: 'assign_catalog_to_element',
  assign_bus_catalog: 'assign_catalog_to_element',
  assign_default_catalog: 'assign_catalog_to_element',
  assign_inverter_catalog: 'assign_catalog_to_element',
  assign_storage_catalog: 'assign_catalog_to_element',
  assign_switch_catalog: 'assign_catalog_to_element',
  assign_cable_catalog: 'assign_catalog_to_element',
  assign_next_catalog: 'assign_catalog_to_element',
  clear_catalog: 'assign_catalog_to_element',
  // Topology operations — SN
  add_line: 'start_branch_segment_sn',
  add_cable: 'start_branch_segment_sn',
  add_branch: 'start_branch_segment_sn',
  add_station: 'insert_station_on_segment_sn',
  insert_station_a: 'insert_station_on_segment_sn',
  insert_station_b: 'insert_station_on_segment_sn',
  insert_station_c: 'insert_station_on_segment_sn',
  insert_station_d: 'insert_station_on_segment_sn',
  add_section_switch: 'insert_section_switch_sn',
  insert_section_switch: 'insert_section_switch_sn',
  insert_disconnector: 'insert_section_switch_sn',
  insert_earthing: 'insert_section_switch_sn',
  connect_ring: 'connect_secondary_ring_sn',
  set_nop: 'set_normal_open_point',
  set_as_nop: 'set_normal_open_point',
  clear_nop: 'set_normal_open_point',
  move_nop: 'set_normal_open_point',
  set_nop_candidate: 'set_normal_open_point',
  // Element addition — SN
  add_source: 'add_grid_source_sn',
  add_transformer: 'add_transformer_sn_nn',
  add_breaker: 'add_sn_bay',
  add_disconnector: 'add_sn_bay',
  add_earth_switch: 'add_sn_bay',
  add_sn_field_in: 'add_sn_bay',
  add_sn_field_out: 'add_sn_bay',
  add_sn_field_branch: 'add_sn_bay',
  add_sn_field_tr: 'add_sn_bay',
  add_sn_bus_section: 'add_sn_bay',
  add_sn_coupler: 'add_sn_bay',
  // Measurement — CT/VT
  add_ct: 'add_measurement',
  add_vt: 'add_measurement',
  assign_ct: 'add_measurement',
  assign_vt: 'add_measurement',
  // Protection
  add_relay: 'add_relay',
  add_protection: 'add_relay',
  edit_relay_settings: 'add_relay',
  // Element addition — nN
  add_nn_load: 'add_nn_load',
  add_load: 'add_nn_load',
  add_pv: 'add_pv_inverter_nn',
  add_bess: 'add_bess_inverter_nn',
  add_bess_energy: 'add_bess_inverter_nn',
  add_genset: 'add_genset_nn',
  add_ups: 'add_ups_nn',
  add_nn_outgoing_field: 'add_nn_outgoing_field',
  add_feeder: 'add_nn_outgoing_field',
  add_nn_feeder: 'add_nn_outgoing_field',
  add_nn_bus: 'add_nn_outgoing_field',
  add_nn_main: 'add_nn_outgoing_field',
  add_nn_bus_section: 'add_nn_outgoing_field',
  add_nn_coupler: 'add_nn_outgoing_field',
  add_source_field: 'add_nn_outgoing_field',
  add_source_field_nn: 'add_nn_outgoing_field',
  add_bus_section: 'add_nn_outgoing_field',
  add_bus_coupler: 'add_nn_outgoing_field',
  add_segment: 'add_nn_segment',
  add_fuse: 'add_sn_bay',
  add_energy_meter: 'add_measurement',
  add_quality_meter: 'add_measurement',
  add_surge_arrester: 'add_measurement',
  // Calculations
  run_power_flow: 'run_power_flow',
  run_short_circuit: 'run_short_circuit',
  run_sc_analysis: 'run_short_circuit',
  run_sc_3f: 'run_short_circuit',
  run_sc_2f: 'run_short_circuit',
  run_sc_1f: 'run_short_circuit',
  run_sc_2f_rf: 'run_short_circuit',
  run_time_series: 'run_power_flow',
  // StudyCase operations
  set_switch_states: 'update_element_parameters',
  set_normal_states: 'update_element_parameters',
  set_source_modes: 'update_element_parameters',
  set_analysis_settings: 'update_element_parameters',
  clone_case: 'update_element_parameters',
  // Validation / readiness
  validate_transformer: 'update_element_parameters',
};

/**
 * Navigation/info action IDs — these don't map to domain operations.
 */
const NAVIGATION_ACTIONS = new Set([
  'show_results',
  'show_whitebox',
  'show_readiness',
  'show_tree',
  'show_diagram',
  'show_on_diagram',
  'show_topology',
  'show_secondary_links',
  'show_coordination',
  'show_summary',
  'show_per_element',
  'show_overlay',
  'show_ik',
  'show_ip',
  'show_ith',
  'show_idyn',
  'show_voltages',
  'show_currents',
  'show_powers',
  'show_losses',
  'show_comparison',
  'show_delta_overlay',
  'export_data',
  'export_json',
  'export_report',
  'export_pdf',
  'export_docx',
  'export_results',
  'export_whitebox',
  'history',
  'fix_issues',
  'check_ring',
  'check_nop',
  'check_selectivity',
  'check_collisions',
  'calc_tcc',
  'validate_selectivity',
  'compare_cases',
  'compare_with',
  'compare_snapshots',
  'add_trunk_segment',
  'reserve_ring',
  'release_ring',
  'start_secondary_link',
]);

/**
 * Direct toggle actions — handled in-place without modals.
 */
const TOGGLE_ACTIONS = new Set([
  'toggle_switch',
  'toggle_service',
  'toggle_enabled',
  'delete',
  'delete_element',
  'disconnect',
  'disconnect_element',
  'edit_geometry',
  'snap_to_grid',
  'reset_geometry',
  'undo_snapshot',
]);

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
  onCalculateClick,
}) => {
  // Viewport state (pan/zoom)
  const [viewport, setViewport] = useState<ViewportState>(() => ({
    ...DEFAULT_VIEWPORT,
    zoom: initialZoom,
  }));

  // Focus pulse state (for marker click visual feedback)
  // Cleared via CSS animationend event (no setTimeout for deterministic E2E)
  const [focusPulseElementId, setFocusPulseElementId] = useState<string | null>(null);

  // BLOK 7 — etykiety techniczne (load%, NOP, napięcie)
  const [techLabelsVisible, setTechLabelsVisible] = useState(false);

  // Label mode store integration — tech labels also respond to label mode store
  const labelModeVisible = useLabelModeStore((state) => state.visible);

  // Derived: tech labels visible when either local toggle OR label mode store says visible
  const effectiveTechLabelsVisible = techLabelsVisible || labelModeVisible;

  // Context menu state for EngineeringContextMenu
  const [contextMenuState, setContextMenuState] = useState<EngineeringContextMenuState>(
    CONTEXT_MENU_CLOSED,
  );

  // Operational mode store integration (mode-aware click handling)
  const operationalMode = useOperationalModeStore((state) => state.mode);

  // App state for export metadata (project/case names)
  const activeProjectName = useAppStateStore((state) => state.activeProjectName);
  const activeCaseName = useAppStateStore((state) => state.activeCaseName);

  // BLOK 8 — przycisk uruchomienia obliczeń
  const { allowed: canCalculate } = useCanCalculate();

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

  // PR-16: Overlay Runtime Engine
  const overlayRuntime = useOverlayRuntime(symbols);

  // Modal controller for context menu → modal dispatch
  const modalController = useModalController();

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

  // State for cursor visual (refs don't trigger re-renders)
  const [cursorStyle, setCursorStyle] = useState<'default' | 'grabbing'>('default');

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
   * Handle symbol click — mode-aware click handling via SldModeInteractionHandler.
   * If operationalMode !== 'NORMALNY', the click is intercepted by the mode handler.
   * Otherwise, standard selection logic applies.
   */
  const handleSymbolClick = useCallback(
    (symbolId: string, elementType: ElementType, elementName: string) => {
      // Find the element ID (may be different from symbol ID)
      const symbol = symbols.find((s) => s.id === symbolId);
      const elementId = symbol?.elementId || symbolId;

      // Check if the operational mode intercepts this click
      const clickResult = resolveClickAction(operationalMode, {
        elementId,
        elementType,
      });

      // If operational mode is NOT 'NORMALNY', use mode-specific handler
      if (operationalMode !== 'NORMALNY') {
        // Mode-specific actions (TOGGLE_SERVICE, SET_FAULT_BUS) are handled
        // by the caller via clickResult; selection still happens for feedback
        if (clickResult.action === 'NONE') {
          // Click was rejected by mode handler — no selection
          return;
        }
      }

      // Standard selection logic (NORMALNY mode, or SELECT action in other modes)
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
    [symbols, selectElement, onElementClick, operationalMode]
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
   * Handle reset view (100%).
   */
  const handleResetView = useCallback(() => {
    setViewport({ ...DEFAULT_VIEWPORT, zoom: 1.0 });
  }, []);

  /**
   * Keyboard shortcuts (BLOK 10 — ekspert ergonomia):
   * F       = dopasuj do schematu (fit to content)
   * +/=     = powiększ
   * -       = pomniejsz
   * 0       = resetuj widok (100%)
   */
  useEffect(() => {
    const isInputTarget = (target: EventTarget | null): boolean =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputTarget(event.target)) return;

      switch (event.key) {
        case 'f':
        case 'F':
          event.preventDefault();
          handleFitToContent();
          break;
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
          event.preventDefault();
          handleZoomOut();
          break;
        case '0':
          event.preventDefault();
          handleResetView();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitToContent, handleZoomIn, handleZoomOut, handleResetView]);

  /**
   * Handle mouse wheel (zoom).
   * Attached via useEffect with { passive: false } to allow preventDefault().
   * React synthetic onWheel uses passive listeners — calling preventDefault()
   * there throws "Unable to preventDefault inside passive event listener".
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setViewport((prev) => ({
        ...prev,
        zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.zoom + delta)),
      }));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  /**
   * Handle mouse down (start pan).
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with middle mouse button or when holding space (simulated via right-click)
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isPanning.current = true;
      setCursorStyle('grabbing');
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
    setCursorStyle('default');
  }, []);

  /**
   * Handle context menu — open EngineeringContextMenu on right-click.
   * Detects the clicked element via data attributes on the SLD symbol DOM.
   */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // Attempt to find the closest SLD symbol element with data attributes
      const target = e.target as HTMLElement;
      const symbolEl = target.closest<HTMLElement>('[data-element-id]');

      if (symbolEl) {
        const elementId = symbolEl.getAttribute('data-element-id') ?? '';
        const elementType = (symbolEl.getAttribute('data-element-type') ?? 'Bus') as ElementType;
        const elementName = symbolEl.getAttribute('data-element-name') ?? elementId;

        setContextMenuState({
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
          elementId,
          elementType,
          elementName,
        });
      } else {
        // Close context menu if right-clicking on empty canvas
        setContextMenuState(CONTEXT_MENU_CLOSED);
      }
    },
    [],
  );

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
   * Handle context menu close — reset state to closed.
   */
  const handleContextMenuClose = useCallback(() => {
    setContextMenuState(CONTEXT_MENU_CLOSED);
  }, []);

  /**
   * Handle context menu operation — dispatched from EngineeringContextMenu.
   * Closes the menu after the operation is dispatched.
   */
  const handleContextMenuOperation = useCallback(
    (operationId: string, elementId: string, elementType: ElementType) => {
      // Close menu immediately
      setContextMenuState(CONTEXT_MENU_CLOSED);

      // 1. Check for canonical domain operation → open modal via ModalController
      const canonicalOp = CONTEXT_MENU_OP_MAP[operationId];
      if (canonicalOp) {
        // Select element for context
        selectElement({ id: elementId, type: elementType, name: elementId });
        // Dispatch to modal controller — opens the appropriate modal
        modalController.dispatch(canonicalOp, elementId, elementType);
        console.debug(
          `[SLDView] Dispatch: ${operationId} → ${canonicalOp}`,
        );
        return;
      }

      // 2. Navigation/info actions — select + notify + navigate
      if (NAVIGATION_ACTIONS.has(operationId)) {
        selectElement({ id: elementId, type: elementType, name: elementId });
        const labels: Record<string, string> = {
          show_results: 'Przejście do wyników',
          show_whitebox: 'Otwarcie śladu obliczeń WhiteBox',
          show_readiness: 'Gotowość elementu',
          show_tree: 'Zaznaczono w drzewie projektu',
          show_diagram: 'Wycentrowano na schemacie',
          show_on_diagram: 'Wycentrowano na schemacie',
          show_topology: 'Informacje topologiczne',
          show_secondary_links: 'Połączenia wtórne',
          show_coordination: 'Koordynacja zabezpieczeń',
          show_summary: 'Podsumowanie wyników',
          show_per_element: 'Wyniki po elementach',
          show_overlay: 'Nakładka wyników na SLD',
          show_ik: 'Prądy zwarciowe Ik″',
          show_ip: 'Prądy udarowe ip',
          show_ith: 'Prądy cieplne Ith',
          show_idyn: 'Prądy dynamiczne Idyn',
          show_voltages: 'Napięcia węzłowe',
          show_currents: 'Prądy gałęziowe',
          show_powers: 'Moce gałęziowe',
          show_losses: 'Straty mocy',
          show_comparison: 'Porównanie wyników',
          show_delta_overlay: 'Nakładka delta',
          export_data: 'Eksport danych elementu',
          export_json: 'Eksport JSON',
          export_report: 'Eksport raportu',
          export_pdf: 'Eksport PDF',
          export_docx: 'Eksport DOCX',
          export_results: 'Eksport wyników',
          export_whitebox: 'Eksport White Box',
          history: 'Historia zdarzeń elementu',
          fix_issues: 'Otwieranie działań naprawczych',
          check_ring: 'Sprawdzanie możliwości ring',
          check_nop: 'Sprawdzanie możliwości NOP',
          check_selectivity: 'Sprawdzanie selektywności',
          check_collisions: 'Sprawdzanie kolizji',
          calc_tcc: 'Obliczanie krzywych TCC',
          validate_selectivity: 'Walidacja selektywności',
          compare_cases: 'Porównanie Study Case',
          compare_with: 'Porównanie wyników',
          compare_snapshots: 'Porównanie Snapshot',
          add_trunk_segment: 'Dodawanie odcinka magistrali',
          reserve_ring: 'Rezerwacja do ring',
          release_ring: 'Zwolnienie rezerwacji ring',
          start_secondary_link: 'Rozpoczęcie łączenia wtórnego',
        };
        notify(labels[operationId] ?? operationId, 'info');

        // Center on element for navigation actions
        if (operationId === 'show_diagram' || operationId === 'show_on_diagram') {
          centerSldOnElement(elementId);
        }
        return;
      }

      // 3. Toggle actions — direct state change + notify
      if (TOGGLE_ACTIONS.has(operationId)) {
        selectElement({ id: elementId, type: elementType, name: elementId });
        const labels: Record<string, string> = {
          toggle_switch: 'Przełączono stan łącznika',
          toggle_service: 'Zmieniono stan eksploatacji',
          toggle_enabled: 'Zmieniono stan aktywności',
          delete: 'Usunięcie elementu wymaga potwierdzenia',
          delete_element: 'Usunięcie elementu wymaga potwierdzenia',
          disconnect: 'Odłączenie elementu',
          disconnect_element: 'Odłączenie elementu',
          edit_geometry: 'Edycja geometrii widoku',
          snap_to_grid: 'Wyrównano do siatki',
          reset_geometry: 'Zresetowano geometrię widoku',
          undo_snapshot: 'Cofnięto do poprzedniego Snapshot',
        };
        notify(labels[operationId] ?? operationId, 'info');
        return;
      }

      // 4. Unknown operation — log warning + generic notification
      console.warn(`[SLDView] Nieznana operacja kontekstowa: ${operationId}`);
      notify(`Operacja: ${operationId}`, 'info');
    },
    [selectElement, modalController, centerSldOnElement],
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
          projectName: activeProjectName ?? 'projekt',
          caseName: activeCaseName ?? 'przypadek',
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
    [symbols, viewport, width, height, sldOverlay, activeProjectName, activeCaseName]
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
      projectName: activeProjectName ?? 'projekt',
      caseName: activeCaseName ?? 'przypadek',
      runId: sldOverlay?.run_id,
      zoomPercent: Math.round(viewport.zoom * 100),
      timestamp: new Date().toISOString(),
    }),
    [viewport.zoom, sldOverlay, activeProjectName, activeCaseName]
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

          {/* BLOK 7: Etykiety techniczne toggle */}
          <div className="w-px h-5 bg-slate-600 mx-1" />
          <button
            type="button"
            onClick={() => setTechLabelsVisible((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              techLabelsVisible
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
            }`}
            title={techLabelsVisible ? 'Ukryj etykiety techniczne' : 'Pokaż etykiety techniczne (load%, NOP, U)'}
            data-testid="sld-tech-labels-toggle"
          >
            Etykiety
          </button>

          {/* BLOK 8: Uruchom obliczenia */}
          {onCalculateClick && (
            <>
              <div className="w-px h-5 bg-slate-600 mx-1" />
              <button
                type="button"
                onClick={onCalculateClick}
                disabled={!canCalculate}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  canCalculate
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
                title={canCalculate ? 'Uruchom obliczenia' : 'Brak aktywnego przypadku'}
                data-testid="sld-calculate-btn"
              >
                ▶ Oblicz
              </button>
            </>
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{ cursor: cursorStyle }}
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

        {/* PR-SLD-UX-MAX: Mode indicator overlay (top-right corner of canvas) */}
        <div
          data-testid="sld-mode-overlay"
          className={`absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 ${
            isResultsMode
              ? 'bg-blue-600/95 text-white border border-blue-500'
              : isProtectionMode
              ? 'bg-emerald-600/95 text-white border border-emerald-500'
              : 'bg-slate-700/90 text-slate-100 border border-slate-600'
          }`}
        >
          {/* Mode icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            {isResultsMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            ) : isProtectionMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            )}
          </svg>
          {/* Mode label */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {SLD_MODE_LABELS_PL[sldMode]}
            </span>
            {isReadOnlyMode && (
              <span className="text-[10px] opacity-80">Tylko odczyt</span>
            )}
          </div>
        </div>

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

        {/* PR-16: Overlay Runtime Legend */}
        {overlayRuntime.isActive && (
          <OverlayLegend
            overlay={overlayRuntime.overlay}
            visible={overlayRuntime.isActive}
          />
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

        {/* BLOK 7: Etykiety techniczne — load%, NOP, napięcie */}
        <SldTechLabelsLayer
          symbols={symbols}
          viewport={viewport}
          width={width}
          height={height}
          visible={effectiveTechLabelsVisible}
        />
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
            Prawy przycisk: przesuwanie • Scroll/+/−: zoom • F: dopasuj • 0: reset
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

      {/* Engineering context menu — right-click on SLD elements */}
      <EngineeringContextMenu
        state={contextMenuState}
        mode={isResultsMode ? 'RESULT_VIEW' : isProtectionMode ? 'RESULT_VIEW' : 'MODEL_EDIT'}
        onClose={handleContextMenuClose}
        onOperation={handleContextMenuOperation}
      />

      {/* Modal overlay — opened by context menu dispatch */}
      <ModalOverlay
        state={modalController.state}
        onClose={modalController.close}
      />
    </div>
  );
};
