/**
 * Fault Scenarios Types — PR-24
 *
 * All labels in Polish. No project codenames.
 * Deterministic sorting (lexicographic by name).
 */

export type FaultTypeValue = 'SC_3F' | 'SC_2F' | 'SC_1F';

export const FAULT_TYPE_LABELS: Readonly<Record<FaultTypeValue, string>> = {
  SC_3F: 'Zwarcie trójfazowe',
  SC_2F: 'Zwarcie dwufazowe',
  SC_1F: 'Zwarcie jednofazowe',
} as const;

export type FaultImpedanceTypeValue = 'METALLIC';

export const FAULT_IMPEDANCE_LABELS: Readonly<Record<FaultImpedanceTypeValue, string>> = {
  METALLIC: 'Zwarcie metaliczne',
} as const;

export type LocationType = 'BUS' | 'BRANCH';

export const LOCATION_TYPE_LABELS: Readonly<Record<LocationType, string>> = {
  BUS: 'Szyna',
  BRANCH: 'Gałąź',
} as const;

export interface FaultLocation {
  element_ref: string;
  location_type: LocationType;
  position: number | null;
}

export interface ShortCircuitConfig {
  c_factor: number;
  thermal_time_seconds: number;
  include_branch_contributions: boolean;
}

export interface FaultScenario {
  scenario_id: string;
  study_case_id: string;
  name: string;
  analysis_type: string;
  fault_type: FaultTypeValue;
  location: FaultLocation;
  config: ShortCircuitConfig;
  fault_impedance_type: FaultImpedanceTypeValue;
  z0_bus_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  content_hash: string;
}

export interface FaultScenarioListResponse {
  scenarios: FaultScenario[];
  count: number;
}

export interface CreateFaultScenarioRequest {
  name: string;
  fault_type: FaultTypeValue;
  location: FaultLocation;
  config?: ShortCircuitConfig;
  z0_bus_data?: Record<string, unknown>;
}

export interface UpdateFaultScenarioRequest {
  name?: string;
  fault_type?: FaultTypeValue;
  location?: FaultLocation;
  config?: ShortCircuitConfig;
  z0_bus_data?: Record<string, unknown> | null;
}

export interface FixAction {
  action_type: 'OPEN_MODAL' | 'NAVIGATE_TO_ELEMENT' | 'SELECT_CATALOG' | 'ADD_MISSING_DEVICE';
  element_ref: string | null;
  modal_type: string | null;
  payload_hint: Record<string, unknown> | null;
}

export interface EligibilityIssue {
  code: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  message_pl: string;
  element_ref: string | null;
  element_type: string | null;
  fix_action: FixAction | null;
}

export interface ScenarioEligibilityResult {
  analysis_type: string;
  status: 'ELIGIBLE' | 'INELIGIBLE';
  blockers: EligibilityIssue[];
  warnings: EligibilityIssue[];
}

export interface ScenarioSldOverlay {
  scenario_id: string;
  overlay_type: string;
  elements: Array<{
    element_ref: string;
    element_type: string;
    visual_state: string;
    color_token: string;
    stroke_token: string;
    animation_token: string | null;
    numeric_badges: Record<string, number | null>;
  }>;
  legend: Array<{
    color_token: string;
    label: string;
    description: string;
  }>;
  label: string;
}

export function getFaultTypeLabel(type: FaultTypeValue): string {
  return FAULT_TYPE_LABELS[type] ?? type;
}
