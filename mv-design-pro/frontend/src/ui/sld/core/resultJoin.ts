/**
 * ResultJoinV1 — Bridge between Snapshot + ResultSet → SLD tokens + Inspector facts.
 *
 * CANONICAL: Lacznik wynikow — jedna implementacja laczenia wynikow z modelem.
 * Wejscie: Snapshot (ElementRefV1 index) + ResultSet (element_ref).
 * Wyjscie: (a) SldOverlayTokenV1[] — tokeny warstwy wynikow na SLD,
 *          (b) InspectorFactV1[] — fakty do inspektora.
 *
 * ALIGNMENT:
 * - Backend: domain/result_join.py (ResultJoinV1, join_results)
 *
 * INVARIANTS:
 * - Laczenie WYLACZNIE po elementId (ElementRefV1.elementId == ResultSet.element_ref).
 * - Brak zgadywania: element bez laczenia → orphan token.
 * - Deterministic: sorted by elementId.
 * - Immutable (readonly).
 * - Tokeny NIE wplywaja na geometrie SLD — sa wylacznie opisowe.
 */

import type { ElementRefV1, ElementTypeV1 } from './elementRef';
import { ElementTypeV1 as ET } from './elementRef';

// =============================================================================
// SLD Overlay Token
// =============================================================================

export const OverlayTokenKindV1 = {
  VOLTAGE: 'VOLTAGE',
  CURRENT: 'CURRENT',
  LOADING: 'LOADING',
  SHORT_CIRCUIT: 'SHORT_CIRCUIT',
  PROTECTION: 'PROTECTION',
  READINESS_BADGE: 'READINESS_BADGE',
  ORPHAN_RESULT: 'ORPHAN_RESULT',
} as const;

export type OverlayTokenKindV1 = (typeof OverlayTokenKindV1)[keyof typeof OverlayTokenKindV1];

export interface SldOverlayTokenV1 {
  readonly elementId: string;
  readonly elementType: ElementTypeV1;
  readonly tokenKind: OverlayTokenKindV1;
  readonly labelPl: string;
  readonly value: number | string | null;
  readonly unit: string | null;
  readonly severity: string;
}

// =============================================================================
// Inspector Fact
// =============================================================================

export const InspectorFactSourceV1 = {
  DOMAIN: 'DOMAIN',
  SOLVER: 'SOLVER',
  READINESS: 'READINESS',
} as const;

export type InspectorFactSourceV1 =
  (typeof InspectorFactSourceV1)[keyof typeof InspectorFactSourceV1];

export interface InspectorFactV1 {
  readonly elementId: string;
  readonly elementType: ElementTypeV1;
  readonly key: string;
  readonly labelPl: string;
  readonly value: number | string | boolean | null;
  readonly unit: string | null;
  readonly source: InspectorFactSourceV1;
  readonly highlight: string | null;
}

// =============================================================================
// ResultJoinV1 — the actual join result
// =============================================================================

export interface ResultJoinV1 {
  readonly sldTokens: readonly SldOverlayTokenV1[];
  readonly inspectorFacts: readonly InspectorFactV1[];
  readonly orphanElementIds: readonly string[];
  readonly unmatchedSnapshotIds: readonly string[];
  readonly contentHash: string;
}

// =============================================================================
// Element result (input from ResultSet)
// =============================================================================

export interface ElementResultInput {
  readonly elementRef: string;
  readonly elementType: string;
  readonly values: Readonly<Record<string, number | string | null>>;
}

// =============================================================================
// Join function
// =============================================================================

/**
 * Join Snapshot elements with ResultSet elements.
 *
 * @param snapshotIndex - elementId → ElementRefV1 from Snapshot
 * @param elementResults - per-element results from ResultSet
 * @param analysisType - SC_3F, LOAD_FLOW, etc.
 * @returns ResultJoinV1 with tokens, facts, orphans, unmatched.
 */
