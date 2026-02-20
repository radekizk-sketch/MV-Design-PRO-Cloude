/**
 * Engineering Context Menu — §2 UX 10/10
 *
 * Warstwa CDSE-integrowanego menu kontekstowego.
 * Jedyny punkt wejścia dla operacji SLD z prawego kliknięcia.
 *
 * Pipeline:
 *   rightClick → resolveElementType → selectBuilder → filterByMode → render
 *
 * INVARIANTS:
 * - Zero logiki biznesowej — tylko routing
 * - Operacje nielegalne UKRYTE (nie zablokowane)
 * - Każda operacja mapowana na canonical operation (backend)
 * - 100% Polish labels
 * - Deterministic action ordering
 */

import { useCallback, useMemo } from 'react';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuAction, ElementType, OperatingMode, SwitchState } from '../types';
import {
  buildSourceSNContextMenu,
  buildBusSNContextMenu,
  buildStationContextMenu,
  buildBaySNContextMenu,
  buildSwitchSNContextMenu,
  buildTransformerContextMenu,
  buildBusNNContextMenu,
  buildFeederNNContextMenu,
  buildSourceFieldNNContextMenu,
  buildPVInverterContextMenu,
  buildBESSInverterContextMenu,
  buildGensetContextMenu,
  buildUPSContextMenu,
  buildLoadNNContextMenu,
  buildEnergyMeterContextMenu,
  buildSwitchNNContextMenu,
  buildSegmentSNContextMenu,
  buildRelaySNContextMenu,
  buildMeasurementSNContextMenu,
  buildNOPContextMenu,
  buildEnergyStorageContextMenu,
  buildTerminalSNContextMenu,
  buildStudyCaseContextMenu,
  buildAnalysisResultContextMenu,
} from './actionMenuBuilders';

// =============================================================================
// Types
// =============================================================================

export interface EngineeringContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  elementId: string;
  elementType: ElementType;
  elementName: string;
  switchState?: SwitchState;
  terminalStatus?: 'OTWARTY' | 'ZAJETY' | 'ZAREZERWOWANY_DLA_RINGU';
  caseStatus?: 'NONE' | 'FRESH' | 'OUTDATED';
  resultType?: 'SHORT_CIRCUIT' | 'POWER_FLOW' | 'TIME_SERIES';
}

export interface EngineeringContextMenuProps {
  state: EngineeringContextMenuState;
  mode: OperatingMode;
  onClose: () => void;
  onOperation: (operationId: string, elementId: string, elementType: ElementType) => void;
}

// =============================================================================
// Builder Registry — deterministic element type → builder mapping
// =============================================================================

type ActionBuilder = (
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined>,
) => ContextMenuAction[];

/**
 * Rejestr budujący menu kontekstowe per typ elementu.
 * Deterministic: każdy typ ma dokładnie jeden builder.
 */
const BUILDER_REGISTRY: Partial<Record<ElementType, ActionBuilder>> = {
  Source: (m, h) => buildSourceSNContextMenu(m, h),
  Bus: (m, h) => buildBusSNContextMenu(m, h),
  Station: (m, h) => buildStationContextMenu(m, h),
  BaySN: (m, h) => buildBaySNContextMenu(m, h),
  TransformerBranch: (m, h) => buildTransformerContextMenu(m, h),
  BusNN: (m, h) => buildBusNNContextMenu(m, h),
  FeederNN: (m, h) => buildFeederNNContextMenu(m, h),
  SourceFieldNN: (m, h) => buildSourceFieldNNContextMenu(m, h),
  PVInverter: (m, h) => buildPVInverterContextMenu(m, h),
  BESSInverter: (m, h) => buildBESSInverterContextMenu(m, h),
  Genset: (m, h) => buildGensetContextMenu(m, h),
  UPS: (m, h) => buildUPSContextMenu(m, h),
  LoadNN: (m, h) => buildLoadNNContextMenu(m, h),
  EnergyMeter: (m, h) => buildEnergyMeterContextMenu(m, h),
  EnergyStorage: (m, h) => buildEnergyStorageContextMenu(m, h),
  LineBranch: (m, h) => buildSegmentSNContextMenu(m, h),
  Relay: (m, h) => buildRelaySNContextMenu(m, h),
  Measurement: (m, h) => buildMeasurementSNContextMenu(m, h),
  NOP: (m, h) => buildNOPContextMenu(m, h),
};

