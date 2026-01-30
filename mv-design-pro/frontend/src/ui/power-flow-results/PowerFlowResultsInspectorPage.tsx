/**
 * P20b — Power Flow Results Inspector Page
 *
 * CANONICAL ALIGNMENT:
 * - 100% Polish UI
 * - READ-ONLY: No physics, no mutations
 * - RESULT_VIEW mode
 *
 * Main page for viewing power flow analysis results (single run).
 * Tabs: Szyny, Galezie, Podsumowanie, Slad obliczen
 */

import { useEffect, useMemo } from 'react';
import {
  usePowerFlowResultsStore,
  useFilteredBusResults,
  useFilteredBranchResults,
  useIsAnyLoading,
} from './store';
import type { PowerFlowBusResult, PowerFlowBranchResult, PowerFlowIterationTrace } from './types';
import {
  POWER_FLOW_TAB_LABELS,
  RESULT_STATUS_LABELS,
  RESULT_STATUS_SEVERITY,
} from './types';

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
      <span className="ml-3 text-slate-600">Ladowanie...</span>
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
  const { runHeader, results } = usePowerFlowResultsStore();

  if (!runHeader) return null;

  const statusLabel = RESULT_STATUS_LABELS[runHeader.result_status] ?? runHeader.result_status;
  const severity = RESULT_STATUS_SEVERITY[runHeader.result_status] ?? 'info';
  const convergedLabel = results?.converged ? 'Zbiezny' : results?.converged === false ? 'Niezbiezny' : '—';
  const iterationsLabel = results?.iterations_count ?? runHeader.iterations ?? '—';

  const formattedDate = useMemo(() => {
    try {
      return new Date(runHeader.created_at).toLocaleString('pl-PL');
    } catch {
      return runHeader.created_at;
    }
  }, [runHeader.created_at]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-4">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(severity)}`}
        >
          {statusLabel}
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Typ analizy:</span> Rozplyw mocy
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Status:</span>{' '}
          <span className={results?.converged ? 'text-emerald-600' : 'text-rose-600'}>
            {convergedLabel}
          </span>
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Iteracje:</span> {iterationsLabel}
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Run:</span> {runHeader.id.substring(0, 8)}...
        </span>
      </div>
      <span className="text-sm text-slate-500">{formattedDate}</span>
    </div>
  );
}

// =============================================================================
// Bus Results Table (Szyny)
// =============================================================================

function BusResultsTable() {
  const { results, isLoadingResults, loadResults, searchQuery, setSearchQuery } =
    usePowerFlowResultsStore();
  const filteredRows = useFilteredBusResults();

  useEffect(() => {
    if (!results) {
      loadResults();
    }
  }, [results, loadResults]);

  if (isLoadingResults) return <LoadingSpinner />;
  if (!results || results.bus_results.length === 0) {
    return <EmptyState message="Brak wynikow wezlowych dla tego obliczenia." />;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtruj po ID szyny..."
          aria-label="Filtruj wyniki wezlowe"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">ID szyny</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">V [pu]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Kat [deg]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">P<sub>inj</sub> [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Q<sub>inj</sub> [Mvar]</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row: PowerFlowBusResult) => (
              <tr key={row.bus_id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800">
                  {row.bus_id.substring(0, 12)}...
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.v_pu, 4)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.angle_deg, 2)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.p_injected_mw, 3)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.q_injected_mvar, 3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Wyswietlono {filteredRows.length} z {results.bus_results.length} wierszy
      </p>
    </div>
  );
}

// =============================================================================
// Branch Results Table (Galezie)
// =============================================================================

