/**
 * UI-03: Short Circuit Verdict Helpers
 *
 * Logika werdyktu dla porównania Ik vs Icu (zdolność wyłączania).
 *
 * CANONICAL ALIGNMENT:
 * - normativeLabels.ts: SHORT_CIRCUIT_VERDICT_LABELS
 * - NOT-A-SOLVER: Tylko prezentacja danych z backendu
 * - 100% Polish UI
 *
 * Kryteria:
 * - PASS: margines > 15%
 * - MARGINAL: 0% ≤ margines ≤ 15%
 * - FAIL: margines < 0% (Ik > Icu)
 */

import type { CoordinationVerdict } from '../protection-coordination/types';
import { SHORT_CIRCUIT_VERDICT_LABELS } from '../shared/normativeLabels';

/**
 * Wynik werdyktu porównania Ik vs Icu.
 */
export interface ShortCircuitVerdictResult {
  /** Werdykt: PASS/MARGINAL/FAIL/ERROR */
  verdict: CoordinationVerdict;
  /** Margines procentowy: (Icu - Ik) / Icu × 100 */
  margin_pct: number | null;
  /** Przyczyna (DLACZEGO) */
  notes: string;
  /** Zalecenie (CO DALEJ) */
  recommendation: string;
}

/**
 * Oblicza margines i werdykt dla porównania Ik vs Icu.
 *
 * @param ik_ka - Prąd zwarciowy [kA]
 * @param icu_ka - Zdolność wyłączania wyłącznika [kA] (z katalogu)
 * @returns Werdykt z marginesem i komunikatami
 */
export function calculateShortCircuitVerdict(
  ik_ka: number | null | undefined,
  icu_ka: number | null | undefined
): ShortCircuitVerdictResult {
  const labels = SHORT_CIRCUIT_VERDICT_LABELS;

  // Brak danych Ik
  if (ik_ka === null || ik_ka === undefined) {
    return {
      verdict: 'ERROR',
      margin_pct: null,
      notes: 'Brak obliczonego prądu zwarciowego',
      recommendation: 'Uruchom obliczenia zwarciowe',
    };
  }

  // Brak danych Icu z katalogu
  if (icu_ka === null || icu_ka === undefined) {
    return {
      verdict: 'ERROR',
      margin_pct: null,
      notes: labels.statusDescriptions.noData,
      recommendation: 'Uzupełnij dane Icu w katalogu wyłącznika',
    };
  }

  // Oblicz margines: (Icu - Ik) / Icu × 100
  const margin_pct = ((icu_ka - ik_ka) / icu_ka) * 100;

  // Werdykt na podstawie marginesu
  if (margin_pct > 15) {
    return {
      verdict: 'PASS',
      margin_pct,
      notes: labels.statusDescriptions.pass,
      recommendation: '',
    };
  }

  if (margin_pct >= 0) {
    return {
      verdict: 'MARGINAL',
      margin_pct,
      notes: labels.statusDescriptions.marginal,
      recommendation: 'Rozważ wymianę wyłącznika na jednostkę o wyższej zdolności wyłączania lub weryfikację warunków zwarciowych.',
    };
  }

  // margin_pct < 0 → Ik > Icu
  return {
    verdict: 'FAIL',
    margin_pct,
    notes: labels.statusDescriptions.fail,
    recommendation: 'WYMAGANA WYMIANA: Wyłącznik nie spełnia wymagań zdolności wyłączania. Dobierz jednostkę o Icu > Ik.',
  };
}

/**
 * Formatuje margines do wyświetlenia.
 */
export function formatMargin(margin_pct: number | null): string {
  if (margin_pct === null) return '—';
  const sign = margin_pct >= 0 ? '' : '';
  return `${sign}${margin_pct.toFixed(1)}%`;
}
