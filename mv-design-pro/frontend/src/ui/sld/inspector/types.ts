/**
 * SLD Inspector Types — PR-SLD-07
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Property grid w stylu PowerFactory
 * - sld_rules.md § G.1: Inspector wyświetla właściwości wybranego elementu
 *
 * FEATURES:
 * - Typy dla inspektora elementu SLD (read-only)
 * - Typy dla inspektora połączenia SLD (read-only)
 * - Mapowanie typów elementów na polskie etykiety
 *
 * 100% POLISH UI - BRAK ANGLICYZMÓW
 */

import type { ElementType } from '../../types';
import type { Connection, AnySldSymbol, PortName } from '../../sld-editor/types';

// =============================================================================
// SELEKCJA INSPEKTORA
// =============================================================================

/**
 * Typ selekcji w inspektorze.
 */
export type InspectorSelectionType = 'element' | 'connection' | 'none';

/**
 * Dane selekcji elementu w inspektorze.
 */
export interface InspectorElementSelection {
  type: 'element';
  elementId: string;
  symbolId: string;
  elementType: ElementType;
  elementName: string;
  symbol: AnySldSymbol;
}

/**
 * Dane selekcji połączenia w inspektorze.
 */
export interface InspectorConnectionSelection {
  type: 'connection';
  connectionId: string;
  connection: Connection;
  fromSymbol: AnySldSymbol | null;
  toSymbol: AnySldSymbol | null;
}

/**
 * Brak selekcji.
 */
export interface InspectorNoSelection {
  type: 'none';
}

/**
 * Unia wszystkich typów selekcji.
 */
export type InspectorSelection =
  | InspectorElementSelection
  | InspectorConnectionSelection
  | InspectorNoSelection;

// =============================================================================
// DANE ELEMENTU DO WYŚWIETLENIA
// =============================================================================

/**
 * Sekcja właściwości elementu.
 */
export interface InspectorPropertySection {
  id: string;
  label: string;
  fields: InspectorPropertyField[];
  collapsed?: boolean;
}

/**
 * Pole właściwości elementu.
 */
export interface InspectorPropertyField {
  key: string;
  label: string;
  value: string | number | boolean | null;
  unit?: string;
  source?: 'instance' | 'calculated' | 'analysis';
  highlight?: 'primary' | 'warning' | 'error';
}

// =============================================================================
// DANE DIAGNOSTYCZNE
// =============================================================================

/**
 * Dane diagnostyczne elementu (tryb WYNIKI).
 */
export interface InspectorDiagnosticData {
  status: 'OK' | 'WYMAGA_KOREKTY' | 'INFORMACJA';
  reasons: string[];
  source: 'solver' | 'analysis';
}

// =============================================================================
// DANE WYNIKÓW (TRYB WYNIKI)
// =============================================================================

/**
 * Wyniki obliczeń dla elementu (dostępne w trybie WYNIKI).
 */
export interface InspectorResultData {
  /** Napięcie [kV] */
  voltage_kv?: number | null;
  /** Napięcie [pu] */
  voltage_pu?: number | null;
  /** Prąd [A] */
  current_a?: number | null;
  /** Obciążenie [%] */
  loading_pct?: number | null;
  /** Spadek napięcia [%] */
  voltage_drop_pct?: number | null;
  /** Moc czynna [MW] */
  p_mw?: number | null;
  /** Moc bierna [Mvar] */
  q_mvar?: number | null;
  /** Moc pozorna [MVA] */
  s_mva?: number | null;
}

// =============================================================================
// ETYKIETY POLSKIE
// =============================================================================

/**
 * Etykiety typów elementów po polsku.
 * BINDING: Bez anglicyzmów.
 */
export const ELEMENT_TYPE_LABELS_PL: Record<ElementType, string> = {
  Bus: 'Szyna',
  LineBranch: 'Linia',
  TransformerBranch: 'Transformator',
  Switch: 'Łącznik',
  Source: 'Źródło',
  Load: 'Odbiornik',
};

/**
 * Etykiety typów łączników po polsku.
 */
export const SWITCH_TYPE_LABELS_PL: Record<string, string> = {
  BREAKER: 'Wyłącznik',
  DISCONNECTOR: 'Rozłącznik',
  LOAD_SWITCH: 'Łącznik obciążeniowy',
  FUSE: 'Bezpiecznik',
};

/**
 * Etykiety stanów łącznika po polsku.
 */
export const SWITCH_STATE_LABELS_PL: Record<string, string> = {
  OPEN: 'Otwarty',
  CLOSED: 'Zamknięty',
};

/**
 * Etykiety typów połączeń po polsku.
 */
export const CONNECTION_TYPE_LABELS_PL: Record<string, string> = {
  branch: 'Linia',
  switch: 'Łącznik',
  source: 'Źródło',
  load: 'Odbiornik',
};

/**
 * Etykiety sekcji inspektora po polsku.
 */
export const INSPECTOR_SECTION_LABELS_PL: Record<string, string> = {
  basic: 'Informacje podstawowe',
  technical: 'Parametry techniczne',
  diagnostics: 'Diagnostyka',
  connection: 'Dane połączenia',
  protection: 'Zabezpieczenia',
  protection_oc_time: 'Zabezpieczenie nadpradowe I> (51)',
  protection_oc_instant: 'Zabezpieczenie nadpradowe I>> (50)',
  protection_ct: 'Przekladnik',
  protection_verification: 'Weryfikacja kryterium',
};

/**
 * Etykiety statusu diagnostycznego po polsku.
 */
export const DIAGNOSTIC_STATUS_LABELS_PL: Record<string, string> = {
  OK: 'OK',
  WYMAGA_KOREKTY: 'Wymaga korekty',
  INFORMACJA: 'Informacja',
};

/**
 * Etykiety źródła danych po polsku.
 */
export const DATA_SOURCE_LABELS_PL: Record<string, string> = {
  solver: 'Solver',
  analysis: 'Analiza',
  instance: 'Instancja',
  calculated: 'Obliczone',
};

/**
 * Etykiety portów po polsku.
 */
export const PORT_LABELS_PL: Record<PortName, string> = {
  top: 'Góra',
  bottom: 'Dół',
  left: 'Lewo',
  right: 'Prawo',
};
