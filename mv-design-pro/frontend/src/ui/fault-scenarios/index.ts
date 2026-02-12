/**
 * Fault Scenarios Module — PR-19
 *
 * Public exports for fault scenario management.
 */

export { FaultScenarioPanel } from './FaultScenarioPanel';
export { FaultLocationSelector } from './FaultLocationSelector';
export { ScenarioList } from './ScenarioList';
export { CreateScenarioModal } from './CreateScenarioModal';
export { useFaultScenarioStore } from './store';
export type {
  FaultScenario,
  FaultType,
  FaultLocation,
  LocationType,
  ShortCircuitConfig,
  CreateFaultScenarioRequest,
} from './types';
export {
  FAULT_TYPE_LABELS,
  LOCATION_TYPE_LABELS,
  FAULT_TYPE_COLORS,
  FAULT_TYPE_BG_COLORS,
} from './types';
