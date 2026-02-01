/**
 * Compare Cases Store — Zustand adapter
 *
 * CANONICAL ALIGNMENT:
 * - P10: Study Cases comparison (Case A vs Case B)
 * - READ-ONLY: No physics calculations
 * - Uses existing data from study-cases and results-inspector stores
 *
 * PATTERN:
 * - Loads results from two cases and computes client-side diff
 * - No new backend endpoints required (uses existing fetchCaseRunHistory, compareRuns)
 */

import { create } from 'zustand';
import type {
  BusComparisonRow,
  BranchComparisonRow,
  ShortCircuitComparisonRow,
  DiagnosticComparisonRow,
  CaseComparisonSummary,
  CompareViewTab,
  ResultsSubTab,
  CompareRowStatus,
  DiagnosticCompareStatus,
} from './types';
import {
  sortBusComparisons,
  sortBranchComparisons,
  sortShortCircuitComparisons,
  sortDiagnosticComparisons,
} from './types';
import type { BusResultRow, BranchResultRow, ShortCircuitRow } from '../results-inspector/types';
import type { ProtectionSanityCheckResult, DiagnosticSeverity } from '../protection-diagnostics/types';

// =============================================================================
// API Functions (using existing endpoints)
// =============================================================================

const API_BASE = '/api';

/**
 * Fetch results for a specific run (buses).
 */
async function fetchBusResults(runId: string): Promise<BusResultRow[]> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/buses`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania wyników szyn: ${response.statusText}`);
  }
  const data = await response.json();
  return data.rows || [];
}

/**
 * Fetch results for a specific run (branches).
 */
async function fetchBranchResults(runId: string): Promise<BranchResultRow[]> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/branches`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania wyników gałęzi: ${response.statusText}`);
  }
  const data = await response.json();
  return data.rows || [];
}

/**
 * Fetch results for a specific run (short-circuit).
 */
async function fetchShortCircuitResults(runId: string): Promise<ShortCircuitRow[]> {
  const response = await fetch(`${API_BASE}/analysis-runs/${runId}/results/short-circuit`);
  if (!response.ok) {
    throw new Error(`Błąd pobierania wyników zwarć: ${response.statusText}`);
  }
  const data = await response.json();
  return data.rows || [];
}

/**
 * Fetch diagnostics for a protection run.
 */
async function fetchDiagnostics(protectionRunId: string): Promise<ProtectionSanityCheckResult[]> {
  const response = await fetch(`${API_BASE}/protection-runs/${protectionRunId}/diagnostics`);
  if (!response.ok) {
    // Diagnostics may not exist - return empty
    return [];
  }
  const data = await response.json();
  return data.results || data || [];
}

/**
 * Fetch latest run ID for a case.
 */
