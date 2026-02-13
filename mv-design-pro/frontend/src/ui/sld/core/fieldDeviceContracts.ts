/**
 * Field & Device Modeling Contracts V1 — ETAP-grade pole/aparat/stacja.
 *
 * CANONICAL CONTRACT (BINDING):
 * - Wersja: V1
 * - Immutable (readonly).
 * - Deterministic (sorted by id, stable enums).
 * - ZAKAZ auto-uzupelnien: brak danych → FixAction (stabilny kod PL).
 * - ZAKAZ fabrykowania urzadzen/funkcji ochronnych.
 *
 * MODEL ARCHITEKTONICZNY: M2
 * - VisualGraphV1 pozostaje zamrozony (stacja = 1 wezel).
 * - Field/Device sa w LayoutResultV1.SwitchgearBlockV1 (anchor mapping).
 * - Overlay/Inspector korzystaja z anchorId → elementId.
 *
 * RUN #3D: ETAP-grade device & field modeling + formal trunk↔station embedding binding.
 */

// =============================================================================
// FIELD ROLE (kanoniczny enum)
// =============================================================================

/**
 * Rola pola rozdzielczego w stacji.
 *
 * Kazda rola definiuje minimalny zestaw wymaganych urzadzen
 * (DeviceRequirementSetV1).
 */
export const FieldRoleV1 = {
  /** Pole liniowe wejsciowe (zasilanie z magistrali) */
  LINE_IN: 'LINE_IN',
  /** Pole liniowe wyjsciowe (zasilanie dalszych stacji) */
  LINE_OUT: 'LINE_OUT',
  /** Pole odgalezieniowe (branch) */
  LINE_BRANCH: 'LINE_BRANCH',
  /** Pole transformatorowe SN/nN */
  TRANSFORMER_SN_NN: 'TRANSFORMER_SN_NN',
  /** Pole przylaczeniowe PV na SN */
  PV_SN: 'PV_SN',
  /** Pole przylaczeniowe BESS na SN */
  BESS_SN: 'BESS_SN',
  /** Pole sprzegla sekcyjnego SN */
  COUPLER_SN: 'COUPLER_SN',
  /** Pole lacznika szyn (jesli modelowane inaczej niz COUPLER_SN) */
  BUS_TIE: 'BUS_TIE',
} as const;

export type FieldRoleV1 = (typeof FieldRoleV1)[keyof typeof FieldRoleV1];

// =============================================================================
// EMBEDDING ROLE (trunk↔station binding)
// =============================================================================

/**
 * Rola stacji wzgledem trunk segmentacji.
 *
 * Wyznaczana deterministycznie z:
 * - incidentTrunkEdges (ile krawedzi TRUNK dotyka stacji)
 * - incidentBranchEdges (ile krawedzi BRANCH)
 * - busSections count (ile szynozbirczych)
 * - coupler presence
 *
 * MAPOWANIE NA TYPY STACJI (A/B/C/D):
 * - A = TRUNK_LEAF
 * - B = TRUNK_INLINE
 * - C = TRUNK_BRANCH
 * - D = LOCAL_SECTIONAL
 *
 * UWAGA: Nie uzywaj "A/B/C/D" w runtime. Tylko w docs jako mapowanie.
 */
export const EmbeddingRoleV1 = {
  /** Stacja koncowa — 1 krawedz TRUNK, brak BRANCH, brak wyjscia trunk */
  TRUNK_LEAF: 'TRUNK_LEAF',
  /** Stacja przelotowa — 2 krawedzie TRUNK, brak BRANCH */
  TRUNK_INLINE: 'TRUNK_INLINE',
  /** Stacja odgalezieniowa — 1 krawedz TRUNK + >= 1 BRANCH */
  TRUNK_BRANCH: 'TRUNK_BRANCH',
  /** Stacja sekcyjna — >= 2 busSections, sprzeglo */
  LOCAL_SECTIONAL: 'LOCAL_SECTIONAL',
} as const;

export type EmbeddingRoleV1 = (typeof EmbeddingRoleV1)[keyof typeof EmbeddingRoleV1];

// =============================================================================
// DEVICE ELECTRICAL ROLE
// =============================================================================

/**
 * Rola elektryczna urzadzenia w polu.
 *
 * Determinuje pozycje urzadzenia w siatce pola:
 * - POWER_PATH: na torze mocy (CB, DS, CT, ES, cable head)
 * - MEASUREMENT: pomiarowe (VT, CT pomiarowy)
 * - PROTECTION: ochronne (Relay — poza torem mocy)
 * - TERMINATION: koncowe (glowica kablowa, trojkat)
 */
