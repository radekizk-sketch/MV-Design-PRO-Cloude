/**
 * bayTemplates.ts — Kanoniczne szablony pol rozdzielczych.
 *
 * CANONICAL CONTRACT (BINDING):
 * - Szablony definiuja wymagany lancuch aparatow dla kazdej roli pola.
 * - Kolejnosc urzadzen: UPSTREAM → MIDSTREAM → DOWNSTREAM (tor mocy).
 * - OFF_PATH urzadzenia (Relay) umieszczone na koncu.
 * - Zgodne z REQUIRED_DEVICES z switchgearConfig.ts.
 * - 100% POLISH labels.
 *
 * ARCHITECTURE:
 * - APPLICATION LAYER: no physics, no model mutation.
 */

import type { FieldRoleV1 } from '../sld/core/fieldDeviceContracts';
import {
  FieldRoleV1 as FR,
  DeviceTypeV1 as DT,
  DeviceElectricalRoleV1 as ER,
  DevicePowerPathPositionV1 as PP,
} from '../sld/core/fieldDeviceContracts';
import type { BayTemplate } from './types';

// =============================================================================
// SN FIELD TEMPLATES
// =============================================================================

const LINE_IN_TEMPLATE: BayTemplate = {
  fieldRole: FR.LINE_IN,
  labelPl: 'Pole liniowe wejsciowe',
  descriptionPl: 'Zasilanie stacji z magistrali SN — wylacznik + glowica kablowa',
  voltageLevelPl: 'SN',
  devices: [
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.UPSTREAM, required: true, labelPl: 'Glowica kablowa (gora)' },
    { deviceType: DT.DS, electricalRole: ER.POWER_PATH, powerPathPosition: PP.UPSTREAM, required: false, labelPl: 'Rozlacznik' },
    { deviceType: DT.CT, electricalRole: ER.MEASUREMENT, powerPathPosition: PP.MIDSTREAM, required: false, labelPl: 'Przekladnik pradowy' },
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik' },
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Glowica kablowa (dol)' },
    { deviceType: DT.RELAY, electricalRole: ER.PROTECTION, powerPathPosition: PP.OFF_PATH, required: false, labelPl: 'Zabezpieczenie' },
  ],
};

const LINE_OUT_TEMPLATE: BayTemplate = {
  fieldRole: FR.LINE_OUT,
  labelPl: 'Pole liniowe wyjsciowe',
  descriptionPl: 'Wyjscie zasilania do kolejnej stacji — wylacznik + glowica kablowa',
  voltageLevelPl: 'SN',
  devices: [
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.UPSTREAM, required: true, labelPl: 'Glowica kablowa (gora)' },
    { deviceType: DT.DS, electricalRole: ER.POWER_PATH, powerPathPosition: PP.UPSTREAM, required: false, labelPl: 'Rozlacznik' },
    { deviceType: DT.CT, electricalRole: ER.MEASUREMENT, powerPathPosition: PP.MIDSTREAM, required: false, labelPl: 'Przekladnik pradowy' },
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik' },
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Glowica kablowa (dol)' },
    { deviceType: DT.RELAY, electricalRole: ER.PROTECTION, powerPathPosition: PP.OFF_PATH, required: false, labelPl: 'Zabezpieczenie' },
  ],
};

const LINE_BRANCH_TEMPLATE: BayTemplate = {
  fieldRole: FR.LINE_BRANCH,
  labelPl: 'Pole odgalezieniowe',
  descriptionPl: 'Odgalezienie magistrali — wylacznik + glowica kablowa',
  voltageLevelPl: 'SN',
  devices: [
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.UPSTREAM, required: true, labelPl: 'Glowica kablowa (gora)' },
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik' },
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Glowica kablowa (dol)' },
  ],
};

