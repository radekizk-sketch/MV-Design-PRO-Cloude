/**
 * SLD Label Layer — §8 UX 10/10
 *
 * Deterministyczne generowanie etykiet technicznych na SLD.
 * 3 tryby widoku:
 *
 * [ Minimalny ] [ Techniczny ] [ Analityczny ]
 *
 * MINIMALNY:
 * - Nazwa elementu
 * - Stan (NOP, wyłączony)
 *
 * TECHNICZNY:
 * - Długość kabla (m)
 * - Typ kabla (XRUHAKXS...)
 * - Obciążenie %
 * - Napięcie kV
 * - Moc stacji kVA
 *
 * ANALITYCZNY:
 * - Impedancja (R + jX) [Ω]
 * - Kierunek mocy (P→, Q→)
 * - Nastawy zabezpieczeń (skrót: I>, t)
 * - Straty [kW]
 *
 * INVARIANTS:
 * - Read-only — brak mutacji modelu
 * - Deterministyczne sortowanie po elementId
 * - Brak migotania (stabilny render)
 * - Units always visible
 */

import type { AnySldSymbol } from '../sld-editor/types';

// =============================================================================
// Label Mode Types
// =============================================================================

export type LabelMode = 'MINIMALNY' | 'TECHNICZNY' | 'ANALITYCZNY';

export const LABEL_MODE_LABELS: Record<LabelMode, string> = {
  MINIMALNY: 'Minimalny',
  TECHNICZNY: 'Techniczny',
  ANALITYCZNY: 'Analityczny',
};

export const LABEL_MODE_DESCRIPTIONS: Record<LabelMode, string> = {
  MINIMALNY: 'Nazwy elementów i stany',
  TECHNICZNY: 'Długości, typy, obciążenia, napięcia',
  ANALITYCZNY: 'Impedancje, kierunki mocy, nastawy zabezpieczeń',
};

// =============================================================================
// Label Data Types
// =============================================================================

export interface LabelLine {
  text: string;
  color: string;
  bold?: boolean;
}

export interface ElementLabel {
  elementId: string;
  x: number;
  y: number;
  lines: LabelLine[];
}

// =============================================================================
// Result Data Types (from overlay)
// =============================================================================

export interface BranchResultData {
  loading_pct?: number;
  p_kw?: number;
  q_kvar?: number;
  i_a?: number;
  losses_kw?: number;
}

export interface BusResultData {
  u_kv?: number;
  u_pu?: number;
}

export interface ProtectionSettingData {
  i_pickup_a?: number;
  t_delay_s?: number;
  curve_type?: string;
}

// =============================================================================
// Colors
// =============================================================================

const COLORS = {
  DEFAULT: '#1e293b',
  HIGH_LOADING: '#dc2626',
  MED_LOADING: '#d97706',
  OK_LOADING: '#16a34a',
  NOP: '#7c3aed',
  IMPEDANCE: '#6366f1',
  POWER_FLOW: '#0891b2',
  PROTECTION: '#c026d3',
  MUTED: '#94a3b8',
} as const;

function loadingColor(pct: number): string {
  if (pct >= 80) return COLORS.HIGH_LOADING;
  if (pct >= 50) return COLORS.MED_LOADING;
  return COLORS.OK_LOADING;
}

// =============================================================================
// Label Builder Functions
// =============================================================================

/**
 * Build MINIMALNY labels — basic names and states.
 */
export function buildMinimalLabels(
  symbol: AnySldSymbol,
  _branchResult?: BranchResultData,
  _busResult?: BusResultData,
): LabelLine[] {
  const lines: LabelLine[] = [];
  const s = symbol as unknown as Record<string, unknown>;

  // NOP indicator
  if (symbol.elementType === 'Switch' && s.switchState === 'OPEN') {
    lines.push({ text: 'NOP', color: COLORS.NOP, bold: true });
  }

  // Out of service indicator
  if (s.inService === false) {
    lines.push({ text: 'WYŁ.', color: COLORS.HIGH_LOADING, bold: true });
  }

  return lines;
}

/**
 * Build TECHNICZNY labels — cable lengths, types, loading percentages.
 */
