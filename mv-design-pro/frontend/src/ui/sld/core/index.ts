/**
 * SLD Core — VisualGraphV1 + LayoutResultV1 + Layout Pipeline + TopologyInput.
 *
 * CANONICAL: Jedyne miejsce prawdy dla kontraktow SLD.
 * RUN #3C: Domain-driven adapter + TopologyInputReader.
 * RUN #3D: Field/Device modeling + formal trunk↔station embedding.
 */

// VisualGraph contract types
export {
  VISUAL_GRAPH_VERSION,
  NodeTypeV1,
  EdgeTypeV1,
  PortRoleV1,
  canonicalizeVisualGraph,
  computeVisualGraphHash,
  validateVisualGraph,
} from './visualGraph';

export type {
  VisualGraphV1,
  VisualNodeV1,
  VisualEdgeV1,
  VisualPortV1,
  VisualNodeAttributesV1,
  VisualEdgeAttributesV1,
  VisualGraphMetaV1,
  PortRefV1,
  VisualGraphValidationResult,
} from './visualGraph';

// Topology Adapter (public API — delegates to V2 pipeline)
export { convertToVisualGraph } from './topologyAdapterV1';
export type { TopologyAdapterOptions } from './topologyAdapterV1';

// TopologyInputReader (domain types + readers)
export {
  BranchKind,
  DeviceKind,
  GeneratorKind,
  StationKind,
  readTopologyFromENM,
  readTopologyFromSymbols,
} from './topologyInputReader';

export type {
  TopologyInputV1,
  ConnectionNodeV1,
  TopologyBranchV1,
  TopologyDeviceV1,
  TopologyStationV1,
  TopologyGeneratorV1,
  TopologySourceV1,
  TopologyLoadV1,
  TopologyProtectionV1,
  TopologyProtectionFunctionV1,
  TopologyFixAction,
  SymbolBridgeMetadata,
} from './topologyInputReader';

// TopologyAdapterV2 (domain-driven builder)
export { buildVisualGraphFromTopology } from './topologyAdapterV2';
export type { AdapterResultV1 } from './topologyAdapterV2';

// LayoutResult contract types
export {
  LAYOUT_RESULT_VERSION,
  StationBlockType,
  CatalogCategory,
  canonicalizeLayoutResult,
  computeLayoutResultHash,
  validateLayoutResult,
} from './layoutResult';

export type {
  LayoutResultV1,
  NodePlacementV1,
  EdgeRouteV1,
  SwitchgearBlockV1,
  SwitchgearPortV1,
  CatalogRefV1,
  RelayBindingV1,
  LayoutValidationErrorV1,
  PointV1,
  RectangleV1,
  PathSegmentV1,
  LayoutResultValidationResult,
} from './layoutResult';

// Layout Pipeline
export { computeLayout, DEFAULT_LAYOUT_CONFIG } from './layoutPipeline';
export type { LayoutGeometryConfigV1 } from './layoutPipeline';

// Station Block Builder (RUN #3D: adapter mapping + embedding role derivation)
export {
  buildStationBlocks,
  deriveEmbeddingRole,
} from './stationBlockBuilder';

export type {
  SegmentationEdgeSets,
  StationBlockBuildResult,
} from './stationBlockBuilder';

// Field & Device Modeling Contracts (RUN #3D + RUN #3F)
export {
  FieldRoleV1,
  EmbeddingRoleV1,
  DeviceElectricalRoleV1,
  DevicePowerPathPositionV1,
  DeviceTypeV1,
  DeviceRequirementLevel,
  CatalogCategoryV1,
  FieldDeviceFixCodes,
  DEVICE_REQUIREMENT_SETS,
  validateFieldDevices,
  validateStationBlock,
  // Polish taxonomy (RUN #3F)
  PoleTypeV1,
  AparatTypeV1,
  POLE_TO_FIELD_ROLE,
  FIELD_ROLE_TO_POLE,
  APARAT_TO_DEVICE_TYPE,
  DEVICE_TYPE_TO_APARAT,
  POLE_TYPE_LABELS_PL,
  APARAT_TYPE_LABELS_PL,
  // Symbol registry (RUN #3F)
  SldSymbolTypeV1,
  DEVICE_TO_SYMBOL,
  buildApparatusSymbolBinding,
  // Wizard field step (RUN #3F)
  buildWizardFieldStep,
} from './fieldDeviceContracts';

export type {
  FieldV1,
  DeviceV1,
  BusSectionV1,
  StationBlockDetailV1,
  StationBlockPortsV1,
  DeviceAnchorV1,
  FieldTerminalsV1,
  DeviceLogicalBindingsV1,
  DeviceParametersV1,
  CatalogRefDetailV1,
  CatalogRatingsV1,
  DeviceRequirementV1,
  DeviceRequirementSetV1,
  FieldDeviceFixActionV1,
  // Symbol binding (RUN #3F)
  ApparatusSymbolBindingV1,
  // Wizard types (RUN #3F)
  WizardFieldStepV1,
  WizardFieldEntryV1,
  WizardDeviceEntryV1,
} from './fieldDeviceContracts';

// ElementRefV1 — Unified Element Identity Contract (SYSTEM-WIDE)
export {
  ElementTypeV1,
  ElementScopeV1,
  buildElementRefIndex,
} from './elementRef';

export type {
  ElementRefV1,
  CatalogRefV1 as ElementCatalogRefV1,
} from './elementRef';

// ReadinessProfileV1 — Per-analysis readiness with FixActions
export {
  ReadinessAreaV1,
  ReadinessPriority,
  ReadinessGateError,
  groupIssuesByArea,
  getBlockers,
  requireSldReady,
  requireShortCircuitReady,
  requireLoadFlowReady,
  requireExportReady,
  // Field/Device gates (RUN #3F)
  requireFieldsComplete,
  requireDevicesParametrized,
  requireProtectionBindings,
  // PV/BESS transformer gate (RUN #3G)
  requirePvBessTransformerRule,
} from './readinessProfile';

