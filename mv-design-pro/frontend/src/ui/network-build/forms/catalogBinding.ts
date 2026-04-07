/**
 * catalogBinding — Helpers for building catalog_binding payloads for
 * domain operations.
 *
 * BINDING: Catalog ref is MANDATORY for physical elements.  These helpers
 * build the canonical binding object sent to POST /enm/ops.
 *
 * Forbidden: auto-defaults, heuristic type selection.
 */

import type { TypeCategory } from '../../catalog/types';

// ---------------------------------------------------------------------------
// Segment kind (SN trunk / branch segment)
// ---------------------------------------------------------------------------

/** Discriminant for the segment element kind (SN level only). */
export type SegmentSelectionKind = 'KABEL_SN' | 'LINIA_NAPOWIETRZNA';

export interface SegmentCatalogConfig {
  /** Category fed to CatalogTypeField for fetching available types. */
  category: TypeCategory;
  /** Domain-level kind string sent in the operation payload. */
  domainKind: string;
}

const SEGMENT_KIND_CONFIG: Record<SegmentSelectionKind, SegmentCatalogConfig> = {
  KABEL_SN: {
    category: 'CABLE',
    domainKind: 'cable',
  },
  LINIA_NAPOWIETRZNA: {
    category: 'LINE',
    domainKind: 'line_overhead',
  },
};

/**
 * Return category + domainKind config for a given segment kind.
 */
export function getSegmentCatalogConfig(kind: SegmentSelectionKind): SegmentCatalogConfig {
  return SEGMENT_KIND_CONFIG[kind];
}

// ---------------------------------------------------------------------------
// Binding builders
// ---------------------------------------------------------------------------

/**
 * Build the catalog_binding payload for a trunk/branch segment operation.
 * Returns null when no catalog type has been selected (validation catches this
 * at form level before calling the backend).
 */
export function buildSegmentCatalogBinding(
  kind: SegmentSelectionKind,
  catalogTypeId: string | null,
): Record<string, string | null> | null {
  if (!catalogTypeId) return null;
  const config = getSegmentCatalogConfig(kind);
  return {
    element_kind: config.domainKind,
    catalog_ref: catalogTypeId,
  };
}

/**
 * Build the catalog_binding payload for a transformer element.
 * Returns null when no catalog type has been selected.
 */
export function buildTransformerCatalogBinding(
  catalogTypeId: string | null,
): Record<string, string | null> | null {
  if (!catalogTypeId) return null;
  return {
    element_kind: 'transformer',
    catalog_ref: catalogTypeId,
  };
}