export function buildTechnicalLabels(
  symbol: AnySldSymbol,
  branchResult?: BranchResultData,
  busResult?: BusResultData,
): LabelLine[] {
  const lines: LabelLine[] = [];
  const s = symbol as unknown as Record<string, unknown>;

  if (symbol.elementType === 'LineBranch') {
    // Cable/line type
    const branchType = s.branchType as string | undefined;
    if (branchType) {
      lines.push({
        text: branchType === 'LINE' ? 'Nap.' : 'Kab.',
        color: COLORS.DEFAULT,
      });
    }

    // Cable type name
    const typeName = s.typeName as string | undefined;
    if (typeName) {
      lines.push({ text: typeName, color: COLORS.MUTED });
    }

    // Length
    const length = s.length_m as number | undefined;
    if (length !== undefined) {
      lines.push({ text: `${length.toFixed(0)} m`, color: COLORS.DEFAULT });
    }

    // Loading percentage
    if (branchResult?.loading_pct !== undefined) {
      const pct = branchResult.loading_pct;
      lines.push({
        text: `${pct.toFixed(0)}%`,
        color: loadingColor(pct),
        bold: pct >= 80,
      });
    }
  }

  if (symbol.elementType === 'TransformerBranch') {
    const ratedPower = s.rated_power_kva as number | undefined;
    if (ratedPower !== undefined) {
      lines.push({ text: `${ratedPower} kVA`, color: COLORS.DEFAULT });
    }

    if (branchResult?.loading_pct !== undefined) {
      const pct = branchResult.loading_pct;
      lines.push({
        text: `TR ${pct.toFixed(0)}%`,
        color: loadingColor(pct),
        bold: pct >= 80,
      });
    }
  }

  if (symbol.elementType === 'Bus') {
    if (busResult?.u_kv !== undefined) {
      lines.push({ text: `${busResult.u_kv.toFixed(2)} kV`, color: COLORS.DEFAULT });
    }
  }

  if (symbol.elementType === 'Switch') {
    if (s.switchState === 'OPEN') {
      lines.push({ text: 'NOP', color: COLORS.NOP, bold: true });
    }
  }

  if (symbol.elementType === 'Source') {
    const slackBus = s.slackBus as boolean | undefined;
    if (slackBus) {
      lines.push({ text: 'Slack', color: COLORS.DEFAULT });
    }
  }

  return lines;
}

/**
 * Build ANALITYCZNY labels — impedances, power directions, protection settings.
 */
export function buildAnalyticalLabels(
  symbol: AnySldSymbol,
  branchResult?: BranchResultData,
  busResult?: BusResultData,
  protectionSettings?: ProtectionSettingData,
): LabelLine[] {
  const lines: LabelLine[] = [];
  const s = symbol as unknown as Record<string, unknown>;

  if (symbol.elementType === 'LineBranch') {
    // Impedance
    const r = s.r_ohm as number | undefined;
    const x = s.x_ohm as number | undefined;
    if (r !== undefined && x !== undefined) {
      lines.push({
        text: `Z = ${r.toFixed(3)} + j${x.toFixed(3)} Ω`,
        color: COLORS.IMPEDANCE,
      });
    }

    // Power flow direction
    if (branchResult?.p_kw !== undefined) {
      const pDir = branchResult.p_kw >= 0 ? '→' : '←';
      const qDir = (branchResult?.q_kvar ?? 0) >= 0 ? '→' : '←';
      lines.push({
        text: `P${pDir}${Math.abs(branchResult.p_kw).toFixed(1)} kW`,
        color: COLORS.POWER_FLOW,
      });
      if (branchResult.q_kvar !== undefined) {
        lines.push({
          text: `Q${qDir}${Math.abs(branchResult.q_kvar).toFixed(1)} kvar`,
          color: COLORS.POWER_FLOW,
        });
      }
    }

    // Losses
    if (branchResult?.losses_kw !== undefined) {
      lines.push({
        text: `ΔP = ${branchResult.losses_kw.toFixed(2)} kW`,
        color: COLORS.MUTED,
      });
    }
  }

  if (symbol.elementType === 'TransformerBranch') {
    const uk = s.uk_pct as number | undefined;
    if (uk !== undefined) {
      lines.push({
        text: `uk = ${uk.toFixed(1)}%`,
        color: COLORS.IMPEDANCE,
      });
    }
  }

  if (symbol.elementType === 'Bus') {
    if (busResult?.u_pu !== undefined) {
      const deviation = Math.abs(busResult.u_pu - 1.0) * 100;
      const color = deviation > 5 ? COLORS.HIGH_LOADING : deviation > 2 ? COLORS.MED_LOADING : COLORS.OK_LOADING;
      lines.push({
        text: `${busResult.u_kv?.toFixed(2) ?? '?'} kV (${busResult.u_pu.toFixed(3)} p.u.)`,
        color,
      });
    }
  }

  // Protection settings (any element with protection)
  if (protectionSettings) {
    const parts: string[] = [];
    if (protectionSettings.i_pickup_a !== undefined) {
      parts.push(`I>=${protectionSettings.i_pickup_a.toFixed(0)} A`);
    }
    if (protectionSettings.t_delay_s !== undefined) {
      parts.push(`t=${protectionSettings.t_delay_s.toFixed(2)} s`);
    }
    if (parts.length > 0) {
      lines.push({
        text: parts.join(', '),
        color: COLORS.PROTECTION,
      });
    }
  }

  return lines;
}

/**
 * Build labels for a symbol based on the current label mode.
 * Returns empty array if no labels should be shown.
 */
export function buildLabelsForSymbol(
  mode: LabelMode,
  symbol: AnySldSymbol,
  branchResult?: BranchResultData,
  busResult?: BusResultData,
  protectionSettings?: ProtectionSettingData,
): LabelLine[] {
  switch (mode) {
    case 'MINIMALNY':
      return buildMinimalLabels(symbol, branchResult, busResult);
    case 'TECHNICZNY':
      return buildTechnicalLabels(symbol, branchResult, busResult);
    case 'ANALITYCZNY':
      return buildAnalyticalLabels(symbol, branchResult, busResult, protectionSettings);
  }
}
