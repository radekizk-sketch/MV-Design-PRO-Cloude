/**
 * Skróty klawiaturowe i tryby ergonomii — FAZA 10.
 *
 * BINDING:
 * - Opisy PL w pomocy.
 * - Brak domysłów: skrót otwiera modal z wymaganymi polami.
 * - Tryby filtrowania i podświetlania.
 *
 * PowerFactory/ETAP-grade:
 * - Tryb „Szybkie dodawanie" (zawsze modal z wymaganymi polami)
 * - Tryb „Tylko gotowość" (podświetla elementy z blockerami)
 * - Tryb „Tylko źródła" (filtr wizualny)
 */

// ---------------------------------------------------------------------------
// Keyboard Shortcut Definition
// ---------------------------------------------------------------------------

export interface KeyboardShortcutDef {
  /** Kombinacja klawiszy (np. 'Ctrl+Shift+P') */
  keys: string;
  /** Opis skrótu po polsku */
  description_pl: string;
  /** Kategoria */
  category: KeyboardCategory;
  /** Identyfikator akcji */
  action_id: string;
  /** Wymagany tryb operacyjny (null = dowolny) */
  required_mode: 'MODEL_EDIT' | 'CASE_CONFIG' | 'RESULT_VIEW' | null;
}

export type KeyboardCategory =
  | 'NAWIGACJA'
  | 'EDYCJA_MODELU'
  | 'WIDOKI'
  | 'ANALIZA'
  | 'NARZEDZIA';

// ---------------------------------------------------------------------------
// Canonical Shortcuts
// ---------------------------------------------------------------------------

export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcutDef[] = [
  // --- Nawigacja ---
  { keys: 'Ctrl+Home', description_pl: 'Dopasuj widok do zawartości', category: 'NAWIGACJA', action_id: 'fit_to_content', required_mode: null },
  { keys: 'Ctrl+0', description_pl: 'Resetuj powiększenie', category: 'NAWIGACJA', action_id: 'reset_zoom', required_mode: null },
  { keys: '+', description_pl: 'Powiększ', category: 'NAWIGACJA', action_id: 'zoom_in', required_mode: null },
  { keys: '-', description_pl: 'Pomniejsz', category: 'NAWIGACJA', action_id: 'zoom_out', required_mode: null },
  { keys: 'Ctrl+F', description_pl: 'Szukaj elementu...', category: 'NAWIGACJA', action_id: 'search_element', required_mode: null },
  { keys: 'Escape', description_pl: 'Zamknij menu / anuluj', category: 'NAWIGACJA', action_id: 'cancel', required_mode: null },

  // --- Edycja modelu ---
  { keys: 'Ctrl+N', description_pl: 'Dodaj element (szybkie dodawanie)...', category: 'EDYCJA_MODELU', action_id: 'quick_add', required_mode: 'MODEL_EDIT' },
  { keys: 'Delete', description_pl: 'Usuń zaznaczony element...', category: 'EDYCJA_MODELU', action_id: 'delete_selected', required_mode: 'MODEL_EDIT' },
  { keys: 'Enter', description_pl: 'Otwórz właściwości zaznaczonego elementu', category: 'EDYCJA_MODELU', action_id: 'open_properties', required_mode: null },
  { keys: 'Ctrl+D', description_pl: 'Powiel zaznaczony element...', category: 'EDYCJA_MODELU', action_id: 'duplicate', required_mode: 'MODEL_EDIT' },
  { keys: 'F2', description_pl: 'Zmień nazwę elementu', category: 'EDYCJA_MODELU', action_id: 'rename', required_mode: 'MODEL_EDIT' },
  { keys: 'Space', description_pl: 'Przełącz stan łącznika (otwórz/zamknij)', category: 'EDYCJA_MODELU', action_id: 'toggle_switch', required_mode: 'MODEL_EDIT' },

  // --- Konteksty K1-K5: Budowa sieci SN ---
  { keys: 'S', description_pl: 'Dodaj odcinek magistrali (od terminala)', category: 'EDYCJA_MODELU', action_id: 'add_trunk_segment', required_mode: 'MODEL_EDIT' },
  { keys: 'T', description_pl: 'Wstaw stację SN/nN (domyślnie A)', category: 'EDYCJA_MODELU', action_id: 'insert_station_a', required_mode: 'MODEL_EDIT' },
  { keys: 'B', description_pl: 'Dodaj odgałęzienie', category: 'EDYCJA_MODELU', action_id: 'add_branch', required_mode: 'MODEL_EDIT' },
  { keys: 'R', description_pl: 'Wejdź w tryb łączenia końców (rezerwa/pierścień)', category: 'EDYCJA_MODELU', action_id: 'start_connect_ends', required_mode: 'MODEL_EDIT' },
  { keys: 'N', description_pl: 'Ustaw NOP (punkt normalnie otwarty)', category: 'EDYCJA_MODELU', action_id: 'set_nop', required_mode: 'MODEL_EDIT' },

  // --- Dodawanie źródeł nN ---
  { keys: 'Ctrl+Shift+P', description_pl: 'Dodaj falownik PV...', category: 'EDYCJA_MODELU', action_id: 'add_pv_inverter', required_mode: 'MODEL_EDIT' },
  { keys: 'Ctrl+Shift+B', description_pl: 'Dodaj falownik BESS...', category: 'EDYCJA_MODELU', action_id: 'add_bess_inverter', required_mode: 'MODEL_EDIT' },
  { keys: 'Ctrl+Shift+G', description_pl: 'Dodaj agregat...', category: 'EDYCJA_MODELU', action_id: 'add_genset', required_mode: 'MODEL_EDIT' },
  { keys: 'Ctrl+Shift+U', description_pl: 'Dodaj UPS...', category: 'EDYCJA_MODELU', action_id: 'add_ups', required_mode: 'MODEL_EDIT' },

  // --- Widoki ---
  { keys: 'Ctrl+1', description_pl: 'Tryb: Edycja modelu', category: 'WIDOKI', action_id: 'mode_model_edit', required_mode: null },
  { keys: 'Ctrl+2', description_pl: 'Tryb: Konfiguracja przypadku', category: 'WIDOKI', action_id: 'mode_case_config', required_mode: null },
  { keys: 'Ctrl+3', description_pl: 'Tryb: Wyniki (tylko odczyt)', category: 'WIDOKI', action_id: 'mode_result_view', required_mode: null },
  { keys: 'Ctrl+G', description_pl: 'Tryb: Tylko gotowość (podświetl blokery)', category: 'WIDOKI', action_id: 'filter_readiness_only', required_mode: null },
  { keys: 'Ctrl+Shift+S', description_pl: 'Tryb: Tylko źródła (filtr wizualny)', category: 'WIDOKI', action_id: 'filter_sources_only', required_mode: null },
  { keys: 'F5', description_pl: 'Odśwież widok', category: 'WIDOKI', action_id: 'refresh_view', required_mode: null },
  { keys: 'Ctrl+I', description_pl: 'Otwórz / zamknij panel inspektora', category: 'WIDOKI', action_id: 'toggle_inspector', required_mode: null },
  { keys: 'Ctrl+T', description_pl: 'Otwórz / zamknij drzewo projektu', category: 'WIDOKI', action_id: 'toggle_project_tree', required_mode: null },

  // --- Analiza ---
  { keys: 'Ctrl+R', description_pl: 'Uruchom obliczenia...', category: 'ANALIZA', action_id: 'run_calculation', required_mode: 'RESULT_VIEW' },
  { keys: 'Ctrl+W', description_pl: 'Otwórz White Box...', category: 'ANALIZA', action_id: 'open_whitebox', required_mode: 'RESULT_VIEW' },
  { keys: 'Ctrl+E', description_pl: 'Eksportuj wyniki...', category: 'ANALIZA', action_id: 'export_results', required_mode: 'RESULT_VIEW' },

  // --- Narzędzia ---
  { keys: 'Ctrl+V', description_pl: 'Waliduj model sieci', category: 'NARZEDZIA', action_id: 'validate_model', required_mode: null },
  { keys: 'F1', description_pl: 'Pomoc — lista skrótów klawiaturowych', category: 'NARZEDZIA', action_id: 'show_shortcuts_help', required_mode: null },
  { keys: 'Ctrl+Shift+E', description_pl: 'Eksportuj schemat SLD...', category: 'NARZEDZIA', action_id: 'export_sld', required_mode: null },
] as const;

