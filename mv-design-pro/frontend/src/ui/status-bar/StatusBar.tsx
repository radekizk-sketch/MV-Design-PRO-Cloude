/**
 * Status Bar — PowerFactory/ETAP Style Bottom Bar
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § B: Status bar zawsze widoczny
 * - wizard_screens.md § 1.4: Informacje kontekstowe
 *
 * ALWAYS VISIBLE bar showing:
 * - Operating mode (Edycja / Przypadek / Wyniki)
 * - Active project name
 * - Active case name
 * - Active snapshot ID (abbreviated)
 * - Validation status (if available)
 *
 * INVARIANTS:
 * - StatusBar ZAWSZE renderowany, niezależnie od stanu aplikacji
 * - Brak danych = wyświetl "—" lub komunikat informacyjny
 * - 100% Polish UI
 */

import { clsx } from 'clsx';
import {
  useAppStateStore,
  useActiveMode,
  useActiveModeLabel,
  useActiveProjectId,
  useActiveCaseId,
  useActiveCaseName,
  useActiveSnapshotId,
  useActiveAnalysisTypeLabel,
  useResultStatusLabel,
} from '../app-state';
import type { OperatingMode, ResultStatus } from '../types';

// =============================================================================
// Status Styling
// =============================================================================

const MODE_STYLES: Record<OperatingMode, { bg: string; text: string; icon: string }> = {
  MODEL_EDIT: {
    bg: 'bg-blue-600',
    text: 'text-white',
    icon: '✏️',
  },
  CASE_CONFIG: {
    bg: 'bg-purple-600',
    text: 'text-white',
    icon: '⚙️',
  },
  RESULT_VIEW: {
    bg: 'bg-green-600',
    text: 'text-white',
    icon: '📊',
  },
};

const RESULT_STATUS_STYLES: Record<ResultStatus, { dot: string; text: string }> = {
  NONE: { dot: 'bg-gray-400', text: 'text-gray-500' },
  FRESH: { dot: 'bg-green-500', text: 'text-green-600' },
  OUTDATED: { dot: 'bg-amber-500', text: 'text-amber-600' },
};

// =============================================================================
// Component Props
// =============================================================================

interface StatusBarProps {
  /**
   * Optional validation status (e.g., from NetworkValidator).
   */
  validationStatus?: 'valid' | 'warnings' | 'errors' | null;

  /**
   * Number of validation warnings (if any).
   */
  validationWarnings?: number;

  /**
   * Number of validation errors (if any).
   */
  validationErrors?: number;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function StatusBar({
  validationStatus,
  validationWarnings = 0,
  validationErrors = 0,
  className,
}: StatusBarProps) {
  const activeMode = useActiveMode();
  const modeLabel = useActiveModeLabel();
  const projectId = useActiveProjectId();
  const projectName = useAppStateStore((state) => state.activeProjectName);
  const caseId = useActiveCaseId();
  const caseName = useActiveCaseName();
  const snapshotId = useActiveSnapshotId();
  const analysisTypeLabel = useActiveAnalysisTypeLabel();
  const resultStatusLabel = useResultStatusLabel();
  const resultStatus = useAppStateStore((state) => state.activeCaseResultStatus);

  const modeStyle = MODE_STYLES[activeMode];
  const resultStyle = RESULT_STATUS_STYLES[resultStatus];

  // Abbreviate snapshot ID for display
  const snapshotDisplay = snapshotId
    ? snapshotId.length > 8
      ? `${snapshotId.substring(0, 8)}...`
      : snapshotId
    : null;

  return (
    <div
      data-testid="status-bar"
      className={clsx(
        'flex items-center justify-between h-7 px-4',
        'bg-gray-800 text-white text-xs',
        'border-t border-gray-700',
        'select-none',
        className
      )}
    >
      {/* Left Section: Mode Indicator */}
      <div className="flex items-center gap-4">
        {/* Mode Badge */}
        <div
          data-testid="status-bar-mode"
          data-mode={activeMode}
          className={clsx(
            'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
            modeStyle.bg,
            modeStyle.text
          )}
        >
          <span>{modeStyle.icon}</span>
          <span>{modeLabel}</span>
        </div>

        {/* Separator */}
        <span className="text-gray-600">|</span>

        {/* Project */}
        <div className="flex items-center gap-2" data-testid="status-bar-project">
          <span className="text-gray-400">Projekt:</span>
          {projectId ? (
            <span className="text-white font-medium">
              {projectName || projectId.substring(0, 8)}
            </span>
          ) : (
            <span className="text-gray-500 italic">Brak</span>
          )}
        </div>

        {/* Separator */}
        <span className="text-gray-600">|</span>

        {/* Case */}
        <div className="flex items-center gap-2" data-testid="status-bar-case">
          <span className="text-gray-400">Przypadek:</span>
          {caseId ? (
            <>
              <span className="text-white font-medium">{caseName || 'Bez nazwy'}</span>
              {/* Result Status Dot */}
              <span
                className={clsx('w-2 h-2 rounded-full', resultStyle.dot)}
                title={resultStatusLabel}
              />
            </>
          ) : (
            <span className="text-gray-500 italic">Nie wybrano</span>
          )}
        </div>

        {/* Analysis Type (if in results mode) */}
        {activeMode === 'RESULT_VIEW' && analysisTypeLabel && (
          <>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2" data-testid="status-bar-analysis">
              <span className="text-gray-400">Analiza:</span>
              <span className="text-white">{analysisTypeLabel}</span>
            </div>
          </>
        )}
      </div>

      {/* Right Section: Snapshot & Validation */}
      <div className="flex items-center gap-4">
        {/* Snapshot */}
        {snapshotDisplay && (
          <div className="flex items-center gap-2" data-testid="status-bar-snapshot">
            <span className="text-gray-400">Snapshot:</span>
            <span className="text-gray-300 font-mono text-xs">{snapshotDisplay}</span>
          </div>
        )}

        {/* Validation Status */}
        {validationStatus && (
          <>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2" data-testid="status-bar-validation">
              {validationStatus === 'valid' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-400">Model prawidłowy</span>
                </>
              )}
              {validationStatus === 'warnings' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-400">
                    {validationWarnings} {validationWarnings === 1 ? 'ostrzeżenie' : 'ostrzeżeń'}
                  </span>
                </>
              )}
              {validationStatus === 'errors' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-400">
                    {validationErrors} {validationErrors === 1 ? 'błąd' : 'błędów'}
                  </span>
                </>
              )}
            </div>
          </>
        )}

        {/* Result Status (if case active) */}
        {caseId && (
          <>
            <span className="text-gray-600">|</span>
            <div
              className={clsx('flex items-center gap-1.5', resultStyle.text)}
              data-testid="status-bar-result-status"
            >
              <span>{resultStatusLabel}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StatusBar;
