/**
 * UI-04: TCC Interpretation Panel
 *
 * Panel tekstowej interpretacji wykrytych konfliktów selektywności
 * wyświetlany obok wykresu TCC.
 *
 * CANONICAL ALIGNMENT:
 * - 100% Polish UI
 * - READ-ONLY (prezentacja danych z backendu)
 * - NOT-A-SOLVER: interpretacja, nie obliczenia
 *
 * ZAWARTOŚĆ:
 * - Liczba wykrytych konfliktów
 * - Dla każdego konfliktu:
 *   * Para urządzeń (nazwa A ↔ nazwa B)
 *   * Zakres prądów konfliktu [A]
 *   * Skutek (np. "brak selektywności")
 *   * Zalecenie (np. "zwiększyć nastawę czasową")
 */

import { useMemo, useState } from 'react';
import type {
  SelectivityCheck,
  ProtectionDevice,
  CoordinationVerdict,
} from './types';
import { LABELS, VERDICT_STYLES } from './types';

// =============================================================================
// Types
// =============================================================================

interface TccInterpretationPanelProps {
  /** Wyniki sprawdzeń selektywności */
  selectivityChecks: SelectivityCheck[];
  /** Lista urządzeń do wyświetlenia nazw */
  devices: ProtectionDevice[];
  /** Czy panel jest domyślnie zwinięty */
  defaultCollapsed?: boolean;
}

interface ConflictInterpretation {
  /** Para urządzeń */
  upstreamDevice: string;
  downstreamDevice: string;
  /** Prąd analizy [A] */
  analysisCurrent: number;
  /** Czas zadziałania urządzenia podrzędnego [s] */
  tDownstream: number;
  /** Czas zadziałania urządzenia nadrzędnego [s] */
  tUpstream: number;
  /** Margines czasowy [s] */
  margin: number;
  /** Wymagany margines [s] */
  requiredMargin: number;
  /** Werdykt */
  verdict: CoordinationVerdict;
  /** Przyczyna techniczna */
  cause: string;
  /** Skutek dla użytkownika */
  effect: string;
  /** Zalecenie operacyjne */
  recommendation: string;
}

// =============================================================================
// Interpretation Logic
// =============================================================================

/**
 * Buduje interpretację konfliktu selektywności.
 */
function buildConflictInterpretation(
  check: SelectivityCheck,
  devices: ProtectionDevice[]
): ConflictInterpretation {
  const getDeviceName = (deviceId: string): string => {
    const device = devices.find((d) => d.id === deviceId);
    return device?.name ?? deviceId.slice(0, 8) + '...';
  };

  const upstreamDevice = getDeviceName(check.upstream_device_id);
  const downstreamDevice = getDeviceName(check.downstream_device_id);

  let cause: string;
  let effect: string;
  let recommendation: string;

  switch (check.verdict) {
    case 'FAIL':
      cause = check.margin_s < 0
        ? `Jednoczesne zadziałanie: Δt = ${check.margin_s.toFixed(3)} s < 0`
        : `Margines czasowy niewystarczający: Δt = ${check.margin_s.toFixed(3)} s < ${check.required_margin_s.toFixed(3)} s`;
      effect = 'Brak selektywności — zabezpieczenie nadrzędne może zadziałać przed podrzędnym, wyłączając większy obszar sieci niż jest to konieczne.';
      recommendation = 'Zwiększ nastawę czasową zabezpieczenia nadrzędnego (TMS lub czas niezależny) o co najmniej ' +
        `${(check.required_margin_s - check.margin_s).toFixed(2)} s, lub zmniejsz nastawę czasową zabezpieczenia podrzędnego.`;
      break;

    case 'MARGINAL':
      cause = `Mały margines czasowy: Δt = ${check.margin_s.toFixed(3)} s przy wymaganym ${check.required_margin_s.toFixed(3)} s`;
      effect = 'Selektywność zachowana z minimalnym marginesem — wrażliwa na tolerancje czasowe aparatury.';
      recommendation = 'Rozważ zwiększenie marginesu selektywności dla większej niezawodności koordynacji.';
      break;

    case 'PASS':
    default:
      cause = `Wystarczający margines czasowy: Δt = ${check.margin_s.toFixed(3)} s ≥ ${check.required_margin_s.toFixed(3)} s`;
      effect = 'Selektywność prawidłowa — zabezpieczenie podrzędne zadziała przed nadrzędnym.';
      recommendation = 'Brak wymaganych działań.';
      break;
  }

  return {
    upstreamDevice,
    downstreamDevice,
    analysisCurrent: check.analysis_current_a,
    tDownstream: check.t_downstream_s,
    tUpstream: check.t_upstream_s,
    margin: check.margin_s,
    requiredMargin: check.required_margin_s,
    verdict: check.verdict,
    cause,
    effect,
    recommendation,
  };
}

/**
 * Filtruje konflikty (FAIL i MARGINAL).
 */
function getConflicts(checks: SelectivityCheck[]): SelectivityCheck[] {
  return checks.filter((c) => c.verdict === 'FAIL' || c.verdict === 'MARGINAL');
}

// =============================================================================
// Component
// =============================================================================

/**
 * TccInterpretationPanel — Panel tekstowej interpretacji konfliktów TCC.
 *
 * Wyświetla:
 * - Liczbę wykrytych konfliktów
 * - Szczegóły każdego konfliktu (para urządzeń, skutek, zalecenie)
 * - Przycisk zwijania/rozwijania
 */
