import type { CatalogBinding, CatalogNamespace } from '../catalog/types';

export const DEFAULT_CATALOG_VERSION = '2024.1';
export const DEFAULT_CABLE_CATALOG_ID = 'cable-tfk-yakxs-3x120';
export const DEFAULT_TRANSFORMER_CATALOG_ID = 'tr-sn-nn-15-04-630kva-dyn11';

export function buildCatalogBinding(
  catalogNamespace: CatalogNamespace,
  catalogItemId: string,
  catalogItemVersion: string = DEFAULT_CATALOG_VERSION,
): CatalogBinding {
  return {
    catalog_namespace: catalogNamespace,
    catalog_item_id: catalogItemId,
    catalog_item_version: catalogItemVersion,
    materialize: true,
    snapshot_mapping_version: '1.0',
  };
}

export const DEFAULT_CABLE_BINDING = buildCatalogBinding('KABEL_SN', DEFAULT_CABLE_CATALOG_ID);
export const DEFAULT_TRANSFORMER_BINDING = buildCatalogBinding(
  'TRAFO_SN_NN',
  DEFAULT_TRANSFORMER_CATALOG_ID,
);

export function inferCatalogNamespaceFromElement(
  element: Record<string, unknown> | null | undefined,
): CatalogNamespace | null {
  const explicitNamespace = element?.catalog_namespace;
  if (typeof explicitNamespace === 'string' && explicitNamespace.trim()) {
    return explicitNamespace as CatalogNamespace;
  }

  const symbolElementType = element?.elementType;
  if (symbolElementType === 'TransformerBranch') {
    return 'TRAFO_SN_NN';
  }

  if (typeof element?.hv_bus_ref === 'string' && typeof element?.lv_bus_ref === 'string') {
    return 'TRAFO_SN_NN';
  }

  switch (element?.type) {
    case 'cable':
      return 'KABEL_SN';
    case 'line_overhead':
      return 'LINIA_SN';
    case 'transformer':
      return 'TRAFO_SN_NN';
    default:
      return null;
  }
}

export function inferCatalogVersionFromElement(
  element: Record<string, unknown> | null | undefined,
): string {
  const meta = element?.meta;
  if (meta && typeof meta === 'object') {
    const version = (meta as Record<string, unknown>).catalog_item_version;
    if (typeof version === 'string' && version.trim()) {
      return version;
    }
  }
  return DEFAULT_CATALOG_VERSION;
}

export function getDefaultBindingForElement(
  element: Record<string, unknown> | null | undefined,
): CatalogBinding | null {
  const namespace = inferCatalogNamespaceFromElement(element);
  if (!namespace) {
    return null;
  }

  const currentRef = element?.catalog_ref;
  if (typeof currentRef === 'string' && currentRef.trim()) {
    return buildCatalogBinding(namespace, currentRef.trim(), inferCatalogVersionFromElement(element));
  }

  if (namespace === 'TRAFO_SN_NN') {
    return DEFAULT_TRANSFORMER_BINDING;
  }

  if (namespace === 'KABEL_SN' || namespace === 'LINIA_SN') {
    return buildCatalogBinding(namespace, DEFAULT_CABLE_CATALOG_ID, inferCatalogVersionFromElement(element));
  }

  return null;
}
