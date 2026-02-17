/**
 * Rich Action Menu Builders — pełne menu kontekstowe A–AZ.
 *
 * CANONICAL ALIGNMENT:
 * - UI_UX_10_10_ABSOLUTE_PLUS_ACTIONS_AND_MODALS_CANONICAL.md
 * - wizard_screens.md § 4: Menu Kontekstowe specifications
 * - sld_rules.md § E.2, § E.3: Context Menu (Edit Mode) and (Result Mode)
 *
 * Zasady:
 * - Minimum 10 opcji w menu każdego obiektu.
 * - Etykiety 100% PL, brak anglicyzmów.
 * - Każda opcja otwiera osobny modal.
 * - Brak domyślnych wartości liczbowych.
 */

import type { ContextMenuAction, OperatingMode } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sep(id: string): ContextMenuAction {
  return { id, label: '', enabled: false, visible: true, separator: true };
}

function action(
  id: string,
  label: string,
  opts: { enabled?: boolean; handler?: () => void; submenu?: ContextMenuAction[] } = {},
): ContextMenuAction {
  return {
    id,
    label,
    enabled: opts.enabled ?? true,
    visible: true,
    handler: opts.handler,
    submenu: opts.submenu,
  };
}

// ---------------------------------------------------------------------------
// A) GPZ / Źródło SN — buildSourceSNContextMenu
// ---------------------------------------------------------------------------

