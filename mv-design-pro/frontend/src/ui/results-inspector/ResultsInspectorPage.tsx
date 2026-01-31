/**
 * P11b — Results Inspector Page (READ-ONLY)
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md: RESULT_VIEW mode, Polish labels
 * - powerfactory_ui_parity.md: Deterministic tables, result freshness
 * - sld_rules.md: Result overlay as separate layer
 * - AGENTS.md: NOT-A-SOLVER, no physics in UI
 *
 * FEATURES:
 * - Run selector (Projekt → Przypadek → Run)
 * - Result status bar (FRESH/OUTDATED/NONE)
 * - Tabs: Szyny, Gałęzie, Zwarcia (SC only), Ślad obliczeń
 * - Sortable, filterable tables
 * - SLD overlay toggle
 *
 * 100% POLISH UI
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  useResultsInspectorStore,
  useFilteredBusResults,
  useFilteredBranchResults,
  useHasShortCircuitResults,
  useIsAnyLoading,
} from './store';
import type { ResultsInspectorTab, BusResultRow, BranchResultRow, ShortCircuitRow } from './types';
import {
  RESULTS_TAB_LABELS,
  RESULT_STATUS_LABELS,
  RESULT_STATUS_SEVERITY,
  FLAG_LABELS,
  SOLVER_KIND_LABELS,
} from './types';
import { useSelectionStore } from '../selection';
import type { ElementType } from '../types';

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

function formatFlags(flags: string[]): string {
  if (flags.length === 0) return '';
  return flags.map((flag) => FLAG_LABELS[flag] ?? flag).join(', ');
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

interface ResultStatusBarProps {
  resultState: string;
  solverKind: string;
  runId: string;
  createdAt: string;
}

function ResultStatusBar({ resultState, solverKind, runId, createdAt }: ResultStatusBarProps) {
  const statusLabel = RESULT_STATUS_LABELS[resultState] ?? resultState;
  const severity = RESULT_STATUS_SEVERITY[resultState] ?? 'info';
  const solverLabel = SOLVER_KIND_LABELS[solverKind] ?? solverKind;

  const formattedDate = useMemo(() => {
    try {
      return new Date(createdAt).toLocaleString('pl-PL');
    } catch {
      return createdAt;
    }
  }, [createdAt]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-4">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(severity)}`}
        >
          {statusLabel}
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Typ analizy:</span> {solverLabel}
        </span>
        <span className="text-sm text-slate-600">
          <span className="font-medium">Run:</span> {runId.substring(0, 8)}...
        </span>
      </div>
      <span className="text-sm text-slate-500">{formattedDate}</span>
    </div>
  );
}

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
// Bus Results Table (Szyny)
// =============================================================================

interface BusResultsTableProps {
  selectedRowId: string | null;
  onRowSelect: (row: BusResultRow) => void;
}

function BusResultsTable({ selectedRowId, onRowSelect }: BusResultsTableProps) {
  const { busResults, isLoadingBuses, loadBusResults, searchQuery, setSearchQuery } =
    useResultsInspectorStore();
  const filteredRows = useFilteredBusResults();

  useEffect(() => {
    if (!busResults) {
      loadBusResults();
    }
  }, [busResults, loadBusResults]);

  if (isLoadingBuses) return <LoadingSpinner />;
  if (!busResults || busResults.rows.length === 0) {
    return <EmptyState message="Brak wyników węzłowych dla tego obliczenia." />;
  }

  return (
    <div data-testid="results-table-buses">
      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtruj po nazwie lub ID..."
          aria-label="Filtruj wyniki węzłowe"
          data-testid="results-search-input"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full text-sm" data-testid="results-table">
          <thead className="bg-slate-50">
            <tr data-testid="results-table-header">
              <th data-testid="col-header-name" className="px-3 py-2 text-left font-semibold text-slate-700">Nazwa</th>
              <th data-testid="col-header-id" className="px-3 py-2 text-left font-semibold text-slate-700">ID węzła</th>
              <th data-testid="col-header-un_kv" className="px-3 py-2 text-right font-semibold text-slate-700">Un [kV]</th>
              <th data-testid="col-header-u_kv" className="px-3 py-2 text-right font-semibold text-slate-700">U [kV]</th>
              <th data-testid="col-header-u_pu" className="px-3 py-2 text-right font-semibold text-slate-700">U [pu]</th>
              <th data-testid="col-header-angle_deg" className="px-3 py-2 text-right font-semibold text-slate-700">Kąt [°]</th>
              <th data-testid="col-header-flags" className="px-3 py-2 text-left font-semibold text-slate-700">Flagi</th>
            </tr>
          </thead>
          <tbody data-testid="results-table-body">
            {filteredRows.map((row) => (
              <tr
                key={row.bus_id}
                data-testid={`results-row-${row.bus_id}`}
                onClick={() => onRowSelect(row)}
                className={`border-t border-slate-100 cursor-pointer transition-colors ${
                  selectedRowId === row.bus_id
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'hover:bg-slate-50'
                }`}
                aria-selected={selectedRowId === row.bus_id}
                role="row"
              >
                <td data-testid={`cell-name-${row.bus_id}`} className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
                <td data-testid={`cell-id-${row.bus_id}`} className="px-3 py-2 text-slate-600">{row.bus_id.substring(0, 8)}...</td>
                <td data-testid={`cell-un_kv-${row.bus_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.un_kv, 1)}</td>
                <td data-testid={`cell-u_kv-${row.bus_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.u_kv)}</td>
                <td data-testid={`cell-u_pu-${row.bus_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.u_pu, 4)}</td>
                <td data-testid={`cell-angle_deg-${row.bus_id}`} className="px-3 py-2 text-right text-slate-600">
                  {formatNumber(row.angle_deg, 2)}
                </td>
                <td data-testid={`cell-flags-${row.bus_id}`} className="px-3 py-2">
                  {row.flags.length > 0 && (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      {formatFlags(row.flags)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500" data-testid="results-row-count">
        Wyświetlono {filteredRows.length} z {busResults.rows.length} wierszy
      </p>
    </div>
  );
}

// =============================================================================
// Branch Results Table (Gałęzie)
// =============================================================================

interface BranchResultsTableProps {
  selectedRowId: string | null;
  onRowSelect: (row: BranchResultRow) => void;
}

function BranchResultsTable({ selectedRowId, onRowSelect }: BranchResultsTableProps) {
  const { branchResults, isLoadingBranches, loadBranchResults, searchQuery, setSearchQuery } =
    useResultsInspectorStore();
  const filteredRows = useFilteredBranchResults();

  useEffect(() => {
    if (!branchResults) {
      loadBranchResults();
    }
  }, [branchResults, loadBranchResults]);

  if (isLoadingBranches) return <LoadingSpinner />;
  if (!branchResults || branchResults.rows.length === 0) {
    return <EmptyState message="Brak wyników gałęziowych dla tego obliczenia." />;
  }

  return (
    <div data-testid="results-table-branches">
      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtruj po nazwie, ID lub węźle..."
          aria-label="Filtruj wyniki gałęziowe"
          data-testid="results-search-input"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full text-sm" data-testid="results-table">
          <thead className="bg-slate-50">
            <tr data-testid="results-table-header">
              <th data-testid="col-header-name" className="px-3 py-2 text-left font-semibold text-slate-700">Nazwa</th>
              <th data-testid="col-header-from_bus" className="px-3 py-2 text-left font-semibold text-slate-700">Od węzła</th>
              <th data-testid="col-header-to_bus" className="px-3 py-2 text-left font-semibold text-slate-700">Do węzła</th>
              <th data-testid="col-header-i_a" className="px-3 py-2 text-right font-semibold text-slate-700">I [A]</th>
              <th data-testid="col-header-p_mw" className="px-3 py-2 text-right font-semibold text-slate-700">P [MW]</th>
              <th data-testid="col-header-q_mvar" className="px-3 py-2 text-right font-semibold text-slate-700">Q [Mvar]</th>
              <th data-testid="col-header-s_mva" className="px-3 py-2 text-right font-semibold text-slate-700">S [MVA]</th>
              <th data-testid="col-header-loading_pct" className="px-3 py-2 text-right font-semibold text-slate-700">Obciążenie [%]</th>
              <th data-testid="col-header-flags" className="px-3 py-2 text-left font-semibold text-slate-700">Flagi</th>
            </tr>
          </thead>
          <tbody data-testid="results-table-body">
            {filteredRows.map((row) => (
              <tr
                key={row.branch_id}
                data-testid={`results-row-${row.branch_id}`}
                onClick={() => onRowSelect(row)}
                className={`border-t border-slate-100 cursor-pointer transition-colors ${
                  selectedRowId === row.branch_id
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'hover:bg-slate-50'
                }`}
                aria-selected={selectedRowId === row.branch_id}
                role="row"
              >
                <td data-testid={`cell-name-${row.branch_id}`} className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
                <td data-testid={`cell-from_bus-${row.branch_id}`} className="px-3 py-2 text-slate-600">{row.from_bus.substring(0, 8)}...</td>
                <td data-testid={`cell-to_bus-${row.branch_id}`} className="px-3 py-2 text-slate-600">{row.to_bus.substring(0, 8)}...</td>
                <td data-testid={`cell-i_a-${row.branch_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.i_a, 1)}</td>
                <td data-testid={`cell-p_mw-${row.branch_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.p_mw)}</td>
                <td data-testid={`cell-q_mvar-${row.branch_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.q_mvar)}</td>
                <td data-testid={`cell-s_mva-${row.branch_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.s_mva)}</td>
                <td data-testid={`cell-loading_pct-${row.branch_id}`} className="px-3 py-2 text-right">
                  <span
                    className={
                      row.loading_pct !== null && row.loading_pct > 100
                        ? 'font-semibold text-rose-600'
                        : row.loading_pct !== null && row.loading_pct > 80
                          ? 'text-amber-600'
                          : 'text-slate-600'
                    }
                  >
                    {formatNumber(row.loading_pct, 1)}
                  </span>
                </td>
                <td data-testid={`cell-flags-${row.branch_id}`} className="px-3 py-2">
                  {row.flags.length > 0 && (
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                      {formatFlags(row.flags)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500" data-testid="results-row-count">
        Wyświetlono {filteredRows.length} z {branchResults.rows.length} wierszy
      </p>
    </div>
  );
}

// =============================================================================
// Short-Circuit Results Table (Zwarcia)
// =============================================================================

interface ShortCircuitResultsTableProps {
  selectedRowId: string | null;
  onRowSelect: (row: ShortCircuitRow) => void;
}

function ShortCircuitResultsTable({ selectedRowId, onRowSelect }: ShortCircuitResultsTableProps) {
  const { shortCircuitResults, isLoadingShortCircuit, loadShortCircuitResults } =
    useResultsInspectorStore();

  useEffect(() => {
    if (!shortCircuitResults) {
      loadShortCircuitResults();
    }
  }, [shortCircuitResults, loadShortCircuitResults]);

  if (isLoadingShortCircuit) return <LoadingSpinner />;
  if (!shortCircuitResults || shortCircuitResults.rows.length === 0) {
    return <EmptyState message="Brak wyników zwarciowych dla tego obliczenia." />;
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200" data-testid="results-table-short-circuit">
      <table className="min-w-full text-sm" data-testid="results-table">
        <thead className="bg-slate-50">
          <tr data-testid="results-table-header">
            <th data-testid="col-header-target" className="px-3 py-2 text-left font-semibold text-slate-700">Węzeł zwarcia</th>
            <th data-testid="col-header-fault_type" className="px-3 py-2 text-left font-semibold text-slate-700">Rodzaj zwarcia</th>
            <th data-testid="col-header-ikss_ka" className="px-3 py-2 text-right font-semibold text-slate-700">Ik'' [kA]</th>
            <th data-testid="col-header-ip_ka" className="px-3 py-2 text-right font-semibold text-slate-700">ip [kA]</th>
            <th data-testid="col-header-ith_ka" className="px-3 py-2 text-right font-semibold text-slate-700">Ith [kA]</th>
            <th data-testid="col-header-sk_mva" className="px-3 py-2 text-right font-semibold text-slate-700">Sk'' [MVA]</th>
          </tr>
        </thead>
        <tbody data-testid="results-table-body">
          {shortCircuitResults.rows.map((row) => (
            <tr
              key={row.target_id}
              data-testid={`results-row-${row.target_id}`}
              onClick={() => onRowSelect(row)}
              className={`border-t border-slate-100 cursor-pointer transition-colors ${
                selectedRowId === row.target_id
                  ? 'bg-blue-50 hover:bg-blue-100'
                  : 'hover:bg-slate-50'
              }`}
              aria-selected={selectedRowId === row.target_id}
              role="row"
            >
              <td data-testid={`cell-target-${row.target_id}`} className="px-3 py-2 font-medium text-slate-800">
                {row.target_name ?? row.target_id.substring(0, 8)}
              </td>
              <td data-testid={`cell-fault_type-${row.target_id}`} className="px-3 py-2 text-slate-600">{row.fault_type ?? '—'}</td>
              <td data-testid={`cell-ikss_ka-${row.target_id}`} className="px-3 py-2 text-right font-semibold text-slate-800">
                {formatNumber(row.ikss_ka)}
              </td>
              <td data-testid={`cell-ip_ka-${row.target_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.ip_ka)}</td>
              <td data-testid={`cell-ith_ka-${row.target_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.ith_ka)}</td>
              <td data-testid={`cell-sk_mva-${row.target_id}`} className="px-3 py-2 text-right text-slate-600">{formatNumber(row.sk_mva, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Extended Trace View (Ślad obliczeń)
// =============================================================================

function TraceView() {
  const { extendedTrace, isLoadingTrace, loadExtendedTrace } = useResultsInspectorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!extendedTrace) {
      loadExtendedTrace();
    }
  }, [extendedTrace, loadExtendedTrace]);

  const filteredSteps = useMemo(() => {
    if (!extendedTrace) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return extendedTrace.white_box_trace;
    return extendedTrace.white_box_trace.filter((step) => {
      const description = step.description?.toLowerCase() ?? '';
      const phase = step.phase?.toLowerCase() ?? '';
      const equationId = step.equation_id?.toLowerCase() ?? '';
      return (
        description.includes(query) || phase.includes(query) || equationId.includes(query)
      );
    });
  }, [extendedTrace, searchQuery]);

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (isLoadingTrace) return <LoadingSpinner />;
  if (!extendedTrace || extendedTrace.white_box_trace.length === 0) {
    return <EmptyState message="Brak śladu obliczeń dla tego obliczenia." />;
  }

  return (
    <div>
      <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <span className="font-medium text-slate-700">Snapshot ID:</span>{' '}
            <span className="text-slate-600">{extendedTrace.snapshot_id ?? '—'}</span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Input hash:</span>{' '}
            <span className="font-mono text-xs text-slate-600">
              {extendedTrace.input_hash.substring(0, 16)}...
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj w śladzie obliczeń..."
          aria-label="Szukaj w śladzie obliczeń"
          className="w-full max-w-md rounded border border-slate-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>

      <div className="space-y-2">
        {filteredSteps.map((step, index) => (
          <div key={index} className="rounded border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => toggleStep(index)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
              aria-label={`Rozwiń krok ${index + 1}`}
            >
              <div className="flex items-center gap-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {index + 1}
                </span>
                {step.phase && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {step.phase}
                  </span>
                )}
                <span className="text-sm font-medium text-slate-800">
                  {step.description ?? step.equation_id ?? 'Krok obliczeń'}
                </span>
              </div>
              <span className="text-slate-400">{expandedSteps.has(index) ? '▼' : '▶'}</span>
            </button>
            {expandedSteps.has(index) && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                  {JSON.stringify(step, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Wyświetlono {filteredSteps.length} z {extendedTrace.white_box_trace.length} kroków
      </p>
    </div>
  );
}

// =============================================================================
// Selected Result Row Types
// =============================================================================

type SelectedResultRow =
  | { type: 'bus'; data: BusResultRow }
  | { type: 'branch'; data: BranchResultRow }
  | { type: 'short_circuit'; data: ShortCircuitRow }
  | null;

// =============================================================================
// Results Inspector Panel (read-only property grid)
// =============================================================================

interface ResultsInspectorPanelProps {
  selectedRow: SelectedResultRow;
  onClose: () => void;
}

function ResultsInspectorPanel({ selectedRow, onClose }: ResultsInspectorPanelProps) {
  if (!selectedRow) {
    return (
      <div
        className="rounded border border-slate-200 bg-white p-4"
        data-testid="results-inspector-panel-empty"
      >
        <p className="text-sm text-slate-500">
          Wybierz wiersz w tabeli, aby zobaczyć szczegóły.
        </p>
      </div>
    );
  }

  const getTitle = () => {
    switch (selectedRow.type) {
      case 'bus':
        return `Szyna: ${selectedRow.data.name}`;
      case 'branch':
        return `Gałąź: ${selectedRow.data.name}`;
      case 'short_circuit':
        return `Zwarcie: ${selectedRow.data.target_name ?? selectedRow.data.target_id.substring(0, 8)}`;
    }
  };

  const renderProperties = () => {
    switch (selectedRow.type) {
      case 'bus':
        return (
          <dl className="divide-y divide-slate-100" data-testid="inspector-properties-bus">
            <PropertyRow label="Nazwa" value={selectedRow.data.name} />
            <PropertyRow label="ID węzła" value={selectedRow.data.bus_id} />
            <PropertyRow label="Napięcie znamionowe" value={formatNumber(selectedRow.data.un_kv, 1)} unit="kV" />
            <PropertyRow label="Napięcie" value={formatNumber(selectedRow.data.u_kv)} unit="kV" />
            <PropertyRow label="Napięcie (p.u.)" value={formatNumber(selectedRow.data.u_pu, 4)} unit="pu" />
            <PropertyRow label="Kąt fazowy" value={formatNumber(selectedRow.data.angle_deg, 2)} unit="°" />
            <PropertyRow label="Flagi" value={formatFlags(selectedRow.data.flags) || '—'} />
          </dl>
        );
      case 'branch':
        return (
          <dl className="divide-y divide-slate-100" data-testid="inspector-properties-branch">
            <PropertyRow label="Nazwa" value={selectedRow.data.name} />
            <PropertyRow label="ID gałęzi" value={selectedRow.data.branch_id} />
            <PropertyRow label="Od węzła" value={selectedRow.data.from_bus} />
            <PropertyRow label="Do węzła" value={selectedRow.data.to_bus} />
            <PropertyRow label="Prąd" value={formatNumber(selectedRow.data.i_a, 1)} unit="A" />
            <PropertyRow label="Moc czynna" value={formatNumber(selectedRow.data.p_mw)} unit="MW" />
            <PropertyRow label="Moc bierna" value={formatNumber(selectedRow.data.q_mvar)} unit="Mvar" />
            <PropertyRow label="Moc pozorna" value={formatNumber(selectedRow.data.s_mva)} unit="MVA" />
            <PropertyRow
              label="Obciążenie"
              value={formatNumber(selectedRow.data.loading_pct, 1)}
              unit="%"
              highlight={
                selectedRow.data.loading_pct !== null && selectedRow.data.loading_pct > 100
                  ? 'error'
                  : selectedRow.data.loading_pct !== null && selectedRow.data.loading_pct > 80
                    ? 'warning'
                    : undefined
              }
            />
            <PropertyRow label="Flagi" value={formatFlags(selectedRow.data.flags) || '—'} />
          </dl>
        );
      case 'short_circuit':
        return (
          <dl className="divide-y divide-slate-100" data-testid="inspector-properties-short-circuit">
            <PropertyRow label="Węzeł zwarcia" value={selectedRow.data.target_name ?? selectedRow.data.target_id} />
            <PropertyRow label="ID węzła" value={selectedRow.data.target_id} />
            <PropertyRow label="Rodzaj zwarcia" value={selectedRow.data.fault_type ?? '—'} />
            <PropertyRow label="Ik''" value={formatNumber(selectedRow.data.ikss_ka)} unit="kA" highlight="primary" />
            <PropertyRow label="ip" value={formatNumber(selectedRow.data.ip_ka)} unit="kA" />
            <PropertyRow label="Ith" value={formatNumber(selectedRow.data.ith_ka)} unit="kA" />
            <PropertyRow label="Sk''" value={formatNumber(selectedRow.data.sk_mva, 1)} unit="MVA" />
          </dl>
        );
    }
  };

  return (
    <div
      className="rounded border border-slate-200 bg-white"
      data-testid="results-inspector-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Właściwości wyniku
          </p>
          <h3 className="text-sm font-semibold text-slate-800">{getTitle()}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Zamknij panel właściwości"
          data-testid="inspector-close-button"
        >
          ✕
        </button>
      </div>

      {/* Read-only badge */}
      <div className="border-b border-slate-100 bg-green-50 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-green-700">
          <span>🔒</span>
          <span>Tryb wyników — tylko do odczytu</span>
        </div>
      </div>

      {/* Properties */}
      <div className="p-4">{renderProperties()}</div>
    </div>
  );
}

