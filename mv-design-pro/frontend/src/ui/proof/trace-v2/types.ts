/**
 * Trace v2 — TypeScript mirror types (PR-33).
 *
 * CANONICAL ALIGNMENT:
 * - Mirrors backend domain/trace_v2/artifact.py
 * - READ-ONLY types for TraceViewer/TraceCompare
 * - Polish labels for UI
 * - NO physics calculations in frontend
 *
 * RULES (BINDING):
 * - These types may ONLY be imported in:
 *   - ui/proof/trace-v2/
 *   - ui/proof/compare/
 *   - ui/proof/TraceViewer.tsx
 */

// =============================================================================
// Analysis Type
// =============================================================================

export type AnalysisTypeV2 = 'SC' | 'PROTECTION' | 'LOAD_FLOW';

export const ANALYSIS_TYPE_LABELS: Record<AnalysisTypeV2, string> = {
  SC: 'Obliczenia zwarciowe',
  PROTECTION: 'Analiza zabezpieczeń',
  LOAD_FLOW: 'Rozpływ mocy',
};

// =============================================================================
// TraceValue
// =============================================================================

export interface TraceValueV2 {
  name: string;
  value: number | string;
  unit: string;
  label_pl: string;
}

// =============================================================================
// TraceEquationStep
// =============================================================================

export interface TraceEquationStepV2 {
  step_id: string;
  subject_id: string;
  eq_id: string;
  label_pl: string;
  symbolic_latex: string;
  substituted_latex: string;
  inputs_used: string[];
  intermediate_values: Record<string, TraceValueV2>;
  result: TraceValueV2;
  origin: 'input' | 'solver' | 'adapter';
  derived_in_adapter: boolean;
}

// =============================================================================
// TraceArtifactV2
// =============================================================================

export interface TraceArtifactV2 {
  trace_id: string;
  analysis_type: AnalysisTypeV2;
  math_spec_version: string;
  snapshot_hash: string;
  run_hash: string;
  inputs: Record<string, TraceValueV2>;
  equation_steps: TraceEquationStepV2[];
  outputs: Record<string, TraceValueV2>;
  trace_signature: string;
}

// =============================================================================
// TraceDiff types (mirrors backend TraceDiffEngine)
// =============================================================================

export interface TraceDiffEntryV2 {
  key: string;
  value_a: string | null;
  value_b: string | null;
  status: 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED';
}

export interface TraceStepDiffV2 {
  step_id: string;
  status: 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED';
  field_diffs: TraceDiffEntryV2[];
}

export interface TraceDiffSummaryV2 {
  total_steps: number;
  unchanged_count: number;
  changed_count: number;
  added_count: number;
  removed_count: number;
}

export interface TraceDiffResultV2 {
  trace_a_id: string;
  trace_b_id: string;
  input_diffs: TraceDiffEntryV2[];
  step_diffs: TraceStepDiffV2[];
  output_diffs: TraceDiffEntryV2[];
  summary: TraceDiffSummaryV2;
}

// =============================================================================
// Polish labels
// =============================================================================

export const TRACE_V2_ORIGIN_LABELS: Record<string, string> = {
  input: 'Dane wejściowe',
  solver: 'Solver',
  adapter: 'Adapter',
};

export const TRACE_V2_DIFF_STATUS_LABELS: Record<string, string> = {
  UNCHANGED: 'Bez zmian',
  CHANGED: 'Zmieniono',
  ADDED: 'Dodano',
  REMOVED: 'Usunięto',
};

export const TRACE_V2_DIFF_STATUS_COLORS: Record<string, string> = {
  UNCHANGED: 'bg-slate-50 text-slate-600',
  CHANGED: 'bg-amber-50 text-amber-700',
  ADDED: 'bg-green-50 text-green-700',
  REMOVED: 'bg-red-50 text-red-700',
};
