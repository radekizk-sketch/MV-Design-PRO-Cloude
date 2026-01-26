/**
 * Property Grid Field Definitions
 *
 * CANONICAL ALIGNMENT:
 * - wizard_screens.md § 3: Complete Property Grid specs for each element type
 * - powerfactory_ui_parity.md § D: Property Grid rules
 *
 * DETERMINISTIC ORDER (per powerfactory_ui_parity.md § D.3):
 * 1. Identyfikacja (ID, Nazwa, UUID)
 * 2. Stan (W eksploatacji, Cykl życia)
 * 3. Topologia (Szyna początkowa, końcowa)
 * 4. Referencja typu (type_ref) — READ-ONLY
 * 5. Parametry elektryczne z typu — READ-ONLY
 * 6. Parametry lokalne (długość, zaczep) — edytowalne
 * 7. Wartości obliczeniowe — READ-ONLY
 * 8. Stan walidacji — komunikaty błędów/ostrzeżeń
 * 9. Metadane audytowe — READ-ONLY
 */

import type { ElementType, PropertySection } from '../types';

/**
 * Section order (canonical, deterministic).
 */
export const SECTION_ORDER = [
  'identification',
  'state',
  'topology',
  'type_reference',
  'type_params',
  'local_params',
  'calculated',
  'validation',
  'audit',
] as const;

/**
 * Section labels (Polish, per wizard_screens.md).
 */
export const SECTION_LABELS: Record<string, string> = {
  identification: 'Identyfikacja',
  state: 'Stan',
  topology: 'Topologia',
  type_reference: 'Referencja typu',
  type_params: 'Parametry typu (z katalogu)',
  local_params: 'Parametry lokalne',
  electrical_params: 'Parametry elektryczne',
  calculated: 'Wartości obliczeniowe',
  validation: 'Stan walidacji',
  audit: 'Metadane audytowe',
  nameplate: 'Dane znamionowe',
  oltc: 'Przełącznik zaczepów (OLTC)',
  short_circuit: 'Parametry zwarciowe',
  power_flow: 'Parametry rozpływu mocy',
};

/**
 * Field definitions for Bus (Szyna).
 * Per wizard_screens.md § 3.1.
 */