export const DeviceElectricalRoleV1 = {
  POWER_PATH: 'POWER_PATH',
  MEASUREMENT: 'MEASUREMENT',
  PROTECTION: 'PROTECTION',
  TERMINATION: 'TERMINATION',
} as const;

export type DeviceElectricalRoleV1 = (typeof DeviceElectricalRoleV1)[keyof typeof DeviceElectricalRoleV1];

// =============================================================================
// DEVICE POWER PATH POSITION
// =============================================================================

/**
 * Pozycja urzadzenia na torze mocy (kolejnosc od szyny do kabla).
 */
export const DevicePowerPathPositionV1 = {
  /** Blisko szyny (DS, ES) */
  UPSTREAM: 'UPSTREAM',
  /** Srodek toru (CB, CT) */
  MIDSTREAM: 'MIDSTREAM',
  /** Blisko kabla/linii (glowica kablowa) */
  DOWNSTREAM: 'DOWNSTREAM',
  /** Poza torem mocy (relay, VT boczny) */
  OFF_PATH: 'OFF_PATH',
} as const;

export type DevicePowerPathPositionV1 =
  (typeof DevicePowerPathPositionV1)[keyof typeof DevicePowerPathPositionV1];

// =============================================================================
// DEVICE TYPE (rozszerzony enum)
// =============================================================================

/**
 * Typ urzadzenia — kanoniczny enum.
 *
 * Rozszerza DeviceKind z topologyInputReader o typy specyficzne
 * dla pola (CABLE_HEAD, TRANSFORMER_DEVICE, GENERATOR_DEVICE, PCS, BATTERY, ACB).
 */
export const DeviceTypeV1 = {
  CB: 'CB',
  DS: 'DS',
  ES: 'ES',
  CT: 'CT',
  VT: 'VT',
  RELAY: 'RELAY',
  LOAD_SWITCH: 'LOAD_SWITCH',
  FUSE: 'FUSE',
  CABLE_HEAD: 'CABLE_HEAD',
  TRANSFORMER_DEVICE: 'TRANSFORMER_DEVICE',
  GENERATOR_PV: 'GENERATOR_PV',
  GENERATOR_BESS: 'GENERATOR_BESS',
  PCS: 'PCS',
  BATTERY: 'BATTERY',
  ACB: 'ACB',
} as const;

export type DeviceTypeV1 = (typeof DeviceTypeV1)[keyof typeof DeviceTypeV1];

// =============================================================================
// DEVICE REQUIREMENT
// =============================================================================

/**
 * Wymaganie urzadzenia w polu.
 *
 * ZAKAZ: "jesli brak CT to dorysuj" — brak CT jesli wymagany → FixAction.
 */
export const DeviceRequirementLevel = {
  REQUIRED: 'REQUIRED',
  REQUIRED_IF: 'REQUIRED_IF',
  OPTIONAL: 'OPTIONAL',
} as const;

export type DeviceRequirementLevel =
  (typeof DeviceRequirementLevel)[keyof typeof DeviceRequirementLevel];

export interface DeviceRequirementV1 {
  readonly deviceType: DeviceTypeV1;
  readonly level: DeviceRequirementLevel;
  readonly electricalRole: DeviceElectricalRoleV1;
  readonly powerPathPosition: DevicePowerPathPositionV1;
  /** Warunek dla REQUIRED_IF (np. "pole ma RELAY" / "domena wskazuje ochrone") */
  readonly condition: string | null;
}

/**
 * Zestaw wymagan urzadzen dla danego FieldRole.
 */
export interface DeviceRequirementSetV1 {
  readonly fieldRole: FieldRoleV1;
  readonly requirements: readonly DeviceRequirementV1[];
}

// =============================================================================
// FIELD V1
// =============================================================================

/**
 * Pole rozdzielcze — immutable kontrakt.
 *
 * Pole jest logiczna grupa urzadzen w stacji, np.:
 * - Pole liniowe wejsciowe: CB + CT + Relay + glowica kablowa
 * - Pole transformatorowe: CB_SN + CT_SN + Relay + TR + ACB_NN
 * - Pole PV: CB + CT + Relay + TR_blokowy? + PV
 */
