/**
 * TraceViewer — Główny widok śladu obliczeń (3-panelowy układ)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: 3-panelowy układ (TOC | Content | Metadata)
 * - wizard_screens.md: RESULT_VIEW mode, Polish labels
 * - SYSTEM_SPEC.md: READ-ONLY result display
 *
 * LAYOUT:
 * - Lewy panel: Spis treści (TraceToc) - nawigacja po krokach
 * - Środkowy panel: Treść kroku (TraceStepView) - wzór, dane, wynik
 * - Prawy panel: Metadane (TraceMetadataPanel) - kontekst, statystyki
 *
 * FEATURES:
 * - Wyszukiwanie pełnotekstowe (client-side, deterministyczne)
 * - Filtry po fazie i "tylko problemy"
 * - Nawigacja wyników (prev/next)
 * - Deterministyczne sortowanie kroków
 * - 100% Polish UI
 *
 * NOTE: Nazwy kodowe (P11, P14, P17) NIGDY nie są pokazywane w UI.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { ExtendedTrace, TraceStep } from '../results-inspector/types';
import { TraceToc } from './TraceToc';
import { TraceStepView, TraceStepViewEmpty } from './TraceStepView';
import { TraceMetadataPanel } from './TraceMetadataPanel';
import { TraceSearchBar } from './search/TraceSearchBar';
import {
  searchTraceSteps,
  hasValidationSteps,
  getAvailablePhases,
  type TraceFilterOptions,
} from './search/traceSearch';

// =============================================================================
// Types
// =============================================================================

interface TraceViewerProps {
  trace: ExtendedTrace;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sortuj kroki deterministycznie.
 * Priorytet: step (numer) > kolejność w tablicy
 */
function sortSteps(steps: TraceStep[]): TraceStep[] {
  return [...steps].sort((a, b) => {
    // Jeśli oba mają numer kroku, sortuj po nim
    if (a.step !== undefined && b.step !== undefined) {
      return a.step - b.step;
    }
    // Jeśli tylko jeden ma numer, ten z numerem idzie pierwszy
    if (a.step !== undefined) return -1;
    if (b.step !== undefined) return 1;
    // W przeciwnym razie zachowaj oryginalną kolejność
    return 0;
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64" data-testid="trace-loading">
      <div className="text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-3 text-sm text-slate-600">Ładowanie śladu obliczeń...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64" data-testid="trace-empty">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">Brak śladu obliczeń</p>
        <p className="text-sm text-slate-400 mt-1">
          Dla tego obliczenia nie wygenerowano szczegółowego śladu
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TraceViewer({ trace }: TraceViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TraceFilterOptions>({
    phase: null,
    onlyProblems: false,
  });
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Ref do przewijania
  const tocRef = useRef<HTMLDivElement>(null);

  // Sortuj kroki deterministycznie
  const sortedSteps = useMemo(() => sortSteps(trace.white_box_trace), [trace.white_box_trace]);

  // Wyszukaj kroki (deterministycznie)
  const searchResults = useMemo(
    () => searchTraceSteps(sortedSteps, searchQuery, filters),
    [sortedSteps, searchQuery, filters]
  );

  // Dostępne fazy do filtrowania
  const availablePhases = useMemo(() => getAvailablePhases(sortedSteps), [sortedSteps]);

  // Czy pokazać filtr "tylko problemy"
  const showProblemsFilter = useMemo(() => hasValidationSteps(sortedSteps), [sortedSteps]);

  // Pobierz wybrany krok
  const selectedStep = useMemo(() => {
    if (selectedStepIndex === null) return null;
    return sortedSteps[selectedStepIndex] ?? null;
  }, [sortedSteps, selectedStepIndex]);

  // Resetuj aktywny wynik gdy zmienia się query lub filtry
  useEffect(() => {
    setActiveResultIndex(0);
  }, [searchQuery, filters]);

  // Handler wyboru kroku
  const handleSelectStep = useCallback((index: number) => {
    setSelectedStepIndex(index);
  }, []);

  // Handler nawigacji do wyniku wyszukiwania
  const handleNavigateToResult = useCallback(
    (resultIndex: number) => {
      if (resultIndex < 0 || resultIndex >= searchResults.length) return;

      setActiveResultIndex(resultIndex);
      const match = searchResults[resultIndex];
      setSelectedStepIndex(match.stepIndex);

      // Przewiń do kroku w TOC
      if (tocRef.current) {
        const stepElement = tocRef.current.querySelector(
          `[data-testid="trace-toc-step-${match.stepIndex}"]`
        );
        if (stepElement) {
          stepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },
    [searchResults]
  );

  // Handler zmiany filtrów
  const handleFiltersChange = useCallback((newFilters: TraceFilterOptions) => {
    setFilters(newFilters);
  }, []);

  // Sprawdź czy są kroki do wyświetlenia
  if (sortedSteps.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="flex flex-col h-full bg-slate-50"
      data-testid="trace-viewer"
    >
      {/* Header z wyszukiwarką i filtrami */}
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Ślad obliczeń
            </h2>
            <p className="text-sm text-slate-500">
              {searchResults.length} z {sortedSteps.length} kroków
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              Tylko do odczytu
            </span>
          </div>
        </div>
        <TraceSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          results={searchResults}
          activeResultIndex={activeResultIndex}
          onNavigateToResult={handleNavigateToResult}
          availablePhases={availablePhases}
          showProblemsFilter={showProblemsFilter}
        />
      </header>

      {/* 3-panelowy układ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Lewy panel: Spis treści */}
        <div
          ref={tocRef}
          className="lg:col-span-3 border-r border-slate-200 bg-white overflow-hidden"
        >
          <TraceToc
            steps={sortedSteps}
            selectedStepIndex={selectedStepIndex}
            onSelectStep={handleSelectStep}
            searchQuery={searchQuery}
            filters={filters}
            searchResults={searchResults}
            activeResultIndex={activeResultIndex}
          />
        </div>

        {/* Środkowy panel: Treść kroku */}
        <div className="lg:col-span-6 bg-white overflow-hidden">
          {selectedStep ? (
            <TraceStepView
              step={selectedStep}
              stepIndex={selectedStepIndex!}
            />
          ) : (
            <TraceStepViewEmpty />
          )}
        </div>

        {/* Prawy panel: Metadane */}
        <div className="lg:col-span-3 overflow-hidden">
          <TraceMetadataPanel
            trace={trace}
            selectedStep={selectedStep}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper z obsługą stanu ładowania (do użycia z React Query / store).
 */
interface TraceViewerContainerProps {
  trace: ExtendedTrace | null;
  isLoading: boolean;
}

export function TraceViewerContainer({ trace, isLoading }: TraceViewerContainerProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (!trace || trace.white_box_trace.length === 0) {
    return <EmptyState />;
  }

  return <TraceViewer trace={trace} />;
}
