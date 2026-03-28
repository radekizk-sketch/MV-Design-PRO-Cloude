/**
 * Reguły Catalog-First dla operacji tworzenia elementów krytycznych.
 *
 * Cel: blokować wykonanie operacji domenowej, jeżeli payload nie zawiera
 * wymaganych danych katalogowych dla elementów krytycznych.
 */

type Payload = Record<string, unknown>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const REQUIRED_CATALOG_MESSAGE: Record<string, string> = {
  continue_trunk_segment_sn: 'Wybierz typ linii/kabla z katalogu przed utworzeniem segmentu.',
  start_branch_segment_sn: 'Wybierz typ odgałęzienia z katalogu przed utworzeniem segmentu.',
  insert_station_on_segment_sn: 'Wybierz typ stacji/transformatora z katalogu przed wstawieniem stacji.',
  insert_branch_pole_on_segment_sn: 'Wybierz typ słupa rozgałęźnego z katalogu przed wstawieniem.',
  insert_zksn_on_segment_sn: 'Wybierz typ ZKSN z katalogu przed wstawieniem.',
  add_transformer_sn_nn: 'Wybierz transformator z katalogu przed dodaniem do stacji.',
  insert_section_switch_sn: 'Wybierz aparat z katalogu przed wstawieniem łącznika.',
  connect_secondary_ring_sn: 'Wybierz typ kabla/linii pierścienia z katalogu przed domknięciem pętli.',
  add_pv_inverter_nn: 'Wybierz falownik PV z katalogu przed dodaniem źródła.',
  add_bess_inverter_nn: 'Wybierz falownik i magazyn BESS z katalogu przed dodaniem źródła.',
};

/**
 * Zwraca komunikat błędu walidacji Catalog-First albo null.
 */
export function validateCatalogFirst(op: string, payload: Payload): string | null {
  switch (op) {
    case 'continue_trunk_segment_sn':
      return isNonEmptyString(payload.catalog_binding)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'start_branch_segment_sn':
      return isNonEmptyString(payload.catalog_ref)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'insert_station_on_segment_sn':
    case 'insert_branch_pole_on_segment_sn':
    case 'insert_zksn_on_segment_sn':
      return isNonEmptyString(payload.catalog_ref)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'add_transformer_sn_nn':
      return isNonEmptyString(payload.catalog_ref)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'insert_section_switch_sn':
      return isNonEmptyString(payload.catalog_binding)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'connect_secondary_ring_sn':
      return isNonEmptyString(payload.catalog_binding as string)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'add_pv_inverter_nn':
      return isNonEmptyString(payload.catalog_item_id)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    case 'add_bess_inverter_nn':
      return isNonEmptyString(payload.inverter_catalog_id) && isNonEmptyString(payload.storage_catalog_id)
        ? null
        : REQUIRED_CATALOG_MESSAGE[op];
    default:
      return null;
  }
}