export interface FieldV1 {
  /** Stabilne ID pola */
  readonly id: string;
  /** ID stacji do ktorej nalezy pole */
  readonly stationId: string;
  /** ID sekcji szynowej do ktorej przylaczone jest pole */
  readonly busSectionId: string;
  /** Rola pola */
  readonly fieldRole: FieldRoleV1;
  /** Terminale polaczeniowe (referencje do ConnectionNode) */
  readonly terminals: FieldTerminalsV1;
  /** Wymagania urzadzen dla tego pola */
  readonly requiredDevices: DeviceRequirementSetV1;
  /** ID urzadzen w polu (sortowane) */
  readonly deviceIds: readonly string[];
  /** Referencja katalogowa (brak → FixAction "catalog.ref_missing") */
  readonly catalogRef: CatalogRefDetailV1 | null;
}

/**
 * Terminale pola — referencje do ConnectionNode.
 */
export interface FieldTerminalsV1 {
  /** Wezel wejsciowy (od strony szyny/magistrali) */
  readonly incomingNodeId: string | null;
  /** Wezel wyjsciowy (od strony odbiorcy/linii) */
  readonly outgoingNodeId: string | null;
  /** Wezel odgalezieniowy (branch) */
  readonly branchNodeId: string | null;
  /** Wezel generatora (PV/BESS) */
  readonly generatorNodeId: string | null;
}

// =============================================================================
// DEVICE V1
// =============================================================================

/**
 * Urzadzenie w polu — immutable kontrakt.
 *
 * REGULY:
 * - CT zawsze w torze mocy (POWER_PATH, MIDSTREAM).
 * - Relay zawsze poza torem (PROTECTION, OFF_PATH).
 * - Relay MUSI miec boundCbId (brak → FixAction).
 * - Glowica kablowa = trojkat (TERMINATION, DOWNSTREAM).
 * - Brak urzadzenia nie jest "fallback" — to FixAction.
 */
export interface DeviceV1 {
  /** Stabilne ID urzadzenia */
  readonly id: string;
  /** ID pola do ktorego nalezy urzadzenie */
  readonly fieldId: string;
  /** Typ urzadzenia */
  readonly deviceType: DeviceTypeV1;
  /** Rola elektryczna */
  readonly electricalRole: DeviceElectricalRoleV1;
  /** Pozycja na torze mocy */
  readonly powerPathPosition: DevicePowerPathPositionV1;
  /** Referencja katalogowa (brak → FixAction) */
  readonly catalogRef: CatalogRefDetailV1 | null;
  /** Powiazania logiczne */
  readonly logicalBindings: DeviceLogicalBindingsV1;
  /** Parametry urzadzenia (typed, immutable) */
  readonly parameters: DeviceParametersV1;
}

/**
 * Powiazania logiczne urzadzenia.
 */
export interface DeviceLogicalBindingsV1 {
  /** ID wylacznika do ktorego przypisany jest relay (mandatory dla RELAY) */
  readonly boundCbId: string | null;
  /** ID przekladnikow pradowych (CT) — deterministycznie posortowane */
  readonly ctInputIds: readonly string[];
}

/**
 * Parametry urzadzenia (typed, immutable).
 *
 * Brak danych → null (nie "domyslny"). Brak wymaganego parametru → FixAction.
 */
export interface DeviceParametersV1 {
  /** Przekladnik: ratio (np. "100/5") */
  readonly ctRatio: string | null;
  /** Wylacznik: zdolnosc wylaczania [kA] */
  readonly breakingCapacityKa: number | null;
  /** Wylacznik: prad znamionowy [A] */
  readonly ratedCurrentA: number | null;
  /** Relay: krzywa/nastawienia (z ProtectionBinding) */
  readonly relaySettings: string | null;
  /** Transformator: moc znamionowa [MVA] */
  readonly ratedPowerMva: number | null;
  /** Transformator: napięcie zwarcia [%] */
  readonly ukPercent: number | null;
  /** Transformator: grupa polaczen */
  readonly vectorGroup: string | null;
}

// =============================================================================
// BUS SECTION V1
// =============================================================================

/**
 * Sekcja szyny zbiorczej — immutable kontrakt.
 *
 * Stacja moze miec wiele sekcji (np. TYPE_D: 2 sekcje z couplerem).
 * orderIndex wyznaczany deterministycznie (sort by id, tie-break by index).
 */
