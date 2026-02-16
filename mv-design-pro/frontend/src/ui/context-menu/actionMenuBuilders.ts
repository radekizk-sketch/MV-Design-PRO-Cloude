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
    action('add_sn_field', 'Dodaj pole SN...', { enabled: edit, handler: handlers.onAddSNField }),
    action('add_transformer', 'Dodaj transformator SN/nN...', { enabled: edit, handler: handlers.onAddTransformer }),
    action('add_nn_bus', 'Dodaj szynę nN...', { enabled: edit, handler: handlers.onAddNNBus }),
    action('add_nn_feeder', 'Dodaj odpływ nN...', { enabled: edit, handler: handlers.onAddNNFeeder }),
    action('add_source_field_nn', 'Dodaj pole źródłowe nN...', { enabled: edit, handler: handlers.onAddSourceFieldNN }),
    action('add_pv', 'Dodaj falownik PV...', { enabled: edit, handler: handlers.onAddPV }),
    action('add_bess', 'Dodaj falownik BESS...', { enabled: edit, handler: handlers.onAddBESS }),
    action('add_genset', 'Dodaj agregat...', { enabled: edit, handler: handlers.onAddGenset }),
    action('add_ups', 'Dodaj UPS...', { enabled: edit, handler: handlers.onAddUPS }),
    sep('s2'),
    action('edit_name', 'Zmień nazwę stacji...', { enabled: edit, handler: handlers.onEditName }),
    action('edit_type', 'Zmień typ stacji (A/B/C/D)...', { enabled: edit, handler: handlers.onEditType }),
    action('configure_switchgear', 'Konfiguruj rozdzielnicę...', { enabled: edit, handler: handlers.onConfigureSwitchgear }),
    sep('s3'),
    action('show_readiness', 'Pokaż gotowość stacji...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki stacji...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s4'),
    action('export_data', 'Eksportuj dane stacji...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s5'),
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
    action('add_pv', 'Dodaj falownik PV...', { enabled: edit, handler: handlers.onAddPV }),
    action('add_bess', 'Dodaj falownik BESS...', { enabled: edit, handler: handlers.onAddBESS }),
    action('add_genset', 'Dodaj agregat...', { enabled: edit, handler: handlers.onAddGenset }),
    action('add_ups', 'Dodaj UPS...', { enabled: edit, handler: handlers.onAddUPS }),
    sep('s2'),
    action('change_kind', 'Zmień rodzaj pola (PV/BESS/agregat/UPS)...', { enabled: edit, handler: handlers.onChangeKind }),
    action('edit_switch', 'Zmień aparat łączeniowy pola...', { enabled: edit, handler: handlers.onEditSwitch }),
    action('toggle_switch', 'Zmień stan aparatu...', { enabled: edit, handler: handlers.onToggleSwitch }),
    action('assign_switch_catalog', 'Przypisz katalog aparatu...', { enabled: edit, handler: handlers.onAssignSwitchCatalog }),
    sep('s3'),
    action('show_readiness', 'Pokaż gotowość pola...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki pola...', { enabled: result, handler: handlers.onShowResults }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s4'),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
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
    action('assign_catalog', 'Przypisz katalog linii/kabla...', { enabled: edit, handler: handlers.onAssignCatalog }),
    action('clear_catalog', 'Wyczyść katalog', { enabled: edit, handler: handlers.onClearCatalog }),
    action('edit_length', 'Zmień długość (m)...', { enabled: edit, handler: handlers.onEditLength }),
    action('edit_type', 'Zmień rodzaj (kabel/linia napowietrzna)...', { enabled: edit, handler: handlers.onEditType }),
    action('insert_station', 'Wstaw stację na segmencie...', { enabled: edit, handler: handlers.onInsertStation }),
    action('insert_switch', 'Wstaw łącznik sekcyjny...', { enabled: edit, handler: handlers.onInsertSwitch }),
    action('toggle_service', 'Zmień stan eksploatacji...', { enabled: edit, handler: handlers.onToggleService }),
    sep('s2'),
    action('show_readiness', 'Pokaż gotowość segmentu...', { handler: handlers.onShowReadiness }),
    action('show_results', 'Pokaż wyniki segmentu...', { enabled: result, handler: handlers.onShowResults }),
    action('show_whitebox', 'Pokaż White Box...', { enabled: result, handler: handlers.onShowWhitebox }),
    action('show_tree', 'Zaznacz w drzewie', { handler: handlers.onShowInTree }),
    action('show_diagram', 'Pokaż na schemacie', { handler: handlers.onShowOnDiagram }),
    sep('s3'),
    action('export_data', 'Eksportuj dane segmentu...', { handler: handlers.onExport }),
    action('history', 'Historia zdarzeń...', { handler: handlers.onHistory }),
    sep('s4'),
    action('delete', 'Usuń segment...', { enabled: edit, handler: handlers.onDelete }),
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
  Station: 20,
  BaySN: 15,
  Switch: 18,
  TransformerBranch: 14,
  LineBranch: 16,
  Relay: 14,
  Measurement: 12,
  NOP: 9,
  // nN
  BusNN: 25,
  FeederNN: 25,
  SourceFieldNN: 15,
  PVInverter: 18,
  BESSInverter: 18,
  Genset: 16,
  UPS: 14,
  LoadNN: 12,
  EnergyMeter: 11,
  EnergyStorage: 13,
  SwitchNN: 13,
};
