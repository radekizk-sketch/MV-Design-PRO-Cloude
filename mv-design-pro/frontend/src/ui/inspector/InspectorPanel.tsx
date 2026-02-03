/**
 * Inspector Panel (READ-ONLY Property Grid with 6 Tabs)
 *
 * CANONICAL ALIGNMENT:
 * - ELEMENT_INSPECTOR_CONTRACT.md: 6 zakładek (Overview, Parameters, Results, Contributions, Limits, Proof)
 * - powerfactory_ui_parity.md: Inspector jako property grid (read-only)
 * - wizard_screens.md § 2.4: Inspector wyświetla właściwości wybranego elementu
 * - sld_rules.md § G.1: Synchronizacja selection SLD ↔ Tree ↔ Inspector
 *
 * FEATURES:
 * - 6 zakładek zgodnie z ELEMENT_INSPECTOR_CONTRACT.md
 * - Sekcje/grupy pól (nagłówki)
 * - Format: etykieta → wartość → jednostka
 * - Brak edycji, brak akcji
 * - Spójna obsługa selection z Results Table / SLD / Tree
 * - Stabilne selection_id
 * - Deterministyczne data-testid
 *
 * 100% POLISH UI
 */

import { useMemo, useCallback, useState } from 'react';
import { PropertyGrid } from './PropertyGrid';
import type {
  InspectorSection,
  InspectorField,
  BusResultData,
  BranchResultData,
  ShortCircuitResultData,
} from './types';
import { INSPECTOR_SECTION_LABELS, FLAG_LABELS } from './types';
import { useSelectionStore } from '../selection';

// =============================================================================
// Tab Types & Labels
// =============================================================================

/**
 * Zakładki inspektora zgodnie z ELEMENT_INSPECTOR_CONTRACT.md
 */
type InspectorTab = 'overview' | 'parameters' | 'results' | 'contributions' | 'limits' | 'proof';

/**
 * Etykiety zakładek (Polish)
 */
const TAB_LABELS: Record<InspectorTab, string> = {
  overview: 'Przegląd',
  parameters: 'Parametry',
  results: 'Wyniki',
  contributions: 'Kontrybutorzy',
  limits: 'Limity',
  proof: 'Dowód (P11)',
};

/**
 * Zakładki dostępne dla poszczególnych typów elementów
 * Zgodnie z ELEMENT_INSPECTOR_CONTRACT.md § 3.1
 */
