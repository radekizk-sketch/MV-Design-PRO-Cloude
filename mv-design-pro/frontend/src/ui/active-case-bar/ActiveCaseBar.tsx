/**
 * Active Case Bar — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 1.3: Active case awareness bar
 * - powerfactory_ui_parity.md § A.2: Status bar
 *
 * ALWAYS VISIBLE bar showing:
 * - Active case name and type
 * - Result status (NONE / FRESH / OUTDATED)
 * - Action buttons: Change case, Configure, Calculate, Results
 *
 * POLISH UI (100% Polish labels).
 *
 * INVARIANTS:
 * - No active case → [Oblicz] DISABLED with Polish message
 * - Result status colors: NONE=gray, FRESH=green, OUTDATED=amber
 */

import { useCallback } from 'react';
import { clsx } from 'clsx';
import {
  useAppStateStore,
  useActiveCaseName,
  useActiveCaseKind,
  useCaseKindLabel,
  useResultStatusLabel,
  useHasActiveCase,
  useCanCalculate,
} from '../app-state';
import type { ResultStatus } from '../types';
import { UndoRedoButtons } from '../history/UndoRedoButtons';

// =============================================================================
// Status Styling
// =============================================================================

const RESULT_STATUS_COLORS: Record<ResultStatus, string> = {
  NONE: 'text-gray-500 bg-gray-100',
  FRESH: 'text-green-700 bg-green-100',
  OUTDATED: 'text-amber-700 bg-amber-100',
};

const RESULT_STATUS_ICONS: Record<ResultStatus, string> = {
  NONE: '[ ]',
  FRESH: '[OK]',
  OUTDATED: '[!]',
};

// =============================================================================
// Component Props
// =============================================================================

interface ActiveCaseBarProps {
  onChangeCaseClick?: () => void;
  onConfigureClick?: () => void;
  onCalculateClick?: () => void;
  onResultsClick?: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ActiveCaseBar({
  onChangeCaseClick,
  onConfigureClick,
  onCalculateClick,
  onResultsClick,
  className,
}: ActiveCaseBarProps) {
  const caseName = useActiveCaseName();
  const caseKindLabel = useCaseKindLabel();
  const resultStatusLabel = useResultStatusLabel();
  const hasActiveCase = useHasActiveCase();
  const { allowed: canCalculate, reason: calculateBlockedReason } = useCanCalculate();

  const resultStatus = useAppStateStore((state) => state.activeCaseResultStatus);
  const activeMode = useAppStateStore((state) => state.activeMode);
  const toggleCaseManager = useAppStateStore((state) => state.toggleCaseManager);

  const handleChangeCaseClick = useCallback(() => {
    if (onChangeCaseClick) {
      onChangeCaseClick();
    } else {
      toggleCaseManager(true);
    }
  }, [onChangeCaseClick, toggleCaseManager]);

  const handleConfigureClick = useCallback(() => {
    if (onConfigureClick) {
      onConfigureClick();
    }
  }, [onConfigureClick]);

  const handleCalculateClick = useCallback(() => {
    if (onCalculateClick && canCalculate) {
      onCalculateClick();
    }
  }, [onCalculateClick, canCalculate]);

  const handleResultsClick = useCallback(() => {
    if (onResultsClick) {
      onResultsClick();
    }
  }, [onResultsClick]);

  return (
    <div
      data-testid="active-case-bar"
      className={clsx(
        'flex items-center justify-between px-4 py-2',
        'bg-white border-b border-gray-200 shadow-sm',
        'select-none',
        className
      )}
    >
      {/* Left: Case Info */}
      <div className="flex items-center gap-4">
        {/* Case Name */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            Aktywny przypadek:
          </span>
          {hasActiveCase ? (
            <span className="text-sm font-semibold text-gray-900">
              {caseName || '(bez nazwy)'}
            </span>
          ) : (
            <span className="text-sm italic text-gray-400">
              Nie wybrano
            </span>
          )}
        </div>

        {/* Case Type */}
        {hasActiveCase && caseKindLabel && (
          <>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Typ:</span>
              <span className="text-xs font-medium text-gray-700">
                {caseKindLabel}
              </span>
            </div>
          </>
        )}

        {/* Result Status */}
        {hasActiveCase && (
          <>
            <span className="text-gray-300">|</span>
            <div
              data-testid="result-status"
              className={clsx(
                'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
                RESULT_STATUS_COLORS[resultStatus]
              )}
              title={resultStatusLabel}
            >
              <span>{RESULT_STATUS_ICONS[resultStatus]}</span>
              <span>{resultStatusLabel}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Change Case Button */}
        <button
          data-testid="btn-change-case"
          onClick={handleChangeCaseClick}
          className={clsx(
            'px-3 py-1.5 text-sm rounded',
            'bg-gray-100 hover:bg-gray-200 text-gray-700',
            'transition-colors'
          )}
        >
          Zmień przypadek
        </button>

        {/* Configure Button */}
        <button
          data-testid="btn-configure"
          onClick={handleConfigureClick}
          disabled={!hasActiveCase}
          className={clsx(
            'px-3 py-1.5 text-sm rounded transition-colors',
            hasActiveCase
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          )}
          title={
            !hasActiveCase
              ? 'Wybierz przypadek, aby skonfigurować'
              : 'Konfiguruj parametry przypadku'
          }
        >
          Konfiguruj
        </button>

        {/* Calculate Button */}
        <button
          data-testid="btn-calculate"
          onClick={handleCalculateClick}
          disabled={!canCalculate}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded transition-colors',
            canCalculate
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
          title={calculateBlockedReason || 'Uruchom obliczenia'}
        >
          Oblicz
        </button>

        {/* Results Button */}
        <button
          data-testid="btn-results"
          onClick={handleResultsClick}
          disabled={!hasActiveCase || resultStatus === 'NONE'}
          className={clsx(
            'px-3 py-1.5 text-sm rounded transition-colors',
            hasActiveCase && resultStatus !== 'NONE'
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          )}
          title={
            !hasActiveCase
              ? 'Wybierz przypadek, aby zobaczyć wyniki'
              : resultStatus === 'NONE'
                ? 'Brak wyników — uruchom obliczenia'
                : 'Przeglądaj wyniki'
          }
        >
          Wyniki
        </button>

        {/* UNDO/REDO Buttons — P30a */}
        <div className="ml-2 pl-2 border-l border-gray-200">
          <UndoRedoButtons />
        </div>

        {/* Mode Indicator */}
        <div className="ml-2 pl-2 border-l border-gray-200">
          <ModeIndicator mode={activeMode} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mode Indicator Sub-component
// =============================================================================

interface ModeIndicatorProps {
  mode: 'MODEL_EDIT' | 'CASE_CONFIG' | 'RESULT_VIEW';
}

function ModeIndicator({ mode }: ModeIndicatorProps) {
  const config = {
    MODEL_EDIT: {
      label: 'Edycja modelu',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      icon: '[E]',
    },
    CASE_CONFIG: {
      label: 'Konfiguracja',
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      icon: '[C]',
    },
    RESULT_VIEW: {
      label: 'Wyniki',
      color: 'text-green-700 bg-green-50 border-green-200',
      icon: '[R]',
    },
  };

  const { label, color, icon } = config[mode];

  return (
    <div
      data-testid="mode-indicator"
      data-mode={mode}
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium',
        color
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default ActiveCaseBar;
