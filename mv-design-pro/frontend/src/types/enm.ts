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
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  code: string;
  severity: 'BLOCKER' | 'IMPORTANT' | 'INFO';
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
