/**
 * Context Menu Integration — mostek między ProcessPanel a menu kontekstowymi.
 *
 * Mapuje typ elementu ENM na odpowiedniego buildera z actionMenuBuilders.ts,
 * wstrzykując handlery operacji domenowych z networkBuildStore.
 *
 * BINDING: 100% PL etykiety. Reużywa istniejące buildery (24+).
 */

import type { ContextMenuAction, OperatingMode, ElementType } from '../types';
import { checkCatalogGate } from '../context-menu/catalogGate';
import type { CatalogNamespace } from '../context-menu/catalogGate';
import {
  buildSourceSNContextMenu,
  buildBusSNContextMenu,
  buildStationContextMenu,
  buildBaySNContextMenu,
  buildSwitchSNContextMenu,
  buildTransformerContextMenu,
  buildBusNNContextMenu,
  buildSegmentSNContextMenu,
  buildPVInverterContextMenu,
  buildBESSInverterContextMenu,
  buildLoadNNContextMenu,
  buildFeederNNContextMenu,
  buildSwitchNNContextMenu,
  buildNOPContextMenu,
  buildRelaySNContextMenu,
  buildMeasurementSNContextMenu,
  buildGensetContextMenu,
  buildUPSContextMenu,
  buildEnergyMeterContextMenu,
  buildEnergyStorageContextMenu,
  buildSourceFieldNNContextMenu,
} from '../context-menu/actionMenuBuilders';

// =============================================================================
// Types
// =============================================================================

/** Parametry do budowy menu kontekstowego. */
export interface ContextMenuRequest {
  elementId: string;
  elementType: ElementType;
  elementName: string;
  mode: OperatingMode;
}

export interface ContextMenuCatalogGateRequest {
  operationId: string;
  elementId: string;
  elementType: ElementType;
  namespace: CatalogNamespace;
  label: string;
  initialFormData?: Record<string, unknown>;
}

/** Callbacki operacji domenowych. */
export interface ContextMenuHandlers {
  onOpenOperationForm: (op: string, context?: Record<string, unknown>) => void;
  onOpenObjectCard: (kind: string, elementId: string) => void;
  onSelectElement: (id: string, type: ElementType, name: string) => void;
  onCenterOnElement: (elementId: string) => void;
  onDeleteElement?: (elementId: string, elementType: ElementType) => void;
  onCatalogRequired?: (request: ContextMenuCatalogGateRequest) => void;
}

// =============================================================================
// Mapper: ElementType → builder
// =============================================================================

/**
 * Buduje standardowe handlery dla menu kontekstowego elementu.
 * Każdy handler deleguje do odpowiedniej operacji domenowej.
 */