export interface BusSectionV1 {
  /** Stabilne ID sekcji */
  readonly id: string;
  /** ID stacji */
  readonly stationId: string;
  /** Index porzadkowy (deterministyczny; 0-based) */
  readonly orderIndex: number;
  /** Referencja katalogowa (opcjonalna; jesli renderowana → wymagana) */
  readonly catalogRef: CatalogRefDetailV1 | null;
}

// =============================================================================
// STATION BLOCK DETAIL V1
// =============================================================================

/**
 * Szczegoly bloku stacji — rozszerzenie SwitchgearBlockV1.
 *
 * Zawiera pelna strukture pola/urzadzen z kotwicami (anchor mapping).
 * Uzywane przez overlay/inspector do identyfikacji elementow.
 */
export interface StationBlockDetailV1 {
  /** ID bloku (= id stacji w VisualGraphV1) */
  readonly blockId: string;
  /** Rola w trunk segmentacji */
  readonly embeddingRole: EmbeddingRoleV1;
  /** Sekcje szyn (sortowane po orderIndex) */
  readonly busSections: readonly BusSectionV1[];
  /** Pola (sortowane po id) */
  readonly fields: readonly FieldV1[];
  /** Urzadzenia (sortowane po id) */
  readonly devices: readonly DeviceV1[];
  /** Porty bloku */
  readonly ports: StationBlockPortsV1;
  /** ID pola sprzegla (mandatory for LOCAL_SECTIONAL) */
  readonly couplerFieldId: string | null;
  /** Kotwice urzadzen do renderowania (elementId → anchor) */
  readonly deviceAnchors: readonly DeviceAnchorV1[];
  /** FixActions walidacji stacji */
  readonly fixActions: readonly FieldDeviceFixActionV1[];
}

/**
 * Porty bloku stacji.
 */
export interface StationBlockPortsV1 {
  /** Port wejsciowy trunk (mandatory for TRUNK_*) */
  readonly trunkInPort: string | null;
  /** Port wyjsciowy trunk (mandatory for TRUNK_INLINE, LOCAL_SECTIONAL) */
  readonly trunkOutPort: string | null;
  /** Port odgalezieniowy (mandatory for TRUNK_BRANCH) */
  readonly branchPort: string | null;
}

// =============================================================================
// DEVICE ANCHOR (kotwica do renderowania)
// =============================================================================

/**
 * Kotwica urzadzenia — mapowanie elementId → pozycja w bloku.
 *
 * Uzywane przez:
 * - Renderer: rysowanie symbolu urzadzenia w pozycji anchor
 * - Overlay: nakladanie wynikow na urzadzenie
 * - Inspector: klikniecie w obszar anchor → wyswietlenie danych urzadzenia
 */
export interface DeviceAnchorV1 {
  /** ID urzadzenia (= DeviceV1.id) */
  readonly deviceId: string;
  /** ID pola (= FieldV1.id) */
  readonly fieldId: string;
  /** Typ urzadzenia */
  readonly deviceType: DeviceTypeV1;
  /** Rola elektryczna */
  readonly electricalRole: DeviceElectricalRoleV1;
  /** Pozycja wzgledna w bloku (0-1 x/y) — obliczona przez layout */
  readonly relativeX: number;
  readonly relativeY: number;
  /** Rozmiar kotwicy [px] */
  readonly width: number;
  readonly height: number;
}

// =============================================================================
// CATALOG REF DETAIL V1 (rozszerzona referencja)
// =============================================================================

/**
 * Rozszerzona referencja katalogowa.
 *
 * ZAKAZ: brak danych → FixAction, nie "domyslny".
 */
export interface CatalogRefDetailV1 {
  /** ID elementu ktorego dotyczy */
  readonly elementId: string;
  /** Kategoria (FIELD|DEVICE|BRANCH|STATION|GENERATOR) */
  readonly category: CatalogCategoryV1;
  /** ID w katalogu */
  readonly catalogId: string;
  /** Wersja katalogu */
  readonly catalogVersion: string | null;
  /** Producent */
  readonly manufacturer: string | null;
  /** Nazwa */
  readonly name: string;
  /** Parametry znamionowe (structured) */
  readonly ratings: CatalogRatingsV1 | null;
}

export const CatalogCategoryV1 = {
  FIELD: 'FIELD',
  DEVICE: 'DEVICE',
  BRANCH: 'BRANCH',
  STATION: 'STATION',
  GENERATOR: 'GENERATOR',
} as const;

export type CatalogCategoryV1 = (typeof CatalogCategoryV1)[keyof typeof CatalogCategoryV1];

