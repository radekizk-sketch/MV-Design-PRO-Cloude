/**
 * CDSE — Context-Driven SLD Engine
 *
 * Single entry point for all SLD operational interactions.
 * Routes clicks → resolves context → dispatches modals → executes operations.
 *
 * Architecture:
 *   SLD Click → contextResolver → sldEventRouter → modalDispatcher
 *     → operationExecutor → selectionSync + readinessSync + overlayUpdater
 *
 * INVARIANTS:
 * - Snapshot is the single source of truth
 * - LogicalViews = pure function of Snapshot
 * - SLD = pure function of (Snapshot + LogicalViews)
 * - No local graph state
 * - Every operation generates a new Snapshot
 * - Deterministic ID required
 * - Every element must have CatalogBinding
 */

// Context resolution
export { resolveContext } from './contextResolver';
export type {
  CdseContextType,
  CdseResolvedContext,
  LogicalViewsProjection,
} from './contextResolver';

// Event routing
export { routeSldClick, routeSldDoubleClick } from './sldEventRouter';
export type { SldClickEvent, RouteResult } from './sldEventRouter';

// Modal dispatch
export { dispatchModal, getAllModalMappings } from './modalDispatcher';
export type { CdseModalId, ModalDispatchTarget } from './modalDispatcher';

// Operation execution
export { executeOperation, validatePayload } from './operationExecutor';
export type {
  DomainOpPayload,
  DomainOpResponse,
  ExecutionResult,
  ExecutionCallbacks,
} from './operationExecutor';

// Selection sync
export {
  applySelectionHint,
  applyClickSelection,
  clearSelection,
  createEmptySelection,
  selectionToUrlParams,
  selectionFromUrlParams,
} from './selectionSync';
export type { SelectionHint, SelectionState } from './selectionSync';

// Overlay updater
export {
  createInitialOverlayState,
  invalidateOverlay,
  applyOverlay,
  clearOverlay,
  toggleOverlay,
  needsRefresh,
  emptyConsequencePreview,
} from './overlayUpdater';
export type {
  OverlayState,
  OverlayConsequencePreview,
} from './overlayUpdater';

// Readiness sync
export {
  createInitialReadiness,
  syncFromResponse,
  getFixAction,
  hasReadinessIssue,
} from './readinessSync';
export type {
  ReadinessBlocker,
  ReadinessFixAction,
  ReadinessState,
} from './readinessSync';

// Catalog preview
export {
  buildCatalogPreview,
  formatPreviewValue,
} from './catalogPreviewEngine';
export type {
  CatalogPreview,
  CatalogPreviewField,
  MaterializationContractDef,
} from './catalogPreviewEngine';
