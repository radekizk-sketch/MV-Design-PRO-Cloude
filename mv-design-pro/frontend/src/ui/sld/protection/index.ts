/**
 * Protection View Module — PR-SLD-09
 *
 * Eksporty dla widoku zabezpieczeniowego SLD.
 */

// Types
export type {
  OvercurrentCharacteristicType,
  ProtectionVerificationStatus,
  OvercurrentTimeSetting,
  OvercurrentInstantSetting,
  OvercurrentProtectionSettings,
  CurrentTransformerInfo,
  ProtectionSummary,
} from './types';

export {
  OC_CHARACTERISTIC_LABELS_PL,
  VERIFICATION_STATUS_LABELS_PL,
  VERIFICATION_STATUS_COLORS,
  PROTECTION_FIELD_LABELS_PL,
  PROTECTION_SECTION_LABELS_PL,
} from './types';

// Hooks & Selectors
export {
  useProtectionSummary,
  useAllProtectionSummaries,
  useHasProtectionData,
  useProtectionStatistics,
  selectProtectionSummaryByElementId,
} from './useProtectionSummary';
