/**
 * P20b — Power Flow Results Page (READ-ONLY)
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md: RESULT_VIEW mode, Polish labels
 * - powerfactory_ui_parity.md: Deterministic tables, result freshness
 * - sld_rules.md: Result overlay as separate layer
 * - AGENTS.md: NOT-A-SOLVER, no physics in UI
 *
 * FEATURES:
 * - Run selector (history list)
 * - Result status bar (converged/iterations)
 * - Tabs: Szyny, Gałęzie, Podsumowanie, Ślad obliczeń
 * - Sortable, filterable tables
 * - SLD overlay toggle
 *
 * 100% POLISH UI
 */

import { useEffect, useMemo, useState } from 'react';
import {
  useResultsInspectorStore,
  useFilteredPowerFlowBusResults,
  useFilteredPowerFlowBranchResults,
  useIsAnyLoading,
  usePowerFlowConvergenceLabel,
} from './store';
import type { PowerFlowResultsTab, PowerFlowRunItem, PowerFlowTrace } from './types';
import { POWER_FLOW_TAB_LABELS } from './types';

// =============================================================================
// Helper Functions
// =============================================================================

function formatNumber(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getConvergenceBadgeClass(converged: boolean | null): string {
  if (converged === null) return 'bg-slate-100 text-slate-600';
  return converged
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700';
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
// Run Selector (History List)
// =============================================================================

interface RunSelectorProps {
  runs: PowerFlowRunItem[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function RunSelector({
  runs,
  selectedRunId,
  onSelect,
  searchQuery,
  onSearchChange,
}: RunSelectorProps) {
  const filteredRuns = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return runs;
    return runs.filter(
      (run) =>
        run.id.toLowerCase().includes(query) ||
        (run.case_name?.toLowerCase().includes(query) ?? false)
    );
  }, [runs, searchQuery]);

  return (
    <div className="border-r border-slate-200 bg-white p-4" style={{ width: '280px' }}>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Historia rozpływów mocy</h3>
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Filtruj po ID lub przypadku..."
        aria-label="Filtruj historię"
        className="mb-3 w-full rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      />
      <div className="max-h-96 overflow-y-auto">
        {filteredRuns.length === 0 ? (
          <p className="text-xs text-slate-400">Brak wyników</p>
        ) : (
          <ul className="space-y-1">
            {filteredRuns.map((run) => {
              const isSelected = run.id === selectedRunId;
              const date = new Date(run.created_at).toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(run.id)}
                    className={`w-full rounded px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{run.case_name || 'Przypadek'}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${getConvergenceBadgeClass(run.converged)}`}
                      >
                        {run.converged ? 'OK' : run.converged === false ? 'BŁĄD' : '—'}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-500">{date}</div>
                    {run.iterations !== null && (
                      <div className="text-slate-400">Iteracje: {run.iterations}</div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Status Bar
// =============================================================================

interface StatusBarProps {
  converged: boolean;
  iterations: number;
  tolerance: number;
  slackBusId: string;
  baseMva: number;
}

function StatusBar({ converged, iterations, tolerance, slackBusId, baseMva }: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-4">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${getConvergenceBadgeClass(converged)}`}
        >
          {converged ? 'Zbieżność osiągnięta' : 'Brak zbieżności'}
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Iteracje:</span> {iterations}
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Tolerancja:</span> {tolerance.toExponential(2)}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>
          <span className="font-medium">Węzeł bilansujący:</span> {slackBusId.substring(0, 8)}...
        </span>
        <span>
          <span className="font-medium">Baza mocy:</span> {baseMva} MVA
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Bus Results Table (Szyny)
// =============================================================================

function BusResultsTable() {
  const filteredRows = useFilteredPowerFlowBusResults();
  const { powerFlowSearchQuery, setPowerFlowSearchQuery, powerFlowResults, isLoadingPowerFlowResults } =
    useResultsInspectorStore();

  if (isLoadingPowerFlowResults) return <LoadingSpinner />;
  if (!powerFlowResults || powerFlowResults.bus_results.length === 0) {
    return <EmptyState message="Brak wyników węzłowych dla tego obliczenia." />;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={powerFlowSearchQuery}
          onChange={(e) => setPowerFlowSearchQuery(e.target.value)}
          placeholder="Filtruj po ID szyny..."
          aria-label="Filtruj wyniki węzłowe"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">ID szyny</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">V [pu]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Kąt [°]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">P inj [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Q inj [Mvar]</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.bus_id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800">{row.bus_id.substring(0, 12)}...</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.v_pu)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.angle_deg, 2)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.p_injected_mw, 3)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.q_injected_mvar, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Wyświetlono {filteredRows.length} z {powerFlowResults.bus_results.length} wierszy
      </p>
    </div>
  );
}

// =============================================================================
// Branch Results Table (Gałęzie)
// =============================================================================

function BranchResultsTable() {
  const filteredRows = useFilteredPowerFlowBranchResults();
  const { powerFlowSearchQuery, setPowerFlowSearchQuery, powerFlowResults, isLoadingPowerFlowResults } =
    useResultsInspectorStore();

  if (isLoadingPowerFlowResults) return <LoadingSpinner />;
  if (!powerFlowResults || powerFlowResults.branch_results.length === 0) {
    return <EmptyState message="Brak wyników gałęziowych dla tego obliczenia." />;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={powerFlowSearchQuery}
          onChange={(e) => setPowerFlowSearchQuery(e.target.value)}
          placeholder="Filtruj po ID gałęzi..."
          aria-label="Filtruj wyniki gałęziowe"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">ID gałęzi</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">P od [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Q od [Mvar]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">P do [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Q do [Mvar]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Straty P [MW]</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Straty Q [Mvar]</th>
              {powerFlowResults.branch_results.some((r) => r.loading_pct !== undefined) && (
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Obciążenie [%]</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.branch_id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800">{row.branch_id.substring(0, 12)}...</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.p_from_mw, 3)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.q_from_mvar, 3)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.p_to_mw, 3)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.q_to_mvar, 3)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.losses_p_mw, 4)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.losses_q_mvar, 4)}</td>
                {row.loading_pct !== undefined && (
                  <td className="px-3 py-2 text-right">
                    <span
                      className={
                        row.loading_pct > 100
                          ? 'font-semibold text-rose-600'
                          : row.loading_pct > 80
                            ? 'text-amber-600'
                            : 'text-slate-600'
                      }
                    >
                      {formatNumber(row.loading_pct, 1)}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Wyświetlono {filteredRows.length} z {powerFlowResults.branch_results.length} wierszy
      </p>
    </div>
  );
}

// =============================================================================
// Summary View (Podsumowanie)
// =============================================================================

function SummaryView() {
  const { powerFlowResults, isLoadingPowerFlowResults } = useResultsInspectorStore();

  if (isLoadingPowerFlowResults) return <LoadingSpinner />;
  if (!powerFlowResults) {
    return <EmptyState message="Brak podsumowania dla tego obliczenia." />;
  }

  const { summary, converged, iterations_count, tolerance_used, base_mva, slack_bus_id } = powerFlowResults;

  return (
    <div className="space-y-6">
      {/* Convergence status */}
      <div className="rounded border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">Status obliczeń</h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Zbieżność</p>
            <p className={`text-lg font-semibold ${converged ? 'text-emerald-600' : 'text-rose-600'}`}>
              {converged ? 'TAK' : 'NIE'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Liczba iteracji</p>
            <p className="text-lg font-semibold text-slate-800">{iterations_count}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tolerancja</p>
            <p className="text-lg font-semibold text-slate-800">{tolerance_used.toExponential(2)}</p>
          </div>
        </div>
      </div>

      {/* Voltage summary */}
      <div className="rounded border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">Napięcia</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Minimalne napięcie</p>
            <p className="text-lg font-semibold text-slate-800">{formatNumber(summary.min_v_pu)} pu</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Maksymalne napięcie</p>
            <p className="text-lg font-semibold text-slate-800">{formatNumber(summary.max_v_pu)} pu</p>
          </div>
        </div>
      </div>

      {/* Losses summary */}
      <div className="rounded border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">Straty</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Całkowite straty mocy czynnej</p>
            <p className="text-lg font-semibold text-slate-800">{formatNumber(summary.total_losses_p_mw, 4)} MW</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Całkowite straty mocy biernej</p>
            <p className="text-lg font-semibold text-slate-800">{formatNumber(summary.total_losses_q_mvar, 4)} Mvar</p>
          </div>
        </div>
      </div>

      {/* Slack node */}
      <div className="rounded border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">Węzeł bilansujący</h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">ID węzła</p>
            <p className="text-sm font-medium text-slate-800">{slack_bus_id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Moc czynna (bilans)</p>
            <p className="text-lg font-semibold text-slate-800">{formatNumber(summary.slack_p_mw, 4)} MW</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Moc bierna (bilans)</p>
            <p className="text-lg font-semibold text-slate-800">{formatNumber(summary.slack_q_mvar, 4)} Mvar</p>
          </div>
        </div>
      </div>

      {/* Base data */}
      <div className="rounded border border-slate-200 bg-slate-50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-600">Dane bazowe</h4>
        <p className="text-sm text-slate-600">
          <span className="font-medium">Baza mocy:</span> {base_mva} MVA
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Trace View (Ślad obliczeń)
// =============================================================================

function TraceView() {
  const { powerFlowTrace, isLoadingPowerFlowTrace, loadPowerFlowTrace } = useResultsInspectorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!powerFlowTrace) {
      loadPowerFlowTrace();
    }
  }, [powerFlowTrace, loadPowerFlowTrace]);

  const filteredIterations = useMemo(() => {
    if (!powerFlowTrace) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return powerFlowTrace.iterations;
    return powerFlowTrace.iterations.filter((iter) => {
      const iterStr = JSON.stringify(iter).toLowerCase();
      return iterStr.includes(query);
    });
  }, [powerFlowTrace, searchQuery]);

  const toggleIteration = (index: number) => {
    setExpandedIterations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (isLoadingPowerFlowTrace) return <LoadingSpinner />;
  if (!powerFlowTrace) {
    return <EmptyState message="Brak śladu obliczeń dla tego rozpływu mocy." />;
  }

  return (
    <div>
      {/* Trace metadata */}
      <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <div>
            <span className="font-medium text-slate-700">Solver:</span>{' '}
            <span className="text-slate-600">v{powerFlowTrace.solver_version}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Input hash:</span>{' '}
            <span className="font-mono text-xs text-slate-600">
              {powerFlowTrace.input_hash.substring(0, 16)}...
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Metoda startowa:</span>{' '}
            <span className="text-slate-600">{powerFlowTrace.init_method}</span>
          </div>
        </div>
        <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
          <div>
            <span className="font-medium text-slate-700">Tolerancja:</span>{' '}
            <span className="text-slate-600">{powerFlowTrace.tolerance.toExponential(2)}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Max iteracji:</span>{' '}
            <span className="text-slate-600">{powerFlowTrace.max_iterations}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Zbieżność:</span>{' '}
            <span className={powerFlowTrace.converged ? 'text-emerald-600' : 'text-rose-600'}>
              {powerFlowTrace.converged ? 'TAK' : 'NIE'} ({powerFlowTrace.final_iterations_count} iter.)
            </span>
          </div>
        </div>
      </div>

      {/* Bus types */}
      <div className="mb-4 rounded border border-slate-200 bg-white p-3">
        <h4 className="mb-2 text-sm font-semibold text-slate-700">Klasyfikacja węzłów</h4>
        <div className="grid gap-2 text-xs md:grid-cols-3">
          <div>
            <span className="font-medium text-slate-600">SLACK:</span>{' '}
            <span className="text-slate-500">{powerFlowTrace.slack_bus_id.substring(0, 12)}...</span>
          </div>
          <div>
            <span className="font-medium text-slate-600">PQ ({powerFlowTrace.pq_bus_ids.length}):</span>{' '}
            <span className="text-slate-500">
              {powerFlowTrace.pq_bus_ids.slice(0, 3).map((id) => id.substring(0, 8)).join(', ')}
              {powerFlowTrace.pq_bus_ids.length > 3 ? '...' : ''}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-600">PV ({powerFlowTrace.pv_bus_ids.length}):</span>{' '}
            <span className="text-slate-500">
              {powerFlowTrace.pv_bus_ids.slice(0, 3).map((id) => id.substring(0, 8)).join(', ')}
              {powerFlowTrace.pv_bus_ids.length > 3 ? '...' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj w iteracjach..."
          aria-label="Szukaj w śladzie obliczeń"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>

      {/* Iterations */}
      <div className="space-y-2">
        {filteredIterations.map((iter, index) => (
          <div key={index} className="rounded border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => toggleIteration(index)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
              aria-label={`Rozwiń iterację ${iter.iteration ?? index + 1}`}
            >
              <div className="flex items-center gap-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Iteracja {iter.iteration ?? index + 1}
                </span>
                {iter.norm_mismatch !== undefined && (
                  <span className="text-xs text-slate-500">
                    ||Δ|| = {iter.norm_mismatch.toExponential(4)}
                  </span>
                )}
                {iter.converged !== undefined && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      iter.converged ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {iter.converged ? 'ZBIEŻNOŚĆ' : 'KONTYNUACJA'}
                  </span>
                )}
              </div>
              <span className="text-slate-400">{expandedIterations.has(index) ? '▼' : '▶'}</span>
            </button>
            {expandedIterations.has(index) && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                  {JSON.stringify(iter, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Wyświetlono {filteredIterations.length} z {powerFlowTrace.iterations.length} iteracji
      </p>
    </div>
  );
}

// =============================================================================
// Main Power Flow Results Page
// =============================================================================

interface PowerFlowResultsPageProps {
  projectId: string;
  onClose?: () => void;
  onOverlayToggle?: (visible: boolean) => void;
}

export function PowerFlowResultsPage({ projectId, onClose, onOverlayToggle }: PowerFlowResultsPageProps) {
  const {
    powerFlowRuns,
    selectedPowerFlowRunId,
    powerFlowResults,
    activePowerFlowTab,
    setActivePowerFlowTab,
    selectPowerFlowRun,
    loadPowerFlowRuns,
    isLoadingPowerFlowRuns,
    isLoadingPowerFlowResults,
    overlayVisible,
    toggleOverlay,
    error,
  } = useResultsInspectorStore();

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const isLoading = useIsAnyLoading();

  // Load runs on mount
  useEffect(() => {
    loadPowerFlowRuns(projectId);
  }, [projectId, loadPowerFlowRuns]);

  // Handle overlay toggle
  const handleOverlayToggle = (visible: boolean) => {
    toggleOverlay(visible);
    onOverlayToggle?.(visible);
  };

  // Available tabs
  const availableTabs: PowerFlowResultsTab[] = ['PF_BUSES', 'PF_BRANCHES', 'PF_SUMMARY', 'PF_TRACE'];

  // Error display
  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <p className="font-semibold">Błąd</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar - Run history */}
      <RunSelector
        runs={powerFlowRuns}
        selectedRunId={selectedPowerFlowRunId}
        onSelect={selectPowerFlowRun}
        searchQuery={historySearchQuery}
        onSearchChange={setHistorySearchQuery}
      />

      {/* Main content */}
      <div className="flex-1">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Rozpływ mocy</p>
                <h1 className="text-2xl font-semibold text-slate-900">Wyniki rozpływu mocy</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Tylko do odczytu
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Zamknij"
                    className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Zamknij
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-6 py-6">
          {!selectedPowerFlowRunId ? (
            <div className="rounded border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-500">Wybierz rozpływ mocy z historii po lewej stronie.</p>
            </div>
          ) : isLoadingPowerFlowResults ? (
            <LoadingSpinner />
          ) : powerFlowResults ? (
            <>
              {/* Status bar */}
              <StatusBar
                converged={powerFlowResults.converged}
                iterations={powerFlowResults.iterations_count}
                tolerance={powerFlowResults.tolerance_used}
                slackBusId={powerFlowResults.slack_bus_id}
                baseMva={powerFlowResults.base_mva}
              />

              {/* Overlay toggle */}
              <div className="mt-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={overlayVisible}
                    onChange={(e) => handleOverlayToggle(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Pokaż nakładkę rozpływu mocy na SLD
                </label>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex gap-2 border-b border-slate-200">
                {availableTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivePowerFlowTab(tab)}
                    aria-label={`Zakładka ${POWER_FLOW_TAB_LABELS[tab]}`}
                    className={`px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                      activePowerFlowTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {POWER_FLOW_TAB_LABELS[tab]}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="mt-6 rounded border border-slate-200 bg-white p-4">
                {activePowerFlowTab === 'PF_BUSES' && <BusResultsTable />}
                {activePowerFlowTab === 'PF_BRANCHES' && <BranchResultsTable />}
                {activePowerFlowTab === 'PF_SUMMARY' && <SummaryView />}
                {activePowerFlowTab === 'PF_TRACE' && <TraceView />}
              </div>
            </>
          ) : (
            <EmptyState message="Nie udało się załadować wyników." />
          )}
        </div>
      </div>
    </div>
  );
}

export default PowerFlowResultsPage;