async function fetchLatestRunId(caseId: string): Promise<string | null> {
  const response = await fetch(`${API_BASE}/study-cases/${caseId}/runs`);
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const runs = data.runs || data || [];
  if (runs.length === 0) return null;

  // Sort by created_at DESC, return first
  const sorted = [...runs].sort((a: { created_at: string }, b: { created_at: string }) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return sorted[0]?.run_id || null;
}

// =============================================================================
// Comparison Logic (Client-side diff)
// =============================================================================

function computeBusComparisons(
  busesA: BusResultRow[],
  busesB: BusResultRow[]
): BusComparisonRow[] {
  const mapA = new Map(busesA.map((b) => [b.bus_id, b]));
  const mapB = new Map(busesB.map((b) => [b.bus_id, b]));
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const rows: BusComparisonRow[] = [];

  for (const id of allIds) {
    const a = mapA.get(id);
    const b = mapB.get(id);

    let status: CompareRowStatus;
    if (!a) {
      status = 'ONLY_IN_B';
    } else if (!b) {
      status = 'ONLY_IN_A';
    } else if (a.u_kv === b.u_kv && a.u_pu === b.u_pu) {
      status = 'IDENTICAL';
    } else {
      status = 'CHANGED';
    }

    const delta_u_kv = (a?.u_kv != null && b?.u_kv != null) ? (b.u_kv - a.u_kv) : null;
    const delta_u_pu = (a?.u_pu != null && b?.u_pu != null) ? (b.u_pu - a.u_pu) : null;

    rows.push({
      row_id: id,
      name: a?.name || b?.name || id,
      u_kv_a: a?.u_kv ?? null,
      u_kv_b: b?.u_kv ?? null,
      u_pu_a: a?.u_pu ?? null,
      u_pu_b: b?.u_pu ?? null,
      delta_u_kv,
      delta_u_pu,
      status,
    });
  }

  return sortBusComparisons(rows);
}

function computeBranchComparisons(
  branchesA: BranchResultRow[],
  branchesB: BranchResultRow[]
): BranchComparisonRow[] {
  const mapA = new Map(branchesA.map((b) => [b.branch_id, b]));
  const mapB = new Map(branchesB.map((b) => [b.branch_id, b]));
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const rows: BranchComparisonRow[] = [];

  for (const id of allIds) {
    const a = mapA.get(id);
    const b = mapB.get(id);

    let status: CompareRowStatus;
    if (!a) {
      status = 'ONLY_IN_B';
    } else if (!b) {
      status = 'ONLY_IN_A';
    } else if (a.p_mw === b.p_mw && a.i_a === b.i_a && a.loading_pct === b.loading_pct) {
      status = 'IDENTICAL';
    } else {
      status = 'CHANGED';
    }

    const delta_p_mw = (a?.p_mw != null && b?.p_mw != null) ? (b.p_mw - a.p_mw) : null;
    const delta_i_a = (a?.i_a != null && b?.i_a != null) ? (b.i_a - a.i_a) : null;
    const delta_loading_pct = (a?.loading_pct != null && b?.loading_pct != null)
      ? (b.loading_pct - a.loading_pct)
      : null;

    rows.push({
      row_id: id,
      name: a?.name || b?.name || id,
      from_bus: a?.from_bus || b?.from_bus || '',
      to_bus: a?.to_bus || b?.to_bus || '',
      p_mw_a: a?.p_mw ?? null,
      p_mw_b: b?.p_mw ?? null,
      i_a_a: a?.i_a ?? null,
      i_a_b: b?.i_a ?? null,
      loading_pct_a: a?.loading_pct ?? null,
      loading_pct_b: b?.loading_pct ?? null,
      delta_p_mw,
      delta_i_a,
      delta_loading_pct,
      status,
    });
  }

  return sortBranchComparisons(rows);
}

function computeShortCircuitComparisons(
  scA: ShortCircuitRow[],
  scB: ShortCircuitRow[]
): ShortCircuitComparisonRow[] {
  const mapA = new Map(scA.map((s) => [s.target_id, s]));
  const mapB = new Map(scB.map((s) => [s.target_id, s]));
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const rows: ShortCircuitComparisonRow[] = [];

  for (const id of allIds) {
    const a = mapA.get(id);
    const b = mapB.get(id);

    let status: CompareRowStatus;
    if (!a) {
      status = 'ONLY_IN_B';
    } else if (!b) {
      status = 'ONLY_IN_A';
    } else if (a.ikss_ka === b.ikss_ka && a.sk_mva === b.sk_mva) {
      status = 'IDENTICAL';
    } else {
      status = 'CHANGED';
    }

    const delta_ikss_ka = (a?.ikss_ka != null && b?.ikss_ka != null) ? (b.ikss_ka - a.ikss_ka) : null;
    const delta_sk_mva = (a?.sk_mva != null && b?.sk_mva != null) ? (b.sk_mva - a.sk_mva) : null;

    rows.push({
      row_id: id,
      target_name: a?.target_name || b?.target_name || null,
      ikss_ka_a: a?.ikss_ka ?? null,
      ikss_ka_b: b?.ikss_ka ?? null,
      sk_mva_a: a?.sk_mva ?? null,
      sk_mva_b: b?.sk_mva ?? null,
      delta_ikss_ka,
      delta_sk_mva,
      status,
    });
  }

  return sortShortCircuitComparisons(rows);
}

function computeDiagnosticComparisons(
  diagA: ProtectionSanityCheckResult[],
  diagB: ProtectionSanityCheckResult[]
): DiagnosticComparisonRow[] {
  // Key by element_id + code
  const keyFn = (d: ProtectionSanityCheckResult) => `${d.element_id}|${d.code}`;

  const mapA = new Map(diagA.map((d) => [keyFn(d), d]));
  const mapB = new Map(diagB.map((d) => [keyFn(d), d]));
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);

  const rows: DiagnosticComparisonRow[] = [];

  for (const key of allKeys) {
    const a = mapA.get(key);
    const b = mapB.get(key);

    let status: DiagnosticCompareStatus;
    if (!a) {
      status = 'NEW_IN_B';
    } else if (!b) {
      status = 'GONE_IN_B';
    } else if (a.severity !== b.severity) {
      status = 'SEVERITY_CHANGED';
    } else {
      status = 'UNCHANGED';
    }

    rows.push({
      key,
      element_id: a?.element_id || b?.element_id || '',
      element_type: a?.element_type || b?.element_type || '',
      code: a?.code || b?.code || '',
      severity_a: a?.severity as DiagnosticSeverity | null ?? null,
      severity_b: b?.severity as DiagnosticSeverity | null ?? null,
      message_pl_a: a?.message_pl ?? null,
      message_pl_b: b?.message_pl ?? null,
      function_ansi: a?.function_ansi || b?.function_ansi || null,
      status,
    });
  }

  return sortDiagnosticComparisons(rows);
}