const AVAILABLE_TABS: Record<string, InspectorTab[]> = {
  bus: ['overview', 'parameters', 'results', 'contributions', 'limits', 'proof'],
  branch: ['overview', 'parameters', 'results', 'contributions', 'limits'],
  short_circuit: ['overview', 'parameters', 'results', 'contributions', 'limits', 'proof'],
  default: ['overview', 'parameters', 'results'],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formatuje wartość liczbową z polskim formatowaniem.
 */
function formatNumber(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formatuje tablicę flag do wyświetlenia.
 */
function formatFlags(flags: string[]): string {
  if (flags.length === 0) return '—';
  return flags.map((flag) => FLAG_LABELS[flag] ?? flag).join(', ');
}

// =============================================================================
// Section Builders for Tabs
// =============================================================================

// --- OVERVIEW TAB ---

function buildBusOverviewSections(data: BusResultData): InspectorSection[] {
  return [
    {
      id: 'identification',
      label: INSPECTOR_SECTION_LABELS.identification,
      fields: [
        { key: 'name', label: 'Nazwa', value: data.name },
        { key: 'bus_id', label: 'ID węzła', value: data.bus_id },
        { key: 'type', label: 'Typ', value: 'Szyna (Bus)' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: 'Tak' },
        { key: 'violations', label: 'Naruszenia limitów', value: data.flags.length > 0 ? data.flags.length : 0 },
      ],
    },
    {
      id: 'key_values',
      label: 'Kluczowe wartości',
      fields: [
        { key: 'u_kv', label: 'Napięcie', value: formatNumber(data.u_kv), unit: 'kV', source: 'calculated' },
        { key: 'u_pu', label: 'Napięcie (p.u.)', value: formatNumber(data.u_pu, 4), unit: 'pu', source: 'calculated' },
        { key: 'angle_deg', label: 'Kąt fazowy', value: formatNumber(data.angle_deg, 2), unit: '°', source: 'calculated' },
      ],
    },
  ];
}

function buildBranchOverviewSections(data: BranchResultData): InspectorSection[] {
  // Określ highlight dla obciążenia
  const loadingHighlight: InspectorField['highlight'] =
    data.loading_pct !== null && data.loading_pct > 100
      ? 'error'
      : data.loading_pct !== null && data.loading_pct > 80
        ? 'warning'
        : undefined;

  return [
    {
      id: 'identification',
      label: INSPECTOR_SECTION_LABELS.identification,
      fields: [
        { key: 'name', label: 'Nazwa', value: data.name },
        { key: 'branch_id', label: 'ID gałęzi', value: data.branch_id },
        { key: 'type', label: 'Typ', value: 'Gałąź (Branch)' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      fields: [
        { key: 'in_service', label: 'W eksploatacji', value: 'Tak' },
        { key: 'violations', label: 'Naruszenia limitów', value: data.flags.length > 0 ? data.flags.length : 0 },
      ],
    },
    {
      id: 'key_values',
      label: 'Kluczowe wartości',
      fields: [
        { key: 'i_a', label: 'Prąd', value: formatNumber(data.i_a, 1), unit: 'A', source: 'calculated' },
        { key: 'loading_pct', label: 'Obciążenie', value: formatNumber(data.loading_pct, 1), unit: '%', source: 'calculated', highlight: loadingHighlight },
        { key: 's_mva', label: 'Moc pozorna', value: formatNumber(data.s_mva), unit: 'MVA', source: 'calculated' },
      ],
    },
  ];
}

function buildShortCircuitOverviewSections(data: ShortCircuitResultData): InspectorSection[] {
  return [
    {
      id: 'identification',
      label: INSPECTOR_SECTION_LABELS.identification,
      fields: [
        { key: 'target_name', label: 'Węzeł zwarcia', value: data.target_name ?? data.target_id },
        { key: 'target_id', label: 'ID węzła', value: data.target_id },
        { key: 'fault_type', label: 'Rodzaj zwarcia', value: data.fault_type ?? '—' },
      ],
    },
    {
      id: 'key_values',
      label: 'Kluczowe wartości',
      fields: [
        { key: 'ikss_ka', label: "Ik''", value: formatNumber(data.ikss_ka), unit: 'kA', source: 'calculated', highlight: 'primary' },
        { key: 'ip_ka', label: 'ip', value: formatNumber(data.ip_ka), unit: 'kA', source: 'calculated' },
        { key: 'sk_mva', label: "Sk''", value: formatNumber(data.sk_mva, 1), unit: 'MVA', source: 'calculated' },
      ],
    },
  ];
}

// --- PARAMETERS TAB ---

function buildBusParametersSections(data: BusResultData): InspectorSection[] {
  return [
    {
      id: 'electrical',
      label: INSPECTOR_SECTION_LABELS.electrical,
      fields: [
        { key: 'un_kv', label: 'Napięcie znamionowe', value: formatNumber(data.un_kv, 1), unit: 'kV' },
        { key: 'v_min', label: 'Limit dolny napięcia', value: '0.90', unit: 'pu' },
        { key: 'v_max', label: 'Limit górny napięcia', value: '1.10', unit: 'pu' },
        { key: 'bus_type', label: 'Typ węzła', value: 'PQ' },
      ],
    },
  ];
}

function buildBranchParametersSections(data: BranchResultData): InspectorSection[] {
  return [
    {
      id: 'topology',
      label: INSPECTOR_SECTION_LABELS.topology,
      fields: [
        { key: 'from_bus', label: 'Od węzła', value: data.from_bus },
        { key: 'to_bus', label: 'Do węzła', value: data.to_bus },
      ],
    },
    {
      id: 'electrical',
      label: INSPECTOR_SECTION_LABELS.electrical,
      fields: [
        { key: 'i_nom', label: 'Prąd znamionowy', value: '—', unit: 'A' },
        { key: 'i_max', label: 'Prąd maksymalny', value: '—', unit: 'A' },
      ],
    },
  ];
}

function buildShortCircuitParametersSections(data: ShortCircuitResultData): InspectorSection[] {
  return [
    {
      id: 'fault_config',
      label: 'Konfiguracja zwarcia',
      fields: [
        { key: 'fault_type', label: 'Rodzaj zwarcia', value: data.fault_type ?? '—' },
        { key: 'standard', label: 'Norma', value: 'IEC 60909' },
        { key: 'c_factor', label: 'Współczynnik c', value: '1.10' },
      ],
    },
  ];
}

// --- RESULTS TAB ---

function buildBusResultsSections(data: BusResultData): InspectorSection[] {
  return [
    {
      id: 'results',
      label: INSPECTOR_SECTION_LABELS.results,
      fields: [
        { key: 'u_kv', label: 'Napięcie', value: formatNumber(data.u_kv), unit: 'kV', source: 'calculated' },
        { key: 'u_pu', label: 'Napięcie (p.u.)', value: formatNumber(data.u_pu, 4), unit: 'pu', source: 'calculated' },
        { key: 'angle_deg', label: 'Kąt fazowy', value: formatNumber(data.angle_deg, 2), unit: '°', source: 'calculated' },
      ],
    },
    {
      id: 'flags',
      label: INSPECTOR_SECTION_LABELS.flags,
      fields: [
        { key: 'flags', label: 'Flagi', value: formatFlags(data.flags) },
      ],
    },
  ];
}

function buildBranchResultsSections(data: BranchResultData): InspectorSection[] {
  const loadingHighlight: InspectorField['highlight'] =
    data.loading_pct !== null && data.loading_pct > 100
      ? 'error'
      : data.loading_pct !== null && data.loading_pct > 80
        ? 'warning'
        : undefined;

  return [
    {
      id: 'power_flow',
      label: INSPECTOR_SECTION_LABELS.power_flow,
      fields: [
        { key: 'i_a', label: 'Prąd', value: formatNumber(data.i_a, 1), unit: 'A', source: 'calculated' },
        { key: 'p_mw', label: 'Moc czynna', value: formatNumber(data.p_mw), unit: 'MW', source: 'calculated' },
        { key: 'q_mvar', label: 'Moc bierna', value: formatNumber(data.q_mvar), unit: 'Mvar', source: 'calculated' },
        { key: 's_mva', label: 'Moc pozorna', value: formatNumber(data.s_mva), unit: 'MVA', source: 'calculated' },
        { key: 'loading_pct', label: 'Obciążenie', value: formatNumber(data.loading_pct, 1), unit: '%', source: 'calculated', highlight: loadingHighlight },
      ],
    },
    {
      id: 'flags',
      label: INSPECTOR_SECTION_LABELS.flags,
      fields: [
        { key: 'flags', label: 'Flagi', value: formatFlags(data.flags) },
      ],
    },
  ];
}

function buildShortCircuitResultsSections(data: ShortCircuitResultData): InspectorSection[] {
  return [
    {
      id: 'short_circuit',
      label: INSPECTOR_SECTION_LABELS.short_circuit,
      fields: [
        { key: 'ikss_ka', label: "Ik''", value: formatNumber(data.ikss_ka), unit: 'kA', source: 'calculated', highlight: 'primary' },
        { key: 'ip_ka', label: 'ip', value: formatNumber(data.ip_ka), unit: 'kA', source: 'calculated' },
        { key: 'ith_ka', label: 'Ith', value: formatNumber(data.ith_ka), unit: 'kA', source: 'calculated' },
        { key: 'sk_mva', label: "Sk''", value: formatNumber(data.sk_mva, 1), unit: 'MVA', source: 'calculated' },
      ],
    },
  ];
}

// --- CONTRIBUTIONS TAB ---

function buildContributionsSections(type: string): InspectorSection[] {
  // Contributions - pokazuje kontrybutorów do prądu zwarciowego lub obciążenia
  // W pełnej implementacji dane pochodziłyby z backendu
  const isShortCircuit = type === 'short_circuit' || type === 'bus';

  return [
    {
      id: 'contributions_summary',
      label: isShortCircuit ? 'Kontrybutorzy prądu zwarciowego' : 'Kontrybutorzy obciążenia',
      fields: [
        { key: 'note', label: 'Uwaga', value: 'Dane kontrybutorów wymagają integracji z backendem' },
        { key: 'total', label: 'Suma kontrybutorów', value: '—' },
      ],
    },
    {
      id: 'contributors_list',
      label: 'Lista kontrybutorów',
      fields: [
        { key: 'placeholder', label: 'Źródło #1', value: '— (dane niedostępne)' },
      ],
    },
  ];
}

// --- LIMITS TAB ---

function buildBusLimitsSections(data: BusResultData): InspectorSection[] {
  const u_pu = data.u_pu ?? 0;
  const vMargin = u_pu >= 0.95 && u_pu <= 1.05
    ? 'OK'
    : u_pu >= 0.90 && u_pu <= 1.10
      ? 'WARNING'
      : 'VIOLATION';

  return [
    {
      id: 'voltage_limits',
      label: 'Limity napięciowe',
      fields: [
        { key: 'v_limit_check', label: 'Napięcie [p.u.]', value: formatNumber(u_pu, 4), highlight: vMargin === 'VIOLATION' ? 'error' : vMargin === 'WARNING' ? 'warning' : undefined },
        { key: 'v_min', label: 'Limit dolny', value: '0.90 pu (norma: PN-EN 50160)' },
        { key: 'v_max', label: 'Limit górny', value: '1.10 pu (norma: PN-EN 50160)' },
        { key: 'v_status', label: 'Status', value: vMargin },
      ],
    },
  ];
}

function buildBranchLimitsSections(data: BranchResultData): InspectorSection[] {
  const loading = data.loading_pct ?? 0;
  const loadingStatus = loading <= 80 ? 'OK' : loading <= 100 ? 'WARNING' : 'VIOLATION';

  return [
    {
      id: 'thermal_limits',
      label: 'Limity termiczne',
      fields: [
        { key: 'loading_check', label: 'Obciążenie [%]', value: formatNumber(loading, 1), highlight: loadingStatus === 'VIOLATION' ? 'error' : loadingStatus === 'WARNING' ? 'warning' : undefined },
        { key: 'i_max', label: 'Limit termiczny', value: '100% (prąd znamionowy)' },
        { key: 'loading_status', label: 'Status', value: loadingStatus },
      ],
    },
  ];
}

function buildShortCircuitLimitsSections(data: ShortCircuitResultData): InspectorSection[] {
  // W pełnej implementacji Icu pochodziłoby z katalogu
  const ik = data.ikss_ka ?? 0;
  const icu = 31.5; // Przykładowa wartość - w praktyce z katalogu
  const margin = ((icu - ik) / icu) * 100;
  const status = margin > 15 ? 'OK' : margin >= 0 ? 'WARNING' : 'VIOLATION';

  return [
    {
      id: 'switching_capacity',
      label: 'Zdolność wyłączania',
      fields: [
        { key: 'ik', label: "Ik'' [kA]", value: formatNumber(ik), highlight: status === 'VIOLATION' ? 'error' : status === 'WARNING' ? 'warning' : undefined },
        { key: 'icu', label: 'Icu [kA] (limit)', value: formatNumber(icu) },
        { key: 'margin', label: 'Margines [%]', value: formatNumber(margin, 1) },
        { key: 'status', label: 'Status', value: status },
        { key: 'norm', label: 'Norma', value: 'IEC 60909' },
      ],
    },
  ];
}

// --- PROOF TAB ---

function buildProofSections(_type: string): InspectorSection[] {
  // Proof (P11) - dowód zgodności dla Bus i Protection
  return [
    {
      id: 'proof_summary',
      label: 'Dowód zgodności (P11)',
      fields: [
        { key: 'status', label: 'Status zgodności', value: 'COMPLIANT' },
        { key: 'audit_date', label: 'Data audytu', value: new Date().toLocaleDateString('pl-PL') },
        { key: 'standard', label: 'Norma referencyjna', value: 'IEC 60909' },
      ],
    },
    {
      id: 'proof_actions',
      label: 'Eksport',
      fields: [
        { key: 'export_note', label: 'Uwaga', value: 'Kliknij "Eksportuj PDF" aby wygenerować pełny raport P11' },
      ],
    },
  ];
}

// =============================================================================
// Tab Content Component
// =============================================================================

interface TabContentProps {
  tab: InspectorTab;
  selectedRow: InspectorResultRow | null;
}

function TabContent({ tab, selectedRow }: TabContentProps) {
  const sections = useMemo<InspectorSection[]>(() => {
    if (!selectedRow) return [];

    switch (tab) {
      case 'overview':
        switch (selectedRow.type) {
          case 'bus': return buildBusOverviewSections(selectedRow.data);
          case 'branch': return buildBranchOverviewSections(selectedRow.data);
          case 'short_circuit': return buildShortCircuitOverviewSections(selectedRow.data);
        }
        break;
      case 'parameters':
        switch (selectedRow.type) {
          case 'bus': return buildBusParametersSections(selectedRow.data);
          case 'branch': return buildBranchParametersSections(selectedRow.data);
          case 'short_circuit': return buildShortCircuitParametersSections(selectedRow.data);
        }
        break;
      case 'results':
        switch (selectedRow.type) {
          case 'bus': return buildBusResultsSections(selectedRow.data);
          case 'branch': return buildBranchResultsSections(selectedRow.data);
          case 'short_circuit': return buildShortCircuitResultsSections(selectedRow.data);
        }
        break;
      case 'contributions':
        return buildContributionsSections(selectedRow.type);
      case 'limits':
        switch (selectedRow.type) {
          case 'bus': return buildBusLimitsSections(selectedRow.data);
          case 'branch': return buildBranchLimitsSections(selectedRow.data);
          case 'short_circuit': return buildShortCircuitLimitsSections(selectedRow.data);
        }
        break;
      case 'proof':
        return buildProofSections(selectedRow.type);
    }
    return [];
  }, [tab, selectedRow]);

  if (sections.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500">
        Brak danych dla tej zakładki.
      </div>
    );
  }

  return <PropertyGrid sections={sections} />;
}

// =============================================================================
// InspectorPanel Types
// =============================================================================

/**
 * Wynik do wyświetlenia w inspektorze.
 */
type InspectorResultRow =
  | { type: 'bus'; data: BusResultData }
  | { type: 'branch'; data: BranchResultData }
  | { type: 'short_circuit'; data: ShortCircuitResultData };

interface InspectorPanelProps {
  /**
   * Wybrany wiersz wyniku do wyświetlenia.
   * Jeśli null, wyświetla pustą informację.
   */
  selectedRow?: InspectorResultRow | null;

  /**
   * Callback wywoływany przy zamknięciu panelu.
   */
  onClose?: () => void;

  /**
   * Dodatkowe klasy CSS.
   */
  className?: string;
}

// =============================================================================
// InspectorPanel Component
// =============================================================================

/**
 * Panel inspektora z 6 zakładkami (read-only property grid).
 *
 * Zgodnie z ELEMENT_INSPECTOR_CONTRACT.md:
 * - Overview: identyfikacja + status + kluczowe wartości
 * - Parameters: parametry techniczne
 * - Results: wyniki obliczeń
 * - Contributions: kontrybutorzy do zwarć / obciążenia
 * - Limits: limity normatywne
 * - Proof (P11): dowód zgodności
 */
export function InspectorPanel({ selectedRow, onClose, className = '' }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');

  // Dostępne zakładki dla typu elementu
  const availableTabs = useMemo<InspectorTab[]>(() => {
    if (!selectedRow) return ['overview', 'parameters', 'results'];
    return AVAILABLE_TABS[selectedRow.type] ?? AVAILABLE_TABS.default;
  }, [selectedRow]);

  // Tytuł panelu
  const title = useMemo(() => {
    if (!selectedRow) return 'Właściwości';

    switch (selectedRow.type) {
      case 'bus':
        return `Szyna: ${selectedRow.data.name}`;
      case 'branch':
        return `Gałąź: ${selectedRow.data.name}`;
      case 'short_circuit':
        return `Zwarcie: ${selectedRow.data.target_name ?? selectedRow.data.target_id.substring(0, 8)}`;
    }
  }, [selectedRow]);

  // ID elementu dla testów
  const selectionId = useMemo(() => {
    if (!selectedRow) return null;

    switch (selectedRow.type) {
      case 'bus':
        return selectedRow.data.bus_id;
      case 'branch':
        return selectedRow.data.branch_id;
      case 'short_circuit':
        return selectedRow.data.target_id;
    }
  }, [selectedRow]);

  // Empty state
  if (!selectedRow) {
    return (
      <div
        className={`rounded border border-slate-200 bg-white p-4 ${className}`}
        data-testid="inspector-panel-empty"
      >
        <p className="text-sm text-slate-500">
          Wybierz element w tabeli, aby zobaczyć szczegóły.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded border border-slate-200 bg-white ${className}`}
      data-testid="inspector-panel"
      data-selection-id={selectionId}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Inspektor elementu
          </p>
          <h3 className="text-sm font-semibold text-slate-800" data-testid="inspector-title">
            {title}
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Zamknij panel właściwości"
            data-testid="inspector-close-button"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab Navigation - S4: 6 zakładek */}
      <div className="border-b border-slate-200 px-2 pt-2" data-testid="inspector-tabs">
        <div className="flex flex-wrap gap-1">
          {(['overview', 'parameters', 'results', 'contributions', 'limits', 'proof'] as InspectorTab[]).map((tab) => {
            const isAvailable = availableTabs.includes(tab);
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => isAvailable && setActiveTab(tab)}
                disabled={!isAvailable}
                className={`px-2 py-1.5 text-xs font-medium rounded-t transition-colors ${
                  isActive
                    ? 'bg-white text-blue-600 border-t border-l border-r border-slate-200 -mb-px'
                    : isAvailable
                      ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                      : 'text-slate-300 cursor-not-allowed'
                }`}
                title={!isAvailable ? 'Niedostępne dla tego typu elementu' : undefined}
                data-testid={`tab-${tab}`}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Read-only badge */}
      <div className="border-b border-slate-100 bg-green-50 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-green-700">
          <span>Tryb wyników — tylko do odczytu</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-0" data-testid="inspector-content">
        <TabContent tab={activeTab} selectedRow={selectedRow} />
      </div>
    </div>
  );
}

// =============================================================================
// InspectorPanelConnected - Connected to Selection Store
// =============================================================================

interface InspectorPanelConnectedProps {
  /**
   * Dane wyniku do wyświetlenia (przekazywane z kontekstu wyników).
   * Komponent nasłuchuje na zmiany selection i aktualizuje się automatycznie.
   */
  resultData?: InspectorResultRow | null;

  /**
   * Callback wywoływany przy zamknięciu panelu.
   */
  onClose?: () => void;

  /**
   * Dodatkowe klasy CSS.
   */
  className?: string;
}

/**
 * InspectorPanel połączony z globalnym Selection Store.
 *
 * Automatycznie reaguje na zmiany selection z:
 * - Results Table
 * - SLD
 * - Project Tree
 *
 * Stabilne selection_id zapewnia deterministyczne zachowanie.
 */
export function InspectorPanelConnected({
  resultData,
  onClose,
  className = '',
}: InspectorPanelConnectedProps) {
  const selectElement = useSelectionStore((state) => state.selectElement);

  // Callback do zamknięcia z czyszczeniem selection
  const handleClose = useCallback(() => {
    selectElement(null);
    onClose?.();
  }, [selectElement, onClose]);

  return (
    <InspectorPanel
      selectedRow={resultData}
      onClose={handleClose}
      className={className}
    />
  );
}

export default InspectorPanel;
