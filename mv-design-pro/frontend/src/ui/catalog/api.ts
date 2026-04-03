import { buildCatalogBinding } from './catalogBinding';
import type {
  BESSInverterCatalogType,
  CableType,
  CatalogNamespace,
  CTCatalogType,
  LineType,
  LoadCatalogType,
  LVApparatusType,
  LVCableType,
  MVApparatusCatalogType,
  PVInverterCatalogType,
  ProtectionDeviceType,
  SourceSystemCatalogType,
  SwitchEquipmentType,
  TransformerType,
  TypeCategory,
  VTCatalogType,
} from './types';

export class CatalogApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly detail: string | null,
    public readonly endpoint: string,
  ) {
    super(`${status} ${statusText}: ${detail ?? 'No detail'}`);
    this.name = 'CatalogApiError';
  }
}

export type CatalogListItem =
  | LineType
  | CableType
  | TransformerType
  | SwitchEquipmentType
  | MVApparatusCatalogType
  | LVApparatusType
  | LVCableType
  | LoadCatalogType
  | CTCatalogType
  | VTCatalogType
  | PVInverterCatalogType
  | BESSInverterCatalogType
  | ProtectionDeviceType
  | SourceSystemCatalogType;

const DECATALOGING_BLOCKED_MESSAGE =
  'Odkatalogowanie elementów technicznych jest niedostępne w trybie katalog-first.';
const NETWORK_ERROR_MESSAGE =
  'Nie mozna polaczyc sie z API katalogow. Uruchom backend i odswiez widok.';
const CATALOG_OPERATION_ERROR_MESSAGE =
  'Nie udalo sie wykonac operacji katalogowej. Sprobuj ponownie.';

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let detail: string | null = null;
    try {
      const body = await response.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      detail = null;
    }
    throw new CatalogApiError(response.status, response.statusText, detail, endpoint);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function normalizeCatalogRequestError(error: unknown): Error {
  if (error instanceof CatalogApiError) {
    return error;
  }
  if (error instanceof Error && error.message === NETWORK_ERROR_MESSAGE) {
    return error;
  }
  if (error instanceof TypeError || (error instanceof Error && error.message === 'Failed to fetch')) {
    return new Error(NETWORK_ERROR_MESSAGE);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(CATALOG_OPERATION_ERROR_MESSAGE);
}

async function requestCatalog<T>(endpoint: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(endpoint, init);
    return await handleResponse<T>(response, endpoint);
  } catch (error) {
    throw normalizeCatalogRequestError(error);
  }
}

async function fetchCatalogJson<T>(endpoint: string): Promise<T> {
  return requestCatalog<T>(endpoint);
}

