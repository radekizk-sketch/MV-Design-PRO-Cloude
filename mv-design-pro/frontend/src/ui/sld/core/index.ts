/**
 * SLD Core — VisualGraphV1 Contract & Topology Adapter.
 *
 * CANONICAL: Jedyne miejsce prawdy dla kontraktu miedzy Topology Adapter a Layout Engine.
 */

// Contract types
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
