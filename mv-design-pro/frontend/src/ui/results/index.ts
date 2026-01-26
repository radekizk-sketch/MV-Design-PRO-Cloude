/**
 * Results Module Exports
 *
 * PowerFactory-grade results lifecycle management.
 */

export {
  useResultsStore,
  useIsOverlayVisible,
  useIsCalculateEnabled,
  useResultStatusMessage,
  useCanEnterResultView,
  type CalculationResult,
} from './resultsStore';

export { ResultStatusBar } from './ResultStatusBar';

export {
  useSafeModeTransition,
  useModelMutation,
  useCanEditTopology,
  useCanEditParameters,
  useIsReadOnly,
  useShouldShowOverlay,
  useOverlayVisibility,
} from './modeGating';
