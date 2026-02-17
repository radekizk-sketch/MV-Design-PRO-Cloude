/**
 * P15c — Protection Results Inspector Page
 *
 * CANONICAL ALIGNMENT:
 * - 100% Polish UI
 * - READ-ONLY: No physics, no mutations
 * - RESULT_VIEW mode
 *
 * Main page for viewing protection analysis results (single run or A/B comparison).
 */

import { useEffect, useMemo } from 'react';
import {
  useProtectionResultsStore,
  useFilteredEvaluations,
  useFilteredComparisonEvaluations,
  useIsAnyLoading,
} from './store';
import type { ProtectionEvaluation, ProtectionEvaluationComparison } from './types';
import {
  PROTECTION_TAB_LABELS,
  PROTECTION_COMPARISON_TAB_LABELS,
  TRIP_STATE_LABELS,
  TRIP_STATE_COLORS,
  RESULT_STATUS_LABELS,
  RESULT_STATUS_SEVERITY,
} from './types';
import { ProtectionDiagnosticsPanelContainer } from '../protection-diagnostics';

// =============================================================================
// Helper Functions
// =============================================================================

function formatNumber(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getStatusBadgeClass(severity: 'info' | 'success' | 'warning'): string {
  switch (severity) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      <span className="ml-3 text-slate-600">Ładowanie...</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
      <p>{message}</p>
    </div>
  );
}

// =============================================================================
// Result Status Bar
// =============================================================================

function ResultStatusBar() {
  const { runHeader } = useProtectionResultsStore();

  const formattedDate = useMemo(() => {
    if (!runHeader) return '—';
    try {
      return new Date(runHeader.created_at).toLocaleString('pl-PL');
    } catch {
      return runHeader.created_at;
    }
  }, [runHeader]);

  if (!runHeader) return null;

  const statusLabel = RESULT_STATUS_LABELS[runHeader.result_state] ?? runHeader.result_state;
  const severity = RESULT_STATUS_SEVERITY[runHeader.result_state] ?? 'info';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-4">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(severity)}`}
        >
          {statusLabel}
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Typ analizy:</span> Zabezpieczenia
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Run:</span> {runHeader.run_id.substring(0, 8)}...
        </span>
      </div>
      <span className="text-sm text-slate-500">{formattedDate}</span>
    </div>
  );
}

// =============================================================================
// Evaluations Table (Oceny)
// =============================================================================