export type {
  ReadinessIssueV1,
  ReadinessProfileV1,
} from './readinessProfile';

// ResultJoinV1 — Bridge: Snapshot + ResultSet → SLD tokens + Inspector facts
export {
  OverlayTokenKindV1,
  InspectorFactSourceV1,
  joinResults,
} from './resultJoin';

export type {
  SldOverlayTokenV1,
  InspectorFactV1,
  ResultJoinV1,
  ElementResultInput,
} from './resultJoin';

// ExportManifestV1 — deterministic export identity seal (KROK 5)
export { buildExportManifest } from './exportManifest';

export type { ExportManifestV1 } from './exportManifest';

// SwitchgearRenderer — deterministic field/apparatus rendering (RUN #3G §3)
export {
  FIELD_COLUMN_PITCH,
  DEVICE_SLOT_HEIGHT,
  DEVICE_SYMBOL_WIDTH,
  DEVICE_SYMBOL_HEIGHT,
  BUS_BAR_HEIGHT,
  OFF_PATH_OFFSET_X,
  BUSBAR_Y,
  renderSwitchgearBlock,
  checkSymbolOverlap,
  validateSymbolRegistry,
  findElementById,
  findDevicesInField,
} from './switchgearRenderer';

export type {
  SwitchgearRenderElementV1,
  SwitchgearRenderResultV1,
  OverlapCheckResultV1,
} from './switchgearRenderer';

// PV/BESS Validation — hard transformer contract (RUN #3G §2)
export {
  validatePvBessConnections,
  canSavePvBessGenerator,
} from './pvBessValidation';

export type {
  PvBessConnectionInputV1,
  PvBessValidationResultV1,
} from './pvBessValidation';

// Geometry Overrides — project mode CAD contract (RUN #3H §2)
export {
  OVERRIDES_VERSION,
  OverrideScopeV1,
  OverrideOperationV1,
  GEOMETRY_GRID_SNAP,
  GeometryFixCodes,
  emptyOverrides,
  canonicalizeOverrides,
  computeOverridesHash,
  snapToGrid,
  snapDeltaToGrid,
  validateOverridesAgainstLayout,
} from './geometryOverrides';

export type {
  ProjectGeometryOverridesV1,
  GeometryOverrideItemV1,
  GeometryOverridePayloadV1,
  MoveDeltaPayloadV1,
  ReorderFieldPayloadV1,
  MoveLabelPayloadV1,
  OverrideValidationErrorV1,
  OverrideValidationResultV1,
  GeometryFixCode,
} from './geometryOverrides';

// Apply Overrides — EffectiveLayout composition (RUN #3H §4)
export {
  applyOverrides,
  checkEffectiveCollisions,
} from './applyOverrides';

export type {
  EffectiveLayoutV1,
  CollisionCheckResultV1,
} from './applyOverrides';

// SwitchgearConfig — Konfiguracja rozdzielnicy (RUN #3I §2)
export {
  SWITCHGEAR_CONFIG_VERSION,
  ConfigIssueSeverity,
  FixActionType,
  SwitchgearConfigValidationCode,
  REQUIRED_DEVICES,
  PV_BESS_SN_ROLES,
  canonicalizeConfig,
  computeConfigHash,
  emptyConfig,
} from './switchgearConfig';

export type {
  SwitchgearConfigV1,
  FieldConfigV1,
  DeviceConfigV1,
  CatalogBindingV1 as ConfigCatalogBindingV1,
  ProtectionBindingV1 as ConfigProtectionBindingV1,
  ConfigValidationIssueV1,
  ConfigFixActionV1,
  SwitchgearConfigValidationResultV1,
} from './switchgearConfig';

// SwitchgearConfig Validator — FE mirror (RUN #3I §2)
export { validateSwitchgearConfig } from './validateSwitchgearConfig';

// SwitchgearConfig API Client (RUN #3I §2)
export {
  fetchSwitchgearConfig,
  saveSwitchgearConfig,
  validateSwitchgearConfigApi,
  mapConfigResponse,
  mapValidateConfigResponse,
} from './switchgearConfigApi';

export type {
  ConfigApiResponse,
  ValidateConfigApiResponse,
} from './switchgearConfigApi';

// Overrides API Client (RUN #3H §3)
export {
  fetchSldOverrides,
  saveSldOverrides,
  validateSldOverrides,
  resetSldOverrides,
  mapResponseToOverrides,
  mapValidateResponse,
} from './overridesApi';

export type {
  OverridesApiResponse,
  ValidateApiResponse,
} from './overridesApi';

// TCC Chart — Time-Current Characteristic chart types and builder
export {
  DEFAULT_TCC_CHART_CONFIG,
  buildTCCCurvePoints,
  mapToLogScale,
  mapFromLogScale,
} from './tccChart';

export type {
  TCCCurveType,
  TCCCurvePointV1,
  TCCCurveDataV1,
  TCCAxisConfigV1,
  TCCChartConfigV1,
  TCCFaultType,
  TCCFaultMarkerV1,
  SelectivityVerdict,
  TCCSelectivityResultV1,
  TCCCurveSettings,
} from './tccChart';

// Export Types — format, request, status, result contracts
export {
  EXPORT_FORMAT_VALUES,
  EXPORT_FORMAT_LABELS_PL,
  EXPORT_STATUS_VALUES,
  EXPORT_STATUS_LABELS_PL,
} from './exportTypes';

export type {
  ExportFormatV1,
  ExportRequestV1,
  ExportStatusV1,
  ExportResultV1,
} from './exportTypes';
