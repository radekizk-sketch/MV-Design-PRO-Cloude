/**
 * Pasek stanu — PowerFactory/ETAP Style Bottom Bar
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § B: Pasek stanu zawsze widoczny
 * - wizard_screens.md § 1.4: Informacje kontekstowe
 *
 * ALWAYS VISIBLE bar showing:
 * - Tryb pracy (Edycja / Konfiguracja / Wyniki)
 * - Aktywny projekt
 * - Aktywny przypadek + stan wyników
 * - Status walidacji
 * - Statystyki sieci
 *
 * INVARIANTS:
 * - Pasek stanu ZAWSZE renderowany, niezależnie od stanu aplikacji
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
// Status Styling — Industrial Grade
// =============================================================================

const MODE_STYLES: Record<OperatingMode, string> = {
  MODEL_EDIT: 'bg-ind-600 text-white',
  CASE_CONFIG: 'bg-purple-600 text-white',
  RESULT_VIEW: 'bg-status-ok text-white',
};

const RESULT_DOT_STYLES: Record<ResultStatus, string> = {
  NONE: 'ind-dot-none',
  FRESH: 'ind-dot-ok',
  OUTDATED: 'ind-dot-warn',
};

const RESULT_TEXT_STYLES: Record<ResultStatus, string> = {
  NONE: 'text-chrome-400',
  FRESH: 'text-emerald-400',
  OUTDATED: 'text-amber-400',
};

// =============================================================================
// Component Props
// =============================================================================

interface StatusBarProps {
  validationStatus?: 'valid' | 'warnings' | 'errors' | null;
  validationWarnings?: number;
  validationErrors?: number;
  networkStats?: {
    nodeCount?: number;
    branchCount?: number;
  };
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function StatusBar({
  validationStatus,
  validationWarnings = 0,
  validationErrors = 0,
  networkStats,
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

  // Abbreviate snapshot ID for display
  const snapshotDisplay = snapshotId
    ? snapshotId.length > 8
      ? `${snapshotId.substring(0, 8)}...`
      : snapshotId
    : null;

  // Determine background color based on state
  const bgStyle = !projectId
    ? 'bg-amber-900 border-amber-700'  // Brak projektu
    : !caseId
      ? 'bg-ind-900 border-ind-700'     // Brak przypadku
      : 'bg-chrome-800 border-chrome-700'; // Stan normalny

  return (
    <div
      data-testid="status-bar"
      className={clsx(
        'flex items-center justify-between h-7 px-4',
        'text-white text-[11px]',
        'border-t',
        'select-none',
        bgStyle,
        className
      )}
    >
      {/* Lewa sekcja: Tryb + Projekt + Przypadek */}
      <div className="flex items-center gap-3">
        {/* Wskaźnik trybu */}
        <div
          data-testid="status-bar-mode"
          data-mode={activeMode}
          className={clsx(
            'flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
            MODE_STYLES[activeMode]
          )}
        >
          <span>{modeLabel}</span>
        </div>

        <span className="text-chrome-600">|</span>

        {/* Projekt */}
        <div className="flex items-center gap-1.5" data-testid="status-bar-project">
          <span className="text-chrome-400">Projekt:</span>
          {projectId ? (
            <span className="text-white font-medium">
              {projectName || projectId.substring(0, 8)}
            </span>
          ) : (
            <span className="text-amber-300 font-medium">Nie utworzono</span>
          )}
        </div>

        <span className="text-chrome-600">|</span>

        {/* Przypadek */}
        <div className="flex items-center gap-1.5" data-testid="status-bar-case">
          <span className="text-chrome-400">Przypadek:</span>
          {caseId ? (
            <>
              <span className="text-white font-medium">{caseName || 'Bez nazwy'}</span>
              <span className={RESULT_DOT_STYLES[resultStatus]} title={resultStatusLabel} />
            </>
          ) : (
            <span className="text-chrome-500 italic">Nie wybrano</span>
          )}
        </div>

        {/* Typ analizy (tylko w trybie wyników) */}
        {activeMode === 'RESULT_VIEW' && analysisTypeLabel && (
          <>
            <span className="text-chrome-600">|</span>
            <div className="flex items-center gap-1.5" data-testid="status-bar-analysis">
              <span className="text-chrome-400">Analiza:</span>
              <span className="text-white">{analysisTypeLabel}</span>
            </div>
          </>
        )}
      </div>

      {/* Prawa sekcja: Snapshot + Walidacja + Stan wyników */}
      <div className="flex items-center gap-3">
        {/* Snapshot */}
        {snapshotDisplay && (
          <div className="flex items-center gap-1.5" data-testid="status-bar-snapshot">
            <span className="text-chrome-400">Snapshot:</span>
            <span className="text-chrome-300 font-mono text-[10px]">{snapshotDisplay}</span>
          </div>
        )}

        {/* Status walidacji */}
        {validationStatus && (
          <>
            <span className="text-chrome-600">|</span>
            <div className="flex items-center gap-1.5" data-testid="status-bar-validation">
              {validationStatus === 'valid' && (
                <>
                  <span className="ind-dot-ok" />
                  <span className="text-emerald-400">Model prawidłowy</span>
                </>
              )}
              {validationStatus === 'warnings' && (
                <>
                  <span className="ind-dot-warn" />
                  <span className="text-amber-400">
                    {validationWarnings} {validationWarnings === 1 ? 'ostrzeżenie' : 'ostrzeżeń'}
                  </span>
                </>
              )}
              {validationStatus === 'errors' && (
                <>
                  <span className="ind-dot-error" />
                  <span className="text-red-400">
                    {validationErrors} {validationErrors === 1 ? 'błąd' : 'błędów'}
                  </span>
                </>
              )}
            </div>
          </>
        )}

        {/* Stan wyników */}
        {caseId && (
          <>
            <span className="text-chrome-600">|</span>
            <div
              className={clsx('flex items-center gap-1.5', RESULT_TEXT_STYLES[resultStatus])}
              data-testid="status-bar-result-status"
            >
              <span>{resultStatusLabel}</span>
            </div>
          </>
        )}

        {/* Statystyki sieci */}
        {networkStats && (networkStats.nodeCount !== undefined || networkStats.branchCount !== undefined) && (
          <>
            <span className="text-chrome-600">|</span>
            <div className="flex items-center gap-3 text-chrome-300" data-testid="status-bar-network-stats">
              {networkStats.nodeCount !== undefined && (
                <span>Węzły: <span className="font-medium text-white">{networkStats.nodeCount}</span></span>
              )}
              {networkStats.branchCount !== undefined && (
                <span>Gałęzie: <span className="font-medium text-white">{networkStats.branchCount}</span></span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StatusBar;