function BranchResultsTable() {
  const { results, isLoadingResults, loadResults, searchQuery, setSearchQuery } =
    usePowerFlowResultsStore();
  const filteredRows = useFilteredBranchResults();

  useEffect(() => {
    if (!results) {
      loadResults();
    }
  }, [results, loadResults]);

  if (isLoadingResults) return <LoadingSpinner />;
  if (!results || results.branch_results.length === 0) {
    return <EmptyState message="Brak wynikow galeziowych dla tego obliczenia." />;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtruj po ID galezi..."
          aria-label="Filtruj wyniki galeziowe"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">ID galezi</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">P<sub>from</sub> [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Q<sub>from</sub> [Mvar]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">P<sub>to</sub> [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Q<sub>to</sub> [Mvar]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Straty P [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Straty Q [Mvar]</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row: PowerFlowBranchResult) => (
              <tr key={row.branch_id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800">
                  {row.branch_id.substring(0, 12)}...
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.p_from_mw, 3)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.q_from_mvar, 3)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.p_to_mw, 3)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {formatNumber(row.q_to_mvar, 3)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-rose-600">
                  {formatNumber(row.losses_p_mw, 4)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-rose-600">
                  {formatNumber(row.losses_q_mvar, 4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Wyswietlono {filteredRows.length} z {results.branch_results.length} wierszy
      </p>
    </div>
  );
}

// =============================================================================
// Summary Tab (Podsumowanie)
// =============================================================================

function SummaryTab() {
  const { results, isLoadingResults, loadResults } = usePowerFlowResultsStore();

  useEffect(() => {
    if (!results) {
      loadResults();
    }
  }, [results, loadResults]);

  if (isLoadingResults) return <LoadingSpinner />;
  if (!results) {
    return <EmptyState message="Brak wynikow do wyswietlenia." />;
  }

  const { summary, converged, iterations_count, tolerance_used, base_mva, slack_bus_id } = results;

  return (
    <div className="space-y-4">
      {/* Convergence status */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className={`rounded border p-4 ${converged ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <div className={`text-sm font-medium ${converged ? 'text-emerald-700' : 'text-rose-700'}`}>
            Status zbieznosci
          </div>
          <div className={`mt-1 text-2xl font-bold ${converged ? 'text-emerald-900' : 'text-rose-900'}`}>
            {converged ? 'Zbiezny' : 'Niezbiezny'}
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">Liczba iteracji</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{iterations_count}</div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">Tolerancja</div>
          <div className="mt-1 text-lg font-mono font-semibold text-slate-900">
            {tolerance_used.toExponential(2)}
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-600">Moc bazowa</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{base_mva} MVA</div>
        </div>
      </div>

      {/* Losses and slack power */}
      <div className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Straty i moc bilansujaca</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Calkowite straty P</div>
            <div className="text-lg font-mono font-semibold text-rose-700">
              {formatNumber(summary.total_losses_p_mw, 4)} MW
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Calkowite straty Q</div>
            <div className="text-lg font-mono font-semibold text-rose-700">
              {formatNumber(summary.total_losses_q_mvar, 4)} Mvar
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Moc czynna slack</div>
            <div className="text-lg font-mono font-semibold text-slate-900">
              {formatNumber(summary.slack_p_mw, 3)} MW
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Moc bierna slack</div>
            <div className="text-lg font-mono font-semibold text-slate-900">
              {formatNumber(summary.slack_q_mvar, 3)} Mvar
            </div>
          </div>
        </div>
      </div>

      {/* Voltage range */}
      <div className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Zakres napiec</h3>
        <div className="flex items-center gap-8">
          <div>
            <div className="text-xs text-slate-500">Minimum V [pu]</div>
            <div className={`text-lg font-mono font-semibold ${summary.min_v_pu < 0.95 ? 'text-amber-600' : 'text-slate-900'}`}>
              {formatNumber(summary.min_v_pu, 4)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Maksimum V [pu]</div>
            <div className={`text-lg font-mono font-semibold ${summary.max_v_pu > 1.05 ? 'text-amber-600' : 'text-slate-900'}`}>
              {formatNumber(summary.max_v_pu, 4)}
            </div>
          </div>
        </div>
      </div>

      {/* Slack bus info */}
      <div className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Wezel bilansujacy (slack)</h3>
        <div className="font-mono text-sm text-slate-600">{slack_bus_id}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Trace Tab (Slad obliczen)
// =============================================================================

function TraceTab() {
  const { trace, isLoadingTrace, loadTrace } = usePowerFlowResultsStore();

  useEffect(() => {
    if (!trace) {
      loadTrace();
    }
  }, [trace, loadTrace]);

  if (isLoadingTrace) return <LoadingSpinner />;
  if (!trace || trace.iterations.length === 0) {
    return <EmptyState message="Brak sladu obliczen dla tego obliczenia." />;
  }

  return (
    <div className="space-y-4">
      {/* Trace metadata */}
      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-medium text-slate-700">Wersja solvera:</span>{' '}
            <span className="text-slate-600">{trace.solver_version}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Metoda startu:</span>{' '}
            <span className="text-slate-600">{trace.init_method === 'flat' ? 'Plaski' : trace.init_method}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Tolerancja:</span>{' '}
            <span className="font-mono text-xs text-slate-600">{trace.tolerance.toExponential(2)}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Max iteracji:</span>{' '}
            <span className="text-slate-600">{trace.max_iterations}</span>
          </div>
        </div>
      </div>

      {/* Bus classification */}
      <div className="rounded border border-slate-200 bg-white p-3">
        <h4 className="mb-2 text-sm font-semibold text-slate-700">Klasyfikacja wezlow</h4>
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <div>
            <span className="font-medium text-slate-600">Slack:</span>{' '}
            <span className="font-mono text-xs text-slate-500">{trace.slack_bus_id.substring(0, 12)}...</span>
          </div>
          <div>
            <span className="font-medium text-slate-600">PQ ({trace.pq_bus_ids.length}):</span>{' '}
            <span className="text-slate-500">{trace.pq_bus_ids.length} wezlow</span>
          </div>
          <div>
            <span className="font-medium text-slate-600">PV ({trace.pv_bus_ids.length}):</span>{' '}
            <span className="text-slate-500">{trace.pv_bus_ids.length} wezlow</span>
          </div>
        </div>
      </div>

      {/* Iterations table */}
      <div className="rounded border border-slate-200 bg-white">
        <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          Iteracje Newton-Raphson
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">k</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Norma mismatch</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Max mismatch [pu]</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">PV→PQ</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {trace.iterations.map((iter: PowerFlowIterationTrace) => (
                <tr key={iter.k} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{iter.k}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">
                    {iter.norm_mismatch.toExponential(4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">
                    {iter.max_mismatch_pu.toExponential(4)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {iter.pv_to_pq_switches && iter.pv_to_pq_switches.length > 0
                      ? `${iter.pv_to_pq_switches.length} przelaczenia`
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {iter.cause_if_failed ? (
                      <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                        {iter.cause_if_failed}
                      </span>
                    ) : (
                      <span className="text-emerald-600">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final status */}
      <div className={`rounded border p-3 ${trace.converged ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${trace.converged ? 'text-emerald-700' : 'text-rose-700'}`}>
            Wynik koncowy:
          </span>
          <span className={`font-semibold ${trace.converged ? 'text-emerald-900' : 'text-rose-900'}`}>
            {trace.converged ? 'Zbiezny' : 'Niezbiezny'} po {trace.final_iterations_count} iteracjach
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export function PowerFlowResultsInspectorPage() {
  const {
    activeTab,
    setActiveTab,
    overlayVisible,
    toggleOverlay,
  } = usePowerFlowResultsStore();

  const isLoading = useIsAnyLoading();

  return (
    <div className="flex h-full flex-col bg-slate-50 p-4">
      <ResultStatusBar />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          {(Object.entries(POWER_FLOW_TAB_LABELS) as [keyof typeof POWER_FLOW_TAB_LABELS, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overlayVisible}
            onChange={() => toggleOverlay()}
            className="h-4 w-4"
          />
          <span>Pokaz nakladke rozplywu mocy na SLD</span>
        </label>
      </div>

      <div className="mt-4 flex-1 overflow-auto rounded border border-slate-200 bg-white p-4">
        {isLoading && <LoadingSpinner />}
        {!isLoading && activeTab === 'BUSES' && <BusResultsTable />}
        {!isLoading && activeTab === 'BRANCHES' && <BranchResultsTable />}
        {!isLoading && activeTab === 'SUMMARY' && <SummaryTab />}
        {!isLoading && activeTab === 'TRACE' && <TraceTab />}
      </div>
    </div>
  );
}
