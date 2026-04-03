import type { CatalogBinding, CatalogNamespace } from './types';

type SnapshotCatalogElement = Record<string, unknown> | null | undefined;

function readString(
  value: SnapshotCatalogElement,
  key: string,
): string | null {
  const raw = value?.[key];
  if (typeof raw !== 'string') {
    return null;
  }
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

export function readExplicitCatalogNamespace(
  element: SnapshotCatalogElement,
): CatalogNamespace | null {
  return readString(element, 'catalog_namespace') as CatalogNamespace | null;
}

export function readExplicitCatalogVersion(
  element: SnapshotCatalogElement,
): string | null {
  const direct = readString(element, 'catalog_version');
  if (direct) {
    return direct;
  }

  const meta = element?.meta;
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const version = (meta as Record<string, unknown>).catalog_item_version;
  if (typeof version !== 'string') {
    return null;
  }
  const normalized = version.trim();
  return normalized.length > 0 ? normalized : null;
}

export function readExplicitCatalogBinding(
  element: SnapshotCatalogElement,
): CatalogBinding | null {
  const catalogNamespace = readExplicitCatalogNamespace(element);
  const catalogItemId = readString(element, 'catalog_ref');
  const catalogItemVersion = readExplicitCatalogVersion(element);

  if (!catalogNamespace || !catalogItemId || !catalogItemVersion) {
    return null;
  }

  return {
    catalog_namespace: catalogNamespace,
    catalog_item_id: catalogItemId,
    catalog_item_version: catalogItemVersion,
    materialize: true,
    snapshot_mapping_version: '1.0',
  };
}
