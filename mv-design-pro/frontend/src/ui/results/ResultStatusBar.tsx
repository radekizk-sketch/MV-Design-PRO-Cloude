/**
 * ResultStatusBar Component (PowerFactory-grade)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § B.2: Result freshness display
 * - SYSTEM_SPEC.md § 5: Explicit calculation trigger
 *
 * DISPLAYS:
 * - Current result status (NONE/FRESH/OUTDATED)
 * - PF-like status message
 * - [Oblicz] button (explicit calculation trigger)
 *
 * POWERFACTORY PARITY:
 * - NO auto-run on changes
 * - Explicit user action required
 * - Visual feedback per status
 */

import {
  useResultsStore,
  useIsCalculateEnabled,
  useResultStatusMessage,
} from './resultsStore';

interface Props {
  onCalculate: () => void;
  className?: string;
}

/**
 * Status indicator badge styles per result status.
 */
function getStatusStyles(status: 'NONE' | 'FRESH' | 'OUTDATED'): string {
  switch (status) {
    case 'NONE':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    case 'FRESH':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'OUTDATED':
      return 'bg-yellow-100 text-yellow-700 border-yellow-400';
  }
}

/**
 * Status icon per result status.
 */
function StatusIcon({ status }: { status: 'NONE' | 'FRESH' | 'OUTDATED' }) {
  switch (status) {
    case 'NONE':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      );
    case 'FRESH':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    case 'OUTDATED':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
  }
}

export function ResultStatusBar({ onCalculate, className = '' }: Props) {
  const status = useResultsStore((state) => state.status);
  const isCalculating = useResultsStore((state) => state.isCalculating);
  const validationErrors = useResultsStore((state) => state.validationErrors);
  const isCalculateEnabled = useIsCalculateEnabled();
  const { message } = useResultStatusMessage();

  const statusStyles = getStatusStyles(status);

  return (
    <div
      className={`flex items-center justify-between p-2 border rounded ${className}`}
    >
      {/* Status indicator */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded border ${statusStyles}`}>
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{message}</span>
      </div>

      {/* Calculate button */}
      <div className="flex items-center gap-2">
        {validationErrors.length > 0 && (
          <span className="text-xs text-red-600" title={validationErrors.join('\n')}>
            {validationErrors.length} błąd(ów) walidacji
          </span>
        )}
        <button
          onClick={onCalculate}
          disabled={!isCalculateEnabled}
          className={`
            px-4 py-2 rounded font-medium text-sm transition-colors
            ${
              isCalculateEnabled
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          title={
            !isCalculateEnabled
              ? validationErrors.length > 0
                ? 'Popraw błędy walidacji przed obliczeniem'
                : isCalculating
                ? 'Obliczenia w toku...'
                : 'Oblicz zwarcie IEC 60909'
              : 'Oblicz zwarcie IEC 60909'
          }
        >
          {isCalculating ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Obliczam...
            </span>
          ) : (
            'Oblicz'
          )}
        </button>
      </div>
    </div>
  );
}
