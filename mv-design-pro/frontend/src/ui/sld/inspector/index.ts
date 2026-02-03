/**
 * SLD Inspector Module — PR-SLD-07 + PR-SLD-08
 *
 * Eksport komponentów i hooków inspektora elementu / połączenia SLD.
 * PR-SLD-08: Dodany moduł porównania (compare)
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

// =============================================================================
// PR-SLD-08: Moduł porównania
// =============================================================================

// Komponent porównania
export { SldInspectorComparePanel } from './compare';
export type { SldInspectorComparePanelProps } from './compare';

// Hook porównania
export { useSldCompareSelection } from './compare';

// Narzędzia porównania
export {
  compareValues,
  compareSections,
  compareAllSections,
  sortElementsForCompare,
  countTotalDifferences,
  areAllFieldsEqual,
  isDifferent,
  formatValue,
  getDifferenceLabel,
} from './compare';

// Typy porównania
export type {
  CompareElement,
  CompareConnection,
  CompareSelection,
  CompareConnectionSelection,
  FieldDiffStatus,
  ComparePropertyField,
  ComparePropertySection,
  CompareSelectionType,
  UseSldCompareSelectionResult,
} from './compare';

// Etykiety porównania
export { COMPARE_LABELS_PL, COMPARE_SECTION_LABELS_PL } from './compare';
