/**
 * EnergyNetworkModel (ENM) — TypeScript canonical types.
 *
 * Mirror of backend Pydantic v2 models.
 * Discriminated union on Branch.type.
 */

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export interface GroundingConfig {
  type: 'isolated' | 'petersen_coil' | 'directly_grounded' | 'resistor_grounded';
  r_ohm?: number | null;
  x_ohm?: number | null;
}

export interface BusLimits {
  u_min_pu?: number | null;
  u_max_pu?: number | null;
}

export interface BranchRating {
  in_a?: number | null;
  ith_ka?: number | null;
  idyn_ka?: number | null;
}

export interface GenLimits {
  p_min_mw?: number | null;
  p_max_mw?: number | null;
  q_min_mvar?: number | null;
  q_max_mvar?: number | null;
}

export interface MeasurementRating {
  ratio_primary: number;
  ratio_secondary: number;
  accuracy_class?: string | null;
  burden_va?: number | null;
}

export interface ProtectionSetting {
  function_type: 'overcurrent_50' | 'overcurrent_51' | 'earth_fault_50N'
    | 'earth_fault_51N' | 'directional_67' | 'directional_67N';
  threshold_a?: number | null;
  time_delay_s?: number | null;
  curve_type?: 'DT' | 'IEC_SI' | 'IEC_VI' | 'IEC_EI' | 'IEC_LI' | null;
  is_directional?: boolean;
}

// ---------------------------------------------------------------------------
// Catalog-first: parameter source & overrides
// ---------------------------------------------------------------------------

export type ParameterSource = 'CATALOG' | 'OVERRIDE';

