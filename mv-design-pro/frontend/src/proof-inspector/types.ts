export type ProofViewMode = 'EXECUTIVE' | 'ENGINEERING' | 'ACADEMIC';

export interface ProofValueView {
  symbol: string;
  value: string;
  raw_value?: string | number;
  unit: string;
  mapping_key: string;
  alias_pl?: string;
}

export interface UnitCheckView {
  passed: boolean;
  derivation: string;
  expected_unit: string;
  computed_unit: string;
}

export interface StepView {
  step_number: number;
  step_id: string;
  title: string;
  equation_id: string;
  formula_latex: string;
  standard_ref?: string;
  input_values: ProofValueView[];
  substitution_latex: string;
  result: ProofValueView;
  unit_check: UnitCheckView;
  source_keys?: Record<string, string>;
}

export interface SummaryView {
  key_results: Record<string, ProofValueView>;
  unit_check_passed: boolean;
  total_steps: number;
  warnings?: string[];
}

export interface HeaderView {
  project_name: string;
  case_name: string;
  run_timestamp: string;
  solver_version: string;
  analysis_label?: string;
  standard_ref?: string;
  run_id?: string;
  snapshot_id?: string;
  fingerprint?: string;
  fault_location?: string;
  fault_type?: string;
  voltage_factor?: number;
  source_bus?: string;
  target_bus?: string;
}

export interface CounterfactualRow {
  name: string;
  symbol_latex: string;
  unit: string;
  value_a: number;
  value_b: number;
  delta: number;
  step_id?: string;
}

export interface CounterfactualView {
  rows: CounterfactualRow[];
  has_vdrop_data?: boolean;
}

export interface ExportAvailability {
  json: boolean;
  latex: boolean;
  pdf: boolean;
}

export interface ExportPayloads {
  json?: string;
  latex?: string;
  pdfBase64?: string;
}

export interface InspectorView {
  document_id: string;
  artifact_id: string;
  created_at: string;
  proof_type: string;
  title: string;
  header: HeaderView;
  steps: StepView[];
  summary: SummaryView;
  counterfactual?: CounterfactualView;
  is_counterfactual?: boolean;
  export_availability?: Partial<ExportAvailability>;
  export_payloads?: ExportPayloads;
}

export interface StepGroup {
  key: string;
  label: string;
  steps: StepView[];
}

export interface ViewConfig {
  showSummary: boolean;
  showSteps: boolean;
  showUnitChecks: boolean;
  showMappingKeys: boolean;
  showAcademicDetails: boolean;
}
