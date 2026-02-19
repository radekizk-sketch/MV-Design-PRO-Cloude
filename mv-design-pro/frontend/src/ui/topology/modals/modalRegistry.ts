/**
 * Modal Registry — maps modal IDs to components and domain operations.
 *
 * Phase 6: Canonical modal matrix.
 * Each modal ID corresponds to exactly one domain operation.
 *
 * BINDING: This file is the SINGLE SOURCE OF TRUTH for modal-to-operation mapping.
 */

/**
 * Canonical modal IDs (Polish, as per specification).
 */
export const MODAL_IDS = {
  MODAL_DODAJ_ODCINEK_SN: 'MODAL_DODAJ_ODCINEK_SN',
  MODAL_WSTAW_STACJE_SN_NN_WARIANT_2: 'MODAL_WSTAW_STACJE_SN_NN_WARIANT_2',
  MODAL_WSTAW_STACJE_SN_NN_WARIANT_21: 'MODAL_WSTAW_STACJE_SN_NN_WARIANT_21',
  MODAL_DODAJ_ODGALEZIENIE_SN: 'MODAL_DODAJ_ODGALEZIENIE_SN',
  MODAL_WSTAW_LACZNIK_SEKCYJNY: 'MODAL_WSTAW_LACZNIK_SEKCYJNY',
  MODAL_POLACZ_RING_WTORNY: 'MODAL_POLACZ_RING_WTORNY',
  MODAL_USTAW_NOP: 'MODAL_USTAW_NOP',
  MODAL_DODAJ_ODPLYW_NN: 'MODAL_DODAJ_ODPLYW_NN',
  MODAL_DODAJ_ODBIOR: 'MODAL_DODAJ_ODBIOR',
  MODAL_DODAJ_PV_NN: 'MODAL_DODAJ_PV_NN',
  MODAL_DODAJ_BESS_NN: 'MODAL_DODAJ_BESS_NN',
  MODAL_DODAJ_ZABEZPIECZENIE: 'MODAL_DODAJ_ZABEZPIECZENIE',
  MODAL_ZMIEN_TYP_Z_KATALOGU: 'MODAL_ZMIEN_TYP_Z_KATALOGU',
  MODAL_ZMIEN_PARAMETRY: 'MODAL_ZMIEN_PARAMETRY',
  MODAL_URUCHOM_ROZPLYW: 'MODAL_URUCHOM_ROZPLYW',
  MODAL_URUCHOM_ZWARCIE: 'MODAL_URUCHOM_ZWARCIE',
} as const;

export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];

/**
 * Modal registry entry — maps modal to domain operation and component.
 */
export interface ModalRegistryEntry {
  modalId: ModalId;
  canonicalOp: string;
  componentName: string;
  labelPl: string;
  implemented: boolean;
}

/**
 * Full modal registry — single source of truth.
 */
export const MODAL_REGISTRY: ModalRegistryEntry[] = [
  {
    modalId: MODAL_IDS.MODAL_DODAJ_ODCINEK_SN,
    canonicalOp: 'continue_trunk_segment_sn',
    componentName: 'TrunkContinueModal',
    labelPl: 'Dodaj odcinek magistrali SN',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_WSTAW_STACJE_SN_NN_WARIANT_2,
    canonicalOp: 'insert_station_on_segment_sn',
    componentName: 'TransformerStationModal',
    labelPl: 'Wstaw stację SN/nN (wariant pełny)',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_WSTAW_STACJE_SN_NN_WARIANT_21,
    canonicalOp: 'insert_station_on_segment_sn',
    componentName: 'TransformerStationModal',
    labelPl: 'Wstaw stację SN/nN (wariant inżynierski)',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_DODAJ_ODGALEZIENIE_SN,
    canonicalOp: 'start_branch_segment_sn',
    componentName: 'BranchModal',
    labelPl: 'Dodaj odgałęzienie SN',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_WSTAW_LACZNIK_SEKCYJNY,
    canonicalOp: 'insert_section_switch_sn',
    componentName: 'SectionSwitchModal',
    labelPl: 'Wstaw łącznik sekcyjny',
    implemented: false,
  },
  {
    modalId: MODAL_IDS.MODAL_POLACZ_RING_WTORNY,
    canonicalOp: 'connect_secondary_ring_sn',
    componentName: 'RingCloseModal',
    labelPl: 'Połącz pierścień wtórny',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_USTAW_NOP,
    canonicalOp: 'set_normal_open_point',
    componentName: 'NOPModal',
    labelPl: 'Ustaw punkt normalnie otwarty (NOP)',
    implemented: false,
  },
  {
    modalId: MODAL_IDS.MODAL_DODAJ_ODPLYW_NN,
    canonicalOp: 'add_nn_outgoing_field',
    componentName: 'NodeModal',
    labelPl: 'Dodaj odpływ nN',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_DODAJ_ODBIOR,
    canonicalOp: 'add_nn_load',
    componentName: 'LoadDERModal',
    labelPl: 'Dodaj odbiór',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_DODAJ_PV_NN,
    canonicalOp: 'add_pv_inverter_nn',
    componentName: 'PVInverterModal',
    labelPl: 'Dodaj źródło PV (nN)',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_DODAJ_BESS_NN,
    canonicalOp: 'add_bess_inverter_nn',
    componentName: 'BESSInverterModal',
    labelPl: 'Dodaj źródło BESS (nN)',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_DODAJ_ZABEZPIECZENIE,
    canonicalOp: 'add_relay',
    componentName: 'ProtectionModal',
    labelPl: 'Dodaj zabezpieczenie',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_ZMIEN_TYP_Z_KATALOGU,
    canonicalOp: 'assign_catalog_to_element',
    componentName: 'CatalogPicker',
    labelPl: 'Zmień typ z katalogu',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_ZMIEN_PARAMETRY,
    canonicalOp: 'update_element_parameters',
    componentName: 'NodeModal',
    labelPl: 'Zmień parametry elementu',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_URUCHOM_ROZPLYW,
    canonicalOp: 'run_power_flow',
    componentName: 'RunButton',
    labelPl: 'Uruchom rozpływ mocy',
    implemented: true,
  },
  {
    modalId: MODAL_IDS.MODAL_URUCHOM_ZWARCIE,
    canonicalOp: 'run_short_circuit',
    componentName: 'RunButton',
    labelPl: 'Uruchom obliczenia zwarciowe',
    implemented: true,
  },
];

/**
 * Get modal entry by modal ID.
 */
export function getModalEntry(modalId: ModalId): ModalRegistryEntry | undefined {
  return MODAL_REGISTRY.find((entry) => entry.modalId === modalId);
}

/**
 * Get modal entry by canonical operation name.
 */
export function getModalByOp(canonicalOp: string): ModalRegistryEntry | undefined {
  return MODAL_REGISTRY.find((entry) => entry.canonicalOp === canonicalOp);
}

/**
 * Get all unimplemented modals.
 */
export function getUnimplementedModals(): ModalRegistryEntry[] {
  return MODAL_REGISTRY.filter((entry) => !entry.implemented);
}