export function getBusFieldDefinitions(): PropertySection[] {
  return [
    {
      id: 'identification',
      label: SECTION_LABELS.identification,
      fields: [
        { key: 'id', label: 'ID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'name', label: 'Nazwa', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'uuid', label: 'UUID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'element_type', label: 'Typ obiektu', value: 'Bus', type: 'string', editable: false, source: 'instance' },
      ],
    },
    {
      id: 'state',
      label: SECTION_LABELS.state,
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: true, type: 'boolean', editable: true, source: 'instance' },
        { key: 'lifecycle_state', label: 'Stan cyklu życia', value: 'AKTYWNY', type: 'enum', editable: true, enumOptions: ['PROJEKTOWANY', 'AKTYWNY', 'WYLACZONY'], source: 'instance' },
      ],
    },
    {
      id: 'electrical_params',
      label: SECTION_LABELS.electrical_params,
      fields: [
        { key: 'voltage_kv', label: 'Napięcie znamionowe', value: 15.0, type: 'number', unit: 'kV', editable: true, source: 'instance' },
        { key: 'bus_type', label: 'Typ szyny', value: 'ZBIORCZA', type: 'enum', editable: true, enumOptions: ['ZBIORCZA', 'SEKCYJNA', 'ODCZEPOWA'], source: 'instance' },
        { key: 'rated_current_a', label: 'Prąd znamionowy', value: 1000, type: 'number', unit: 'A', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'nameplate',
      label: SECTION_LABELS.nameplate,
      fields: [
        { key: 'manufacturer', label: 'Producent', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'switchgear_type', label: 'Typ rozdzielnicy', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'installation_year', label: 'Rok instalacji', value: null, type: 'number', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'calculated',
      label: SECTION_LABELS.calculated,
      fields: [
        { key: 'u_calculated', label: 'U obliczone', value: null, type: 'number', unit: 'kV', editable: false, source: 'calculated' },
        { key: 'angle_deg', label: 'Kąt napięcia', value: null, type: 'number', unit: '°', editable: false, source: 'calculated' },
        { key: 'ikss_ka', label: 'Ik"', value: null, type: 'number', unit: 'kA', editable: false, source: 'calculated' },
        { key: 'ip_ka', label: 'ip', value: null, type: 'number', unit: 'kA', editable: false, source: 'calculated' },
      ],
    },
    {
      id: 'audit',
      label: SECTION_LABELS.audit,
      fields: [
        { key: 'created_at', label: 'Data utworzenia', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'created_by', label: 'Utworzył', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_at', label: 'Data modyfikacji', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_by', label: 'Zmodyfikował', value: '', type: 'string', editable: false, source: 'audit' },
      ],
    },
  ];
}

/**
 * Field definitions for LineBranch (Linia/Kabel).
 * Per wizard_screens.md § 3.2.
 */
export function getLineBranchFieldDefinitions(): PropertySection[] {
  return [
    {
      id: 'identification',
      label: SECTION_LABELS.identification,
      fields: [
        { key: 'id', label: 'ID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'name', label: 'Nazwa', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'uuid', label: 'UUID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'element_type', label: 'Typ obiektu', value: 'LineBranch', type: 'string', editable: false, source: 'instance' },
      ],
    },
    {
      id: 'state',
      label: SECTION_LABELS.state,
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: true, type: 'boolean', editable: true, source: 'instance' },
        { key: 'lifecycle_state', label: 'Stan cyklu życia', value: 'AKTYWNY', type: 'enum', editable: true, enumOptions: ['PROJEKTOWANY', 'AKTYWNY', 'WYLACZONY'], source: 'instance' },
      ],
    },
    {
      id: 'topology',
      label: SECTION_LABELS.topology,
      fields: [
        { key: 'from_bus_id', label: 'Szyna początkowa', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
        { key: 'to_bus_id', label: 'Szyna końcowa', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'type_reference',
      label: SECTION_LABELS.type_reference,
      fields: [
        { key: 'type_ref', label: 'Typ przewodu (katalog)', value: null, type: 'ref', editable: false, source: 'type' },
      ],
    },
    {
      id: 'type_params',
      label: SECTION_LABELS.type_params,
      fields: [
        { key: 'r_ohm_per_km', label: "Rezystancja R'", value: 0, type: 'number', unit: 'Ω/km', editable: false, source: 'type' },
        { key: 'x_ohm_per_km', label: "Reaktancja X'", value: 0, type: 'number', unit: 'Ω/km', editable: false, source: 'type' },
        { key: 'b_us_per_km', label: "Susceptancja B'", value: 0, type: 'number', unit: 'μS/km', editable: false, source: 'type' },
        { key: 'rated_current_a', label: 'Prąd dopuszczalny', value: 0, type: 'number', unit: 'A', editable: false, source: 'type' },
      ],
    },
    {
      id: 'local_params',
      label: SECTION_LABELS.local_params,
      fields: [
        { key: 'branch_type', label: 'Typ', value: 'CABLE', type: 'enum', editable: true, enumOptions: ['CABLE', 'LINE'], source: 'instance' },
        { key: 'length_km', label: 'Długość', value: 1.0, type: 'number', unit: 'km', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'calculated',
      label: SECTION_LABELS.calculated,
      fields: [
        { key: 'r_total_ohm', label: 'R całkowite', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'x_total_ohm', label: 'X całkowite', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'z_total_ohm', label: 'Z całkowite', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'i_calculated_a', label: 'I obliczony', value: null, type: 'number', unit: 'A', editable: false, source: 'calculated' },
        { key: 'loading_percent', label: 'Obciążenie', value: null, type: 'number', unit: '%', editable: false, source: 'calculated' },
      ],
    },
    {
      id: 'audit',
      label: SECTION_LABELS.audit,
      fields: [
        { key: 'created_at', label: 'Data utworzenia', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'created_by', label: 'Utworzył', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_at', label: 'Data modyfikacji', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_by', label: 'Zmodyfikował', value: '', type: 'string', editable: false, source: 'audit' },
      ],
    },
  ];
}

/**
 * Field definitions for TransformerBranch.
 * Per wizard_screens.md § 3.3.
 */
export function getTransformerBranchFieldDefinitions(): PropertySection[] {
  return [
    {
      id: 'identification',
      label: SECTION_LABELS.identification,
      fields: [
        { key: 'id', label: 'ID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'name', label: 'Nazwa', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'uuid', label: 'UUID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'element_type', label: 'Typ obiektu', value: 'TransformerBranch', type: 'string', editable: false, source: 'instance' },
      ],
    },
    {
      id: 'state',
      label: SECTION_LABELS.state,
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: true, type: 'boolean', editable: true, source: 'instance' },
        { key: 'lifecycle_state', label: 'Stan cyklu życia', value: 'AKTYWNY', type: 'enum', editable: true, enumOptions: ['PROJEKTOWANY', 'AKTYWNY', 'WYLACZONY'], source: 'instance' },
      ],
    },
    {
      id: 'topology',
      label: SECTION_LABELS.topology,
      fields: [
        { key: 'hv_bus_id', label: 'Szyna GN', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
        { key: 'lv_bus_id', label: 'Szyna DN', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'type_reference',
      label: SECTION_LABELS.type_reference,
      fields: [
        { key: 'type_ref', label: 'Typ transformatora (katalog)', value: null, type: 'ref', editable: false, source: 'type' },
      ],
    },
    {
      id: 'type_params',
      label: SECTION_LABELS.type_params,
      fields: [
        { key: 'rated_power_mva', label: 'Moc znamionowa Sn', value: 0, type: 'number', unit: 'MVA', editable: false, source: 'type' },
        { key: 'voltage_hv_kv', label: 'Napięcie GN', value: 0, type: 'number', unit: 'kV', editable: false, source: 'type' },
        { key: 'voltage_lv_kv', label: 'Napięcie DN', value: 0, type: 'number', unit: 'kV', editable: false, source: 'type' },
        { key: 'uk_percent', label: 'Napięcie zwarcia uk%', value: 0, type: 'number', unit: '%', editable: false, source: 'type' },
        { key: 'pk_kw', label: 'Straty obciążeniowe Pk', value: 0, type: 'number', unit: 'kW', editable: false, source: 'type' },
        { key: 'vector_group', label: 'Grupa połączeń', value: 'Dyn11', type: 'string', editable: false, source: 'type' },
      ],
    },
    {
      id: 'local_params',
      label: SECTION_LABELS.local_params,
      fields: [
        { key: 'tap_position', label: 'Aktualny zaczep', value: 0, type: 'number', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'calculated',
      label: SECTION_LABELS.calculated,
      fields: [
        { key: 'zk_ohm', label: 'Impedancja zwarcia Zk', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'rk_ohm', label: 'Rezystancja zwarcia Rk', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'xk_ohm', label: 'Reaktancja zwarcia Xk', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'turns_ratio', label: 'Przekładnia nominalna', value: null, type: 'number', editable: false, source: 'calculated' },
        { key: 'loading_percent', label: 'Obciążenie', value: null, type: 'number', unit: '%', editable: false, source: 'calculated' },
      ],
    },
    {
      id: 'audit',
      label: SECTION_LABELS.audit,
      fields: [
        { key: 'created_at', label: 'Data utworzenia', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'created_by', label: 'Utworzył', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_at', label: 'Data modyfikacji', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_by', label: 'Zmodyfikował', value: '', type: 'string', editable: false, source: 'audit' },
      ],
    },
  ];
}

/**
 * Field definitions for Switch (Łącznik).
 * Per wizard_screens.md § 3.5, § 3.6.
 */
export function getSwitchFieldDefinitions(): PropertySection[] {
  return [
    {
      id: 'identification',
      label: SECTION_LABELS.identification,
      fields: [
        { key: 'id', label: 'ID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'name', label: 'Nazwa', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'uuid', label: 'UUID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'element_type', label: 'Typ obiektu', value: 'Switch', type: 'string', editable: false, source: 'instance' },
        { key: 'switch_type', label: 'Podtyp', value: 'BREAKER', type: 'enum', editable: false, enumOptions: ['BREAKER', 'DISCONNECTOR', 'LOAD_SWITCH', 'FUSE'], source: 'instance' },
      ],
    },
    {
      id: 'state',
      label: SECTION_LABELS.state,
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: true, type: 'boolean', editable: true, source: 'instance' },
        { key: 'state', label: 'Pozycja', value: 'CLOSED', type: 'enum', editable: true, enumOptions: ['CLOSED', 'OPEN'], source: 'instance' },
        { key: 'lifecycle_state', label: 'Stan cyklu życia', value: 'AKTYWNY', type: 'enum', editable: true, enumOptions: ['PROJEKTOWANY', 'AKTYWNY', 'WYLACZONY'], source: 'instance' },
      ],
    },
    {
      id: 'topology',
      label: SECTION_LABELS.topology,
      fields: [
        { key: 'from_node_id', label: 'Szyna', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
        { key: 'to_node_id', label: 'Szyna końcowa', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'electrical_params',
      label: SECTION_LABELS.electrical_params,
      fields: [
        { key: 'voltage_kv', label: 'Napięcie znamionowe Un', value: 15.0, type: 'number', unit: 'kV', editable: true, source: 'instance' },
        { key: 'rated_current_a', label: 'Prąd znamionowy In', value: 1250, type: 'number', unit: 'A', editable: true, source: 'instance' },
        { key: 'breaking_current_ka', label: 'Prąd wyłączalny Ik', value: 25.0, type: 'number', unit: 'kA', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'calculated',
      label: SECTION_LABELS.calculated,
      fields: [
        { key: 'i_calculated_a', label: 'I obliczony', value: null, type: 'number', unit: 'A', editable: false, source: 'calculated' },
        { key: 'ikss_at_location_ka', label: 'Ik" w miejscu', value: null, type: 'number', unit: 'kA', editable: false, source: 'calculated' },
        { key: 'utilization_percent', label: 'Współczynnik wykorzystania', value: null, type: 'number', unit: '%', editable: false, source: 'calculated' },
      ],
    },
    {
      id: 'audit',
      label: SECTION_LABELS.audit,
      fields: [
        { key: 'created_at', label: 'Data utworzenia', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'created_by', label: 'Utworzył', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_at', label: 'Data modyfikacji', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_by', label: 'Zmodyfikował', value: '', type: 'string', editable: false, source: 'audit' },
      ],
    },
  ];
}

/**
 * Field definitions for Source (Źródło - sieć zewnętrzna).
 * Per wizard_screens.md § 3.7.
 */
export function getSourceFieldDefinitions(): PropertySection[] {
  return [
    {
      id: 'identification',
      label: SECTION_LABELS.identification,
      fields: [
        { key: 'id', label: 'ID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'name', label: 'Nazwa', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'uuid', label: 'UUID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'element_type', label: 'Typ obiektu', value: 'Source', type: 'string', editable: false, source: 'instance' },
      ],
    },
    {
      id: 'state',
      label: SECTION_LABELS.state,
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: true, type: 'boolean', editable: true, source: 'instance' },
        { key: 'lifecycle_state', label: 'Stan cyklu życia', value: 'AKTYWNY', type: 'enum', editable: true, enumOptions: ['PROJEKTOWANY', 'AKTYWNY', 'WYLACZONY'], source: 'instance' },
      ],
    },
    {
      id: 'topology',
      label: SECTION_LABELS.topology,
      fields: [
        { key: 'bus_id', label: 'Szyna przyłączenia', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'short_circuit',
      label: SECTION_LABELS.short_circuit,
      fields: [
        { key: 'sk_mva', label: "Moc zwarciowa Sk\"", value: 5000, type: 'number', unit: 'MVA', editable: true, source: 'instance' },
        { key: 'rx_ratio', label: 'Stosunek R/X', value: 0.1, type: 'number', editable: true, source: 'instance' },
        { key: 'voltage_kv', label: 'Napięcie znamionowe Un', value: 110.0, type: 'number', unit: 'kV', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'calculated',
      label: SECTION_LABELS.calculated,
      fields: [
        { key: 'zk_ohm', label: 'Impedancja zwarciowa Zk', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'rk_ohm', label: 'Rk', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'xk_ohm', label: 'Xk', value: null, type: 'number', unit: 'Ω', editable: false, source: 'calculated' },
        { key: 'ikss_ka', label: 'Ik"', value: null, type: 'number', unit: 'kA', editable: false, source: 'calculated' },
        { key: 'p_mw', label: 'P wpływające', value: null, type: 'number', unit: 'MW', editable: false, source: 'calculated' },
        { key: 'q_mvar', label: 'Q wpływające', value: null, type: 'number', unit: 'Mvar', editable: false, source: 'calculated' },
      ],
    },
    {
      id: 'audit',
      label: SECTION_LABELS.audit,
      fields: [
        { key: 'created_at', label: 'Data utworzenia', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'created_by', label: 'Utworzył', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_at', label: 'Data modyfikacji', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_by', label: 'Zmodyfikował', value: '', type: 'string', editable: false, source: 'audit' },
      ],
    },
  ];
}

/**
 * Field definitions for Load (Odbiornik).
 * Per wizard_screens.md § 3.9.
 */
export function getLoadFieldDefinitions(): PropertySection[] {
  return [
    {
      id: 'identification',
      label: SECTION_LABELS.identification,
      fields: [
        { key: 'id', label: 'ID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'name', label: 'Nazwa', value: '', type: 'string', editable: true, source: 'instance' },
        { key: 'uuid', label: 'UUID', value: '', type: 'string', editable: false, source: 'instance' },
        { key: 'element_type', label: 'Typ obiektu', value: 'Load', type: 'string', editable: false, source: 'instance' },
      ],
    },
    {
      id: 'state',
      label: SECTION_LABELS.state,
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: true, type: 'boolean', editable: true, source: 'instance' },
        { key: 'lifecycle_state', label: 'Stan cyklu życia', value: 'AKTYWNY', type: 'enum', editable: true, enumOptions: ['PROJEKTOWANY', 'AKTYWNY', 'WYLACZONY'], source: 'instance' },
      ],
    },
    {
      id: 'topology',
      label: SECTION_LABELS.topology,
      fields: [
        { key: 'bus_id', label: 'Szyna przyłączenia', value: '', type: 'ref', refType: 'Bus', editable: true, source: 'instance' },
      ],
    },
    {
      id: 'electrical_params',
      label: SECTION_LABELS.electrical_params,
      fields: [
        { key: 'p_mw', label: 'Moc czynna P', value: 1.0, type: 'number', unit: 'MW', editable: true, source: 'instance' },
        { key: 'q_mvar', label: 'Moc bierna Q', value: 0.3, type: 'number', unit: 'Mvar', editable: true, source: 'instance' },
        { key: 'cos_phi', label: 'Współczynnik mocy cos φ', value: 0.95, type: 'number', editable: true, source: 'instance' },
        { key: 'load_type', label: 'Typ modelu', value: 'CONSTANT_POWER', type: 'enum', editable: true, enumOptions: ['CONSTANT_POWER', 'CONSTANT_IMPEDANCE', 'ZIP'], source: 'instance' },
      ],
    },
    {
      id: 'calculated',
      label: SECTION_LABELS.calculated,
      fields: [
        { key: 'p_calculated_mw', label: 'P obliczone', value: null, type: 'number', unit: 'MW', editable: false, source: 'calculated' },
        { key: 'q_calculated_mvar', label: 'Q obliczone', value: null, type: 'number', unit: 'Mvar', editable: false, source: 'calculated' },
        { key: 's_calculated_mva', label: 'S obliczone', value: null, type: 'number', unit: 'MVA', editable: false, source: 'calculated' },
        { key: 'i_calculated_a', label: 'I obliczony', value: null, type: 'number', unit: 'A', editable: false, source: 'calculated' },
      ],
    },
    {
      id: 'audit',
      label: SECTION_LABELS.audit,
      fields: [
        { key: 'created_at', label: 'Data utworzenia', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'created_by', label: 'Utworzył', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_at', label: 'Data modyfikacji', value: '', type: 'string', editable: false, source: 'audit' },
        { key: 'modified_by', label: 'Zmodyfikował', value: '', type: 'string', editable: false, source: 'audit' },
      ],
    },
  ];
}

/**
 * Get field definitions for an element type.
 */
export function getFieldDefinitions(elementType: ElementType): PropertySection[] {
  switch (elementType) {
    case 'Bus':
      return getBusFieldDefinitions();
    case 'LineBranch':
      return getLineBranchFieldDefinitions();
    case 'TransformerBranch':
      return getTransformerBranchFieldDefinitions();
    case 'Switch':
      return getSwitchFieldDefinitions();
    case 'Source':
      return getSourceFieldDefinitions();
    case 'Load':
      return getLoadFieldDefinitions();
    default:
      return [];
  }
}
