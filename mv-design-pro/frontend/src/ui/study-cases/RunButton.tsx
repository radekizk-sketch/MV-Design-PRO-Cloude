/**
 * RunButton — PR-14: Przycisk uruchamiania obliczeń
 *
 * INVARIANTS:
 * - Disabled when readiness.ready === false
 * - Disabled when run is in progress
 * - Disabled when no active study case
 * - 100% PL etykiety
 * - NO physics, NO model mutation
 */

import React from 'react';
import { useIsRunInProgress } from './runStore';
import {
  ANALYSIS_TYPE_LABELS,
  type ExecutionAnalysisType,
} from './types';

interface RunButtonProps {
  /** Whether the network is ready for calculations. */
  readinessReady: boolean;
  /** Analysis type to run. */
  analysisType: ExecutionAnalysisType;
  /** Handler called when the button is clicked. */
  onRun: (analysisType: ExecutionAnalysisType) => void;
  /** Optional additional disabled flag. */
  disabled?: boolean;
}

/**
 * Button to start an execution run.
 * Displays analysis type label in Polish.
 * Disabled when readiness fails or run is in progress.
 */
export const RunButton: React.FC<RunButtonProps> = ({
  readinessReady,
  analysisType,
  onRun,
  disabled = false,
}) => {
  const isInProgress = useIsRunInProgress();
  const isDisabled = !readinessReady || isInProgress || disabled;

  const label = isInProgress
    ? 'Obliczanie...'
    : `Oblicz: ${ANALYSIS_TYPE_LABELS[analysisType]}`;

  const tooltip = !readinessReady
    ? 'Sieć nie jest gotowa do obliczeń'
    : isInProgress
      ? 'Obliczenie w trakcie — proszę czekać'
      : `Uruchom obliczenie: ${ANALYSIS_TYPE_LABELS[analysisType]}`;

  return (
    <button
      type="button"
      onClick={() => onRun(analysisType)}
      disabled={isDisabled}
      title={tooltip}
      className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
        isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
      }`}
    >
      {label}
    </button>
  );
};
