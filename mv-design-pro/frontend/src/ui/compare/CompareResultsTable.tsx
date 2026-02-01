/**
 * Compare Results Table — Results Diff UI
 *
 * CANONICAL ALIGNMENT:
 * - P10: Study Cases comparison (Case A vs Case B)
 * - READ-ONLY: No physics calculations
 * - UI 100% po polsku
 * - Deterministic sorting by row_id
 *
 * FEATURES:
 * - Shows value A, value B, delta (Δ)
 * - Marks rows: "Tylko w A", "Tylko w B", "Zmieniono"
 * - Three sub-tables: Szyny (buses), Gałęzie (branches), Zwarcia (short-circuit)
 */

import type {
  CompareRowStatus,
  ResultsSubTab,
} from './types';
import {
  COMPARE_ROW_STATUS_LABELS,
  COMPARE_ROW_STATUS_COLORS,
  RESULTS_SUB_TAB_LABELS,
} from './types';
import {
  useCompareCasesStore,
  useFilteredBuses,
  useFilteredBranches,
  useFilteredShortCircuit,
} from './store';

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDelta(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return sign + value.toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function StatusBadge({ status }: { status: CompareRowStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${COMPARE_ROW_STATUS_COLORS[status]}`}>
      {COMPARE_ROW_STATUS_LABELS[status]}
    </span>
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
// Bus Comparison Table (Szyny)
// =============================================================================

function BusComparisonTable() {
  const buses = useFilteredBuses();
  const caseAName = useCompareCasesStore((s) => s.caseAName);
  const caseBName = useCompareCasesStore((s) => s.caseBName);
  const totalBuses = useCompareCasesStore((s) => s.buses.length);

  if (buses.length === 0) {
    return <EmptyState message="Brak różnic w szynach." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Nazwa</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              U [kV] — {caseAName || 'A'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              U [kV] — {caseBName || 'B'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">ΔU [kV]</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              U [pu] — {caseAName || 'A'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              U [pu] — {caseBName || 'B'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">ΔU [pu]</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {buses.map((row) => (
            <tr key={row.row_id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.u_kv_a)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.u_kv_b)}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800">
                {formatDelta(row.delta_u_kv)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.u_pu_a, 4)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.u_pu_b, 4)}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800">
                {formatDelta(row.delta_u_pu, 4)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 px-3 text-xs text-slate-500">
        Wyświetlono {buses.length} z {totalBuses} szyn
      </p>
    </div>
  );
}

// =============================================================================
// Branch Comparison Table (Gałęzie)
// =============================================================================

function BranchComparisonTable() {
  const branches = useFilteredBranches();
  const caseAName = useCompareCasesStore((s) => s.caseAName);
  const caseBName = useCompareCasesStore((s) => s.caseBName);
  const totalBranches = useCompareCasesStore((s) => s.branches.length);

  if (branches.length === 0) {
    return <EmptyState message="Brak różnic w gałęziach." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Nazwa</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Trasa</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              P [MW] — {caseAName || 'A'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              P [MW] — {caseBName || 'B'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">ΔP [MW]</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Obciążenie [%] — {caseAName || 'A'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Obciążenie [%] — {caseBName || 'B'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">Δ [%]</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((row) => (
            <tr key={row.row_id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
              <td className="px-3 py-2 text-slate-600">
                {row.from_bus} → {row.to_bus}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.p_mw_a)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.p_mw_b)}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800">
                {formatDelta(row.delta_p_mw)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.loading_pct_a, 1)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.loading_pct_b, 1)}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800">
                {formatDelta(row.delta_loading_pct, 1)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 px-3 text-xs text-slate-500">
        Wyświetlono {branches.length} z {totalBranches} gałęzi
      </p>
    </div>
  );
}

// =============================================================================
// Short-Circuit Comparison Table (Zwarcia)
// =============================================================================

function ShortCircuitComparisonTable() {
  const shortCircuit = useFilteredShortCircuit();
  const caseAName = useCompareCasesStore((s) => s.caseAName);
  const caseBName = useCompareCasesStore((s) => s.caseBName);
  const totalSC = useCompareCasesStore((s) => s.shortCircuit.length);

  if (shortCircuit.length === 0) {
    return <EmptyState message="Brak różnic w zwarciach." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Cel zwarcia</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Ik'' [kA] — {caseAName || 'A'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Ik'' [kA] — {caseBName || 'B'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">ΔIk'' [kA]</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Sk'' [MVA] — {caseAName || 'A'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Sk'' [MVA] — {caseBName || 'B'}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">ΔSk'' [MVA]</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {shortCircuit.map((row) => (
            <tr key={row.row_id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-800">
                {row.target_name || row.row_id.substring(0, 8) + '...'}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.ikss_ka_a)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.ikss_ka_b)}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800">
                {formatDelta(row.delta_ikss_ka)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.sk_mva_a, 1)}
              </td>
              <td className="px-3 py-2 text-right text-slate-600">
                {formatNumber(row.sk_mva_b, 1)}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800">
                {formatDelta(row.delta_sk_mva, 1)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 px-3 text-xs text-slate-500">
        Wyświetlono {shortCircuit.length} z {totalSC} celów zwarcia
      </p>
    </div>
  );
}

// =============================================================================
// Sub-Tab Navigation
// =============================================================================

function ResultsSubTabNav() {
  const activeTab = useCompareCasesStore((s) => s.resultsSubTab);
  const setResultsSubTab = useCompareCasesStore((s) => s.setResultsSubTab);
  const summary = useCompareCasesStore((s) => s.summary);

  const tabs: ResultsSubTab[] = ['BUSES', 'BRANCHES', 'SHORT_CIRCUIT'];

  const getCounts = (tab: ResultsSubTab): { total: number; changed: number } => {
    if (!summary) return { total: 0, changed: 0 };
    switch (tab) {
      case 'BUSES':
        return {
          total: summary.total_buses,
          changed: summary.changed_buses + summary.only_in_a_buses + summary.only_in_b_buses,
        };
      case 'BRANCHES':
        return {
          total: summary.total_branches,
          changed: summary.changed_branches + summary.only_in_a_branches + summary.only_in_b_branches,
        };
      case 'SHORT_CIRCUIT':
        return { total: 0, changed: 0 }; // Not counted in summary
    }
  };

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const counts = getCounts(tab);
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setResultsSubTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {RESULTS_SUB_TAB_LABELS[tab]}
            {counts.changed > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {counts.changed}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CompareResultsTable() {
  const resultsSubTab = useCompareCasesStore((s) => s.resultsSubTab);

  return (
    <div className="rounded border border-slate-200 bg-white">
      <ResultsSubTabNav />
      <div className="p-4">
        {resultsSubTab === 'BUSES' && <BusComparisonTable />}
        {resultsSubTab === 'BRANCHES' && <BranchComparisonTable />}
        {resultsSubTab === 'SHORT_CIRCUIT' && <ShortCircuitComparisonTable />}
      </div>
    </div>
  );
}
