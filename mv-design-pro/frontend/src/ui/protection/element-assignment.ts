/**
 * P16a — Protection Element Assignment Contract (READ-ONLY)
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § A: Bijection Symbol ↔ Model Object
 * - powerfactory_ui_parity.md: PowerFactory-like protection visualization
 *
 * KONTRAKT DANYCH:
 * Definiuje strukturę przypisania urządzeń zabezpieczeniowych do elementów SLD.
 * Umożliwia wizualizację zabezpieczeń na schemacie bez uruchamiania solverów.
 *
 * WYMAGANIA:
 * - Dane muszą być dostępne statycznie (bez analizy)
 * - Jedno urządzenie może chronić wiele elementów
 * - Jeden element może mieć wiele urządzeń (np. I>, I>>)
 *
 * STATUS: KONTRAKT (nie zaimplementowany)
 * Implementacja wymaga rozszerzenia modelu NetworkModel lub osobnego store.
 */

import type { ElementType } from '../types';

// =============================================================================
// Element Protection Assignment Types
// =============================================================================

/**
 * Typ urządzenia zabezpieczeniowego (zgodny z PowerFactory).
 */
export type ProtectionDeviceKind =
  | 'RELAY_OVERCURRENT' // Przekaźnik nadprądowy (I>, I>>)
  | 'RELAY_DISTANCE' // Przekaźnik odległościowy
  | 'RELAY_DIFFERENTIAL' // Przekaźnik różnicowy
  | 'RELAY_EARTH_FAULT' // Przekaźnik ziemnozwarciowy (Io>)
  | 'FUSE' // Bezpiecznik
  | 'RECLOSER' // Reklozer
  | 'SECTIONALIZER' // Sekcjonalizer
  | 'OTHER'; // Inny

/**
 * Stan urządzenia zabezpieczeniowego.
 */
export type ProtectionDeviceStatus =
  | 'ACTIVE' // Aktywne (w pracy)
  | 'BLOCKED' // Zablokowane
  | 'TEST' // Tryb testowy
  | 'UNKNOWN'; // Nieznany

/**
 * Przypisanie urządzenia zabezpieczeniowego do elementu.
 * Reprezentuje relację: element sieci ← urządzenie zabezpieczeniowe.
 */
export interface ElementProtectionAssignment {
  /** ID elementu sieci (bijection z SldSymbol.elementId) */
  element_id: string;

  /** Typ elementu (Switch, LineBranch, TransformerBranch, etc.) */
  element_type: ElementType;

  /** ID urządzenia zabezpieczeniowego (referencja do ProtectionDeviceType) */
  device_id: string;

  /** Nazwa urządzenia (dla wyświetlania) */
  device_name_pl: string;

  /** Typ urządzenia */
  device_kind: ProtectionDeviceKind;

  /** Stan urządzenia */
  status: ProtectionDeviceStatus;

  /** Kluczowe nastawy (read-only, dla tooltipa) */
  settings_summary?: ProtectionSettingsSummary;
}

/**
 * Podsumowanie nastaw zabezpieczenia (read-only).
 * Tylko podstawowe parametry do wyświetlenia w tooltipie/panelu.
 */
export interface ProtectionSettingsSummary {
  /** Prąd rozruchowy I> [A] */
  i_pickup_a?: number;

  /** Prąd rozruchowy szybki I>> [A] */
  i_pickup_fast_a?: number;

  /** Czas opóźnienia [s] */
  t_delay_s?: number;

  /** Charakterystyka (np. "IEC SI", "IEC VI", "ANSI") */
  curve_type?: string;

  /** Prąd znamionowy [A] */
  i_rated_a?: number;

  /** Dodatkowe parametry (klucz-wartość) */
  extra?: Record<string, string | number>;
}

// =============================================================================
// SLD Symbol Extension (kontrakt rozszerzenia)
// =============================================================================

/**
 * Rozszerzenie symbolu SLD o dane zabezpieczeń.
 * UWAGA: To jest KONTRAKT - SldSymbol jeszcze nie ma tego pola.
 *
 * Proponowane rozszerzenie:
 * ```typescript
 * interface SldSymbol {
 *   ...
 *   // Opcjonalne referencje do urządzeń zabezpieczeniowych
 *   protectionDeviceRefs?: string[];
 * }
 * ```
 */