export interface CatalogRatingsV1 {
  /** Zdolnosc wylaczania [kA] (CB) */
  readonly breakingCapacityKa: number | null;
  /** Prad znamionowy [A] */
  readonly ratedCurrentA: number | null;
  /** Moc znamionowa [MVA] (TR) */
  readonly ratedPowerMva: number | null;
  /** Napiecie znamionowe [kV] */
  readonly ratedVoltageKv: number | null;
  /** Przekladnik: ratio */
  readonly ctRatio: string | null;
}

// =============================================================================
// FIX ACTIONS (stabilne kody PL)
// =============================================================================

/**
 * FixAction z polami + urzadzeniami — stabilne kody.
 *
 * Kody sa stabilne (nie zmieniaja sie miedzy wersjami).
 * Komunikaty sa w jezyku polskim.
 */
export interface FieldDeviceFixActionV1 {
  /** Stabilny kod bledu */
  readonly code: string;
  /** Komunikat PL */
  readonly message: string;
  /** Dotyczy elementu (id) */
  readonly elementId: string | null;
  /** Podpowiedz naprawy (PL) */
  readonly fixHint: string;
}

/**
 * Stabilne kody FixAction dla pol i urzadzen.
 */
export const FieldDeviceFixCodes = {
  // Pola
  FIELD_DEVICE_MISSING_CB: 'field.device_missing.cb',
  FIELD_DEVICE_MISSING_CT: 'field.device_missing.ct',
  FIELD_DEVICE_MISSING_RELAY: 'field.device_missing.relay',
  FIELD_DEVICE_MISSING_CABLE_HEAD: 'field.device_missing.cable_head',
  FIELD_DEVICE_MISSING_TRANSFORMER: 'field.device_missing.transformer',
  FIELD_DEVICE_MISSING_ACB: 'field.device_missing.acb',
  FIELD_DEVICE_MISSING_GENERATOR: 'field.device_missing.generator',

  // Stacje
  STATION_EMBEDDING_UNDETERMINED: 'station.embedding_role_undetermined',
  STATION_TYPOLOGY_CONFLICT: 'station.typology_conflict',
  STATION_COUPLER_MISSING: 'station.coupler_missing',
  STATION_TRANSFORMER_MISSING: 'station.transformer_missing_for_sn_nn',
  STATION_MULTIPLE_BRANCHES: 'station.multiple_branches_requires_explicit_ports',

  // Katalogi
  CATALOG_REF_MISSING: 'catalog.ref_missing',
  CATALOG_REF_INCOMPLETE: 'catalog.ref_incomplete',

  // Parametry
  DEVICE_CB_RATING_MISSING: 'device.cb.breaking_capacity_missing',
  DEVICE_CT_RATIO_MISSING: 'device.ct.ratio_missing',
  DEVICE_RELAY_SETTINGS_MISSING: 'device.relay.settings_missing',
  DEVICE_TR_POWER_MISSING: 'device.transformer.rated_power_missing',

  // Protection
  PROTECTION_RELAY_BINDING_MISSING: 'protection.relay_binding_missing',
  PROTECTION_RELAY_CB_MISSING: 'protection.relay_cb_binding_missing',

  // Branch
  BRANCH_NOP_STATE_MISSING: 'branch.nop_state_missing',

  // Generator
  GENERATOR_BLOCK_TR_MISSING: 'generator.block_transformer_missing',

  // Model
  MODEL_NN_SCOPE_MISSING: 'model.nn_scope_missing',
} as const;

export type FieldDeviceFixCode =
  (typeof FieldDeviceFixCodes)[keyof typeof FieldDeviceFixCodes];

// =============================================================================
// DEVICE REQUIREMENT SETS (kanoniczne per FieldRole)
// =============================================================================

function req(
  deviceType: DeviceTypeV1,
  level: DeviceRequirementLevel,
  electricalRole: DeviceElectricalRoleV1,
  powerPathPosition: DevicePowerPathPositionV1,
  condition: string | null = null,
): DeviceRequirementV1 {
  return { deviceType, level, electricalRole, powerPathPosition, condition };
}

const R = DeviceRequirementLevel;
const E = DeviceElectricalRoleV1;
const P = DevicePowerPathPositionV1;
const D = DeviceTypeV1;

/**
 * Kanoniczne zestawy wymagan urzadzen per FieldRole.
 *
 * ZAKAZ: "jesli brak CT to dorysuj" — brak wymaganego urzadzenia → FixAction.
 */
