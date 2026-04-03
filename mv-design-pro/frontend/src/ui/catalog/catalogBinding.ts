import type { CatalogBinding, CatalogNamespace } from './types';

export const CANONICAL_CATALOG_VERSION = '2024.1';

export function buildCatalogBinding(
  catalogNamespace: CatalogNamespace,
  catalogItemId: string,
  catalogItemVersion: string = CANONICAL_CATALOG_VERSION,
): CatalogBinding {
  return {
    catalog_namespace: catalogNamespace,
    catalog_item_id: catalogItemId,
    catalog_item_version: catalogItemVersion,
    materialize: true,
    snapshot_mapping_version: '1.0',
  };
}
