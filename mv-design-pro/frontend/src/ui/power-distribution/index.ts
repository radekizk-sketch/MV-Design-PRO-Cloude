/**
 * PowerDistribution Module — Architektura rozdzialu mocy.
 *
 * Exports production-grade station bay creator components.
 */

export { PowerDistributionPage } from './PowerDistributionPage';
export { SldDemonstratorPage } from './SldDemonstratorPage';
export { BaySvgRenderer } from './BaySvgRenderer';
export type { BaySvgRendererProps } from './BaySvgRenderer';
export { usePowerDistributionStore, useStation, useSelectedFieldId, useSelectedDeviceId } from './store';
export { BAY_TEMPLATES, SN_TEMPLATES, NN_TEMPLATES } from './bayTemplates';
export type {
  StationConfig,
  FieldConfig,
  DeviceConfig,
  BayTemplate,
  BayTemplateDevice,
  FieldValidationResult,
} from './types';
export {
  FIELD_ROLE_LABELS_PL,
  DEVICE_TYPE_LABELS_PL,
  EMBEDDING_ROLE_LABELS_PL,
  ELECTRICAL_ROLE_LABELS_PL,
  POWER_PATH_POSITION_LABELS_PL,
} from './types';