export interface SldSymbolProtectionExtension {
  /** ID symbolu (pasuje do SldSymbol.id) */
  symbol_id: string;

  /** Przypisane urządzenia zabezpieczeniowe */
  protection_device_refs: string[];
}

// =============================================================================
// Adapter Interface (kontrakt adaptera)
// =============================================================================

/**
 * Interfejs adaptera do pobierania przypisań zabezpieczeń.
 * UWAGA: To jest KONTRAKT - adapter nie jest jeszcze zaimplementowany.
 *
 * Implementacja może:
 * - Pobierać z NetworkModel (jeśli model zostanie rozszerzony)
 * - Pobierać z osobnego store
 * - Pobierać z API (jeśli backend dostarczy endpoint)
 */
export interface ProtectionAssignmentAdapter {
  /**
   * Pobierz wszystkie przypisania dla projektu/diagramu.
   */
  getAssignments(projectId: string, diagramId: string): Promise<ElementProtectionAssignment[]>;

  /**
   * Pobierz przypisania dla konkretnego elementu.
   */
  getAssignmentsForElement(elementId: string): Promise<ElementProtectionAssignment[]>;

  /**
   * Sprawdź czy element ma przypisane zabezpieczenia.
   */
  hasProtection(elementId: string): Promise<boolean>;
}

// =============================================================================
// Polish Labels (100% PL)
// =============================================================================

export const PROTECTION_DEVICE_KIND_LABELS: Record<ProtectionDeviceKind, string> = {
  RELAY_OVERCURRENT: 'Przekaznik nadpradowy',
  RELAY_DISTANCE: 'Przekaznik odleglosciowy',
  RELAY_DIFFERENTIAL: 'Przekaznik roznicowy',
  RELAY_EARTH_FAULT: 'Przekaznik ziemnozwarciowy',
  FUSE: 'Bezpiecznik',
  RECLOSER: 'Reklozer',
  SECTIONALIZER: 'Sekcjonalizer',
  OTHER: 'Inny',
};

export const PROTECTION_STATUS_LABELS: Record<ProtectionDeviceStatus, string> = {
  ACTIVE: 'Aktywne',
  BLOCKED: 'Zablokowane',
  TEST: 'Tryb testowy',
  UNKNOWN: 'Nieznany',
};

export const PROTECTION_STATUS_COLORS: Record<ProtectionDeviceStatus, string> = {
  ACTIVE: 'text-emerald-600 bg-emerald-50',
  BLOCKED: 'text-rose-600 bg-rose-50',
  TEST: 'text-amber-600 bg-amber-50',
  UNKNOWN: 'text-gray-600 bg-gray-50',
};

// =============================================================================
// Fixture Data (dla testów i mockowania)
// =============================================================================

/**
 * Przykładowe dane fixture do testów UI.
 * UWAGA: To są dane testowe, nie produkcyjne.
 */
export const PROTECTION_ASSIGNMENT_FIXTURES: ElementProtectionAssignment[] = [
  {
    element_id: 'switch-001',
    element_type: 'Switch',
    device_id: 'relay-oc-001',
    device_name_pl: 'Przekaznik I> (F1)',
    device_kind: 'RELAY_OVERCURRENT',
    status: 'ACTIVE',
    settings_summary: {
      i_pickup_a: 630,
      i_pickup_fast_a: 2500,
      t_delay_s: 0.5,
      curve_type: 'IEC SI',
    },
  },
  {
    element_id: 'trafo-001',
    element_type: 'TransformerBranch',
    device_id: 'relay-diff-001',
    device_name_pl: 'Przekaznik roznicowy (T1)',
    device_kind: 'RELAY_DIFFERENTIAL',
    status: 'ACTIVE',
    settings_summary: {
      i_pickup_a: 0.3, // 30% In
      t_delay_s: 0,
    },
  },
  {
    element_id: 'line-001',
    element_type: 'LineBranch',
    device_id: 'relay-dist-001',
    device_name_pl: 'Przekaznik odleglosciowy (L1)',
    device_kind: 'RELAY_DISTANCE',
    status: 'BLOCKED',
  },
];
