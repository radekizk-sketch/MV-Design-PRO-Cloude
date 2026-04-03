/**
 * Reguly Catalog-First dla aktywnych operacji tworzenia elementow technicznych.
 *
 * Formularze FE maja emitowac kanoniczne payloady:
 * - segmenty: segment.catalog_binding
 * - stacje na odcinku: transformer.catalog_binding
 * - transformatory, laczniki i GPZ: payload.catalog_binding
 * - PV/BESS: pv_spec.catalog_item_id oraz bess_spec.inverter_catalog_id/storage_catalog_id
 */

type Payload = Record<string, unknown>;

function asPayload(value: unknown): Payload | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  return value as Payload;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCatalogBinding(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.catalog_item_id);
}

function hasCatalogInSegment(payload: Payload): boolean {
  const segment = asPayload(payload.segment);
  return (
    segment !== null
    && hasCatalogBinding(segment.catalog_binding)
  );
}

function hasPvCatalog(payload: Payload): boolean {
  const pvSpec = asPayload(payload.pv_spec);
  return pvSpec !== null && isNonEmptyString(pvSpec.catalog_item_id);
}

function hasBessCatalog(payload: Payload): boolean {
  const bessSpec = asPayload(payload.bess_spec);
  return (
    bessSpec !== null
    && isNonEmptyString(bessSpec.inverter_catalog_id)
    && isNonEmptyString(bessSpec.storage_catalog_id)
  );
}

const REQUIRED_CATALOG_MESSAGE: Record<string, string> = {
  continue_trunk_segment_sn: 'Wybierz typ linii lub kabla z katalogu przed utworzeniem segmentu.',
  start_branch_segment_sn: 'Wybierz typ odgałęzienia z katalogu przed utworzeniem segmentu.',
  insert_station_on_segment_sn: 'Wybierz transformator z katalogu przed wstawieniem stacji.',
  insert_branch_pole_on_segment_sn: 'Wybierz typ słupa rozgałęźnego z katalogu przed wstawieniem.',
  insert_zksn_on_segment_sn: 'Wybierz typ ZKSN z katalogu przed wstawieniem.',
  add_transformer_sn_nn: 'Wybierz transformator z katalogu przed dodaniem do stacji.',
  insert_section_switch_sn: 'Wybierz aparat z katalogu przed wstawieniem lacznika.',
  connect_secondary_ring_sn: 'Wybierz typ kabla lub linii pierscienia z katalogu przed domknieciem petli.',
  add_grid_source_sn: 'Wybierz zrodlo systemowe z katalogu przed utworzeniem zasilania GPZ.',
  add_pv_inverter_nn: 'Wybierz falownik PV z katalogu przed dodaniem zrodla.',
  add_bess_inverter_nn: 'Wybierz falownik i magazyn BESS z katalogu przed dodaniem zrodla.',
};

/**
 * Zwraca komunikat bledu walidacji Catalog-First albo null.
 */
export function validateCatalogFirst(op: string, payload: Payload): string | null {
  switch (op) {
    case 'continue_trunk_segment_sn':
    case 'start_branch_segment_sn':
    case 'connect_secondary_ring_sn':
      return hasCatalogInSegment(payload) ? null : REQUIRED_CATALOG_MESSAGE[op];
    case 'insert_station_on_segment_sn': {
      const transformer = asPayload(payload.transformer);
      return (
        transformer !== null
        && hasCatalogBinding(transformer.catalog_binding)
      )
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    }
    case 'insert_branch_pole_on_segment_sn':
    case 'insert_zksn_on_segment_sn':
    case 'insert_section_switch_sn':
    case 'add_grid_source_sn':
      return hasCatalogBinding(payload.catalog_binding)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'add_transformer_sn_nn':
      return hasCatalogBinding(payload.catalog_binding)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'add_pv_inverter_nn':
      return hasPvCatalog(payload) ? null : REQUIRED_CATALOG_MESSAGE[op];
    case 'add_bess_inverter_nn':
      return hasBessCatalog(payload) ? null : REQUIRED_CATALOG_MESSAGE[op];
    default:
      return null;
  }
}
