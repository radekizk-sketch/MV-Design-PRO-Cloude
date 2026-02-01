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
 * - Wyszukiwanie w obrębie śladu (client-side)
 * - Deterministyczne sortowanie kroków
 * - 100% Polish UI
 *
 * NOTE: Nazwy kodowe (P11, P14, P17) NIGDY nie są pokazywane w UI.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ExtendedTrace, TraceStep } from '../results-inspector/types';
import { TraceToc } from './TraceToc';
import { TraceStepView, TraceStepViewEmpty } from './TraceStepView';
import { TraceMetadataPanel, TraceMetadataPanelEmpty } from './TraceMetadataPanel';

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

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          className="h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Szukaj w śladzie obliczeń..."
        aria-label="Szukaj w śladzie obliczeń"
        data-testid="trace-search-input"
        className="w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

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
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // Sortuj kroki deterministycznie
  const sortedSteps = useMemo(() => sortSteps(trace.white_box_trace), [trace.white_box_trace]);

  // Pobierz wybrany krok
  const selectedStep = useMemo(() => {
    if (selectedStepIndex === null) return null;
    return sortedSteps[selectedStepIndex] ?? null;
  }, [sortedSteps, selectedStepIndex]);

  // Handler wyboru kroku
  const handleSelectStep = useCallback((index: number) => {
    setSelectedStepIndex(index);
  }, []);

  // Wyczyść wyszukiwanie
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
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
      {/* Header z wyszukiwarką */}
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Ślad obliczeń
            </h2>
            <p className="text-sm text-slate-500">
              {sortedSteps.length} kroków obliczeniowych
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              Tylko do odczytu
            </span>
          </div>
        </div>
      </header>

      {/* 3-panelowy układ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Lewy panel: Spis treści */}
        <div className="lg:col-span-3 border-r border-slate-200 bg-white overflow-hidden">
          <TraceToc
            steps={sortedSteps}
            selectedStepIndex={selectedStepIndex}
            onSelectStep={handleSelectStep}
            searchQuery={searchQuery}
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