export function buildSourceSNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości...', { handler: handlers.onProperties }),
    sep('s1'),
    action('edit_sk3', 'Zmień moc zwarciową Sk″ (MVA)...', { enabled: edit, handler: handlers.onEditSk3 }),
    action('edit_voltage', 'Zmień napięcie zasilania (kV)...', { enabled: edit, handler: handlers.onEditVoltage }),
    action('edit_rx', 'Zmień stosunek R/X...', { enabled: edit, handler: handlers.onEditRx }),
    action('assign_catalog', 'Przypisz katalog źródła...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość źródła...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki na źródle...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('export_data', 'Eksportuj dane źródła...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    action('delete', 'Usuń źródło SN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// B) Szyna SN — buildBusSNContextMenu (rozszerzony)
// ---------------------------------------------------------------------------

export function buildBusSNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości...', { handler: handlers.onProperties }),
    sep('s1'),
    action('add_line', 'Dodaj linię/kabel...', { enabled: edit, handler: handlers.onAddLine }),
    action('add_transformer', 'Dodaj transformator...', { enabled: edit, handler: handlers.onAddTransformer }),
    action('add_breaker', 'Dodaj wyłącznik...', { enabled: edit, handler: handlers.onAddBreaker }),
    action('add_disconnector', 'Dodaj rozłącznik...', { enabled: edit, handler: handlers.onAddDisconnector }),
    action('add_source', 'Dodaj źródło...', { enabled: edit, handler: handlers.onAddSource }),
    action('add_load', 'Dodaj odbiornik...', { enabled: edit, handler: handlers.onAddLoad }),
    action('add_ct', 'Dodaj przekładnik prądowy...', { enabled: edit, handler: handlers.onAddCT }),
    action('add_vt', 'Dodaj przekładnik napięciowy...', { enabled: edit, handler: handlers.onAddVT }),
    sep('s2'),
    action('edit_voltage', 'Zmień napięcie szyny (kV)...', { enabled: edit, handler: handlers.onEditVoltage }),
    action('assign_catalog', 'Przypisz katalog szyny...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s3'),
    action('show_readiness', 'Pokaż gotowość szyny...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki na szynie...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s4'),
    action('export_data', 'Eksportuj dane szyny...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s5'),
    action('delete', 'Usuń szynę SN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// G) Stacja SN/nN — buildStationContextMenu
// ---------------------------------------------------------------------------

export function buildStationContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości stacji...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Pola SN (1-6) ---
    action('add_sn_field_in', 'Dodaj pole SN liniowe IN...', { enabled: edit, handler: handlers.onAddSNFieldIN }),
    action('add_sn_field_out', 'Dodaj pole SN liniowe OUT...', { enabled: edit, handler: handlers.onAddSNFieldOUT }),
    action('add_sn_field_branch', 'Dodaj pole SN odgałęźne...', { enabled: edit, handler: handlers.onAddSNFieldBranch }),
    action('add_sn_field_tr', 'Dodaj pole transformatorowe...', { enabled: edit, handler: handlers.onAddSNFieldTR }),
    action('add_sn_bus_section', 'Dodaj sekcję szyn SN...', { enabled: edit, handler: handlers.onAddSNBusSection }),
    action('add_sn_coupler', 'Dodaj sprzęgło SN...', { enabled: edit, handler: handlers.onAddSNCoupler }),
    sep('s2'),
    // --- Ochrona (7-12) ---
    action('add_ct', 'Dodaj CT do pola...', { enabled: edit, handler: handlers.onAddCT }),
    action('add_vt', 'Dodaj VT do pola...', { enabled: edit, handler: handlers.onAddVT }),
    action('add_relay', 'Dodaj przekaźnik do pola...', { enabled: edit, handler: handlers.onAddRelay }),
    action('edit_relay_settings', 'Edytuj nastawy przekaźnika...', { enabled: edit, handler: handlers.onEditRelaySettings }),
    action('calc_tcc', 'Wylicz krzywe TCC...', { handler: handlers.onCalcTCC }),
    action('check_selectivity', 'Sprawdź selektywność...', { handler: handlers.onCheckSelectivity }),
    sep('s3'),
    // --- Transformator i nN (13-20) ---
    action('add_transformer', 'Dodaj transformator SN/nN...', { enabled: edit, handler: handlers.onAddTransformer }),
    action('assign_tr_catalog', 'Przypisz katalog transformatora...', { enabled: edit, handler: handlers.onAssignTRCatalog }),
    action('add_nn_bus', 'Dodaj szynę nN...', { enabled: edit, handler: handlers.onAddNNBus }),
    action('add_nn_main', 'Dodaj pole główne nN...', { enabled: edit, handler: handlers.onAddNNMain }),
    action('add_nn_feeder', 'Dodaj odpływ nN...', { enabled: edit, handler: handlers.onAddNNFeeder }),
    action('add_nn_bus_section', 'Dodaj sekcję szyn nN...', { enabled: edit, handler: handlers.onAddNNBusSection }),
    action('add_nn_coupler', 'Dodaj sprzęgło nN...', { enabled: edit, handler: handlers.onAddNNCoupler }),
    action('add_nn_load', 'Dodaj odbiór nN...', { enabled: edit, handler: handlers.onAddNNLoad }),
    sep('s4'),
    // --- Źródła nN (21-26) ---
    action('add_source_field_nn', 'Dodaj źródło nN (pole źródłowe)...', { enabled: edit, handler: handlers.onAddSourceFieldNN }),
    action('add_pv', 'Dodaj falownik PV...', { enabled: edit, handler: handlers.onAddPV }),
    action('add_bess', 'Dodaj falownik BESS...', { enabled: edit, handler: handlers.onAddBESS }),
    action('add_bess_energy', 'Dodaj BESS (energia)...', { enabled: edit, handler: handlers.onAddBESSEnergy }),
    action('add_genset', 'Dodaj agregat...', { enabled: edit, handler: handlers.onAddGenset }),
    action('add_ups', 'Dodaj UPS...', { enabled: edit, handler: handlers.onAddUPS }),
    action('set_source_mode', 'Ustaw tryb pracy źródeł (StudyCase)...', { enabled: edit, handler: handlers.onSetSourceMode }),
    sep('s5'),
    // --- Gotowość, wyniki, eksport (27-30) ---
    action('show_readiness', 'Pokaż gotowość stacji...', { handler: handlers.onShowReadiness }),
    action('fix_issues', 'Napraw braki (działania naprawcze)...', { handler: handlers.onFixIssues }),
    action('show_results', 'Wyniki + White Box + Eksport raportu stacji...', { enabled: result, handler: handlers.onShowResults }),
    sep('s6'),
    action('edit_name', 'Zmień nazwę stacji...', { enabled: edit, handler: handlers.onEditName }),
    action('edit_type', 'Zmień typ stacji (A/B/C/D)...', { enabled: edit, handler: handlers.onEditType }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    action('export_data', 'Eksportuj dane stacji...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s7'),
    action('delete', 'Usuń stację...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// H) Pole SN — buildBaySNContextMenu
// ---------------------------------------------------------------------------

export function buildBaySNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości pola SN...', { handler: handlers.onProperties }),
    sep('s1'),
    action('add_breaker', 'Dodaj wyłącznik...', { enabled: edit, handler: handlers.onAddBreaker }),
    action('add_disconnector', 'Dodaj rozłącznik...', { enabled: edit, handler: handlers.onAddDisconnector }),
    action('add_earth_switch', 'Dodaj odłącznik uziemiający...', { enabled: edit, handler: handlers.onAddEarthSwitch }),
    action('add_ct', 'Dodaj przekładnik prądowy (CT)...', { enabled: edit, handler: handlers.onAddCT }),
    action('add_vt', 'Dodaj przekładnik napięciowy (VT)...', { enabled: edit, handler: handlers.onAddVT }),
    action('add_protection', 'Dodaj zabezpieczenie...', { enabled: edit, handler: handlers.onAddProtection }),
    sep('s2'),
    action('change_role', 'Zmień rolę pola...', { enabled: edit, handler: handlers.onChangeRole }),
    action('assign_catalog', 'Przypisz katalog aparatów...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s3'),
    action('show_readiness', 'Pokaż gotowość pola...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki pola...', { enabled: result, handler: handlers.onShowResults }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s4'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    action('delete', 'Usuń pole SN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// I) Aparat SN — buildSwitchSNContextMenu (rozszerzony)
// ---------------------------------------------------------------------------

export function buildSwitchSNContextMenu(
  mode: OperatingMode,
  switchState: 'OPEN' | 'CLOSED' | undefined,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  const stateLabel = switchState === 'CLOSED' ? 'Otwórz łącznik' : 'Zamknij łącznik';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości łącznika...', { handler: handlers.onProperties }),
    sep('s1'),
    action('toggle_switch', stateLabel, { enabled: edit, handler: handlers.onToggleSwitch }),
    action('set_normal_state', 'Ustaw stan normalny...', { enabled: edit, handler: handlers.onSetNormalState }),
    action('set_as_nop', 'Ustaw jako punkt normalnie otwarty...', { enabled: edit, handler: handlers.onSetAsNOP }),
    sep('s2'),
    action('assign_catalog', 'Przypisz katalog łącznika...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s3'),
    action('add_protection', 'Dodaj zabezpieczenie...', { enabled: edit, handler: handlers.onAddProtection }),
    action('add_ct', 'Dodaj przekładnik prądowy...', { enabled: edit, handler: handlers.onAddCT }),
    action('add_vt', 'Dodaj przekładnik napięciowy...', { enabled: edit, handler: handlers.onAddVT }),
    sep('s4'),
    action('show_readiness', 'Pokaż gotowość łącznika...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki łącznika...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s5'),
    action('export_data', 'Eksportuj dane łącznika...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s6'),
    action('delete', 'Usuń łącznik SN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// L) Transformator SN/nN — buildTransformerContextMenu
// ---------------------------------------------------------------------------

export function buildTransformerContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości transformatora...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog transformatora...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_tap', 'Zmień nastawy przełącznika zaczepów...', { enabled: edit, handler: handlers.onEditTap }),
    action('edit_vector_group', 'Zmień grupę połączeń...', { enabled: edit, handler: handlers.onEditVectorGroup }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość transformatora...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki transformatora...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('export_data', 'Eksportuj dane transformatora...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    action('delete', 'Usuń transformator...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// M) Szyna nN — buildBusNNContextMenu (20+ opcji)
// ---------------------------------------------------------------------------

export function buildBusNNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości szyny nN...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Odpływy i źródła ---
    action('add_feeder', 'Dodaj odpływ nN...', { enabled: edit, handler: handlers.onAddFeeder }),
    action('add_source_field', 'Dodaj pole źródłowe nN...', { enabled: edit, handler: handlers.onAddSourceField }),
    action('add_pv', 'Dodaj falownik PV...', { enabled: edit, handler: handlers.onAddPV }),
    action('add_bess', 'Dodaj falownik BESS...', { enabled: edit, handler: handlers.onAddBESS }),
    action('add_genset', 'Dodaj agregat...', { enabled: edit, handler: handlers.onAddGenset }),
    action('add_ups', 'Dodaj UPS...', { enabled: edit, handler: handlers.onAddUPS }),
    sep('s2'),
    // --- Infrastruktura szyny ---
    action('add_bus_section', 'Dodaj sekcję szyn nN...', { enabled: edit, handler: handlers.onAddBusSection }),
    action('add_bus_coupler', 'Dodaj sprzęgło szyn nN...', { enabled: edit, handler: handlers.onAddBusCoupler }),
    action('add_energy_meter', 'Dodaj pomiar energii...', { enabled: edit, handler: handlers.onAddEnergyMeter }),
    action('add_quality_meter', 'Dodaj pomiar jakości energii...', { enabled: edit, handler: handlers.onAddQualityMeter }),
    action('add_surge_arrester', 'Dodaj ogranicznik przepięć nN...', { enabled: edit, handler: handlers.onAddSurgeArrester }),
    action('add_load', 'Dodaj odbiór zbiorczy...', { enabled: edit, handler: handlers.onAddLoad }),
    action('add_segment', 'Dodaj segment nN (odcinek)...', { enabled: edit, handler: handlers.onAddSegment }),
    sep('s3'),
    // --- Edycja parametrów ---
    action('edit_voltage', 'Zmień napięcie nN (kV)...', { enabled: edit, handler: handlers.onEditVoltage }),
    action('assign_bus_catalog', 'Przypisz katalog szyny...', { enabled: edit, handler: handlers.onAssignBusCatalog }),
    action('assign_default_catalog', 'Przypisz katalog aparatów domyślnych...', { enabled: edit, handler: handlers.onAssignDefaultCatalog }),
    sep('s4'),
    // --- Widoki i diagnostyka ---
    action('show_readiness', 'Pokaż gotowość szyny...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki na szynie...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s5'),
    action('export_data', 'Eksportuj dane szyny nN...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s6'),
    action('delete', 'Usuń szynę nN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// O) Odpływ nN — buildFeederNNContextMenu (20+ opcji)
// ---------------------------------------------------------------------------

export function buildFeederNNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości odpływu nN...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Zmiana roli i topologia ---
    action('change_role', 'Zmień rolę odpływu (odbiór/rezerwa/źródło PV/źródło BESS)...', { enabled: edit, handler: handlers.onChangeRole }),
    action('add_load', 'Dodaj odbiór...', { enabled: edit, handler: handlers.onAddLoad }),
    action('add_pv', 'Dodaj źródło PV na odpływie...', { enabled: edit, handler: handlers.onAddPV }),
    action('add_bess', 'Dodaj źródło BESS na odpływie...', { enabled: edit, handler: handlers.onAddBESS }),
    sep('s2'),
    // --- Aparatura ---
    action('add_fuse', 'Dodaj bezpiecznik...', { enabled: edit, handler: handlers.onAddFuse }),
    action('add_breaker', 'Dodaj wyłącznik...', { enabled: edit, handler: handlers.onAddBreaker }),
    action('add_disconnector', 'Dodaj rozłącznik...', { enabled: edit, handler: handlers.onAddDisconnector }),
    action('toggle_switch', 'Zmień stan aparatu...', { enabled: edit, handler: handlers.onToggleSwitch }),
    action('set_normal_state', 'Ustaw stan normalny...', { enabled: edit, handler: handlers.onSetNormalState }),
    action('assign_switch_catalog', 'Przypisz katalog aparatu...', { enabled: edit, handler: handlers.onAssignSwitchCatalog }),
    action('assign_cable_catalog', 'Przypisz katalog przewodu...', { enabled: edit, handler: handlers.onAssignCableCatalog }),
    sep('s3'),
    // --- Segment ---
    action('add_segment', 'Dodaj segment nN...', { enabled: edit, handler: handlers.onAddSegment }),
    action('edit_segment_length', 'Zmień długość segmentu...', { enabled: edit, handler: handlers.onEditSegmentLength }),
    sep('s4'),
    // --- Pomiary i zabezpieczenia ---
    action('add_energy_meter', 'Dodaj licznik energii...', { enabled: edit, handler: handlers.onAddEnergyMeter }),
    action('add_quality_meter', 'Dodaj pomiar jakości...', { enabled: edit, handler: handlers.onAddQualityMeter }),
    action('add_surge_arrester', 'Dodaj ogranicznik przepięć...', { enabled: edit, handler: handlers.onAddSurgeArrester }),
    action('add_protection', 'Dodaj zabezpieczenie (logiczne)...', { enabled: edit, handler: handlers.onAddProtection }),
    sep('s5'),
    // --- Widoki i diagnostyka ---
    action('show_readiness', 'Pokaż gotowość odpływu...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki odpływu...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s6'),
    action('export_data', 'Eksportuj dane odpływu...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s7'),
    action('delete', 'Usuń odpływ nN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// U) Pole źródłowe nN — buildSourceFieldNNContextMenu
// ---------------------------------------------------------------------------

export function buildSourceFieldNNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości pola źródłowego nN...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Źródła (1-5) ---
    action('add_pv', 'Dodaj falownik PV...', { enabled: edit, handler: handlers.onAddPV }),
    action('add_bess', 'Dodaj falownik BESS...', { enabled: edit, handler: handlers.onAddBESS }),
    action('add_bess_energy', 'Dodaj BESS (energia)...', { enabled: edit, handler: handlers.onAddBESSEnergy }),
    action('add_genset', 'Dodaj agregat...', { enabled: edit, handler: handlers.onAddGenset }),
    action('add_ups', 'Dodaj UPS...', { enabled: edit, handler: handlers.onAddUPS }),
    sep('s2'),
    // --- Konfiguracja (6-11) ---
    action('set_operating_mode', 'Ustaw tryb pracy (SIEĆ/LOKALNE/WYSPA)...', { enabled: edit, handler: handlers.onSetOperatingMode }),
    action('set_time_profile', 'Ustaw profil czasowy...', { enabled: edit, handler: handlers.onSetTimeProfile }),
    action('assign_inverter_catalog', 'Przypisz katalog falownika...', { enabled: edit, handler: handlers.onAssignInverterCatalog }),
    action('assign_switch_catalog', 'Przypisz katalog aparatu...', { enabled: edit, handler: handlers.onAssignSwitchCatalog }),
    action('edit_source_params', 'Edytuj parametry źródła...', { enabled: edit, handler: handlers.onEditSourceParams }),
    action('validate_transformer', 'Waliduj „transformator w torze" (raport)...', { handler: handlers.onValidateTransformer }),
    sep('s3'),
    // --- Gotowość i wyniki (12-18) ---
    action('show_readiness', 'Pokaż gotowość pola...', { handler: handlers.onShowReadiness }),
    action('fix_issues', 'Napraw braki...', { handler: handlers.onFixIssues }),
    action('show_results', 'Pokaż wyniki pola...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    // --- Eksport i geometria (19-20) ---
    action('export_json', 'Eksport JSON...', { handler: handlers.onExportJSON }),
    action('export_report', 'Eksport raportu...', { handler: handlers.onExportReport }),
    action('edit_geometry', 'Edytuj geometrię widoku...', { enabled: edit, handler: handlers.onEditGeometry }),
    action('reset_geometry', 'Reset geometrii widoku', { enabled: edit, handler: handlers.onResetGeometry }),
    sep('s5'),
    action('delete', 'Usuń pole źródłowe nN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// V) Falownik PV — buildPVInverterContextMenu
// ---------------------------------------------------------------------------

export function buildPVInverterContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości falownika PV...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog falownika PV...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_power', 'Zmień moc znamionową/maksymalną...', { enabled: edit, handler: handlers.onEditPower }),
    action('edit_control', 'Zmień tryb regulacji (cos φ / Q(U) / P(U))...', { enabled: edit, handler: handlers.onEditControl }),
    action('edit_limits', 'Zmień ograniczenia generacji...', { enabled: edit, handler: handlers.onEditLimits }),
    action('edit_disconnect', 'Zmień warunek odłączenia...', { enabled: edit, handler: handlers.onEditDisconnect }),
    action('edit_measurement', 'Zmień punkt pomiaru energii...', { enabled: edit, handler: handlers.onEditMeasurement }),
    action('set_profile', 'Przypisz profil pracy...', { enabled: edit, handler: handlers.onSetProfile }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość falownika PV...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki falownika PV...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('export_data', 'Eksportuj dane falownika PV...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    action('delete', 'Usuń falownik PV...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// W) Falownik BESS — buildBESSInverterContextMenu
// ---------------------------------------------------------------------------

export function buildBESSInverterContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości falownika BESS...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_inverter_catalog', 'Przypisz katalog falownika BESS...', { enabled: edit, handler: handlers.onAssignInverterCatalog }),
    action('assign_storage_catalog', 'Przypisz katalog magazynu energii...', { enabled: edit, handler: handlers.onAssignStorageCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_capacity', 'Zmień pojemność użyteczną (kWh)...', { enabled: edit, handler: handlers.onEditCapacity }),
    action('edit_power', 'Zmień moc ładowania/rozładowania (kW)...', { enabled: edit, handler: handlers.onEditPower }),
    action('edit_mode', 'Zmień tryb pracy...', { enabled: edit, handler: handlers.onEditMode }),
    action('edit_strategy', 'Zmień strategię sterowania...', { enabled: edit, handler: handlers.onEditStrategy }),
    action('edit_soc', 'Zmień ograniczenia SOC (%)...', { enabled: edit, handler: handlers.onEditSOC }),
    action('set_profile', 'Przypisz profil czasowy...', { enabled: edit, handler: handlers.onSetProfile }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość falownika BESS...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki falownika BESS...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('export_data', 'Eksportuj dane falownika BESS...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    action('delete', 'Usuń falownik BESS...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// Y) Agregat — buildGensetContextMenu
// ---------------------------------------------------------------------------

export function buildGensetContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości agregatu...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog agregatu...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_power', 'Zmień moc znamionową (kW)...', { enabled: edit, handler: handlers.onEditPower }),
    action('edit_voltage', 'Zmień napięcie znamionowe (kV)...', { enabled: edit, handler: handlers.onEditVoltage }),
    action('edit_pf', 'Zmień współczynnik mocy...', { enabled: edit, handler: handlers.onEditPF }),
    action('edit_mode', 'Zmień tryb pracy (ciągły/awaryjny/szczytowy)...', { enabled: edit, handler: handlers.onEditMode }),
    action('edit_fuel', 'Zmień rodzaj paliwa...', { enabled: edit, handler: handlers.onEditFuel }),
    action('edit_switch', 'Zmień aparat odłączający...', { enabled: edit, handler: handlers.onEditSwitch }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość agregatu...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki agregatu...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('export_data', 'Eksportuj dane agregatu...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    action('delete', 'Usuń agregat...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// Z) UPS — buildUPSContextMenu
// ---------------------------------------------------------------------------

export function buildUPSContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości UPS...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog UPS...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_power', 'Zmień moc znamionową (kW)...', { enabled: edit, handler: handlers.onEditPower }),
    action('edit_backup_time', 'Zmień czas podtrzymania (min)...', { enabled: edit, handler: handlers.onEditBackupTime }),
    action('edit_mode', 'Zmień tryb pracy (online/line-interactive/offline)...', { enabled: edit, handler: handlers.onEditMode }),
    action('edit_battery', 'Zmień typ akumulatora...', { enabled: edit, handler: handlers.onEditBattery }),
    action('edit_switch', 'Zmień aparat odłączający...', { enabled: edit, handler: handlers.onEditSwitch }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość UPS...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki UPS...', { enabled: result, handler: handlers.onShowResults }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('export_data', 'Eksportuj dane UPS...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    action('delete', 'Usuń UPS...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// S) Odbiór nN — buildLoadNNContextMenu
// ---------------------------------------------------------------------------

export function buildLoadNNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości odbioru nN...', { handler: handlers.onProperties }),
    sep('s1'),
    action('edit_power', 'Zmień moc czynną (kW)...', { enabled: edit, handler: handlers.onEditPower }),
    action('edit_reactive', 'Zmień moc bierną (kvar) / cos φ...', { enabled: edit, handler: handlers.onEditReactive }),
    action('edit_kind', 'Zmień rodzaj odbioru (skupiony/rozproszony)...', { enabled: edit, handler: handlers.onEditKind }),
    action('edit_connection', 'Zmień sposób przyłączenia (1-faz./3-faz.)...', { enabled: edit, handler: handlers.onEditConnection }),
    action('set_profile', 'Przypisz profil obciążenia...', { enabled: edit, handler: handlers.onSetProfile }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość odbioru...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki odbioru...', { enabled: result, handler: handlers.onShowResults }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    action('delete', 'Usuń odbiór nN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// AA) Licznik energii — buildEnergyMeterContextMenu
// ---------------------------------------------------------------------------

export function buildEnergyMeterContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  return [
    action('properties', 'Właściwości licznika energii...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog licznika...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('edit_type', 'Zmień typ pomiaru (jednokierunkowy/dwukierunkowy)...', { enabled: edit, handler: handlers.onEditType }),
    action('edit_accuracy', 'Zmień klasę dokładności...', { enabled: edit, handler: handlers.onEditAccuracy }),
    action('edit_ratio', 'Zmień przekładnię...', { enabled: edit, handler: handlers.onEditRatio }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość licznika...', { handler: handlers.onShowReadiness }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    action('delete', 'Usuń licznik energii...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// AH) Łącznik nN — buildSwitchNNContextMenu
// ---------------------------------------------------------------------------

export function buildSwitchNNContextMenu(
  mode: OperatingMode,
  switchState: 'OPEN' | 'CLOSED' | undefined,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  const stateLabel = switchState === 'CLOSED' ? 'Otwórz łącznik' : 'Zamknij łącznik';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości łącznika nN...', { handler: handlers.onProperties }),
    sep('s1'),
    action('toggle_switch', stateLabel, { enabled: edit, handler: handlers.onToggleSwitch }),
    action('set_normal_state', 'Ustaw stan normalny...', { enabled: edit, handler: handlers.onSetNormalState }),
    action('change_kind', 'Zmień rodzaj (wyłącznik/rozłącznik/bezpiecznik)...', { enabled: edit, handler: handlers.onChangeKind }),
    action('assign_catalog', 'Przypisz katalog łącznika nN...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość łącznika nN...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki łącznika nN...', { enabled: result, handler: handlers.onShowResults }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    action('delete', 'Usuń łącznik nN...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// D/E) Segment SN — buildSegmentSNContextMenu
// ---------------------------------------------------------------------------

export function buildSegmentSNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości segmentu...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Budowa (1-8) ---
    action('insert_station_a', 'Wstaw stację SN/nN (A)...', { enabled: edit, handler: handlers.onInsertStationA }),
    action('insert_station_b', 'Wstaw stację SN/nN (B)...', { enabled: edit, handler: handlers.onInsertStationB }),
    action('insert_station_c', 'Wstaw stację SN/nN (C)...', { enabled: edit, handler: handlers.onInsertStationC }),
    action('insert_station_d', 'Wstaw stację SN/nN (D)...', { enabled: edit, handler: handlers.onInsertStationD }),
    action('insert_section_switch', 'Wstaw łącznik sekcyjny...', { enabled: edit, handler: handlers.onInsertSwitch }),
    action('insert_disconnector', 'Wstaw rozłącznik...', { enabled: edit, handler: handlers.onInsertDisconnector }),
    action('insert_earthing', 'Wstaw uziemnik...', { enabled: edit, handler: handlers.onInsertEarthing }),
    sep('s2'),
    // --- Aparaty i pomiary (8-9) ---
    action('add_ct', 'Dodaj pomiar prądu (CT)...', { enabled: edit, handler: handlers.onAddCT }),
    action('add_vt', 'Dodaj pomiar napięcia (VT)...', { enabled: edit, handler: handlers.onAddVT }),
    sep('s3'),
    // --- Katalog i parametry (10-15) ---
    action('assign_catalog', 'Przypisz katalog do odcinka...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_type', 'Zmień typ odcinka (linia/kabel)...', { enabled: edit, handler: handlers.onEditType }),
    action('edit_length', 'Zmień długość odcinka (m)...', { enabled: edit, handler: handlers.onEditLength }),
    action('edit_description', 'Dodaj opis techniczny...', { enabled: edit, handler: handlers.onEditDescription }),
    action('edit_label', 'Ustaw oznaczenie odcinka...', { enabled: edit, handler: handlers.onEditLabel }),
    action('rename', 'Zmień nazwę...', { enabled: edit, handler: handlers.onRename }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s4'),
    // --- Gotowość i wyniki (16-20) ---
    action('show_readiness', 'Pokaż gotowość odcinka...', { handler: handlers.onShowReadiness }),
    action('fix_issues', 'Napraw braki odcinka...', { handler: handlers.onFixIssues }),
    action('show_results', 'Pokaż wyniki (z ostatniej analizy)...', { enabled: result, handler: handlers.onShowResults }),
    action('show_comparison', 'Pokaż porównanie wyników...', { enabled: result, handler: handlers.onShowComparison }),
    action('show_whitebox', 'Pokaż White Box dla odcinka...', { enabled: result, handler: handlers.onShowWhitebox }),
    sep('s5'),
    // --- Historia i porównania (21-25) ---
    action('show_history', 'Pokaż historię zmian (zdarzenia)...', { handler: handlers.onShowHistory }),
    action('undo_snapshot', 'Cofnij do poprzedniego Snapshot...', { enabled: edit, handler: handlers.onUndoSnapshot }),
    action('compare_snapshots', 'Porównaj Snapshot...', { handler: handlers.onCompareSnapshots }),
    action('export_json', 'Eksportuj dane odcinka (JSON)...', { handler: handlers.onExportJSON }),
    action('export_report', 'Eksportuj fragment raportu (PDF/DOCX)...', { handler: handlers.onExportReport }),
    sep('s6'),
    // --- Geometria widoku (26-30) ---
    action('edit_geometry', 'Edytuj geometrię widoku odcinka (łamania)...', { enabled: edit, handler: handlers.onEditGeometry }),
    action('snap_to_grid', 'Wyrównaj do siatki (tylko widok)', { enabled: edit, handler: handlers.onSnapToGrid }),
    action('reset_geometry', 'Reset geometrii widoku (tylko widok)', { enabled: edit, handler: handlers.onResetGeometry }),
    action('check_collisions', 'Sprawdź kolizje i odstępy...', { handler: handlers.onCheckCollisions }),
    sep('s7'),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s8'),
    action('delete', 'Usuń odcinek (z potwierdzeniem)...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// J) Przekaźnik / Zabezpieczenie SN — buildRelaySNContextMenu
// ---------------------------------------------------------------------------

export function buildRelaySNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości zabezpieczenia...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog zabezpieczenia...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('edit_settings', 'Zmień nastawy zabezpieczenia...', { enabled: edit, handler: handlers.onEditSettings }),
    action('edit_curve', 'Zmień charakterystykę czasową...', { enabled: edit, handler: handlers.onEditCurve }),
    action('edit_type', 'Zmień typ zabezpieczenia...', { enabled: edit, handler: handlers.onEditType }),
    action('assign_ct', 'Przypisz przekładnik prądowy (CT)...', { enabled: edit, handler: handlers.onAssignCT }),
    action('assign_vt', 'Przypisz przekładnik napięciowy (VT)...', { enabled: edit, handler: handlers.onAssignVT }),
    action('toggle_enabled', 'Włącz/Wyłącz zabezpieczenie...', { enabled: edit, handler: handlers.onToggleEnabled }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość zabezpieczenia...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki zabezpieczenia...', { enabled: result, handler: handlers.onShowResults }),
    action('show_coordination', 'Pokaż koordynację...', { enabled: result, handler: handlers.onShowCoordination }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    action('delete', 'Usuń zabezpieczenie...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// K) CT/VT SN — buildMeasurementSNContextMenu
// ---------------------------------------------------------------------------

export function buildMeasurementSNContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  return [
    action('properties', 'Właściwości przekładnika...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog przekładnika...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_rating', 'Zmień dane znamionowe...', { enabled: edit, handler: handlers.onEditRating }),
    action('edit_connection', 'Zmień schemat połączeń (gwiazda/trójkąt)...', { enabled: edit, handler: handlers.onEditConnection }),
    action('edit_purpose', 'Zmień przeznaczenie (zabezpieczenia/pomiarowy/kombinowany)...', { enabled: edit, handler: handlers.onEditPurpose }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość przekładnika...', { handler: handlers.onShowReadiness }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    action('delete', 'Usuń przekładnik...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// Q) NOP — buildNOPContextMenu
// ---------------------------------------------------------------------------

export function buildNOPContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', 'Właściwości punktu normalnie otwartego...', { handler: handlers.onProperties }),
    sep('s1'),
    action('clear_nop', 'Usuń oznaczenie punktu normalnie otwartego...', { enabled: edit, handler: handlers.onClearNOP }),
    action('move_nop', 'Przenieś punkt normalnie otwarty na inny łącznik...', { enabled: edit, handler: handlers.onMoveNOP }),
    action('toggle_switch', 'Zmień stan łącznika...', { enabled: edit, handler: handlers.onToggleSwitch }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki...', { enabled: result, handler: handlers.onShowResults }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
  ];
}

// ---------------------------------------------------------------------------
// X) Magazyn energii — buildEnergyStorageContextMenu
// ---------------------------------------------------------------------------

export function buildEnergyStorageContextMenu(
  mode: OperatingMode,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości magazynu energii...', { handler: handlers.onProperties }),
    sep('s1'),
    action('assign_catalog', 'Przypisz katalog modułu magazynu...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_capacity', 'Zmień pojemność użyteczną (kWh)...', { enabled: edit, handler: handlers.onEditCapacity }),
    action('edit_soc', 'Zmień ograniczenia SOC (%)...', { enabled: edit, handler: handlers.onEditSOC }),
    action('edit_cycles', 'Zmień limit cykli...', { enabled: edit, handler: handlers.onEditCycles }),
    action('edit_chemistry', 'Zmień technologię ogniw...', { enabled: edit, handler: handlers.onEditChemistry }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość magazynu...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki magazynu...', { enabled: result, handler: handlers.onShowResults }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    action('delete', 'Usuń magazyn energii...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// Eksport zbiorczy — ACTION_MENU_MINIMUM_OPTIONS_MAP
// ---------------------------------------------------------------------------

/**
 * Minimalna liczba opcji w menu kontekstowym dla każdego typu obiektu.
 * Używane przez strażnika CI do weryfikacji kompletności.
 */
export const ACTION_MENU_MINIMUM_OPTIONS: Record<string, number> = {
  // SN
  Source: 14,
  Bus: 20,
  Station: 30,
  BaySN: 15,
  Switch: 18,
  TransformerBranch: 14,
  LineBranch: 30,
  Relay: 14,
  Measurement: 12,
  NOP: 9,
  Terminal: 20,
  SecondaryLink: 10,
  // nN
  BusNN: 25,
  FeederNN: 25,
  SourceFieldNN: 20,
  PVInverter: 18,
  BESSInverter: 18,
  Genset: 16,
  UPS: 14,
  LoadNN: 12,
  EnergyMeter: 11,
  EnergyStorage: 13,
  SwitchNN: 13,
  // StudyCase / Analizy
  StudyCase: 20,
  AnalysisResult: 20,
};

// ---------------------------------------------------------------------------
// F) Terminal magistrali SN — buildTerminalSNContextMenu (20+ opcji)
// ---------------------------------------------------------------------------

export function buildTerminalSNContextMenu(
  mode: OperatingMode,
  terminalStatus: 'OTWARTY' | 'ZAJETY' | 'ZAREZERWOWANY_DLA_RINGU' | undefined,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT';
  const result = mode === 'RESULT_VIEW';
  const isOpen = terminalStatus === 'OTWARTY';
  return [
    action('properties', result ? 'Pokaż właściwości...' : 'Właściwości terminala...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Budowa ---
    action('add_trunk_segment', 'Dodaj odcinek magistrali...', { enabled: edit && isOpen, handler: handlers.onAddTrunkSegment }),
    action('reserve_ring', 'Zarezerwuj do ring...', { enabled: edit && isOpen, handler: handlers.onReserveRing }),
    action('release_ring', 'Zwolnij rezerwację ring...', { enabled: edit && terminalStatus === 'ZAREZERWOWANY_DLA_RINGU', handler: handlers.onReleaseRing }),
    action('start_secondary_link', 'Rozpocznij łączenie wtórne...', { enabled: edit && isOpen, handler: handlers.onStartSecondaryLink }),
    action('set_nop_candidate', 'Ustaw jako kandydat NOP...', { enabled: edit, handler: handlers.onSetNOPCandidate }),
    sep('s2'),
    // --- Katalog i parametry ---
    action('assign_next_catalog', 'Przypisz katalog do następnego odcinka...', { enabled: edit, handler: handlers.onAssignNextCatalog }),
    action('edit_label', 'Zmień oznaczenie terminala...', { enabled: edit, handler: handlers.onEditLabel }),
    sep('s3'),
    // --- Gotowość i wyniki ---
    action('show_readiness', 'Pokaż gotowość terminala...', { handler: handlers.onShowReadiness }),
    action('fix_issues', 'Napraw braki...', { handler: handlers.onFixIssues }),
    action('show_results', 'Pokaż wyniki w punkcie...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    sep('s4'),
    // --- Nawigacja ---
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    action('show_topology', 'Pokaż informacje topologiczne...', { handler: handlers.onShowTopology }),
    action('show_secondary_links', 'Pokaż logiczne połączenia wtórne...', { handler: handlers.onShowSecondaryLinks }),
    action('check_ring', 'Sprawdź możliwość ring...', { handler: handlers.onCheckRing }),
    action('check_nop', 'Sprawdź możliwość NOP...', { handler: handlers.onCheckNOP }),
    sep('s5'),
    // --- Widok i eksport ---
    action('edit_geometry', 'Edytuj geometrię widoku...', { enabled: edit, handler: handlers.onEditGeometry }),
    action('reset_geometry', 'Reset geometrii widoku', { enabled: edit, handler: handlers.onResetGeometry }),
    action('export_data', 'Eksport danych terminala...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s6'),
    action('delete', 'Usuń terminal...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// StudyCase — buildStudyCaseContextMenu (20+ opcji)
// ---------------------------------------------------------------------------

export function buildStudyCaseContextMenu(
  mode: OperatingMode,
  caseStatus: 'NONE' | 'FRESH' | 'OUTDATED' | undefined,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const edit = mode === 'MODEL_EDIT' || mode === 'CASE_CONFIG';
  const hasFresh = caseStatus === 'FRESH';
  return [
    action('properties', 'Właściwości Study Case...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Konfiguracja ---
    action('edit_label', 'Zmień nazwę Study Case...', { enabled: edit, handler: handlers.onEditLabel }),
    action('set_switch_states', 'Ustaw stany łączników...', { enabled: edit, handler: handlers.onSetSwitchStates }),
    action('set_normal_states', 'Ustaw stany normalne...', { enabled: edit, handler: handlers.onSetNormalStates }),
    action('set_source_modes', 'Ustaw tryby pracy źródeł...', { enabled: edit, handler: handlers.onSetSourceModes }),
    action('set_time_profile', 'Przypisz profil czasowy...', { enabled: edit, handler: handlers.onSetTimeProfile }),
    action('set_analysis_settings', 'Ustaw parametry analizy...', { enabled: edit, handler: handlers.onSetAnalysisSettings }),
    sep('s2'),
    // --- Uruchomienia ---
    action('run_sc_3f', 'Uruchom zwarcie 3F...', { handler: handlers.onRunSC3F }),
    action('run_sc_2f', 'Uruchom zwarcie 2F...', { handler: handlers.onRunSC2F }),
    action('run_sc_1f', 'Uruchom zwarcie 1F...', { handler: handlers.onRunSC1F }),
    action('run_sc_2f_rf', 'Uruchom zwarcie 2F z Rf...', { handler: handlers.onRunSC2FRf }),
    action('run_power_flow', 'Uruchom przepływ mocy...', { handler: handlers.onRunPowerFlow }),
    action('run_time_series', 'Uruchom serię czasową...', { handler: handlers.onRunTimeSeries }),
    sep('s3'),
    // --- Wyniki ---
    action('show_results', 'Pokaż wyniki...', { enabled: hasFresh, handler: handlers.onShowResults }),
    action('compare_cases', 'Porównaj z innym Study Case...', { handler: handlers.onCompareCases }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: hasFresh, handler: handlers.onShowWhitebox }),
    action('validate_selectivity', 'Sprawdź selektywność ochrony...', { enabled: hasFresh, handler: handlers.onValidateSelectivity }),
    sep('s4'),
    // --- Klonowanie i eksport ---
    action('clone_case', 'Klonuj Study Case...', { handler: handlers.onCloneCase }),
    action('export_results', 'Eksportuj wyniki (PDF/DOCX)...', { enabled: hasFresh, handler: handlers.onExportResults }),
    action('export_json', 'Eksportuj wyniki (JSON)...', { enabled: hasFresh, handler: handlers.onExportJSON }),
    action('history', 'Historia uruchomień...', { handler: handlers.onHistory }),
    sep('s5'),
    action('delete', 'Usuń Study Case...', { enabled: edit, handler: handlers.onDelete }),
  ];
}

// ---------------------------------------------------------------------------
// Wynik analizy — buildAnalysisResultContextMenu (20+ opcji)
// ---------------------------------------------------------------------------

export function buildAnalysisResultContextMenu(
  mode: OperatingMode,
  resultType: 'SHORT_CIRCUIT' | 'POWER_FLOW' | 'TIME_SERIES' | undefined,
  handlers: Record<string, (() => void) | undefined> = {},
): ContextMenuAction[] {
  const isSC = resultType === 'SHORT_CIRCUIT';
  const isPF = resultType === 'POWER_FLOW';
  return [
    action('properties', 'Właściwości wyniku analizy...', { handler: handlers.onProperties }),
    sep('s1'),
    // --- Podgląd ---
    action('show_summary', 'Pokaż podsumowanie wyników...', { handler: handlers.onShowSummary }),
    action('show_per_element', 'Pokaż wyniki po elementach...', { handler: handlers.onShowPerElement }),
    action('show_overlay', 'Pokaż overlay na SLD...', { handler: handlers.onShowOverlay }),
    action('show_whitebox', 'Pokaż White Box...', { handler: handlers.onShowWhitebox }),
    sep('s2'),
    // --- Zwarcia ---
    action('show_ik', 'Pokaż prądy zwarciowe Ik″...', { enabled: isSC, handler: handlers.onShowIk }),
    action('show_ip', 'Pokaż prądy udarowe ip...', { enabled: isSC, handler: handlers.onShowIp }),
    action('show_ith', 'Pokaż prądy cieplne Ith...', { enabled: isSC, handler: handlers.onShowIth }),
    action('show_idyn', 'Pokaż prądy dynamiczne Idyn...', { enabled: isSC, handler: handlers.onShowIdyn }),
    // --- Przepływ mocy ---
    action('show_voltages', 'Pokaż napięcia...', { enabled: isPF, handler: handlers.onShowVoltages }),
    action('show_currents', 'Pokaż prądy...', { enabled: isPF, handler: handlers.onShowCurrents }),
    action('show_powers', 'Pokaż moce...', { enabled: isPF, handler: handlers.onShowPowers }),
    action('show_losses', 'Pokaż straty...', { enabled: isPF, handler: handlers.onShowLosses }),
    sep('s3'),
    // --- Porównanie ---
    action('compare_with', 'Porównaj z innym wynikiem...', { handler: handlers.onCompareWith }),
    action('show_delta_overlay', 'Pokaż delta overlay...', { handler: handlers.onShowDeltaOverlay }),
    sep('s4'),
    // --- Eksport ---
    action('export_pdf', 'Eksportuj raport (PDF)...', { handler: handlers.onExportPDF }),
    action('export_docx', 'Eksportuj raport (DOCX)...', { handler: handlers.onExportDOCX }),
    action('export_json', 'Eksportuj dane (JSON)...', { handler: handlers.onExportJSON }),
    action('export_whitebox', 'Eksportuj White Box (LaTeX)...', { handler: handlers.onExportWhitebox }),
    sep('s5'),
    action('history', 'Historia uruchomień...', { handler: handlers.onHistory }),
    action('delete', 'Usuń wynik analizy...', { handler: handlers.onDelete }),
  ];
}
