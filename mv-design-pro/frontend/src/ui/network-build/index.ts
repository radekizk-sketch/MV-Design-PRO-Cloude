/**
 * Network Build Module — Panel procesowy budowy sieci SN.
 *
 * Zastępuje Wizard K1-K10 panelem procesowym opartym na operacjach domenowych.
 */

export { ProcessPanel } from './ProcessPanel';
export { ProcessBuildPage } from './ProcessBuildPage';
export { OperationFormRouter } from './OperationFormRouter';
export { ReadinessBar } from './ReadinessBar';
export {
  useNetworkBuildStore,
  useNetworkBuildDerived,
  computeBuildPhase,
  buildPhaseLabel,
  selectOpenTerminals,
  selectRingReservedTerminals,
  selectAvailableBranchPorts,
  selectRingCandidates,
  selectStationSummaries,
  selectTransformerSummaries,
  selectOzeSourceSummaries,
  selectBlockersByCategory,
} from './networkBuildStore';

export type {
  BuildPhase,
  ActiveOperationForm,
  ActiveObjectCard,
  NetworkBuildState,
  AvailableBranchPort,
  RingCandidate,
  StationSummary,
  TransformerSummary,
  OzeSourceSummary,
} from './networkBuildStore';