function EvaluationsTable() {
  const { results, isLoadingResults, loadResults, searchQuery, setSearchQuery } =
    useProtectionResultsStore();
  const filteredRows = useFilteredEvaluations();

  useEffect(() => {
    if (!results) {
      loadResults();
    }
  }, [results, loadResults]);

  if (isLoadingResults) return <LoadingSpinner />;
  if (!results || results.evaluations.length === 0) {
    return <EmptyState message="Brak wyników ocen zabezpieczeń." />;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Szukaj (element, urządzenie, stan)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="w-full border-collapse bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Element chroniony
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Urządzenie
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Stan zadziałania
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-right font-semibold">
                I<sub>zwarcia</sub> [A]
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-right font-semibold">
                I<sub>pickup</sub> [A]
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-right font-semibold">
                t<sub>trip</sub> [s]
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-right font-semibold">
                Margines [%]
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Charakterystyka
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row: ProtectionEvaluation, idx) => (
              <tr key={`${row.protected_element_ref}-${idx}`} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-2">
                  {row.protected_element_ref}
                </td>
                <td className="border-b border-slate-100 px-4 py-2">{row.device_id}</td>
                <td className="border-b border-slate-100 px-4 py-2">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${TRIP_STATE_COLORS[row.trip_state]}`}>
                    {TRIP_STATE_LABELS[row.trip_state]}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-2 text-right font-mono">
                  {formatNumber(row.i_fault_a, 2)}
                </td>
                <td className="border-b border-slate-100 px-4 py-2 text-right font-mono">
                  {formatNumber(row.i_pickup_a, 2)}
                </td>
                <td className="border-b border-slate-100 px-4 py-2 text-right font-mono">
                  {row.t_trip_s !== undefined ? formatNumber(row.t_trip_s, 3) : '—'}
                </td>
                <td className="border-b border-slate-100 px-4 py-2 text-right font-mono">
                  {row.margin_percent !== undefined ? formatNumber(row.margin_percent, 1) : '—'}
                </td>
                <td className="border-b border-slate-100 px-4 py-2 text-xs text-slate-600">
                  {row.curve_kind}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-sm text-slate-500">
        Wyświetlono: {filteredRows.length} z {results.evaluations.length}
      </div>
    </div>
  );
}

// =============================================================================
// Summary Tab (Podsumowanie)
// =============================================================================

function SummaryTab() {
  const { results, isLoadingResults, loadResults } = useProtectionResultsStore();

  useEffect(() => {
    if (!results) {
      loadResults();
    }
  }, [results, loadResults]);

  if (isLoadingResults) return <LoadingSpinner />;
  if (!results) {
    return <EmptyState message="Brak wyników do wyświetlenia." />;
  }

  const { summary } = results;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">Wszystkie oceny</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {summary.total_evaluations}
          </div>
        </div>

        <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-medium text-emerald-700">Zadziałania</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{summary.trips_count}</div>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-medium text-amber-700">Brak zadziałania</div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{summary.no_trip_count}</div>
        </div>

        <div className="rounded border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-medium text-rose-700">Nieprawidłowe</div>
          <div className="mt-1 text-2xl font-bold text-rose-900">{summary.invalid_count}</div>
        </div>
      </div>

      {summary.min_trip_time_s !== undefined && summary.max_trip_time_s !== undefined && (
        <div className="rounded border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Zakres czasów zadziałania</h3>
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs text-slate-500">Minimum</div>
              <div className="text-lg font-mono font-semibold text-slate-900">
                {formatNumber(summary.min_trip_time_s, 3)} s
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Maksimum</div>
              <div className="text-lg font-mono font-semibold text-slate-900">
                {formatNumber(summary.max_trip_time_s, 3)} s
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Trace Tab (Ślad obliczeń)
// =============================================================================

function TraceTab() {
  const { trace, isLoadingTrace, loadTrace } = useProtectionResultsStore();

  useEffect(() => {
    if (!trace) {
      loadTrace();
    }
  }, [trace, loadTrace]);

  if (isLoadingTrace) return <LoadingSpinner />;
  if (!trace || trace.steps.length === 0) {
    return <EmptyState message="Brak śladu obliczeń." />;
  }

  return (
    <div className="space-y-2">
      {trace.steps.map((step, idx) => (
        <div key={`${step.step_id}-${idx}`} className="rounded border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                  {step.phase}
                </span>
                <span className="text-xs text-slate-500">{step.step_id}</span>
              </div>
              <p className="text-sm text-slate-800">{step.description}</p>
            </div>
            {step.timestamp && (
              <span className="text-xs text-slate-400">{step.timestamp}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Comparison Differences Tab (Różnice)
// =============================================================================

function ComparisonDifferencesTab() {
  const { comparison, isLoadingComparison, loadComparison, searchQuery, setSearchQuery } =
    useProtectionResultsStore();
  const filteredRows = useFilteredComparisonEvaluations();

  useEffect(() => {
    if (!comparison) {
      loadComparison();
    }
  }, [comparison, loadComparison]);

  if (isLoadingComparison) return <LoadingSpinner />;
  if (!comparison?.protection || comparison.protection.evaluations.length === 0) {
    return <EmptyState message="Brak różnic do wyświetlenia." />;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Szukaj (element, zmiana stanu)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="w-full border-collapse bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Element
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Stan A
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Stan B
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold">
                Zmiana
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-right font-semibold">
                Δt [s]
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-right font-semibold">
                Δmargines [%]
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row: ProtectionEvaluationComparison, idx) => (
              <tr key={`${row.element_id}-${idx}`} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-2">{row.element_id}</td>
                <td className="border-b border-slate-100 px-4 py-2">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${TRIP_STATE_COLORS[row.trip_state_a] || 'text-slate-600 bg-slate-50'}`}>
                    {TRIP_STATE_LABELS[row.trip_state_a] || row.trip_state_a}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-2">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${TRIP_STATE_COLORS[row.trip_state_b] || 'text-slate-600 bg-slate-50'}`}>
                    {TRIP_STATE_LABELS[row.trip_state_b] || row.trip_state_b}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-2 font-medium">
                  {row.state_change}
                </td>
                <td className="border-b border-slate-100 px-4 py-2 text-right font-mono">
                  {row.t_trip_delta ? formatNumber(row.t_trip_delta.delta, 3) : '—'}
                </td>
                <td className="border-b border-slate-100 px-4 py-2 text-right font-mono">
                  {row.margin_delta ? formatNumber(row.margin_delta.delta, 1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-sm text-slate-500">
        Wyświetlono: {filteredRows.length} z {comparison.protection.evaluations.length}
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export function ProtectionResultsInspectorPage() {
  const {
    viewMode,
    activeTab,
    setActiveTab,
    activeComparisonTab,
    setActiveComparisonTab,
    showSldOverlay,
    toggleSldOverlay,
  } = useProtectionResultsStore();

  const isLoading = useIsAnyLoading();

  // Render RUN mode
  if (viewMode === 'RUN') {
    return (
      <div className="flex h-full flex-col bg-slate-50 p-4">
        <ResultStatusBar />

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            {Object.entries(PROTECTION_TAB_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showSldOverlay}
              onChange={toggleSldOverlay}
              className="h-4 w-4"
            />
            <span>Pokaż nakładkę na SLD</span>
          </label>
        </div>

        <div className="mt-4 flex-1 overflow-auto rounded border border-slate-200 bg-white p-4">
          {isLoading && <LoadingSpinner />}
          {!isLoading && activeTab === 'EVALUATIONS' && <EvaluationsTable />}
          {!isLoading && activeTab === 'SUMMARY' && <SummaryTab />}
          {!isLoading && activeTab === 'DIAGNOSTICS' && <ProtectionDiagnosticsPanelContainer />}
          {!isLoading && activeTab === 'TRACE' && <TraceTab />}
        </div>
      </div>
    );
  }

  // Render COMPARISON mode
  return (
    <div className="flex h-full flex-col bg-slate-50 p-4">
      <div className="rounded border border-slate-200 bg-white p-3">
        <h2 className="text-lg font-semibold text-slate-800">Porównanie zabezpieczeń A/B</h2>
      </div>

      <div className="mt-4 flex gap-2">
        {Object.entries(PROTECTION_COMPARISON_TAB_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveComparisonTab(key as any)}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              activeComparisonTab === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 overflow-auto rounded border border-slate-200 bg-white p-4">
        {isLoading && <LoadingSpinner />}
        {!isLoading && activeComparisonTab === 'DIFFERENCES' && <ComparisonDifferencesTab />}
        {!isLoading && activeComparisonTab === 'RANKING' && (
          <EmptyState message="Ranking problemów — w trakcie implementacji" />
        )}
        {!isLoading && activeComparisonTab === 'TRACE' && (
          <EmptyState message="Ślad porównania — w trakcie implementacji" />
        )}
      </div>
    </div>
  );
}
