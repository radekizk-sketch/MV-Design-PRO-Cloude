/**
 * SLD Core — VisualGraphV1 + LayoutResultV1 + Layout Pipeline.
 *
 * CANONICAL: Jedyne miejsce prawdy dla kontraktow SLD.
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

// Topology Adapter
export { convertToVisualGraph } from './topologyAdapterV1';
export type { TopologyAdapterOptions } from './topologyAdapterV1';

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