export const DEVICE_REQUIREMENT_SETS: Record<FieldRoleV1, DeviceRequirementSetV1> = {
  [FieldRoleV1.LINE_IN]: {
    fieldRole: FieldRoleV1.LINE_IN,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.UPSTREAM),
      req(D.CT, R.REQUIRED_IF, E.MEASUREMENT, P.MIDSTREAM, 'pole ma RELAY lub domena wskazuje ochronę'),
      req(D.RELAY, R.OPTIONAL, E.PROTECTION, P.OFF_PATH),
      req(D.CABLE_HEAD, R.REQUIRED, E.TERMINATION, P.DOWNSTREAM),
      req(D.ES, R.OPTIONAL, E.POWER_PATH, P.DOWNSTREAM),
    ],
  },
  [FieldRoleV1.LINE_OUT]: {
    fieldRole: FieldRoleV1.LINE_OUT,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.UPSTREAM),
      req(D.CT, R.REQUIRED_IF, E.MEASUREMENT, P.MIDSTREAM, 'pole ma RELAY lub domena wskazuje ochronę'),
      req(D.RELAY, R.OPTIONAL, E.PROTECTION, P.OFF_PATH),
      req(D.CABLE_HEAD, R.REQUIRED, E.TERMINATION, P.DOWNSTREAM),
      req(D.ES, R.OPTIONAL, E.POWER_PATH, P.DOWNSTREAM),
    ],
  },
  [FieldRoleV1.LINE_BRANCH]: {
    fieldRole: FieldRoleV1.LINE_BRANCH,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.UPSTREAM),
      req(D.CT, R.REQUIRED_IF, E.MEASUREMENT, P.MIDSTREAM, 'pole ma RELAY lub domena wskazuje ochronę'),
      req(D.RELAY, R.OPTIONAL, E.PROTECTION, P.OFF_PATH),
      req(D.CABLE_HEAD, R.REQUIRED, E.TERMINATION, P.DOWNSTREAM),
    ],
  },
  [FieldRoleV1.TRANSFORMER_SN_NN]: {
    fieldRole: FieldRoleV1.TRANSFORMER_SN_NN,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.UPSTREAM),
      req(D.CT, R.REQUIRED, E.MEASUREMENT, P.MIDSTREAM),
      req(D.RELAY, R.REQUIRED, E.PROTECTION, P.OFF_PATH),
      req(D.TRANSFORMER_DEVICE, R.REQUIRED, E.POWER_PATH, P.MIDSTREAM),
      req(D.ACB, R.REQUIRED_IF, E.POWER_PATH, P.DOWNSTREAM, 'strona nN modelowana'),
      req(D.CABLE_HEAD, R.REQUIRED, E.TERMINATION, P.DOWNSTREAM),
    ],
  },
  [FieldRoleV1.PV_SN]: {
    fieldRole: FieldRoleV1.PV_SN,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.UPSTREAM),
      req(D.CT, R.REQUIRED, E.MEASUREMENT, P.MIDSTREAM),
      req(D.RELAY, R.REQUIRED, E.PROTECTION, P.OFF_PATH),
      req(D.TRANSFORMER_DEVICE, R.REQUIRED_IF, E.POWER_PATH, P.MIDSTREAM, 'domena wskazuje TR blokowy'),
      req(D.GENERATOR_PV, R.REQUIRED, E.POWER_PATH, P.DOWNSTREAM),
      req(D.CABLE_HEAD, R.REQUIRED, E.TERMINATION, P.DOWNSTREAM),
    ],
  },
  [FieldRoleV1.BESS_SN]: {
    fieldRole: FieldRoleV1.BESS_SN,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.UPSTREAM),
      req(D.CT, R.REQUIRED, E.MEASUREMENT, P.MIDSTREAM),
      req(D.RELAY, R.REQUIRED, E.PROTECTION, P.OFF_PATH),
      req(D.TRANSFORMER_DEVICE, R.REQUIRED_IF, E.POWER_PATH, P.MIDSTREAM, 'domena wskazuje TR blokowy'),
      req(D.GENERATOR_BESS, R.REQUIRED, E.POWER_PATH, P.DOWNSTREAM),
      req(D.CABLE_HEAD, R.REQUIRED, E.TERMINATION, P.DOWNSTREAM),
    ],
  },
  [FieldRoleV1.COUPLER_SN]: {
    fieldRole: FieldRoleV1.COUPLER_SN,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.MIDSTREAM),
      req(D.CT, R.OPTIONAL, E.MEASUREMENT, P.MIDSTREAM),
      req(D.RELAY, R.OPTIONAL, E.PROTECTION, P.OFF_PATH),
    ],
  },
  [FieldRoleV1.BUS_TIE]: {
    fieldRole: FieldRoleV1.BUS_TIE,
    requirements: [
      req(D.CB, R.REQUIRED, E.POWER_PATH, P.MIDSTREAM),
      req(D.CT, R.OPTIONAL, E.MEASUREMENT, P.MIDSTREAM),
    ],
  },
};

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Waliduje pole pod katem wymagan urzadzen.
 *
 * ZAKAZ auto-uzupelnien: brak wymaganego urzadzenia → FixAction.
 */
