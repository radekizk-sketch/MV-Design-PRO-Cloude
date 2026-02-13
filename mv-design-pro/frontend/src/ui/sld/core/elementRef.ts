/**
 * ElementRefV1 — Unified Element Identity Contract (TypeScript mirror).
 *
 * CANONICAL: Kanoniczny kontrakt identyfikacji elementu w calym systemie.
 * Jedyne zrodlo prawdy: elementId + elementType — identyczne we wszystkich warstwach:
 *   Kreator -> Domena -> Snapshot -> Solver Input -> Wyniki -> SLD -> Eksport
 *
 * ALIGNMENT:
 * - Backend: domain/element_ref.py (ElementRefV1, ElementTypeV1, ElementScopeV1)
 * - ENM: ref_id -> ElementRefV1.elementId
 * - ResultSet: element_ref -> ElementRefV1.elementId
 * - Overlay: ref_id -> ElementRefV1.elementId
 * - SLD TopologyInput: id -> ElementRefV1.elementId
 *
 * INVARIANTS:
 * - Immutable (readonly).
 * - Deterministic (sorted by elementId).
 * - elementId jest stabilny — taki sam we wszystkich warstwach.
 */

// =============================================================================
// ElementTypeV1 — canonical element type enum
// =============================================================================

export const ElementTypeV1 = {
  NODE: 'NODE',
  BRANCH: 'BRANCH',
  TRANSFORMER: 'TRANSFORMER',
  STATION: 'STATION',
  BUS_SECTION: 'BUS_SECTION',
  FIELD: 'FIELD',
  DEVICE: 'DEVICE',
  GENERATOR: 'GENERATOR',
  SOURCE: 'SOURCE',
  LOAD: 'LOAD',
  SWITCH: 'SWITCH',
  PROTECTION_ASSIGNMENT: 'PROTECTION_ASSIGNMENT',
  MEASUREMENT: 'MEASUREMENT',
  CORRIDOR: 'CORRIDOR',
  JUNCTION: 'JUNCTION',
} as const;

export type ElementTypeV1 = (typeof ElementTypeV1)[keyof typeof ElementTypeV1];

// =============================================================================
// ElementScopeV1 — validation-only, not logic-driving
// =============================================================================

export const ElementScopeV1 = {
  DOMAIN: 'DOMAIN',
  SNAPSHOT: 'SNAPSHOT',
  SLD: 'SLD',
  RESULT: 'RESULT',
  EXPORT: 'EXPORT',
} as const;

export type ElementScopeV1 = (typeof ElementScopeV1)[keyof typeof ElementScopeV1];

// =============================================================================
// CatalogRefV1 — reference to catalog entry
// =============================================================================

export interface CatalogRefV1 {
  readonly catalogId: string;
  readonly category: string;
  readonly manufacturer: string | null;
  readonly name: string | null;
  readonly version: string | null;
}

// =============================================================================
// ElementRefV1 — unified identity contract
// =============================================================================

export interface ElementRefV1 {
  readonly elementId: string;
  readonly elementType: ElementTypeV1;
  readonly stationId: string | null;
  readonly catalogRef: CatalogRefV1 | null;
}

// =============================================================================
// Lookup helpers
// =============================================================================

/**
 * Build elementId -> ElementRefV1 index (sorted, deterministic).
 */
export function buildElementRefIndex(
  refs: readonly ElementRefV1[],
): ReadonlyMap<string, ElementRefV1> {
  const sorted = [...refs].sort((a, b) => a.elementId.localeCompare(b.elementId));
  return new Map(sorted.map(ref => [ref.elementId, ref]));
}
