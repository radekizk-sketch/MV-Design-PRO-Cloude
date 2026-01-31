/**
 * Inspector Module (READ-ONLY Property Grid)
 *
 * Eksportuje komponenty inspektora do przeglądania właściwości elementów
 * w trybie read-only, zgodnie z PowerFactory UI parity.
 *
 * 100% POLISH UI
 */

// Components
export { InspectorPanel, InspectorPanelConnected } from './InspectorPanel';
export { PropertyGrid } from './PropertyGrid';
export { ProtectionSection } from './ProtectionSection';

// Types
export type {
  InspectorSection,
  InspectorField,
  InspectorElementData,
  BusResultData,
  BranchResultData,
  ShortCircuitResultData,
} from './types';

// Constants
export { INSPECTOR_SECTION_LABELS, FLAG_LABELS } from './types';
