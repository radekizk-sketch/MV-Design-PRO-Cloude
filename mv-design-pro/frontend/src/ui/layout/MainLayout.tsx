/**
 * Main Layout — P12a Data Manager Parity
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 2.1: Main window structure
 * - wizard_screens.md § 1.3: Active case bar (always visible)
 *
 * Layout with:
 * - Active Case Bar (top, always visible)
 * - Main content area
 * - Case Manager panel (slide-in)
 */

import { type ReactNode, useCallback } from 'react';
import { clsx } from 'clsx';
import { ActiveCaseBar } from '../active-case-bar';
import { CaseManager } from '../case-manager';
import { IssuePanelContainer } from '../issue-panel';
import { useAppStateStore, useCaseManagerOpen, useIssuePanelOpen, useActiveCaseId } from '../app-state';

// =============================================================================
// Types
// =============================================================================

interface MainLayoutProps {
  children: ReactNode;
  onCalculate?: () => void;
  onViewResults?: () => void;
  showCaseBar?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function MainLayout({
  children,
  onCalculate,
  onViewResults,
  showCaseBar = true,
}: MainLayoutProps) {
  const caseManagerOpen = useCaseManagerOpen();
  const issuePanelOpen = useIssuePanelOpen();
  const activeCaseId = useActiveCaseId();
  const toggleCaseManager = useAppStateStore((state) => state.toggleCaseManager);
  const toggleIssuePanel = useAppStateStore((state) => state.toggleIssuePanel);
  const setActiveMode = useAppStateStore((state) => state.setActiveMode);

  const handleChangeCaseClick = useCallback(() => {
    toggleCaseManager(true);
  }, [toggleCaseManager]);

  const handleConfigureClick = useCallback(() => {
    setActiveMode('CASE_CONFIG');
    toggleCaseManager(true);
  }, [setActiveMode, toggleCaseManager]);

  const handleCalculateClick = useCallback(() => {
    if (onCalculate) {
      onCalculate();
    }
  }, [onCalculate]);

  const handleResultsClick = useCallback(() => {
    setActiveMode('RESULT_VIEW');
    if (onViewResults) {
      onViewResults();
    }
  }, [setActiveMode, onViewResults]);

  const handleCaseManagerClose = useCallback(() => {
    toggleCaseManager(false);
  }, [toggleCaseManager]);

  const handleIssuePanelToggle = useCallback(() => {
    toggleIssuePanel();
  }, [toggleIssuePanel]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Active Case Bar (always visible) */}
      {showCaseBar && (
        <ActiveCaseBar
          onChangeCaseClick={handleChangeCaseClick}
          onConfigureClick={handleConfigureClick}
          onCalculateClick={handleCalculateClick}
          onResultsClick={handleResultsClick}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Content */}
        <div className="flex-1 overflow-auto">{children}</div>

        {/* P30d: Issue Panel (right sidebar) */}
        {issuePanelOpen && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-hidden">
            <IssuePanelContainer caseId={activeCaseId} />
          </div>
        )}

        {/* Case Manager Panel (slide-in from right) */}
        <CaseManagerPanel
          open={caseManagerOpen}
          onClose={handleCaseManagerClose}
          onCalculate={onCalculate}
          onViewResults={onViewResults}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Case Manager Panel Sub-component
// =============================================================================

interface CaseManagerPanelProps {
  open: boolean;
  onClose: () => void;
  onCalculate?: () => void;
  onViewResults?: () => void;
}

function CaseManagerPanel({
  open,
  onClose,
  onCalculate,
  onViewResults,
}: CaseManagerPanelProps) {
  const handleCaseSelected = useCallback(
    (_caseId: string) => {
      // Case selection is handled in CaseManager
    },
    []
  );

  const handleCalculate = useCallback(
    (_caseId: string) => {
      onClose();
      if (onCalculate) {
        onCalculate();
      }
    },
    [onClose, onCalculate]
  );

  const handleViewResults = useCallback(
    (_caseId: string) => {
      onClose();
      if (onViewResults) {
        onViewResults();
      }
    },
    [onClose, onViewResults]
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 bg-black/20 z-20"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={clsx(
          'absolute top-0 right-0 h-full w-[480px] bg-white shadow-xl z-30',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {open && (
          <CaseManager
            onClose={onClose}
            onCaseSelected={handleCaseSelected}
            onCalculate={handleCalculate}
            onViewResults={handleViewResults}
          />
        )}
      </div>
    </>
  );
}

export default MainLayout;
