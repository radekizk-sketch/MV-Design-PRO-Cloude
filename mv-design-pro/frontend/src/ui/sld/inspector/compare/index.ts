/**
 * SLD Inspector Compare Module — PR-SLD-08
 *
 * Eksport komponentów i hooków trybu porównania inspektora SLD.
 *
 * @example
 * ```tsx
 * import {
 *   SldInspectorComparePanel,
 *   useSldCompareSelection,
 * } from './compare';
 *
 * function MyComponent() {
 *   const { isCompareMode, compareSections } = useSldCompareSelection();
 *   return isCompareMode ? <SldInspectorComparePanel /> : <SingleInspector />;
 * }
 * ```
 */

// Główny komponent
export { SldInspectorComparePanel } from './SldInspectorComparePanel';
export type { SldInspectorComparePanelProps } from './SldInspectorComparePanel';

// Hook selekcji porównania
export { useSldCompareSelection } from './useSldCompareSelection';

// Narzędzia porównania
export {
  compareValues,
  compareSections,
  compareAllSections,
  sortElementsForCompare,
  countTotalDifferences,
  areAllFieldsEqual,
  isDifferent,
  formatNumber,
  formatBoolean,
  formatValue,
  getDifferenceLabel,
} from './compareUtils';

// Typy
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
} from './types';

// Etykiety
export { COMPARE_LABELS_PL, COMPARE_SECTION_LABELS_PL } from './types';