const TRANSFORMER_SN_NN_TEMPLATE: BayTemplate = {
  fieldRole: FR.TRANSFORMER_SN_NN,
  labelPl: 'Pole transformatorowe SN/nN',
  descriptionPl: 'Transformator SN/nN z pelnym osprzetem — CB, CT, Relay, Transformator',
  voltageLevelPl: 'SN/nN',
  devices: [
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.UPSTREAM, required: true, labelPl: 'Glowica kablowa' },
    { deviceType: DT.DS, electricalRole: ER.POWER_PATH, powerPathPosition: PP.UPSTREAM, required: false, labelPl: 'Rozlacznik' },
    { deviceType: DT.CT, electricalRole: ER.MEASUREMENT, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Przekladnik pradowy' },
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik' },
    { deviceType: DT.TRANSFORMER_DEVICE, electricalRole: ER.POWER_PATH, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Transformator SN/nN' },
    { deviceType: DT.RELAY, electricalRole: ER.PROTECTION, powerPathPosition: PP.OFF_PATH, required: true, labelPl: 'Zabezpieczenie' },
  ],
};

const PV_SN_TEMPLATE: BayTemplate = {
  fieldRole: FR.PV_SN,
  labelPl: 'Pole przylaczeniowe PV (SN)',
  descriptionPl: 'Przylaczenie zrodla fotowoltaicznego po stronie SN',
  voltageLevelPl: 'SN',
  devices: [
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.UPSTREAM, required: true, labelPl: 'Glowica kablowa' },
    { deviceType: DT.CT, electricalRole: ER.MEASUREMENT, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Przekladnik pradowy' },
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik' },
    { deviceType: DT.GENERATOR_PV, electricalRole: ER.POWER_PATH, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Generator PV' },
    { deviceType: DT.RELAY, electricalRole: ER.PROTECTION, powerPathPosition: PP.OFF_PATH, required: true, labelPl: 'Zabezpieczenie' },
  ],
};

const BESS_SN_TEMPLATE: BayTemplate = {
  fieldRole: FR.BESS_SN,
  labelPl: 'Pole przylaczeniowe BESS (SN)',
  descriptionPl: 'Przylaczenie magazynu energii po stronie SN',
  voltageLevelPl: 'SN',
  devices: [
    { deviceType: DT.CABLE_HEAD, electricalRole: ER.TERMINATION, powerPathPosition: PP.UPSTREAM, required: true, labelPl: 'Glowica kablowa' },
    { deviceType: DT.CT, electricalRole: ER.MEASUREMENT, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Przekladnik pradowy' },
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik' },
    { deviceType: DT.GENERATOR_BESS, electricalRole: ER.POWER_PATH, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Magazyn energii BESS' },
    { deviceType: DT.RELAY, electricalRole: ER.PROTECTION, powerPathPosition: PP.OFF_PATH, required: true, labelPl: 'Zabezpieczenie' },
  ],
};

const COUPLER_SN_TEMPLATE: BayTemplate = {
  fieldRole: FR.COUPLER_SN,
  labelPl: 'Pole sprzegla sekcyjnego SN',
  descriptionPl: 'Sprzeglo laczace dwie sekcje szyny zbiorczej SN',
  voltageLevelPl: 'SN',
  devices: [
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik sprzegla' },
  ],
};

const BUS_TIE_TEMPLATE: BayTemplate = {
  fieldRole: FR.BUS_TIE,
  labelPl: 'Lacznik szyn',
  descriptionPl: 'Lacznik szyn zbiorczych',
  voltageLevelPl: 'SN',
  devices: [
    { deviceType: DT.CB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik lacznika' },
  ],
};

// =============================================================================
// nN FIELD TEMPLATES
// =============================================================================

const MAIN_NN_TEMPLATE: BayTemplate = {
  fieldRole: FR.MAIN_NN,
  labelPl: 'Pole glowne nN',
  descriptionPl: 'Pole glowne rozdzielnicy niskiego napiecia — ACB glowny',
  voltageLevelPl: 'nN',
  devices: [
    { deviceType: DT.ACB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik powietrzny ACB' },
  ],
};

const FEEDER_NN_TEMPLATE: BayTemplate = {
  fieldRole: FR.FEEDER_NN,
  labelPl: 'Pole odplywowe nN',
  descriptionPl: 'Pole odplywowe niskiego napiecia — bezpiecznik',
  voltageLevelPl: 'nN',
  devices: [
    { deviceType: DT.FUSE, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Bezpiecznik' },
  ],
};

const PV_NN_TEMPLATE: BayTemplate = {
  fieldRole: FR.PV_NN,
  labelPl: 'Pole zrodla PV (nN)',
  descriptionPl: 'Przylaczenie zrodla fotowoltaicznego po stronie nN',
  voltageLevelPl: 'nN',
  devices: [
    { deviceType: DT.CT, electricalRole: ER.MEASUREMENT, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Przekladnik pradowy' },
    { deviceType: DT.ACB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik powietrzny ACB' },
    { deviceType: DT.GENERATOR_PV, electricalRole: ER.POWER_PATH, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Generator PV' },
    { deviceType: DT.RELAY, electricalRole: ER.PROTECTION, powerPathPosition: PP.OFF_PATH, required: true, labelPl: 'Zabezpieczenie' },
  ],
};

const BESS_NN_TEMPLATE: BayTemplate = {
  fieldRole: FR.BESS_NN,
  labelPl: 'Pole zrodla BESS (nN)',
  descriptionPl: 'Przylaczenie magazynu energii po stronie nN',
  voltageLevelPl: 'nN',
  devices: [
    { deviceType: DT.CT, electricalRole: ER.MEASUREMENT, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Przekladnik pradowy' },
    { deviceType: DT.ACB, electricalRole: ER.POWER_PATH, powerPathPosition: PP.MIDSTREAM, required: true, labelPl: 'Wylacznik powietrzny ACB' },
    { deviceType: DT.GENERATOR_BESS, electricalRole: ER.POWER_PATH, powerPathPosition: PP.DOWNSTREAM, required: true, labelPl: 'Magazyn energii BESS' },
    { deviceType: DT.RELAY, electricalRole: ER.PROTECTION, powerPathPosition: PP.OFF_PATH, required: true, labelPl: 'Zabezpieczenie' },
  ],
};

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

/**
 * Rejestr szablonow pol — indeksowany po FieldRoleV1.
 *
 * Uzywany przez kreator do:
 * 1. Wyswietlenia dostepnych typow pol (selector).
 * 2. Automatycznego generowania lancucha aparatow.
 * 3. Walidacji kompletnosci konfiguracji.
 */
export const BAY_TEMPLATES: ReadonlyMap<FieldRoleV1, BayTemplate> = new Map([
  [FR.LINE_IN, LINE_IN_TEMPLATE],
  [FR.LINE_OUT, LINE_OUT_TEMPLATE],
  [FR.LINE_BRANCH, LINE_BRANCH_TEMPLATE],
  [FR.TRANSFORMER_SN_NN, TRANSFORMER_SN_NN_TEMPLATE],
  [FR.PV_SN, PV_SN_TEMPLATE],
  [FR.BESS_SN, BESS_SN_TEMPLATE],
  [FR.COUPLER_SN, COUPLER_SN_TEMPLATE],
  [FR.BUS_TIE, BUS_TIE_TEMPLATE],
  [FR.MAIN_NN, MAIN_NN_TEMPLATE],
  [FR.FEEDER_NN, FEEDER_NN_TEMPLATE],
  [FR.PV_NN, PV_NN_TEMPLATE],
  [FR.BESS_NN, BESS_NN_TEMPLATE],
]);

/**
 * Szablony SN (srednie napiecie).
 */
export const SN_TEMPLATES: readonly BayTemplate[] = [
  LINE_IN_TEMPLATE,
  LINE_OUT_TEMPLATE,
  LINE_BRANCH_TEMPLATE,
  TRANSFORMER_SN_NN_TEMPLATE,
  PV_SN_TEMPLATE,
  BESS_SN_TEMPLATE,
  COUPLER_SN_TEMPLATE,
  BUS_TIE_TEMPLATE,
];

/**
 * Szablony nN (niskie napiecie).
 */
export const NN_TEMPLATES: readonly BayTemplate[] = [
  MAIN_NN_TEMPLATE,
  FEEDER_NN_TEMPLATE,
  PV_NN_TEMPLATE,
  BESS_NN_TEMPLATE,
];