export interface ParameterOverride {
  key: string;
  value: number | string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// ENMElement — base for all elements
// ---------------------------------------------------------------------------

export interface ENMElement {
  id: string;
  ref_id: string;
  name: string;
  tags: string[];
  meta: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Header + Defaults
// ---------------------------------------------------------------------------

export interface ENMDefaults {
  frequency_hz: number;
  unit_system: 'SI';
}

export interface ENMHeader {
  enm_version: '1.0';
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  hash_sha256: string;
  defaults: ENMDefaults;
}

// ---------------------------------------------------------------------------
// Bus
// ---------------------------------------------------------------------------

export interface Bus extends ENMElement {
  voltage_kv: number;
  frequency_hz?: number | null;
  phase_system: '3ph';
  zone?: string | null;
  grounding?: GroundingConfig | null;
  nominal_limits?: BusLimits | null;
}

// ---------------------------------------------------------------------------
// Branches — discriminated union on `type`
// ---------------------------------------------------------------------------

export interface BranchBase extends ENMElement {
  from_bus_ref: string;
  to_bus_ref: string;
  status: 'closed' | 'open';
  catalog_ref?: string | null;
  parameter_source?: ParameterSource | null;
  overrides?: ParameterOverride[] | null;
}

export interface OverheadLine extends BranchBase {
  type: 'line_overhead';
  length_km: number;
  r_ohm_per_km: number;
  x_ohm_per_km: number;
  b_siemens_per_km?: number | null;
  r0_ohm_per_km?: number | null;
  x0_ohm_per_km?: number | null;
  b0_siemens_per_km?: number | null;
  rating?: BranchRating | null;
}

export interface Cable extends BranchBase {
  type: 'cable';
  length_km: number;
  r_ohm_per_km: number;
  x_ohm_per_km: number;
  b_siemens_per_km?: number | null;
  r0_ohm_per_km?: number | null;
  x0_ohm_per_km?: number | null;
  b0_siemens_per_km?: number | null;
  rating?: BranchRating | null;
  insulation?: 'XLPE' | 'PVC' | 'PAPER' | null;
}

export interface SwitchBranch extends BranchBase {
  type: 'switch' | 'breaker' | 'bus_coupler' | 'disconnector';
  r_ohm?: number | null;
  x_ohm?: number | null;
}

export interface FuseBranch extends BranchBase {
  type: 'fuse';
  rated_current_a?: number | null;
  rated_voltage_kv?: number | null;
}

export type Branch = OverheadLine | Cable | SwitchBranch | FuseBranch;

// ---------------------------------------------------------------------------
// Transformer
// ---------------------------------------------------------------------------

export interface Transformer extends ENMElement {
  hv_bus_ref: string;
  lv_bus_ref: string;
  sn_mva: number;
  uhv_kv: number;
  ulv_kv: number;
  uk_percent: number;
  pk_kw: number;
  p0_kw?: number | null;
  i0_percent?: number | null;
  vector_group?: string | null;
  hv_neutral?: GroundingConfig | null;
  lv_neutral?: GroundingConfig | null;
  tap_position?: number | null;
  tap_min?: number | null;
  tap_max?: number | null;
  tap_step_percent?: number | null;
  catalog_ref?: string | null;
  parameter_source?: ParameterSource | null;
  overrides?: ParameterOverride[] | null;
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

export interface Source extends ENMElement {
  bus_ref: string;
  model: 'thevenin' | 'short_circuit_power' | 'external_grid';
  sk3_mva?: number | null;
  ik3_ka?: number | null;
  r_ohm?: number | null;
  x_ohm?: number | null;
  rx_ratio?: number | null;
  r0_ohm?: number | null;
  x0_ohm?: number | null;
  z0_z1_ratio?: number | null;
  c_max?: number | null;
  c_min?: number | null;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export interface Load extends ENMElement {
  bus_ref: string;
  p_mw: number;
  q_mvar: number;
  model: 'pq' | 'zip';
  catalog_ref?: string | null;
  quantity?: number | null;
  parameter_source?: ParameterSource | null;
  overrides?: ParameterOverride[] | null;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export interface Generator extends ENMElement {
  bus_ref: string;
  p_mw: number;
  q_mvar?: number | null;
  gen_type?: 'synchronous' | 'pv_inverter' | 'wind_inverter' | 'bess' | null;
  limits?: GenLimits | null;
  catalog_ref?: string | null;
  quantity?: number | null;
  n_parallel?: number | null;
  parameter_source?: ParameterSource | null;
  overrides?: ParameterOverride[] | null;

  /**
   * Wariant przylaczenia PV/BESS:
   * - 'nn_side': po stronie nN stacji (przez transformator stacji SN/nN)
   * - 'block_transformer': przez transformator blokowy do SN
   * - null: brak informacji → FixAction generator.connection_variant_missing
   */
  connection_variant?: 'nn_side' | 'block_transformer' | null;

  /** Referencja do transformatora blokowego (ref_id). Wymagana przy 'block_transformer'. */
  blocking_transformer_ref?: string | null;

  /** Referencja do stacji (ref_id substacji). Wymagana przy 'nn_side'. */
  station_ref?: string | null;
}

// ---------------------------------------------------------------------------
// Substation (stacja SN/nn — kontener logiczny z rozdzielnicami)
// ---------------------------------------------------------------------------

export interface Substation extends ENMElement {
  station_type: 'gpz' | 'mv_lv' | 'switching' | 'customer';
  bus_refs: string[];
  transformer_refs: string[];
  entry_point_ref?: string | null;
}

// ---------------------------------------------------------------------------
// Bay (pole rozdzielcze SN)
// ---------------------------------------------------------------------------

export interface Bay extends ENMElement {
  bay_role: 'IN' | 'OUT' | 'TR' | 'COUPLER' | 'FEEDER' | 'MEASUREMENT' | 'OZE';
  substation_ref: string;
  bus_ref: string;
  equipment_refs: string[];
  protection_ref?: string | null;
}

// ---------------------------------------------------------------------------
// Junction (węzeł T — rozgałęzienie magistrali)
// ---------------------------------------------------------------------------

export interface Junction extends ENMElement {
  connected_branch_refs: string[];
  junction_type: 'T_node' | 'sectionalizer' | 'recloser_point' | 'NO_point';
}

// ---------------------------------------------------------------------------
// Corridor (magistrala — ciąg linii SN)
// ---------------------------------------------------------------------------

export interface Corridor extends ENMElement {
  corridor_type: 'radial' | 'ring' | 'mixed';
  ordered_segment_refs: string[];
  no_point_ref?: string | null;
}

// ---------------------------------------------------------------------------
// Measurement (przekładnik CT/VT)
// ---------------------------------------------------------------------------

export interface Measurement extends ENMElement {
  measurement_type: 'CT' | 'VT';
  bus_ref: string;
  bay_ref?: string | null;
  rating: MeasurementRating;
  connection: 'star' | 'delta' | 'single_phase';
  purpose: 'protection' | 'metering' | 'combined';
  catalog_ref?: string | null;
  parameter_source?: ParameterSource | null;
  overrides?: ParameterOverride[] | null;
}

// ---------------------------------------------------------------------------
// ProtectionAssignment (przypięcie zabezpieczenia do wyłącznika)
// ---------------------------------------------------------------------------

export interface ProtectionAssignment extends ENMElement {
  breaker_ref: string;
  ct_ref?: string | null;
  vt_ref?: string | null;
  device_type: 'overcurrent' | 'earth_fault' | 'directional_overcurrent'
    | 'distance' | 'differential' | 'custom';
  catalog_ref?: string | null;
  settings: ProtectionSetting[];
  is_enabled: boolean;
  parameter_source?: ParameterSource | null;
  overrides?: ParameterOverride[] | null;
}

// ---------------------------------------------------------------------------
// ROOT
// ---------------------------------------------------------------------------

export interface EnergyNetworkModel {
  header: ENMHeader;
  buses: Bus[];
  branches: Branch[];
  transformers: Transformer[];
  sources: Source[];
  loads: Load[];
  generators: Generator[];
  substations: Substation[];
  bays: Bay[];
  junctions: Junction[];
  corridors: Corridor[];
  measurements: Measurement[];
  protection_assignments: ProtectionAssignment[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  code: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  message_pl: string;
  element_refs: string[];
  wizard_step_hint: string;
  suggested_fix?: string | null;
}

export interface AnalysisAvailability {
  short_circuit_3f: boolean;
  short_circuit_1f: boolean;
  load_flow: boolean;
}

export interface ValidationResult {
  status: 'OK' | 'WARN' | 'FAIL';
  issues: ValidationIssue[];
  analysis_available: AnalysisAvailability;
}

// ---------------------------------------------------------------------------
// Topology Summary (z GET /enm/topology)
// ---------------------------------------------------------------------------

export interface TopologySummary {
  case_id: string;
  substations: Substation[];
  bays: Bay[];
  junctions: Junction[];
  corridors: Corridor[];
  bus_count: number;
  branch_count: number;
  transformer_count: number;
}

// ---------------------------------------------------------------------------
// Readiness Matrix (z GET /enm/readiness)
// ---------------------------------------------------------------------------

export interface AnalysisReadiness {
  short_circuit_3f: boolean;
  short_circuit_1f: boolean;
  load_flow: boolean;
  protection: boolean;
}

export interface TopologyCompleteness {
  has_substations: boolean;
  has_bays: boolean;
  has_junctions: boolean;
  has_corridors: boolean;
}

export interface ElementCounts {
  buses: number;
  branches: number;
  transformers: number;
  sources: number;
  loads: number;
  generators: number;
  substations: number;
  bays: number;
  junctions: number;
  corridors: number;
  measurements: number;
  protection_assignments: number;
}

export interface ReadinessMatrix {
  case_id: string;
  enm_revision: number;
  validation_status: 'OK' | 'WARN' | 'FAIL';
  analysis_readiness: AnalysisReadiness;
  topology_completeness: TopologyCompleteness;
  element_counts: ElementCounts;
}

// ---------------------------------------------------------------------------
// Selection System (SLD ↔ Kreator ↔ Inspektor)
// ---------------------------------------------------------------------------

export interface SelectionRef {
  /** Kanoniczny elementId (= ENMElement.ref_id = ElementRefV1.elementId) */
  elementId: string;
  /** Typ elementu (align z ElementTypeV1) */
  element_type: 'bus' | 'branch' | 'transformer' | 'source' | 'load' | 'generator'
    | 'substation' | 'bay' | 'junction' | 'corridor'
    | 'measurement' | 'protection_assignment';
  /** Krok kreatora powiązany z elementem */
  wizard_step_hint: string;
}

// ---------------------------------------------------------------------------
// Topology Graph Summary (z GET /enm/topology/summary)
// ---------------------------------------------------------------------------

export interface AdjacencyEntry {
  bus_ref: string;
  neighbor_ref: string;
  via_ref: string;
  via_type: string;
}

export interface SpineNode {
  bus_ref: string;
  depth: number;
  is_source: boolean;
  children_refs: string[];
}

export interface TopologyGraphSummary {
  case_id: string;
  enm_revision: number;
  bus_count: number;
  branch_count: number;
  transformer_count: number;
  source_count: number;
  load_count: number;
  generator_count: number;
  measurement_count: number;
  protection_count: number;
  is_radial: boolean;
  has_cycles: boolean;
  adjacency: AdjacencyEntry[];
  spine: SpineNode[];
  lateral_roots: string[];
}

// ---------------------------------------------------------------------------
// Topology Operations (POST /enm/ops)
// ---------------------------------------------------------------------------

export interface TopologyOpIssue {
  code: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  message_pl: string;
  element_ref?: string | null;
}

export interface TopologyOpResult {
  success: boolean;
  op: string;
  created_ref?: string | null;
  issues: TopologyOpIssue[];
  revision: number;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isOverheadLine(b: Branch): b is OverheadLine {
  return b.type === 'line_overhead';
}

export function isCable(b: Branch): b is Cable {
  return b.type === 'cable';
}

export function isSwitchBranch(b: Branch): b is SwitchBranch {
  return ['switch', 'breaker', 'bus_coupler', 'disconnector'].includes(b.type);
}

export function isFuseBranch(b: Branch): b is FuseBranch {
  return b.type === 'fuse';
}
