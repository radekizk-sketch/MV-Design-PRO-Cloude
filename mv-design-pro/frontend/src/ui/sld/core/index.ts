/**
 * SLD Core — VisualGraphV1 + LayoutResultV1 + Layout Pipeline + TopologyInput.
 *
 * CANONICAL: Jedyne miejsce prawdy dla kontraktow SLD.
 * RUN #3C: Domain-driven adapter + TopologyInputReader.
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