export function validateFieldDevices(
  field: FieldV1,
  devices: readonly DeviceV1[],
  hasRelayInField: boolean,
  domainIndicatesProtection: boolean,
): readonly FieldDeviceFixActionV1[] {
  const fixActions: FieldDeviceFixActionV1[] = [];
  const requirements = DEVICE_REQUIREMENT_SETS[field.fieldRole];

  if (!requirements) {
    return fixActions;
  }

  const fieldDevices = devices.filter(d => d.fieldId === field.id);
  const deviceTypes = new Set(fieldDevices.map(d => d.deviceType));

  for (const requirement of requirements.requirements) {
    const isPresent = deviceTypes.has(requirement.deviceType);

    if (requirement.level === DeviceRequirementLevel.REQUIRED && !isPresent) {
      fixActions.push({
        code: deviceTypeToFixCode(requirement.deviceType),
        message: `Pole ${field.id} (${field.fieldRole}): brak wymaganego urzadzenia ${requirement.deviceType}`,
        elementId: field.id,
        fixHint: `Dodaj urzadzenie ${requirement.deviceType} do pola ${field.id}`,
      });
    }

    if (requirement.level === DeviceRequirementLevel.REQUIRED_IF && !isPresent) {
      // Sprawdz warunek
      const conditionMet =
        (requirement.condition?.includes('RELAY') && hasRelayInField) ||
        (requirement.condition?.includes('ochronę') && domainIndicatesProtection) ||
        (requirement.condition?.includes('ochrony') && domainIndicatesProtection) ||
        (requirement.condition?.includes('nN modelowana') && field.terminals.outgoingNodeId !== null) ||
        (requirement.condition?.includes('TR blokowy') && fieldDevices.some(d => d.deviceType === DeviceTypeV1.TRANSFORMER_DEVICE));

      if (conditionMet) {
        fixActions.push({
          code: deviceTypeToFixCode(requirement.deviceType),
          message: `Pole ${field.id} (${field.fieldRole}): brak urzadzenia ${requirement.deviceType} (warunek: ${requirement.condition})`,
          elementId: field.id,
          fixHint: `Dodaj urzadzenie ${requirement.deviceType} do pola ${field.id}`,
        });
      }
    }
  }

  // Relay musi miec boundCbId
  for (const device of fieldDevices) {
    if (device.deviceType === DeviceTypeV1.RELAY && device.logicalBindings.boundCbId === null) {
      fixActions.push({
        code: FieldDeviceFixCodes.PROTECTION_RELAY_CB_MISSING,
        message: `Relay ${device.id}: brak powiazania z wylacznikiem (boundCbId)`,
        elementId: device.id,
        fixHint: `Przypisz relay ${device.id} do wylacznika CB w polu ${field.id}`,
      });
    }

    // Katalog wymagany
    if (device.catalogRef === null) {
      fixActions.push({
        code: FieldDeviceFixCodes.CATALOG_REF_MISSING,
        message: `Urzadzenie ${device.id} (${device.deviceType}): brak referencji katalogowej`,
        elementId: device.id,
        fixHint: `Przypisz typ z katalogu do urzadzenia ${device.id}`,
      });
    }
  }

  return fixActions;
}