// =============================================================================
// Property Row Component
// =============================================================================

interface PropertyRowProps {
  label: string;
  value: string;
  unit?: string;
  highlight?: 'error' | 'warning' | 'primary';
}

function PropertyRow({ label, value, unit, highlight }: PropertyRowProps) {
  const valueClass = highlight === 'error'
    ? 'font-semibold text-rose-600'
    : highlight === 'warning'
      ? 'text-amber-600'
      : highlight === 'primary'
        ? 'font-semibold text-blue-700'
        : 'text-slate-800';

  return (
    <div className="flex items-center justify-between py-2" data-testid={`property-row-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-xs font-mono ${valueClass}`}>
        {value}
        {unit && <span className="ml-1 text-slate-400">{unit}</span>}
      </dd>
    </div>
  );
}

// =============================================================================
// Main Results Inspector Page
// =============================================================================

interface ResultsInspectorPageProps {
  runId?: string;
  onClose?: () => void;
}

export function ResultsInspectorPage({ runId, onClose }: ResultsInspectorPageProps) {
  const {
    selectedRunId,
    resultsIndex,
    activeTab,
    setActiveTab,
    selectRun,
    isLoadingIndex,
    error,
    overlayVisible,
    toggleOverlay,
  } = useResultsInspectorStore();

  const selectElement = useSelectionStore((state) => state.selectElement);
  const hasShortCircuit = useHasShortCircuitResults();
  const isLoading = useIsAnyLoading();

  // Local state for selected result row
  const [selectedResultRow, setSelectedResultRow] = useState<SelectedResultRow>(null);

  // Select run on mount if provided
  useEffect(() => {
    if (runId && runId !== selectedRunId) {
      selectRun(runId);
    }
  }, [runId, selectedRunId, selectRun]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedResultRow(null);
  }, [activeTab]);

  // Handle bus row selection
  const handleBusRowSelect = useCallback((row: BusResultRow) => {
    setSelectedResultRow({ type: 'bus', data: row });
    // Update global selection store (Bus type is already an ElementType)
    selectElement({
      id: row.bus_id,
      type: 'Bus' as ElementType,
      name: row.name,
    });
  }, [selectElement]);

  // Handle branch row selection
  const handleBranchRowSelect = useCallback((row: BranchResultRow) => {
    setSelectedResultRow({ type: 'branch', data: row });
    // Update global selection store (LineBranch as default branch type)
    selectElement({
      id: row.branch_id,
      type: 'LineBranch' as ElementType,
      name: row.name,
    });
  }, [selectElement]);

  // Handle short-circuit row selection
  const handleShortCircuitRowSelect = useCallback((row: ShortCircuitRow) => {
    setSelectedResultRow({ type: 'short_circuit', data: row });
    // Update global selection store (target is a Bus)
    selectElement({
      id: row.target_id,
      type: 'Bus' as ElementType,
      name: row.target_name ?? row.target_id,
    });
  }, [selectElement]);

  // Close inspector panel
  const handleCloseInspector = useCallback(() => {
    setSelectedResultRow(null);
    selectElement(null);
  }, [selectElement]);

  // Get selected row ID for highlighting
  const getSelectedRowId = (): string | null => {
    if (!selectedResultRow) return null;
    switch (selectedResultRow.type) {
      case 'bus':
        return selectedResultRow.data.bus_id;
      case 'branch':
        return selectedResultRow.data.branch_id;
      case 'short_circuit':
        return selectedResultRow.data.target_id;
    }
  };

  // Available tabs based on analysis type
  const availableTabs: ResultsInspectorTab[] = useMemo(() => {
    const tabs: ResultsInspectorTab[] = ['BUSES', 'BRANCHES'];
    if (hasShortCircuit) {
      tabs.push('SHORT_CIRCUIT');
    }
    tabs.push('TRACE');
    return tabs;
  }, [hasShortCircuit]);

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

  // Loading state
  if (isLoadingIndex || !resultsIndex) {
    return (
      <div className="min-h-screen bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  const { run_header } = resultsIndex;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Przeglądarka wyników
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">Wyniki analizy</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Tylko do odczytu
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Zamknij przeglądarkę wyników"
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
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Status bar */}
        <ResultStatusBar
          resultState={run_header.result_state}
          solverKind={run_header.solver_kind}
          runId={run_header.run_id}
          createdAt={run_header.created_at}
        />

        {/* Overlay toggle */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={overlayVisible}
              onChange={(e) => toggleOverlay(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Pokaż nakładkę wyników na SLD
          </label>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-slate-200">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-label={`Zakładka ${RESULTS_TAB_LABELS[tab]}`}
              className={`px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {RESULTS_TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Content grid with table and inspector */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tab content */}
          <div className="lg:col-span-2 rounded border border-slate-200 bg-white p-4" data-testid="results-table-container">
            {activeTab === 'BUSES' && (
              <BusResultsTable
                selectedRowId={getSelectedRowId()}
                onRowSelect={handleBusRowSelect}
              />
            )}
            {activeTab === 'BRANCHES' && (
              <BranchResultsTable
                selectedRowId={getSelectedRowId()}
                onRowSelect={handleBranchRowSelect}
              />
            )}
            {activeTab === 'SHORT_CIRCUIT' && (
              <ShortCircuitResultsTable
                selectedRowId={getSelectedRowId()}
                onRowSelect={handleShortCircuitRowSelect}
              />
            )}
            {activeTab === 'TRACE' && <TraceView />}
          </div>

          {/* Inspector panel */}
          <div className="lg:col-span-1" data-testid="results-inspector-container">
            <ResultsInspectorPanel
              selectedRow={selectedResultRow}
              onClose={handleCloseInspector}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
