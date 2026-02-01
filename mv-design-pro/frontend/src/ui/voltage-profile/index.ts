/**
 * FIX-04 — Voltage Profile Chart Module
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Analysis layer (interpretation only)
 * - 100% Polish UI labels
 *
 * This module provides voltage profile visualization for feeders,
 * showing voltage distribution along the network path with
 * configurable limit indicators.
 */

// Main component
export { VoltageProfileChart } from './VoltageProfileChart';

// Sub-components
export { FeederSelector } from './FeederSelector';
export { ProfileOptions } from './ProfileOptions';

// Types
export type {
  Feeder,
  ProfileDataPoint,
  NetworkBus,
  NetworkBranch,
  NetworkSnapshot,
  BusVoltageResult,
  PowerFlowResultForProfile,
  VoltageProfileConfig,
  VoltageViolationType,
} from './types';

// Constants
export {
  DEFAULT_PROFILE_CONFIG,
  VOLTAGE_PROFILE_LABELS,
  VOLTAGE_STATUS_COLORS,
  VIOLATION_COLORS,
} from './types';

// Utilities
export {
  extractFeeders,
  calculateProfileData,
  getProfileStats,
  checkVoltageViolation,
  calculateDeviation,
  formatVoltage,
  formatDistance,
} from './utils';