function buildStandardHandlers(
  req: ContextMenuRequest,
  handlers: ContextMenuHandlers,
): Record<string, (() => void) | undefined> {
  const openWithCatalogGate = (
    canonicalOp: string,
    actionId: string,
    context?: Record<string, unknown>,
  ) => {
    const gate = checkCatalogGate(canonicalOp);
    if (gate.required && gate.namespace && gate.label) {
      if (handlers.onCatalogRequired) {
        handlers.onCatalogRequired({
          operationId: gate.canonicalOperation,
          elementId: req.elementId,
          elementType: req.elementType,
          namespace: gate.namespace,
          label: gate.label,
          initialFormData: context,
        });
      }
      return;
    }

    handlers.onOpenOperationForm(gate.canonicalOperation || canonicalOp || actionId, context);
  };

  return {
    onProperties: () =>
      handlers.onOpenObjectCard(elementTypeToCardKind(req.elementType), req.elementId),
    onAssignCatalog: () =>
      handlers.onOpenOperationForm('assign_catalog_to_element', {
        element_ref: req.elementId,
        element_type: req.elementType,
      }),
    onEditVoltage: () =>
      handlers.onOpenOperationForm('update_element_parameters', {
        element_ref: req.elementId,
        element_type: req.elementType,
        field: 'voltage_kv',
      }),
    onEditSk3: () =>
      handlers.onOpenOperationForm('update_element_parameters', {
        element_ref: req.elementId,
        element_type: req.elementType,
        field: 'sk3_mva',
      }),
    onEditRx: () =>
      handlers.onOpenOperationForm('update_element_parameters', {
        element_ref: req.elementId,
        element_type: req.elementType,
        field: 'rx_ratio',
      }),
    onToggleService: () =>
      handlers.onOpenOperationForm('update_element_parameters', {
        element_ref: req.elementId,
        element_type: req.elementType,
        field: 'in_service',
      }),
    onShowReadiness: () =>
      handlers.onOpenObjectCard(elementTypeToCardKind(req.elementType), req.elementId),
    onShowInTree: () =>
      handlers.onSelectElement(req.elementId, req.elementType, req.elementName),
    onShowOnDiagram: () => handlers.onCenterOnElement(req.elementId),
    onDelete: handlers.onDeleteElement
      ? () => handlers.onDeleteElement!(req.elementId, req.elementType)
      : undefined,
    // Dodatkowe akcje przekazywane do konkretnych builderów
    onAddLine: () =>
      openWithCatalogGate('start_branch_segment_sn', 'add_line', {
        from_ref: req.elementId,
      }),
    onAddTransformer: () =>
      openWithCatalogGate('add_transformer_sn_nn', 'add_transformer', {
        station_ref: req.elementId,
      }),
    onInsertSwitch: () =>
      openWithCatalogGate('insert_section_switch_sn', 'insert_section_switch', {
        bus_ref: req.elementId,
        switch_kind: 'BREAKER',
      }),
    onInsertDisconnector: () =>
      openWithCatalogGate('insert_section_switch_sn', 'insert_disconnector', {
        bus_ref: req.elementId,
        switch_kind: 'DISCONNECTOR',
      }),
    onAddSource: () =>
      openWithCatalogGate('add_grid_source_sn', 'add_source', {
        bus_ref: req.elementId,
      }),
    onAddCT: () =>
      openWithCatalogGate('add_ct', 'add_ct', {
        element_ref: req.elementId,
      }),
    onAddVT: () =>
      openWithCatalogGate('add_vt', 'add_vt', {
        element_ref: req.elementId,
      }),
    onAddPV: () =>
      openWithCatalogGate('add_pv_inverter_nn', 'add_pv', {
        station_ref: req.elementId,
      }),
    onAddBESS: () =>
      openWithCatalogGate('add_bess_inverter_nn', 'add_bess', {
        station_ref: req.elementId,
      }),
    onAddNNFeeder: () =>
      openWithCatalogGate('add_nn_outgoing_field', 'add_nn_feeder', {
        station_ref: req.elementId,
      }),
    onAddFeeder: () =>
      openWithCatalogGate('add_nn_outgoing_field', 'add_feeder', {
        station_ref: req.elementId,
      }),
    onAddSourceField: () =>
      openWithCatalogGate('add_nn_outgoing_field', 'add_source_field', {
        station_ref: req.elementId,
      }),
    onAddRelay: () =>
      openWithCatalogGate('add_relay', 'add_relay', {
        element_ref: req.elementId,
      }),
    onAddProtection: () =>
      openWithCatalogGate('add_relay', 'add_protection', {
        element_ref: req.elementId,
      }),
    onAddBreaker: () =>
      handlers.onOpenOperationForm('add_sn_bay', {
        bus_ref: req.elementId,
        bay_kind: 'BREAKER',
      }),
    onAddDisconnector: () =>
      handlers.onOpenOperationForm('add_sn_bay', {
        bus_ref: req.elementId,
        bay_kind: 'DISCONNECTOR',
      }),
    onAddLoad: () =>
      handlers.onOpenOperationForm('update_element_parameters', {
        bus_ref: req.elementId,
        element_type: 'Load',
      }),
    onToggleSwitchState: () =>
      handlers.onOpenOperationForm('update_element_parameters', {
        element_ref: req.elementId,
        element_type: 'Switch',
        field: 'state',
      }),
    onSetNOP: () =>
      handlers.onOpenOperationForm('set_normal_open_point', {
        switch_ref: req.elementId,
      }),
  };
}

/**
 * Mapuje ElementType na kind karty obiektu w networkBuildStore.
 */
