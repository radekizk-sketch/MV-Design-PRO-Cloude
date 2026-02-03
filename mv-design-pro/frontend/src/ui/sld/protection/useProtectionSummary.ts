/**
 * useProtectionSummary — Funkcja pomocnicza do pobierania danych zabezpieczen dla elementow SLD
 *
 * PR-SLD-09: Widok zabezpieczeniowy (nastawy i kryteria)
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Warstwa nakladkowa tylko do odczytu
 * - Brak nowych obliczen — tylko interpretacja istniejacych danych
 *
 * CECHY:
 * - Pobiera dane zabezpieczen dla elementu
 * - Dane demonstracyjne (docelowo API)
 * - Deterministyczne mapowanie elementId -> ProtectionSummary
 *
 * 100% POLISH UI
 */

import { useMemo } from 'react';
import type {
  ProtectionSummary,
  OvercurrentProtectionSettings,
  CurrentTransformerInfo,
} from './types';

// =============================================================================
// DANE DEMONSTRACYJNE
// =============================================================================

/**
 * Dane demonstracyjne: nastawy nadpradowe dla linii SN.
 */
const FIXTURE_LINE_OC_SETTINGS: OvercurrentProtectionSettings = {
  time_overcurrent: {
    pickup_a: 240,
    pickup_in_multiplier: false,
    trip_time_s: 0.5,
    characteristic: 'DT',
    tms: null,
  },
  instant_overcurrent: {
    pickup_a: 1200,
    pickup_in_multiplier: false,
    trip_time_s: 0.05,
    instantaneous: true,
  },
};

/**
 * Dane demonstracyjne: nastawy nadpradowe dla transformatora.
 */
const FIXTURE_TRAFO_OC_SETTINGS: OvercurrentProtectionSettings = {
  time_overcurrent: {
    pickup_a: 360,
    pickup_in_multiplier: false,
    trip_time_s: 0.7,
    characteristic: 'SI',
    tms: 0.15,
  },
  instant_overcurrent: {
    pickup_a: 2000,
    pickup_in_multiplier: false,
    trip_time_s: 0,
    instantaneous: true,
  },
};

/**
 * Dane demonstracyjne: przekladnik dla linii.
 */
const FIXTURE_LINE_CT: CurrentTransformerInfo = {
  primary_a: 200,
  secondary_a: 1,
  label: '200/1',
};

/**
 * Dane demonstracyjne: przekladnik dla transformatora.
 */
const FIXTURE_TRAFO_CT: CurrentTransformerInfo = {
  primary_a: 400,
  secondary_a: 5,
  label: '400/5',
};

/**
 * Mapa danych demonstracyjnych zabezpieczen dla elementow.
 * DETERMINISTYCZNE: staly zestaw dla powtarzalnosci.
 */
const FIXTURE_PROTECTION_DATA: Map<string, ProtectionSummary> = new Map([
  // Linia 1 — pelne dane, spelnione
  [
    'line-001',
    {
      element_id: 'line-001',
      element_type: 'LineBranch',
      element_name: 'Linia WN-1',
      overcurrent: FIXTURE_LINE_OC_SETTINGS,
      ct: FIXTURE_LINE_CT,
      verification_status: 'SPELNIONE',
      verification_reason: 'Selektywnosc zapewniona, margines 15%',
      margin_pct: 15,
      has_complete_data: true,
    },
  ],
  // Linia 2 — pelne dane, niespelnione
  [
    'line-002',
    {
      element_id: 'line-002',
      element_type: 'LineBranch',
      element_name: 'Linia WN-2',
      overcurrent: {
        time_overcurrent: {
          pickup_a: 180,
          pickup_in_multiplier: false,
          trip_time_s: 0.3,
          characteristic: 'DT',
          tms: null,
        },
        instant_overcurrent: {
          pickup_a: 800,
          pickup_in_multiplier: false,
          trip_time_s: 0.05,
          instantaneous: true,
        },
      },
      ct: { primary_a: 150, secondary_a: 1, label: '150/1' },
      verification_status: 'NIESPELNIONE',
      verification_reason: 'Brak selektywnosci z zabezpieczeniem nadrzednym',
      margin_pct: -5,
      has_complete_data: true,
    },
  ],
  // Transformator 1 — pelne dane, spelnione
  [
    'trafo-001',
    {
      element_id: 'trafo-001',
      element_type: 'TransformerBranch',
      element_name: 'Transformator T1',
      overcurrent: FIXTURE_TRAFO_OC_SETTINGS,
      ct: FIXTURE_TRAFO_CT,
      verification_status: 'SPELNIONE',
      verification_reason: 'Ochrona zgodna z IEC 60909',
      margin_pct: 22,
      has_complete_data: true,
    },
  ],
  // Transformator 2 — brak danych
  [
    'trafo-002',
    {
      element_id: 'trafo-002',
      element_type: 'TransformerBranch',
      element_name: 'Transformator T2',
      overcurrent: null,
      ct: null,
      verification_status: 'BRAK_DANYCH',
      verification_reason: 'Brak konfiguracji zabezpieczen',
      margin_pct: null,
      has_complete_data: false,
    },
  ],
  // Lacznik z funkcja zabezpieczeniowa
  [
    'switch-001',
    {
      element_id: 'switch-001',
      element_type: 'Switch',
      element_name: 'Wylacznik Q1',
      overcurrent: {
        time_overcurrent: {
          pickup_a: 300,
          pickup_in_multiplier: false,
          trip_time_s: 0.4,
          characteristic: 'VI',
          tms: 0.1,
        },
        instant_overcurrent: null,
      },
      ct: { primary_a: 300, secondary_a: 1, label: '300/1' },
      verification_status: 'SPELNIONE',
      verification_reason: 'Koordynacja poprawna',
      margin_pct: 18,
      has_complete_data: true,
    },
  ],
]);