function computeSummary(
  buses: BusComparisonRow[],
  branches: BranchComparisonRow[],
  diagnostics: DiagnosticComparisonRow[]
): CaseComparisonSummary {
  return {
    total_buses: buses.length,
    changed_buses: buses.filter((b) => b.status === 'CHANGED').length,
    only_in_a_buses: buses.filter((b) => b.status === 'ONLY_IN_A').length,
    only_in_b_buses: buses.filter((b) => b.status === 'ONLY_IN_B').length,
    total_branches: branches.length,
    changed_branches: branches.filter((b) => b.status === 'CHANGED').length,
    only_in_a_branches: branches.filter((b) => b.status === 'ONLY_IN_A').length,
    only_in_b_branches: branches.filter((b) => b.status === 'ONLY_IN_B').length,
    total_diagnostics: diagnostics.length,
    new_diagnostics: diagnostics.filter((d) => d.status === 'NEW_IN_B').length,
    gone_diagnostics: diagnostics.filter((d) => d.status === 'GONE_IN_B').length,
    changed_severity: diagnostics.filter((d) => d.status === 'SEVERITY_CHANGED').length,
  };
}

// =============================================================================
// Store State Interface
// =============================================================================

interface CompareCasesState {
  // --- SELECTION ---
  caseAId: string | null;
  caseBId: string | null;
  caseAName: string | null;
  caseBName: string | null;

  // --- RESULTS ---
  runAId: string | null;
  runBId: string | null;
  buses: BusComparisonRow[];
  branches: BranchComparisonRow[];
  shortCircuit: ShortCircuitComparisonRow[];
  diagnostics: DiagnosticComparisonRow[];
  summary: CaseComparisonSummary | null;

  // --- UI STATE ---
  activeTab: CompareViewTab;
  resultsSubTab: ResultsSubTab;
  showOnlyChanges: boolean;
  isLoading: boolean;
  error: string | null;

  // --- ACTIONS ---
  setCaseA: (caseId: string, caseName: string) => void;
  setCaseB: (caseId: string, caseName: string) => void;
  setActiveTab: (tab: CompareViewTab) => void;
  setResultsSubTab: (tab: ResultsSubTab) => void;
  setShowOnlyChanges: (show: boolean) => void;
  compare: () => Promise<void>;
  reset: () => void;
}

// =============================================================================
// Store Creation
// =============================================================================

