/**
 * Inspector Panel (READ-ONLY Property Grid)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Inspector jako property grid (read-only)
 * - wizard_screens.md § 2.4: Inspector wyświetla właściwości wybranego elementu
 * - sld_rules.md § G.1: Synchronizacja selection SLD ↔ Tree ↔ Inspector
 *
 * FEATURES:
 * - Sekcje/grupy pól (nagłówki)
 * - Format: etykieta → wartość → jednostka
 * - Brak edycji, brak akcji
 * - Spójna obsługa selection z Results Table / SLD / Tree
 * - Stabilne selection_id
 * - Deterministyczne data-testid
 *
 * TERMINOLOGIA PL:
 * - PCC = punkt wspólnego przyłączenia
 * - Szyna = Bus
 * - Gałąź = Branch
 *
 * 100% POLISH UI
 */

import { useMemo, useCallback } from 'react';
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
// Section Builders for Results
// =============================================================================

/**
 * Buduje sekcje inspektora dla wyniku szyny.
 */
function buildBusSections(data: BusResultData): InspectorSection[] {
  return [
    {
      id: 'identification',
      label: INSPECTOR_SECTION_LABELS.identification,
      fields: [
        { key: 'name', label: 'Nazwa', value: data.name },
        { key: 'bus_id', label: 'ID węzła', value: data.bus_id },
      ],
    },
    {
      id: 'electrical',
      label: INSPECTOR_SECTION_LABELS.electrical,
      fields: [
        { key: 'un_kv', label: 'Napięcie znamionowe', value: formatNumber(data.un_kv, 1), unit: 'kV' },
      ],
    },
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

/**
 * Buduje sekcje inspektora dla wyniku gałęzi.
 */
function buildBranchSections(data: BranchResultData): InspectorSection[] {
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
      ],
    },
    {
      id: 'topology',
      label: INSPECTOR_SECTION_LABELS.topology,
      fields: [
        { key: 'from_bus', label: 'Od węzła', value: data.from_bus },
        { key: 'to_bus', label: 'Do węzła', value: data.to_bus },
      ],
    },
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

/**
 * Buduje sekcje inspektora dla wyniku zwarcia.
 */
function buildShortCircuitSections(data: ShortCircuitResultData): InspectorSection[] {
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
 * Panel inspektora (read-only property grid).
 *
 * Wyświetla właściwości wybranego elementu/wyniku w formacie PowerFactory:
 * - Sekcje z nagłówkami (zwijalne)
 * - Pola: label | value | unit
 * - Brak edycji, brak akcji
 * - Obsługa selection z Results Table / SLD / Tree
 */
export function InspectorPanel({ selectedRow, onClose, className = '' }: InspectorPanelProps) {
  // Buduj sekcje na podstawie wybranego wiersza
  const sections = useMemo<InspectorSection[]>(() => {
    if (!selectedRow) return [];

    switch (selectedRow.type) {
      case 'bus':
        return buildBusSections(selectedRow.data);
      case 'branch':
        return buildBranchSections(selectedRow.data);
      case 'short_circuit':
        return buildShortCircuitSections(selectedRow.data);
      default:
        return [];
    }
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
            Właściwości
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

      {/* Read-only badge */}
      <div className="border-b border-slate-100 bg-green-50 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-green-700">
          <span>🔒</span>
          <span>Tryb wyników — tylko do odczytu</span>
        </div>
      </div>

      {/* Property Grid */}
      <div className="p-0" data-testid="inspector-content">
        <PropertyGrid sections={sections} />
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
