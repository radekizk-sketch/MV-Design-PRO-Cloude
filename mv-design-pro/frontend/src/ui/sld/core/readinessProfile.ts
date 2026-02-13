/**
 * ReadinessProfileV1 — Per-analysis readiness with FixActions (TypeScript mirror).
 *
 * CANONICAL: Gotowosc projektu do uruchomienia analiz / wyswietlenia SLD / eksportu.
 * Rozszerza AnalysisEligibilityMatrix o per-area grouping (KATALOGI, TOPOLOGIA, etc.)
 * i formalne profile: sldReady, shortCircuitReady, loadFlowReady, protectionReady.
 *
 * ALIGNMENT:
 * - Backend: domain/readiness.py (ReadinessProfileV1, ReadinessIssueV1)
 *
 * INVARIANTS:
 * - Immutable (readonly).
 * - Deterministyczny: identyczny Snapshot → identyczny ReadinessProfileV1.
 * - FixActions sa stabilne kody PL — brak auto-uzupelnien.
 * - ReadinessProfileV1 NIE mutuje modelu — tylko informuje.
 */

// =============================================================================
// ReadinessAreaV1 — logical grouping
// =============================================================================

export const ReadinessAreaV1 = {
  CATALOGS: 'CATALOGS',
  TOPOLOGY: 'TOPOLOGY',
  SOURCES: 'SOURCES',
  STATIONS: 'STATIONS',
  GENERATORS: 'GENERATORS',
  PROTECTION: 'PROTECTION',
  ANALYSIS: 'ANALYSIS',
} as const;

export type ReadinessAreaV1 = (typeof ReadinessAreaV1)[keyof typeof ReadinessAreaV1];

// =============================================================================
// ReadinessPriority
// =============================================================================

export const ReadinessPriority = {
  BLOCKER: 'BLOCKER',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const;

export type ReadinessPriority = (typeof ReadinessPriority)[keyof typeof ReadinessPriority];

// =============================================================================
// ReadinessIssueV1
// =============================================================================

export interface ReadinessIssueV1 {
  readonly code: string;
  readonly area: ReadinessAreaV1;
  readonly priority: ReadinessPriority;
  readonly messagePl: string;
  readonly elementId: string | null;
  readonly elementType: string | null;
  readonly fixHintPl: string | null;
  readonly wizardStep: string | null;
}

// =============================================================================
// ReadinessProfileV1
// =============================================================================

export interface ReadinessProfileV1 {
  readonly snapshotId: string;
  readonly snapshotFingerprint: string;

  readonly sldReady: boolean;
  readonly shortCircuitReady: boolean;
  readonly loadFlowReady: boolean;
  readonly protectionReady: boolean;

  readonly issues: readonly ReadinessIssueV1[];

  readonly contentHash: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Group readiness issues by area.
 */
export function groupIssuesByArea(
  issues: readonly ReadinessIssueV1[],
): ReadonlyMap<ReadinessAreaV1, readonly ReadinessIssueV1[]> {
  const result = new Map<ReadinessAreaV1, ReadinessIssueV1[]>();
  for (const issue of issues) {
    const list = result.get(issue.area) ?? [];
    list.push(issue);
    result.set(issue.area, list);
  }
  return result;
}

/**
 * Get blocker issues for a specific readiness profile.
 */
export function getBlockers(
  issues: readonly ReadinessIssueV1[],
): readonly ReadinessIssueV1[] {
  return issues.filter(i => i.priority === ReadinessPriority.BLOCKER);
}