export const useCompareCasesStore = create<CompareCasesState>((set, get) => ({
  // --- Initial State ---
  caseAId: null,
  caseBId: null,
  caseAName: null,
  caseBName: null,
  runAId: null,
  runBId: null,
  buses: [],
  branches: [],
  shortCircuit: [],
  diagnostics: [],
  summary: null,
  activeTab: 'RESULTS',
  resultsSubTab: 'BUSES',
  showOnlyChanges: false,
  isLoading: false,
  error: null,

  // --- Actions ---
  setCaseA: (caseId, caseName) => set({ caseAId: caseId, caseAName: caseName }),

  setCaseB: (caseId, caseName) => set({ caseBId: caseId, caseBName: caseName }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setResultsSubTab: (tab) => set({ resultsSubTab: tab }),

  setShowOnlyChanges: (show) => set({ showOnlyChanges: show }),

  compare: async () => {
    const { caseAId, caseBId } = get();

    if (!caseAId || !caseBId) {
      set({ error: 'Wybierz oba przypadki (A i B) aby wykonać porównanie.' });
      return;
    }

    if (caseAId === caseBId) {
      set({ error: 'Przypadki A i B muszą być różne.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // 1. Get latest run IDs for both cases
      const [runAId, runBId] = await Promise.all([
        fetchLatestRunId(caseAId),
        fetchLatestRunId(caseBId),
      ]);

      if (!runAId || !runBId) {
        set({
          error: 'Jeden lub oba przypadki nie mają wyników. Wykonaj obliczenia najpierw.',
          isLoading: false,
        });
        return;
      }

      // 2. Fetch all results for both runs in parallel
      const [busesA, busesB, branchesA, branchesB, scA, scB, diagA, diagB] = await Promise.all([
        fetchBusResults(runAId),
        fetchBusResults(runBId),
        fetchBranchResults(runAId),
        fetchBranchResults(runBId),
        fetchShortCircuitResults(runAId).catch(() => []),
        fetchShortCircuitResults(runBId).catch(() => []),
        fetchDiagnostics(runAId).catch(() => []),
        fetchDiagnostics(runBId).catch(() => []),
      ]);

      // 3. Compute comparisons
      const buses = computeBusComparisons(busesA, busesB);
      const branches = computeBranchComparisons(branchesA, branchesB);
      const shortCircuit = computeShortCircuitComparisons(scA, scB);
      const diagnostics = computeDiagnosticComparisons(diagA, diagB);
      const summary = computeSummary(buses, branches, diagnostics);

      set({
        runAId,
        runBId,
        buses,
        branches,
        shortCircuit,
        diagnostics,
        summary,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Nieznany błąd porównania',
        isLoading: false,
      });
    }
  },

  reset: () =>
    set({
      caseAId: null,
      caseBId: null,
      caseAName: null,
      caseBName: null,
      runAId: null,
      runBId: null,
      buses: [],
      branches: [],
      shortCircuit: [],
      diagnostics: [],
      summary: null,
      error: null,
    }),
}));

// =============================================================================
// Derived Hooks
// =============================================================================

/**
 * Hook: Get filtered buses (optionally only changes).
 */
export function useFilteredBuses(): BusComparisonRow[] {
  return useCompareCasesStore((state) => {
    if (!state.showOnlyChanges) return state.buses;
    return state.buses.filter((b) => b.status !== 'IDENTICAL');
  });
}

/**
 * Hook: Get filtered branches (optionally only changes).
 */
export function useFilteredBranches(): BranchComparisonRow[] {
  return useCompareCasesStore((state) => {
    if (!state.showOnlyChanges) return state.branches;
    return state.branches.filter((b) => b.status !== 'IDENTICAL');
  });
}

/**
 * Hook: Get filtered short-circuit (optionally only changes).
 */
export function useFilteredShortCircuit(): ShortCircuitComparisonRow[] {
  return useCompareCasesStore((state) => {
    if (!state.showOnlyChanges) return state.shortCircuit;
    return state.shortCircuit.filter((s) => s.status !== 'IDENTICAL');
  });
}

/**
 * Hook: Get filtered diagnostics (optionally only changes).
 */
export function useFilteredDiagnostics(): DiagnosticComparisonRow[] {
  return useCompareCasesStore((state) => {
    if (!state.showOnlyChanges) return state.diagnostics;
    return state.diagnostics.filter((d) => d.status !== 'UNCHANGED');
  });
}

/**
 * Hook: Check if comparison is ready.
 */
export function useHasComparison(): boolean {
  return useCompareCasesStore((state) => state.summary !== null);
}

/**
 * Hook: Check if loading.
 */
export function useIsComparing(): boolean {
  return useCompareCasesStore((state) => state.isLoading);
}
