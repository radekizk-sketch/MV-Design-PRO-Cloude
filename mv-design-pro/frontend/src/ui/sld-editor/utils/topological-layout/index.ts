/**
 * TOPOLOGICAL AUTO-LAYOUT ENGINE — Public API
 *
 * Silnik auto-layoutu topologicznego SLD.
 * Wspolrzedne sa WYNIKIEM topologii, nie wejsciem.
 *
 * DETERMINIZM: 100% gwarantowany.
 * KOLIZJE: symbol-symbol = FAIL CI.
 *
 * USAGE:
 * ```typescript
 * import {
 *   computeTopologicalLayout,
 *   verifyDeterminism,
 * } from './topological-layout';
 *
 * const result = computeTopologicalLayout(symbols);
 * // result.positions — finalne pozycje
 * // result.roleAssignments — role topologiczne
 * // result.collisionReport — raport kolizji
 * // result.diagnostics — dane diagnostyczne
 * ```
 */

// =============================================================================
// MAIN ENGINE
// =============================================================================

export {
  computeTopologicalLayout,
  processIncrementalUpdate,
  verifyDeterminism,
  deepFreezeSymbols,
} from './topologicalLayoutEngine';

// =============================================================================
// ROLE ASSIGNMENT (Phase 1)
// =============================================================================

export {
  assignTopologicalRoles,
  buildTopologyGraph,
  detectVoltageLevel,
  isPccNode,
  filterPccNodes,
} from './roleAssigner';

// =============================================================================
// GEOMETRIC SKELETON (Phase 2-4)
// =============================================================================

export {
  buildGeometricSkeleton,
  resolveOrientation,
  DEFAULT_GEOMETRY_CONFIG,
} from './geometricSkeleton';

// =============================================================================
// AUTO-INSERT (Phase 5)
// =============================================================================

export {
  processAutoInsert,
  checkInsertStability,
} from './autoInsert';

// =============================================================================
// COLLISION GUARD (Phase 6)
// =============================================================================

export {
  calculateSymbolBounds,
  detectSymbolCollisions,
  resolveSymbolCollisions,
  validateExportMargins,
} from './collisionGuard';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Roles
  TopologicalRole,
  RoleAssignment,
  VoltageLevel,
  CanonicalLayer,

  // Orientation
  GlobalOrientation,
  OrientationConfig,

  // Skeleton
  SkeletonTier,
  FeederSlot,
  BusbarSection,
  BusbarLayout,
  GeometricSkeleton,

  // Config
  LayoutGeometryConfig,

  // Collisions
  SymbolBounds,
  CollisionPair,
  CollisionReport,

  // Auto-insert
  ModelOperation,
  AutoInsertResult,

  // Engine result
  TopologicalLayoutResult,
  LayoutDiagnostics,

  // Topology graph
  TopologyGraph,
  TopologyNode,
  TopologyEdge,
} from './types';
