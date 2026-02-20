/**
 * Bramka katalogowa UI — sprawdzenie wymagania katalogu przed operacja.
 *
 * REGULA: Frontend NIGDY nie wysyla operacji tworzacej segment lub transformator
 * bez wypelnionego catalog_binding w payload.
 *
 * Pipeline:
 *   operationId → requiresCatalog(operationId) → catalogNamespace(operationId) → CatalogPicker
 *
 * INVARIANTS:
 * - Mapa operacja → namespace jest deterministyczna
 * - Brak heurystyk — jesli operacja wymaga katalogu, MUSI miec binding
 * - 100% Polish labels
 */

/**
 * Namespace katalogu — mapuje na backend `_infer_namespace()`.
 */
export type CatalogNamespace =
  | 'KABEL_SN'
  | 'TRAFO_SN_NN'
  | 'APARAT_SN'
  | 'APARAT_NN'
  | 'ZRODLO_NN_PV'
  | 'ZRODLO_NN_BESS'
  | 'ZABEZPIECZENIE'
  | 'CT'
  | 'VT'
  | 'OBCIAZENIE';

/**
 * Operacje wymagajace bramy katalogowej.
 * Mapowanie 1:1 z backend _CATALOG_REQUIRED_OPERATIONS.
 */
const CATALOG_REQUIRED_OPERATIONS: Record<string, CatalogNamespace> = {
  continue_trunk_segment_sn: 'KABEL_SN',
  start_branch_segment_sn: 'KABEL_SN',
  insert_station_on_segment_sn: 'TRAFO_SN_NN',
  add_transformer_sn_nn: 'TRAFO_SN_NN',
  connect_secondary_ring_sn: 'KABEL_SN',
  insert_section_switch_sn: 'APARAT_SN',
  add_nn_outgoing_field: 'APARAT_NN',
  add_pv_inverter_nn: 'ZRODLO_NN_PV',
  add_bess_inverter_nn: 'ZRODLO_NN_BESS',
  add_relay: 'ZABEZPIECZENIE',
  add_ct: 'CT',
  add_vt: 'VT',
};

/**
 * Mapowanie context menu action ID → canonical operation name.
 * Uzywane do przelozenia kliknietego przycisku menu na operacje domenowa.
 */
const ACTION_TO_OPERATION: Record<string, string> = {
  // K2: Terminal
  add_trunk_segment: 'continue_trunk_segment_sn',
  // K3: Segment
  insert_station_a: 'insert_station_on_segment_sn',
  insert_station_b: 'insert_station_on_segment_sn',
  insert_station_c: 'insert_station_on_segment_sn',
  insert_station_d: 'insert_station_on_segment_sn',
  insert_section_switch: 'insert_section_switch_sn',
  insert_disconnector: 'insert_section_switch_sn',
  // K4: Branch
  add_branch: 'start_branch_segment_sn',
  // K5: Ring
  start_secondary_link: 'connect_secondary_ring_sn',
  // Station
  add_transformer: 'add_transformer_sn_nn',
  // nN
  add_nn_feeder: 'add_nn_outgoing_field',
  add_feeder: 'add_nn_outgoing_field',
  add_pv: 'add_pv_inverter_nn',
  add_bess: 'add_bess_inverter_nn',
  add_relay: 'add_relay',
  add_ct: 'add_ct',
  add_vt: 'add_vt',
  add_line: 'continue_trunk_segment_sn',
  // Direct catalog operations
  add_load: 'add_nn_load',
};

/**
 * Sprawdz czy operacja wymaga bramy katalogowej.
 */
export function requiresCatalog(operationId: string): boolean {
  const canonicalOp = ACTION_TO_OPERATION[operationId] ?? operationId;
  return canonicalOp in CATALOG_REQUIRED_OPERATIONS;
}

/**
 * Pobierz namespace katalogu dla operacji.
 * Zwraca undefined jesli operacja nie wymaga katalogu.
 */
export function catalogNamespace(operationId: string): CatalogNamespace | undefined {
  const canonicalOp = ACTION_TO_OPERATION[operationId] ?? operationId;
  return CATALOG_REQUIRED_OPERATIONS[canonicalOp];
}

/**
 * Pobierz polska etykiete dla namespace katalogu.
 */
export function catalogNamespaceLabel(ns: CatalogNamespace): string {
  const labels: Record<CatalogNamespace, string> = {
    KABEL_SN: 'Kabel/linia SN',
    TRAFO_SN_NN: 'Transformator SN/nN',
    APARAT_SN: 'Aparat SN',
    APARAT_NN: 'Aparat nN',
    ZRODLO_NN_PV: 'Falownik PV',
    ZRODLO_NN_BESS: 'Falownik BESS',
    ZABEZPIECZENIE: 'Zabezpieczenie',
    CT: 'Przekladnik pradowy',
    VT: 'Przekladnik napieciowy',
    OBCIAZENIE: 'Obciazenie',
  };
  return labels[ns];
}

/**
 * Przeloz action ID na kanonyczna nazwe operacji.
 */
export function resolveCanonicalOperation(actionId: string): string {
  return ACTION_TO_OPERATION[actionId] ?? actionId;
}

/**
 * Interfejs wynikowy bramy katalogowej.
 */
export interface CatalogGateResult {
  /** Czy operacja wymaga katalogu */
  required: boolean;
  /** Namespace katalogu (jesli wymagany) */
  namespace?: CatalogNamespace;
  /** Polska etykieta (jesli wymagany) */
  label?: string;
  /** Kanonyczna nazwa operacji */
  canonicalOperation: string;
}

/**
 * Sprawdz brame katalogowa dla danej akcji.
 */
export function checkCatalogGate(actionId: string): CatalogGateResult {
  const canonicalOp = resolveCanonicalOperation(actionId);
  const ns = catalogNamespace(actionId);
  if (ns) {
    return {
      required: true,
      namespace: ns,
      label: catalogNamespaceLabel(ns),
      canonicalOperation: canonicalOp,
    };
  }
  return {
    required: false,
    canonicalOperation: canonicalOp,
  };
}
