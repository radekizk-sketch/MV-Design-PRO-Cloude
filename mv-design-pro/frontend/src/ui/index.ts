/**
 * UI Module Exports
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md: UI components follow Wizard specifications
 * - powerfactory_ui_parity.md: PF-style Property Grid and interactions
 * - sld_rules.md: SLD ↔ selection synchronization
 *
 * Components:
 * - PropertyGrid: Element property editor with deterministic field ordering
 * - ContextMenu: Mode-aware context menu with Polish labels
 * - Selection Store: Zustand store for selection state (SLD ↔ Tree ↔ Grid sync)
 */

// Types
export * from './types';

// Selection state management
export {
  useSelectionStore,
  useCanEdit,
  useIsMutationBlocked,
  useModeLabel,
  useResultStatusLabel,
  useSldSelection,
  useTreeSelection,
  useSelectionSync,
  usePropertyGridSelection,
  useContextMenuState,
} from './selection';

// Property Grid
export { PropertyGrid, getFieldDefinitions, SECTION_LABELS, SECTION_ORDER } from './property-grid';

// Context Menu
export {
  ContextMenu,
  buildContextMenuActions,
  buildBusContextMenu,
  buildNetworkModelContextMenu,
  getContextMenuHeader,
} from './context-menu';

// Type Catalog (P8.2)
export {
  TypePicker,
  fetchLineTypes,
  fetchCableTypes,
  fetchTransformerTypes,
  fetchSwitchEquipmentTypes,
  fetchTypesByCategory,
  assignTypeToBranch,
  assignTypeToTransformer,
  assignEquipmentTypeToSwitch,
  clearTypeFromBranch,
  clearTypeFromTransformer,
  clearEquipmentTypeFromSwitch,
} from './catalog';
export type {
  LineType,
  CableType,
  TransformerType,
  SwitchEquipmentType,
  TypeCategory,
  TypeReference,
} from './catalog';