export function joinResults(
  snapshotIndex: ReadonlyMap<string, ElementRefV1>,
  elementResults: readonly ElementResultInput[],
  analysisType: string,
): ResultJoinV1 {
  const sldTokens: SldOverlayTokenV1[] = [];
  const inspectorFacts: InspectorFactV1[] = [];
  const matchedIds = new Set<string>();
  const orphanIds: string[] = [];

  const sortedResults = [...elementResults].sort((a, b) =>
    a.elementRef.localeCompare(b.elementRef),
  );

  for (const er of sortedResults) {
    const ref = snapshotIndex.get(er.elementRef);
    if (!ref) {
      orphanIds.push(er.elementRef);
      sldTokens.push({
        elementId: er.elementRef,
        elementType: ET.NODE,
        tokenKind: OverlayTokenKindV1.ORPHAN_RESULT,
        labelPl: `Wynik bez elementu w modelu: ${er.elementRef}`,
        value: null,
        unit: null,
        severity: 'WARNING',
      });
      continue;
    }

    matchedIds.add(er.elementRef);

    const sortedKeys = Object.keys(er.values).sort();
    for (const key of sortedKeys) {
      const val = er.values[key];
      const tokenKind = classifyTokenKind(key, analysisType);
      const unit = inferUnit(key);

      sldTokens.push({
        elementId: er.elementRef,
        elementType: ref.elementType,
        tokenKind,
        labelPl: labelPl(key),
        value: val,
        unit,
        severity: 'INFO',
      });

      inspectorFacts.push({
        elementId: er.elementRef,
        elementType: ref.elementType,
        key,
        labelPl: labelPl(key),
        value: val,
        unit,
        source: InspectorFactSourceV1.SOLVER,
        highlight: null,
      });
    }
  }

  const unmatchedIds: string[] = [];
  for (const eid of [...snapshotIndex.keys()].sort()) {
    if (!matchedIds.has(eid)) {
      unmatchedIds.push(eid);
    }
  }

  sldTokens.sort((a, b) =>
    a.elementId.localeCompare(b.elementId) || a.tokenKind.localeCompare(b.tokenKind),
  );
  inspectorFacts.sort((a, b) =>
    a.elementId.localeCompare(b.elementId) || a.key.localeCompare(b.key),
  );
  orphanIds.sort();

  return {
    sldTokens,
    inspectorFacts,
    orphanElementIds: orphanIds,
    unmatchedSnapshotIds: unmatchedIds,
    contentHash: '', // Hash computed server-side for authoritative value
  };
}

// =============================================================================
// Helpers (internal)
// =============================================================================

function classifyTokenKind(key: string, analysisType: string): OverlayTokenKindV1 {
  if (key.includes('ikss') || key.includes('ik_') || key.includes('sk_mva')) {
    return OverlayTokenKindV1.SHORT_CIRCUIT;
  }
  if (key.includes('v_pu') || key.includes('u_kv') || key.includes('angle')) {
    return OverlayTokenKindV1.VOLTAGE;
  }
  if (key.includes('i_a') || key.includes('current')) {
    return OverlayTokenKindV1.CURRENT;
  }
  if (key.includes('loading')) {
    return OverlayTokenKindV1.LOADING;
  }
  if (key.includes('protection') || key.includes('relay')) {
    return OverlayTokenKindV1.PROTECTION;
  }
  if (['SC_3F', 'SC_1F', 'SC_2F'].includes(analysisType)) {
    return OverlayTokenKindV1.SHORT_CIRCUIT;
  }
  return OverlayTokenKindV1.VOLTAGE;
}

const UNIT_MAP: Record<string, string> = {
  v_pu: 'p.u.',
  u_kv: 'kV',
  angle_deg: '°',
  p_mw: 'MW',
  q_mvar: 'Mvar',
  s_mva: 'MVA',
  i_a: 'A',
  ikss_ka: 'kA',
  ip_ka: 'kA',
  ith_ka: 'kA',
  sk_mva: 'MVA',
  loading_pct: '%',
  losses_p_mw: 'MW',
  losses_q_mvar: 'Mvar',
};

function inferUnit(key: string): string | null {
  for (const [pattern, unit] of Object.entries(UNIT_MAP)) {
    if (key.includes(pattern)) return unit;
  }
  return null;
}

const LABEL_PL_MAP: Record<string, string> = {
  v_pu: 'Napiecie [p.u.]',
  u_kv: 'Napiecie [kV]',
  angle_deg: 'Kat fazowy [°]',
  p_mw: 'Moc czynna [MW]',
  q_mvar: 'Moc bierna [Mvar]',
  s_mva: 'Moc pozorna [MVA]',
  i_a: 'Prad [A]',
  ikss_ka: 'Prad zwarciowy Ik\'\' [kA]',
  ip_ka: 'Prad udarowy ip [kA]',
  ith_ka: 'Prad cieplny Ith [kA]',
  sk_mva: 'Moc zwarciowa Sk\'\' [MVA]',
  loading_pct: 'Obciazenie [%]',
  losses_p_mw: 'Straty czynne [MW]',
  losses_q_mvar: 'Straty bierne [Mvar]',
  p_injected_mw: 'Moc czynna wstrzyknieta [MW]',
  q_injected_mvar: 'Moc bierna wstrzyknieta [Mvar]',
};

function labelPl(key: string): string {
  for (const [pattern, label] of Object.entries(LABEL_PL_MAP)) {
    if (key.includes(pattern)) return label;
  }
  return key;
}