function elementTypeToCardKind(elementType: ElementType): string {
  switch (elementType) {
    case 'Source':
      return 'source';
    case 'Station':
      return 'station';
    case 'TransformerBranch':
      return 'transformer';
    case 'LineBranch':
      return 'line_segment';
    case 'Switch':
      return 'switch';
    case 'BaySN':
      return 'bay';
    case 'Generator':
    case 'PVInverter':
    case 'BESSInverter':
      return 'renewable_source';
    default:
      return 'source';
  }
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Buduje pełne menu kontekstowe dla dowolnego elementu ENM.
 *
 * Deleguje do odpowiedniego buildera z actionMenuBuilders.ts,
 * wstrzykując handlery operacji domenowych.
 *
 * @returns Lista akcji menu (ContextMenuAction[]) lub null jeśli brak buildera.
 */
export function buildContextMenuForElement(
  req: ContextMenuRequest,
  handlers: ContextMenuHandlers,
): ContextMenuAction[] | null {
  const h = buildStandardHandlers(req, handlers);

  switch (req.elementType) {
    case 'Source':
      return buildSourceSNContextMenu(req.mode, h);
    case 'Bus':
      return buildBusSNContextMenu(req.mode, h);
    case 'Station':
      return buildStationContextMenu(req.mode, h);
    case 'BaySN':
      return buildBaySNContextMenu(req.mode, h);
    case 'Switch':
      return buildSwitchSNContextMenu(req.mode, undefined, h);
    case 'TransformerBranch':
      return buildTransformerContextMenu(req.mode, h);
    case 'LineBranch':
      return buildSegmentSNContextMenu(req.mode, h);
    case 'BusNN':
      return buildBusNNContextMenu(req.mode, h);
    case 'PVInverter':
      return buildPVInverterContextMenu(req.mode, h);
    case 'BESSInverter':
      return buildBESSInverterContextMenu(req.mode, h);
    case 'Generator':
      return buildPVInverterContextMenu(req.mode, h);
    case 'Load':
    case 'LoadNN':
      return buildLoadNNContextMenu(req.mode, h);
    case 'FeederNN':
      return buildFeederNNContextMenu(req.mode, h);
    case 'SwitchNN':
      return buildSwitchNNContextMenu(req.mode, undefined, h);
    case 'NOP':
      return buildNOPContextMenu(req.mode, h);
    // Note: Terminal requires terminalStatus, but we don't have it here.
    // Skip Terminal in the generic dispatcher; it's handled by SLD with proper context.
    case 'Relay':
      return buildRelaySNContextMenu(req.mode, h);
    case 'Measurement':
      return buildMeasurementSNContextMenu(req.mode, h);
    case 'Genset':
      return buildGensetContextMenu(req.mode, h);
    case 'UPS':
      return buildUPSContextMenu(req.mode, h);
    case 'EnergyMeter':
      return buildEnergyMeterContextMenu(req.mode, h);
    case 'EnergyStorage':
      return buildEnergyStorageContextMenu(req.mode, h);
    case 'SourceFieldNN':
      return buildSourceFieldNNContextMenu(req.mode, h);
    default:
      return null;
  }
}

/**
 * Zwraca etykietę nagłówka menu kontekstowego (PL).
 */
export function getContextMenuTitle(elementType: ElementType, elementName: string): string {
  const typeLabels: Partial<Record<ElementType, string>> = {
    Source: 'Źródło zasilania',
    Bus: 'Szyna SN',
    Station: 'Stacja',
    BaySN: 'Pole SN',
    Switch: 'Łącznik SN',
    TransformerBranch: 'Transformator',
    LineBranch: 'Odcinek linii',
    BusNN: 'Szyna nN',
    PVInverter: 'Falownik PV',
    BESSInverter: 'Falownik BESS',
    Generator: 'Generator',
    Load: 'Obciążenie',
    LoadNN: 'Obciążenie nN',
    FeederNN: 'Obwód odpływowy nN',
    SwitchNN: 'Łącznik nN',
    NOP: 'Punkt normalnie otwarty',
    Relay: 'Przekaźnik',
    Measurement: 'Pomiar',
    Genset: 'Agregat prądotwórczy',
    UPS: 'Zasilacz UPS',
    EnergyMeter: 'Licznik energii',
    EnergyStorage: 'Magazyn energii',
    SourceFieldNN: 'Pole zasilające nN',
    Terminal: 'Terminal',
  };

  const typeLabel = typeLabels[elementType] ?? elementType;
  return `${typeLabel}: ${elementName}`;
}