// =============================================================================
// FUNKCJE POMOCNICZE REACT
// =============================================================================

/**
 * Funkcja pomocnicza: Pobierz podsumowanie zabezpieczenia dla elementu.
 *
 * @param elementId - ID elementu sieci
 * @returns ProtectionSummary lub null jesli brak danych
 *
 * WIAZANIE: Tylko odczyt, brak mutacji.
 */
export function useProtectionSummary(elementId: string | null): ProtectionSummary | null {
  return useMemo(() => {
    if (!elementId) return null;
    return FIXTURE_PROTECTION_DATA.get(elementId) ?? null;
  }, [elementId]);
}

/**
 * Funkcja pomocnicza: Pobierz wszystkie elementy z danymi zabezpieczen.
 *
 * @returns Mapa elementId -> ProtectionSummary
 *
 * WIAZANIE: Tylko odczyt, deterministyczne.
 */
export function useAllProtectionSummaries(): Map<string, ProtectionSummary> {
  return useMemo(() => FIXTURE_PROTECTION_DATA, []);
}

/**
 * Funkcja pomocnicza: Sprawdz czy element ma dane zabezpieczen.
 *
 * @param elementId - ID elementu sieci
 * @returns true jesli element ma dane zabezpieczen
 */
export function useHasProtectionData(elementId: string | null): boolean {
  return useMemo(() => {
    if (!elementId) return false;
    const summary = FIXTURE_PROTECTION_DATA.get(elementId);
    return summary?.has_complete_data ?? false;
  }, [elementId]);
}

/**
 * Funkcja pomocnicza: Pobierz statystyki zabezpieczen dla calego schematu.
 *
 * @returns Obiekt ze statystykami
 */
export function useProtectionStatistics(): {
  total: number;
  complete: number;
  incomplete: number;
  verified: number;
  failed: number;
  noData: number;
} {
  return useMemo(() => {
    let total = 0;
    let complete = 0;
    let incomplete = 0;
    let verified = 0;
    let failed = 0;
    let noData = 0;

    for (const summary of FIXTURE_PROTECTION_DATA.values()) {
      total++;
      if (summary.has_complete_data) {
        complete++;
      } else {
        incomplete++;
      }
      switch (summary.verification_status) {
        case 'SPELNIONE':
          verified++;
          break;
        case 'NIESPELNIONE':
          failed++;
          break;
        case 'BRAK_DANYCH':
          noData++;
          break;
      }
    }

    return { total, complete, incomplete, verified, failed, noData };
  }, []);
}

// =============================================================================
// FUNKCJA WYBORU
// =============================================================================

/**
 * Funkcja wyboru: Pobierz ProtectionSummary dla elementId.
 * Uzywana bezposrednio (bez funkcji pomocniczej) gdy potrzebna w useMemo.
 *
 * @param elementId - ID elementu sieci
 * @returns ProtectionSummary lub null
 */
export function selectProtectionSummaryByElementId(
  elementId: string | null
): ProtectionSummary | null {
  if (!elementId) return null;
  return FIXTURE_PROTECTION_DATA.get(elementId) ?? null;
}