// Switch builders require extra state
const SWITCH_BUILDERS: Partial<
  Record<
    ElementType,
    (
      mode: OperatingMode,
      state: SwitchState | undefined,
      handlers: Record<string, (() => void) | undefined>,
    ) => ContextMenuAction[]
  >
> = {
  Switch: (m, s, h) => buildSwitchSNContextMenu(m, s, h),
  SwitchNN: (m, s, h) => buildSwitchNNContextMenu(m, s, h),
};

// =============================================================================
// Component
// =============================================================================

/**
 * EngineeringContextMenu — centralny komponent menu kontekstowego SLD.
 *
 * Automatycznie dobiera builder per elementType.
 * Generuje handlery które wywołują onOperation z operationId.
 */
export function EngineeringContextMenu({
  state,
  mode,
  onClose,
  onOperation,
}: EngineeringContextMenuProps) {
  const { isOpen, x, y, elementId, elementType, elementName, switchState } = state;

  // Generuj handlery (każda akcja → onOperation callback)
  const makeHandler = useCallback(
    (operationId: string) => () => {
      onOperation(operationId, elementId, elementType);
    },
    [onOperation, elementId, elementType],
  );

  // Zbuduj proxy handlerów (Proxy-based to cover all possible handler keys)
  const handlers = useMemo(() => {
    return new Proxy<Record<string, () => void>>(
      {},
      {
        get(_target, prop: string) {
          // Convert handler name to operation ID
          // e.g., "onInsertStationA" → "insert_station_a"
          // e.g., "onProperties" → "properties"
          const opId = prop
            .replace(/^on/, '')
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '');
          return makeHandler(opId);
        },
      },
    );
  }, [makeHandler]);

  // Zbuduj akcje per elementType
  const actions = useMemo((): ContextMenuAction[] => {
    // Switch types have extra state
    const switchBuilder = SWITCH_BUILDERS[elementType];
    if (switchBuilder) {
      return switchBuilder(mode, switchState, handlers);
    }

    // Terminal has extra terminal status
    if (elementType === 'Terminal') {
      return buildTerminalSNContextMenu(mode, state.terminalStatus, handlers);
    }

    // StudyCase / AnalysisResult special builders
    if (elementType === ('StudyCase' as ElementType)) {
      return buildStudyCaseContextMenu(mode, state.caseStatus, handlers);
    }
    if (elementType === ('AnalysisResult' as ElementType)) {
      return buildAnalysisResultContextMenu(mode, state.resultType, handlers);
    }

    // Standard builder from registry
    const builder = BUILDER_REGISTRY[elementType];
    if (builder) {
      return builder(mode, handlers);
    }

    // Fallback: minimal menu for unknown types
    return [
      {
        id: 'properties',
        label: 'Właściwości...',
        enabled: true,
        visible: true,
        handler: makeHandler('properties'),
      },
      { id: 'sep1', label: '', enabled: false, visible: true, separator: true },
      {
        id: 'show_tree',
        label: 'Zaznacz w drzewie',
        enabled: true,
        visible: true,
        handler: makeHandler('show_tree'),
      },
      {
        id: 'show_diagram',
        label: 'Pokaż na schemacie',
        enabled: true,
        visible: true,
        handler: makeHandler('show_diagram'),
      },
    ];
  }, [elementType, mode, switchState, handlers, makeHandler, state.terminalStatus, state.caseStatus, state.resultType]);

  // Filtruj niewidoczne operacje
  const visibleActions = useMemo(
    () => actions.filter((a) => a.visible),
    [actions],
  );

  return (
    <ContextMenu
      isOpen={isOpen}
      x={x}
      y={y}
      elementType={elementType}
      elementName={elementName}
      mode={mode}
      actions={visibleActions}
      onClose={onClose}
    />
  );
}

export default EngineeringContextMenu;
