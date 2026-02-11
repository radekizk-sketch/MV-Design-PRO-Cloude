/**
 * Fault Scenario Types — PR-19
 *
 * Type definitions for fault scenario management.
 * All labels in Polish. No project codenames.
 * No default physical values. No heuristics.
 */

/**
 * Fault type (IEC 60909).
 */
export type FaultType = 'SC_3F' | 'SC_2F' | 'SC_1F';

/**
 * Location type in the network.
 */
export type LocationType = 'BUS' | 'BRANCH';

/**
 * Fault location in the network.
 */
export interface FaultLocation {
  element_ref: string;
  location_type: LocationType;
  position: number | null;
}

/**
 * Short-circuit calculation configuration.
 */
export interface ShortCircuitConfig {
  c_factor: number;
  thermal_time_seconds: number;
  include_branch_contributions: boolean;
}

/**
 * Fault scenario domain object.
 */
export interface FaultScenario {
  scenario_id: string;
  study_case_id: string;
  analysis_type: string;
  fault_type: FaultType;
  location: FaultLocation;
  config: ShortCircuitConfig;
  z0_bus_data: Record<string, unknown> | null;
  content_hash: string;
}

/**
 * Request to create a fault scenario.
 */
export interface CreateFaultScenarioRequest {
  fault_type: FaultType;
  location: FaultLocation;
  config?: Partial<ShortCircuitConfig>;
  z0_bus_data?: Record<string, unknown> | null;
}

/**
 * List response from API.
 */
export interface FaultScenarioListResponse {
  scenarios: FaultScenario[];
  count: number;
}

/**
 * Polish labels for fault types.
 */
export const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  SC_3F: 'Zwarcie trójfazowe',
  SC_2F: 'Zwarcie dwufazowe',
  SC_1F: 'Zwarcie jednofazowe',
};

/**
 * Polish labels for location types.
 */
export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  BUS: 'Szyna',
  BRANCH: 'Gałąź',
};

/**
 * CSS colors for fault types.
 */
export const FAULT_TYPE_COLORS: Record<FaultType, string> = {
  SC_3F: 'text-red-600',
  SC_2F: 'text-orange-600',
  SC_1F: 'text-yellow-600',
};

/**
 * Badge colors for fault types.
 */
export const FAULT_TYPE_BG_COLORS: Record<FaultType, string> = {
  SC_3F: 'bg-red-100 border-red-300',
  SC_2F: 'bg-orange-100 border-orange-300',
  SC_1F: 'bg-yellow-100 border-yellow-300',
};
