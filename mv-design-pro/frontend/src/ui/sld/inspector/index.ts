/**
 * SLD Inspector Module — PR-SLD-07
 *
 * Eksport komponentów i hooków inspektora elementu / połączenia SLD.
 *
 * @example
 * ```tsx
 * import { SldInspectorPanel, useSldInspectorSelection } from './inspector';
 *
 * function MyComponent() {
 *   const { selection, sections } = useSldInspectorSelection();
 *   return <SldInspectorPanel />;
 * }
 * ```
 */

// Główny komponent
export { SldInspectorPanel } from './SldInspectorPanel';
export type { SldInspectorPanelProps } from './SldInspectorPanel';

// Hook selekcji
export { useSldInspectorSelection } from './useSldInspectorSelection';
export type { UseSldInspectorSelectionResult } from './useSldInspectorSelection';

// Typy
export type {
  InspectorSelectionType,
  InspectorElementSelection,
  InspectorConnectionSelection,
  InspectorNoSelection,
  InspectorSelection,
  InspectorPropertySection,
  InspectorPropertyField,
  InspectorDiagnosticData,
  InspectorResultData,
} from './types';

// Etykiety
export {
  ELEMENT_TYPE_LABELS_PL,
  SWITCH_TYPE_LABELS_PL,
  SWITCH_STATE_LABELS_PL,
  CONNECTION_TYPE_LABELS_PL,
  INSPECTOR_SECTION_LABELS_PL,
  DIAGNOSTIC_STATUS_LABELS_PL,
  DATA_SOURCE_LABELS_PL,
  PORT_LABELS_PL,
} from './types';