async function postCatalogJson<T>(endpoint: string, body: unknown): Promise<T> {
  return requestCatalog<T>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchLineTypes(): Promise<LineType[]> {
  return fetchCatalogJson<LineType[]>('/api/catalog/line-types');
}

export async function fetchCableTypes(): Promise<CableType[]> {
  return fetchCatalogJson<CableType[]>('/api/catalog/cable-types');
}

export async function fetchTransformerTypes(): Promise<TransformerType[]> {
  return fetchCatalogJson<TransformerType[]>('/api/catalog/transformer-types');
}

export async function fetchSwitchEquipmentTypes(): Promise<SwitchEquipmentType[]> {
  return fetchCatalogJson<SwitchEquipmentType[]>('/api/catalog/switch-equipment-types');
}

export async function fetchMvApparatusTypes(): Promise<MVApparatusCatalogType[]> {
  return fetchCatalogJson<MVApparatusCatalogType[]>('/api/catalog/mv-apparatus-types');
}

export async function fetchLvApparatusTypes(): Promise<LVApparatusType[]> {
  return fetchCatalogJson<LVApparatusType[]>('/api/catalog/lv-apparatus-types');
}

export async function fetchLvCableTypes(): Promise<LVCableType[]> {
  return fetchCatalogJson<LVCableType[]>('/api/catalog/lv-cable-types');
}

export async function fetchLoadTypes(): Promise<LoadCatalogType[]> {
  return fetchCatalogJson<LoadCatalogType[]>('/api/catalog/load-types');
}

export async function fetchCtTypes(): Promise<CTCatalogType[]> {
  return fetchCatalogJson<CTCatalogType[]>('/api/catalog/ct-types');
}

export async function fetchVtTypes(): Promise<VTCatalogType[]> {
  return fetchCatalogJson<VTCatalogType[]>('/api/catalog/vt-types');
}

export async function fetchPvInverterTypes(): Promise<PVInverterCatalogType[]> {
  return fetchCatalogJson<PVInverterCatalogType[]>('/api/catalog/pv-inverter-types');
}

export async function fetchBessInverterTypes(): Promise<BESSInverterCatalogType[]> {
  return fetchCatalogJson<BESSInverterCatalogType[]>('/api/catalog/bess-inverter-types');
}

export async function fetchSourceSystemTypes(): Promise<SourceSystemCatalogType[]> {
  return fetchCatalogJson<SourceSystemCatalogType[]>('/api/catalog/source-system-types');
}

export async function fetchProtectionDeviceTypes(): Promise<ProtectionDeviceType[]> {
  const raw = await fetchCatalogJson<Array<Record<string, unknown>>>('/api/catalog/protection/device-types');
  return raw.map((item) => {
    const params =
      typeof item.params === 'object' && item.params !== null
        ? (item.params as Record<string, unknown>)
        : item;
    const vendor =
      typeof params.vendor === 'string'
        ? params.vendor
        : typeof item.vendor === 'string'
          ? item.vendor
          : undefined;
    return {
      id: String(item.id ?? ''),
      name: String(item.name_pl ?? item.name ?? params.name_pl ?? params.name ?? item.id ?? ''),
      manufacturer: vendor,
      vendor,
      model:
        typeof params.model === 'string'
          ? params.model
          : typeof item.model === 'string'
            ? item.model
            : undefined,
      series:
        typeof params.series === 'string'
          ? params.series
          : typeof item.series === 'string'
            ? item.series
            : undefined,
      rated_current_a:
        typeof params.rated_current_a === 'number'
          ? params.rated_current_a
          : typeof item.rated_current_a === 'number'
            ? item.rated_current_a
            : undefined,
      notes_pl:
        typeof params.notes_pl === 'string'
          ? params.notes_pl
          : typeof item.notes_pl === 'string'
            ? item.notes_pl
            : undefined,
      source_catalog:
        typeof params.source_catalog === 'string'
          ? params.source_catalog
          : typeof item.source_catalog === 'string'
            ? item.source_catalog
            : undefined,
      unverified:
        typeof params.unverified === 'boolean'
          ? params.unverified
          : typeof item.unverified === 'boolean'
            ? item.unverified
            : undefined,
      unverified_ranges:
        typeof params.unverified_ranges === 'boolean'
          ? params.unverified_ranges
          : typeof item.unverified_ranges === 'boolean'
            ? item.unverified_ranges
            : undefined,
      functions_supported: Array.isArray(params.functions_supported)
        ? params.functions_supported.filter((value): value is string => typeof value === 'string')
        : undefined,
      curves_supported: Array.isArray(params.curves_supported)
        ? params.curves_supported.filter((value): value is string => typeof value === 'string')
        : undefined,
    };
  });
}

function sortCatalogItems(items: CatalogListItem[]): CatalogListItem[] {
  return [...items].sort((a, b) => {
    const recordA = a as unknown as Record<string, unknown>;
    const recordB = b as unknown as Record<string, unknown>;
    const manufacturerA =
      typeof recordA.manufacturer === 'string'
        ? recordA.manufacturer
        : typeof recordA.vendor === 'string'
          ? recordA.vendor
          : null;
    const manufacturerB =
      typeof recordB.manufacturer === 'string'
        ? recordB.manufacturer
        : typeof recordB.vendor === 'string'
          ? recordB.vendor
          : null;

    if (manufacturerA == null && manufacturerB != null) return 1;
    if (manufacturerA != null && manufacturerB == null) return -1;
    if (manufacturerA != null && manufacturerB != null) {
      if (manufacturerA < manufacturerB) return -1;
      if (manufacturerA > manufacturerB) return 1;
    }

    const nameA = typeof recordA.name === 'string' ? recordA.name : String(recordA.id ?? '');
    const nameB = typeof recordB.name === 'string' ? recordB.name : String(recordB.id ?? '');
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;

    const idA = String(recordA.id ?? '');
    const idB = String(recordB.id ?? '');
    if (idA < idB) return -1;
    if (idA > idB) return 1;

    return 0;
  });
}

export async function fetchTypesByCategory(category: TypeCategory): Promise<CatalogListItem[]> {
  let types: CatalogListItem[];

  switch (category) {
    case 'LINE':
      types = await fetchLineTypes();
      break;
    case 'CABLE':
      types = await fetchCableTypes();
      break;
    case 'TRANSFORMER':
      types = await fetchTransformerTypes();
      break;
    case 'SWITCH_EQUIPMENT':
      types = await fetchSwitchEquipmentTypes();
      break;
    case 'MV_APPARATUS':
      types = await fetchMvApparatusTypes();
      break;
    case 'LV_APPARATUS':
      types = await fetchLvApparatusTypes();
      break;
    case 'LV_CABLE':
      types = await fetchLvCableTypes();
      break;
    case 'LOAD':
      types = await fetchLoadTypes();
      break;
    case 'CT':
      types = await fetchCtTypes();
      break;
    case 'VT':
      types = await fetchVtTypes();
      break;
    case 'MEASUREMENT_TRANSFORMER':
      types = [...(await fetchCtTypes()), ...(await fetchVtTypes())];
      break;
    case 'PV_INVERTER':
      types = await fetchPvInverterTypes();
      break;
    case 'BESS_INVERTER':
      types = await fetchBessInverterTypes();
      break;
    case 'CONVERTER':
      types = [...(await fetchPvInverterTypes()), ...(await fetchBessInverterTypes())];
      break;
    case 'PROTECTION_DEVICE':
      types = await fetchProtectionDeviceTypes();
      break;
    case 'SYSTEM_SOURCE':
      types = await fetchSourceSystemTypes();
      break;
    default:
      throw new Error(`Unknown category: ${category}`);
  }

  return sortCatalogItems(types);
}

export async function assignTypeToBranch(
  projectId: string,
  branchId: string,
  typeId: string,
  catalogNamespace: CatalogNamespace = 'KABEL_SN',
): Promise<void> {
  const endpoint = `/api/cases/${projectId}/enm/domain-ops`;
  await postCatalogJson<void>(endpoint, {
    operation: 'assign_catalog_to_element',
    payload: {
      element_ref: branchId,
      catalog_binding: buildCatalogBinding(catalogNamespace, typeId),
      source_mode: 'KATALOG',
    },
  });
}

export async function assignTypeToTransformer(
  projectId: string,
  transformerId: string,
  typeId: string,
): Promise<void> {
  const endpoint = `/api/cases/${projectId}/enm/domain-ops`;
  await postCatalogJson<void>(endpoint, {
    operation: 'assign_catalog_to_element',
    payload: {
      element_ref: transformerId,
      catalog_binding: buildCatalogBinding('TRAFO_SN_NN', typeId),
      source_mode: 'KATALOG',
    },
  });
}

export async function assignEquipmentTypeToSwitch(
  projectId: string,
  switchId: string,
  typeId: string,
  catalogNamespace: CatalogNamespace = 'APARAT_SN',
): Promise<void> {
  const endpoint = `/api/cases/${projectId}/enm/domain-ops`;
  await postCatalogJson<void>(endpoint, {
    operation: 'assign_catalog_to_element',
    payload: {
      element_ref: switchId,
      catalog_binding: buildCatalogBinding(catalogNamespace, typeId),
      source_mode: 'KATALOG',
    },
  });
}

export async function clearTypeFromBranch(_projectId: string, _branchId: string): Promise<void> {
  throw new Error(DECATALOGING_BLOCKED_MESSAGE);
}

export async function clearTypeFromTransformer(
  _projectId: string,
  _transformerId: string,
): Promise<void> {
  throw new Error(DECATALOGING_BLOCKED_MESSAGE);
}

export async function clearEquipmentTypeFromSwitch(
  _projectId: string,
  _switchId: string,
): Promise<void> {
  throw new Error(DECATALOGING_BLOCKED_MESSAGE);
}

export async function exportTypeLibrary(params?: {
  library_name_pl?: string;
  vendor?: string;
  series?: string;
  revision?: string;
  description_pl?: string;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.library_name_pl) queryParams.set('library_name_pl', params.library_name_pl);
  if (params?.vendor) queryParams.set('vendor', params.vendor);
  if (params?.series) queryParams.set('series', params.series);
  if (params?.revision) queryParams.set('revision', params.revision);
  if (params?.description_pl) queryParams.set('description_pl', params.description_pl);

  const queryString = queryParams.toString();
  const endpoint = `/api/catalog/export${queryString ? `?${queryString}` : ''}`;
  return fetchCatalogJson<any>(endpoint);
}

export async function importTypeLibrary(
  data: any,
  mode: 'merge' | 'replace' = 'merge',
): Promise<any> {
  const endpoint = `/api/catalog/import?mode=${mode}`;
  return postCatalogJson<any>(endpoint, data);
}
