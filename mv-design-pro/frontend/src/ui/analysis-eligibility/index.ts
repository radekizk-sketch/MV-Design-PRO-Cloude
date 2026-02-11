/**
 * Analysis Eligibility Module — PR-17
 *
 * Public exports for the Analysis Eligibility Matrix UI.
 */

export { AnalysisEligibilityPanel } from './AnalysisEligibilityPanel';
export type { AnalysisEligibilityPanelProps } from './AnalysisEligibilityPanel';
export {
  useAnalysisEligibilityStore,
  useEligibilityMatrix,
  useEligibilityForAnalysis,
  useIsAnalysisEligible,
  useEligibilityOverall,
} from './store';