// ---------------------------------------------------------------------------
// Visual Filter Modes (Tryby ergonomii)
// ---------------------------------------------------------------------------

export type VisualFilterMode =
  | 'ALL'                    // Brak filtra — wszystkie elementy widoczne
  | 'READINESS_ONLY'         // Podświetl elementy z blockerami
  | 'SOURCES_ONLY'           // Pokaż tylko źródła (PV/BESS/agregat/UPS)
  | 'NN_ONLY'                // Pokaż tylko elementy nN
  | 'PROTECTION_ONLY';       // Pokaż tylko zabezpieczenia

export interface VisualFilterDef {
  mode: VisualFilterMode;
  label_pl: string;
  description_pl: string;
  shortcut: string | null;
}

export const VISUAL_FILTERS: readonly VisualFilterDef[] = [
  {
    mode: 'ALL',
    label_pl: 'Wszystkie elementy',
    description_pl: 'Wyświetl wszystkie elementy sieci bez filtrowania.',
    shortcut: null,
  },
  {
    mode: 'READINESS_ONLY',
    label_pl: 'Tylko gotowość',
    description_pl: 'Podświetl elementy z problemami gotowości (blokujące na czerwono, ostrzeżenia na żółto).',
    shortcut: 'Ctrl+G',
  },
  {
    mode: 'SOURCES_ONLY',
    label_pl: 'Tylko źródła',
    description_pl: 'Pokaż tylko źródła energii (falowniki PV, BESS, agregaty, UPS). Pozostałe elementy wyszarzone.',
    shortcut: 'Ctrl+Shift+S',
  },
  {
    mode: 'NN_ONLY',
    label_pl: 'Tylko nN',
    description_pl: 'Pokaż tylko elementy rozdzielni niskiego napięcia (nN). Sieć SN wyszarzona.',
    shortcut: null,
  },
  {
    mode: 'PROTECTION_ONLY',
    label_pl: 'Tylko zabezpieczenia',
    description_pl: 'Pokaż tylko zabezpieczenia i ich powiązania z łącznikami.',
    shortcut: null,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Grupuj skróty po kategorii */
export function groupShortcutsByCategory(): Map<KeyboardCategory, KeyboardShortcutDef[]> {
  const map = new Map<KeyboardCategory, KeyboardShortcutDef[]>();
  for (const shortcut of KEYBOARD_SHORTCUTS) {
    const list = map.get(shortcut.category) ?? [];
    list.push(shortcut);
    map.set(shortcut.category, list);
  }
  return map;
}

/** Etykiety kategorii (PL) */
export const CATEGORY_LABELS: Record<KeyboardCategory, string> = {
  NAWIGACJA: 'Nawigacja',
  EDYCJA_MODELU: 'Edycja modelu',
  WIDOKI: 'Widoki i tryby',
  ANALIZA: 'Analiza i wyniki',
  NARZEDZIA: 'Narzędzia',
};