export function TccInterpretationPanel({
  selectivityChecks,
  devices,
  defaultCollapsed = false,
}: TccInterpretationPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Filtruj tylko konflikty (FAIL i MARGINAL)
  const conflicts = useMemo(
    () => getConflicts(selectivityChecks),
    [selectivityChecks]
  );

  // Buduj interpretacje dla konfliktów
  const interpretations = useMemo(
    () => conflicts.map((c) => buildConflictInterpretation(c, devices)),
    [conflicts, devices]
  );

  // Statystyki
  const failCount = conflicts.filter((c) => c.verdict === 'FAIL').length;
  const marginalCount = conflicts.filter((c) => c.verdict === 'MARGINAL').length;
  const totalPairs = selectivityChecks.length;

  // Określ ogólny status
  const overallStatus: 'OK' | 'WARNING' | 'CRITICAL' =
    failCount > 0 ? 'CRITICAL' : marginalCount > 0 ? 'WARNING' : 'OK';

  const statusStyles = {
    OK: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
    WARNING: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
    CRITICAL: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  };
  const style = statusStyles[overallStatus];

  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg}`}
      data-testid="tcc-interpretation-panel"
    >
      {/* Header with collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-4 py-3 ${style.text} font-semibold text-left hover:opacity-80 transition-opacity`}
        aria-expanded={!collapsed}
        aria-controls="tcc-interpretation-content"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">INTERPRETACJA WYKRESU</span>
          {conflicts.length > 0 ? (
            <span className="inline-flex items-center gap-2 text-sm font-normal">
              <span className="rounded-full bg-orange-200 px-2 py-0.5 text-orange-800">
                {failCount} {failCount === 1 ? 'konflikt' : failCount < 5 ? 'konflikty' : 'konfliktów'}
              </span>
              {marginalCount > 0 && (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-800">
                  {marginalCount} na granicy
                </span>
              )}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-emerald-800 text-sm font-normal">
              Brak konfliktów
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {!collapsed && (
        <div id="tcc-interpretation-content" className="px-4 pb-4 space-y-4">
          {/* Summary */}
          <div className="text-sm text-slate-600">
            Przeanalizowano {totalPairs} {totalPairs === 1 ? 'parę' : totalPairs < 5 ? 'pary' : 'par'} zabezpieczeń.
            {conflicts.length === 0 && (
              <span className="text-emerald-700 font-medium">
                {' '}Wszystkie pary zachowują prawidłową selektywność.
              </span>
            )}
          </div>

          {/* Conflict list */}
          {interpretations.length > 0 && (
            <div className="space-y-3">
              {interpretations.map((interp, idx) => {
                const verdictStyle = VERDICT_STYLES[interp.verdict];
                return (
                  <div
                    key={`${interp.upstreamDevice}-${interp.downstreamDevice}-${idx}`}
                    className="rounded border border-slate-200 bg-white p-3"
                    data-testid={`conflict-item-${idx}`}
                  >
                    {/* Device pair header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          {idx + 1}.
                        </span>
                        <span className="text-sm font-medium text-slate-900">
                          {interp.downstreamDevice}
                        </span>
                        <span className="text-slate-400">↔</span>
                        <span className="text-sm font-medium text-slate-900">
                          {interp.upstreamDevice}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${verdictStyle.bg} ${verdictStyle.text}`}
                      >
                        {LABELS.verdict[interp.verdict]}
                      </span>
                    </div>

                    {/* Current range */}
                    <div className="text-xs text-slate-500 mb-2">
                      <span className="font-medium">Prąd analizy:</span>{' '}
                      <span className="font-mono">{interp.analysisCurrent.toFixed(0)} A</span>
                      <span className="mx-2">|</span>
                      <span className="font-medium">t<sub>pod</sub>:</span>{' '}
                      <span className="font-mono">{interp.tDownstream.toFixed(3)} s</span>
                      <span className="mx-2">|</span>
                      <span className="font-medium">t<sub>nad</sub>:</span>{' '}
                      <span className="font-mono">{interp.tUpstream.toFixed(3)} s</span>
                      <span className="mx-2">|</span>
                      <span className="font-medium">Δt:</span>{' '}
                      <span className={`font-mono ${interp.margin < interp.requiredMargin ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {interp.margin.toFixed(3)} s
                      </span>
                    </div>

                    {/* Cause */}
                    <div className="text-sm mb-1">
                      <span className="font-medium text-slate-700">Przyczyna: </span>
                      <span className="text-slate-600">{interp.cause}</span>
                    </div>

                    {/* Effect */}
                    <div className="text-sm mb-1">
                      <span className="font-medium text-slate-700">Skutek: </span>
                      <span className="text-slate-600">{interp.effect}</span>
                    </div>

                    {/* Recommendation */}
                    {interp.verdict !== 'PASS' && (
                      <div className="text-sm bg-blue-50 rounded p-2 mt-2">
                        <span className="font-medium text-blue-800">Zalecenie: </span>
                        <span className="text-blue-700">{interp.recommendation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No conflicts message */}
          {interpretations.length === 0 && (
            <div className="text-center py-4">
              <svg
                className="mx-auto h-12 w-12 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-emerald-700 font-medium">
                Wszystkie sprawdzenia selektywności przeszły pomyślnie.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Zabezpieczenia są prawidłowo skoordynowane czasowo.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TccInterpretationPanel;