function deviceTypeToFixCode(deviceType: DeviceTypeV1): string {
  switch (deviceType) {
    case DeviceTypeV1.CB: return FieldDeviceFixCodes.FIELD_DEVICE_MISSING_CB;
    case DeviceTypeV1.CT: return FieldDeviceFixCodes.FIELD_DEVICE_MISSING_CT;
    case DeviceTypeV1.RELAY: return FieldDeviceFixCodes.FIELD_DEVICE_MISSING_RELAY;
    case DeviceTypeV1.CABLE_HEAD: return FieldDeviceFixCodes.FIELD_DEVICE_MISSING_CABLE_HEAD;
    case DeviceTypeV1.TRANSFORMER_DEVICE: return FieldDeviceFixCodes.FIELD_DEVICE_MISSING_TRANSFORMER;
    case DeviceTypeV1.ACB: return FieldDeviceFixCodes.FIELD_DEVICE_MISSING_ACB;
    case DeviceTypeV1.GENERATOR_PV:
    case DeviceTypeV1.GENERATOR_BESS: return FieldDeviceFixCodes.FIELD_DEVICE_MISSING_GENERATOR;
    default: return FieldDeviceFixCodes.CATALOG_REF_MISSING;
  }
}

/**
 * Waliduje stacje pod katem embeddingRole i wymagan portow/pol.
 */
export function validateStationBlock(
  block: StationBlockDetailV1,
): readonly FieldDeviceFixActionV1[] {
  const fixActions: FieldDeviceFixActionV1[] = [];

  // BusSections non-empty
  if (block.busSections.length === 0) {
    fixActions.push({
      code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
      message: `Stacja ${block.blockId}: brak sekcji szyn (busSections puste)`,
      elementId: block.blockId,
      fixHint: `Dodaj przynajmniej jedną sekcję szyny do stacji ${block.blockId}`,
    });
  }

  // Fields non-empty
  if (block.fields.length === 0) {
    fixActions.push({
      code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
      message: `Stacja ${block.blockId}: brak pol (fields puste)`,
      elementId: block.blockId,
      fixHint: `Dodaj przynajmniej jedno pole do stacji ${block.blockId}`,
    });
  }

  // LOCAL_SECTIONAL: coupler required
  if (block.embeddingRole === EmbeddingRoleV1.LOCAL_SECTIONAL && block.couplerFieldId === null) {
    fixActions.push({
      code: FieldDeviceFixCodes.STATION_COUPLER_MISSING,
      message: `Stacja sekcyjna ${block.blockId}: brak pola sprzegla`,
      elementId: block.blockId,
      fixHint: `Dodaj pole COUPLER_SN do stacji sekcyjnej ${block.blockId}`,
    });
  }

  // Port consistency per embedding role
  const { ports, embeddingRole } = block;
  if (embeddingRole === EmbeddingRoleV1.TRUNK_LEAF && !ports.trunkInPort) {
    fixActions.push({
      code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
      message: `Stacja TRUNK_LEAF ${block.blockId}: brak trunkInPort`,
      elementId: block.blockId,
      fixHint: `Przypisz trunkInPort do stacji ${block.blockId}`,
    });
  }

  if (embeddingRole === EmbeddingRoleV1.TRUNK_INLINE) {
    if (!ports.trunkInPort) {
      fixActions.push({
        code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
        message: `Stacja TRUNK_INLINE ${block.blockId}: brak trunkInPort`,
        elementId: block.blockId,
        fixHint: `Przypisz trunkInPort do stacji ${block.blockId}`,
      });
    }
    if (!ports.trunkOutPort) {
      fixActions.push({
        code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
        message: `Stacja TRUNK_INLINE ${block.blockId}: brak trunkOutPort`,
        elementId: block.blockId,
        fixHint: `Przypisz trunkOutPort do stacji ${block.blockId}`,
      });
    }
  }

  if (embeddingRole === EmbeddingRoleV1.TRUNK_BRANCH && !ports.branchPort) {
    fixActions.push({
      code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
      message: `Stacja TRUNK_BRANCH ${block.blockId}: brak branchPort`,
      elementId: block.blockId,
      fixHint: `Przypisz branchPort do stacji ${block.blockId}`,
    });
  }

  if (embeddingRole === EmbeddingRoleV1.LOCAL_SECTIONAL) {
    if (!ports.trunkInPort || !ports.trunkOutPort) {
      fixActions.push({
        code: FieldDeviceFixCodes.STATION_EMBEDDING_UNDETERMINED,
        message: `Stacja LOCAL_SECTIONAL ${block.blockId}: brak trunkInPort lub trunkOutPort`,
        elementId: block.blockId,
        fixHint: `Przypisz trunkInPort i trunkOutPort do stacji sekcyjnej ${block.blockId}`,
      });
    }
  }

  return fixActions;
}
