/**
 * Typy operacji domenowych — budowa sieci SN od GPZ.
 * Lustrzane odbicie backend domain_ops_models.py.
 */

// --- Envelope ---
export interface DomainOpEnvelope {
  project_id: string;
  snapshot_base_hash: string;
  operation: {
    name: CanonicalOpName;
    idempotency_key: string;
    payload: Record<string, unknown>;
  };
}

// --- Canonical operation names ---
export type CanonicalOpName =
  | 'add_grid_source_sn'
  | 'continue_trunk_segment_sn'
  | 'insert_station_on_segment_sn'
  | 'start_branch_segment_sn'
  | 'insert_section_switch_sn'
  | 'connect_secondary_ring_sn'
  | 'set_normal_open_point'
  | 'add_transformer_sn_nn'
  | 'assign_catalog_to_element'
  | 'update_element_parameters';

export const ALIAS_MAP: Record<string, CanonicalOpName> = {
  add_trunk_segment_sn: 'continue_trunk_segment_sn',
  add_branch_segment_sn: 'start_branch_segment_sn',
  start_branch_from_port: 'start_branch_segment_sn',
  insert_station_on_trunk_segment_sn: 'insert_station_on_segment_sn',
  connect_ring_sn: 'connect_secondary_ring_sn',
};

// --- Response ---
export interface DomainOpResponse {
  snapshot: Record<string, unknown>;
  logical_views: Record<string, unknown>;
  readiness: ReadinessInfo;
  fix_actions: FixActionItem[];
  changes: ChangeSet;
  selection_hint: SelectionHint | null;
  audit_trail: AuditEntry[];
  domain_events: DomainEvent[];
}

export interface ReadinessInfo {
  ready: boolean;
  blockers: ReadinessBlocker[];
  warnings: ReadinessWarning[];
}

export interface ReadinessBlocker {
  code: string;
  severity: 'BLOKUJACE';
  message_pl: string;
  element_ref: string | null;
}

export interface ReadinessWarning {
  code: string;
  severity: 'OSTRZEZENIE';
  message_pl: string;
  element_ref: string | null;
}

export interface FixActionItem {
  code: string;
  action_type: 'OPEN_MODAL' | 'NAVIGATE_TO_ELEMENT' | 'SELECT_CATALOG' | 'ADD_MISSING_DEVICE';
  element_ref: string | null;
  panel: string | null;
  step: string | null;
  focus: string | null;
  message_pl: string;
}

export interface ChangeSet {
  created_element_ids: string[];
  updated_element_ids: string[];
  deleted_element_ids: string[];
}

export interface SelectionHint {
  element_id: string | null;
  element_type: string | null;
  zoom_to: boolean;
}

export interface AuditEntry {
  step: number;
  action: string;
  element_id: string | null;
  detail: string;
}

export interface DomainEvent {
  event_seq: number;
  event_type: string;
  element_id: string | null;
  detail: string;
}

// --- InsertAt ---
export type InsertAtMode = 'RATIO' | 'ODLEGLOSC_OD_POCZATKU_M' | 'ANCHOR';

export interface InsertAt {
  mode: InsertAtMode;
  value: number | AnchorValue;
}

export interface AnchorValue {
  anchor_id: string;
  offset_m: number;
}

// --- Insert at UI labels (mapping) ---
export function mapUILabelToInsertAt(label: string, value?: number): InsertAt {
  switch (label) {
    case 'SRODEK_ODCINKA':
      return { mode: 'RATIO', value: 0.5 };
    case 'PODZIAL_WSPOLCZYNNIKIEM':
      return { mode: 'RATIO', value: value ?? 0.5 };
    case 'ODLEGLOSC_OD_POCZATKU':
      return { mode: 'ODLEGLOSC_OD_POCZATKU_M', value: value ?? 0 };
    default:
      return { mode: 'RATIO', value: 0.5 };
  }
}

// --- Segment spec ---
export interface SegmentSpec {
  rodzaj: 'KABEL' | 'LINIA_NAPOWIETRZNA';
  dlugosc_m: number;
  catalog_ref: string | null;
  name: string | null;
}

// --- Station ---
export type StationType = 'A' | 'B' | 'C' | 'D';

export interface StationSpec {
  station_type: StationType;
  station_role: 'STACJA_SN_NN';
  station_name: string | null;
  sn_voltage_kv: number;
  nn_voltage_kv: number;
}

// --- SN Field ---
export type SNFieldRole = 'LINIA_IN' | 'LINIA_OUT' | 'LINIA_ODG' | 'TRANSFORMATOROWE' | 'SPRZEGLO';

export interface SNFieldSpec {
  field_role: SNFieldRole;
  apparatus_plan: string[];
  catalog_bindings: CatalogBindings | null;
}

export interface CatalogBindings {
  line_catalog_ref: string | null;
  switch_catalog_ref: string | null;
  ct_catalog_ref: string | null;
  vt_catalog_ref: string | null;
}

// --- Transformer ---
export interface TransformerSpec {
  create: true;
  transformer_catalog_ref: string | null;
  model_type: 'DWU_UZWOJENIOWY';
  tap_changer_present: boolean;
}

// --- NN Block ---
export type NNFeederRole = 'ODPLYW_NN' | 'ODPLYW_REZERWOWY' | 'ZRODLO_NN_PV' | 'ZRODLO_NN_BESS';

export interface NNFeederSpec {
  feeder_role: NNFeederRole;
  catalog_bindings: CatalogBindings | null;
}

export interface NNBlockSpec {
  create_nn_bus: true;
  main_breaker_nn: true;
  outgoing_feeders_nn_count: number;
  outgoing_feeders_nn: NNFeederSpec[];
}

// --- Operation payloads ---
export interface AddGridSourceSNPayload {
  source_name?: string;
  bus_name?: string;
  voltage_kv: number;
  sk3_mva?: number;
  ik3_ka?: number;
  rx_ratio?: number;
}

export interface ContinueTrunkSegmentSNPayload {
  trunk_id: string;
  from_terminal_id: string;
  segment: SegmentSpec;
  parametry_jawne?: Record<string, unknown>;
}

export interface InsertStationOnSegmentSNPayload {
  segment_id: string;
  insert_at: InsertAt;
  station: StationSpec;
  sn_fields: SNFieldSpec[];
  transformer: TransformerSpec;
  nn_block: NNBlockSpec;
  options: {
    create_transformer_field: boolean;
    create_default_fields: boolean;
    create_nn_bus: boolean;
  };
}

export interface StartBranchSegmentSNPayload {
  from_bus_ref: string;
  from_port?: string;
  segment: SegmentSpec;
}

export interface ConnectSecondaryRingSNPayload {
  from_bus_ref: string;
  to_bus_ref: string;
  segment?: SegmentSpec;
}

export interface SetNormalOpenPointPayload {
  switch_ref: string;
  corridor_ref?: string;
}
