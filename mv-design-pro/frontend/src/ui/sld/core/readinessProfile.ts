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

// =============================================================================
// Readiness Gates — hard blocking (RUN #3E §3)
// =============================================================================

/**
 * Error thrown when an operation is blocked by readiness requirements.
 */
export class ReadinessGateError extends Error {
  readonly gate: string;
  readonly blockers: readonly ReadinessIssueV1[];

  constructor(gate: string, blockers: readonly ReadinessIssueV1[]) {
    const codes = blockers.slice(0, 5).map(b => b.code).join(', ');
    super(`Readiness gate '${gate}' BLOCKED: ${blockers.length} blocker(s) [${codes}]`);
    this.gate = gate;
    this.blockers = blockers;
    this.name = 'ReadinessGateError';
  }
}

/**
 * Gate: SLD rendering requires sldReady=true.
 * @throws ReadinessGateError if SLD is not ready.
 */
export function requireSldReady(profile: ReadinessProfileV1): void {
  if (profile.sldReady) return;
  const blockers = profile.issues.filter(
    i => i.priority === ReadinessPriority.BLOCKER &&
      (i.area === ReadinessAreaV1.TOPOLOGY ||
       i.area === ReadinessAreaV1.STATIONS ||
       i.area === ReadinessAreaV1.GENERATORS),
  );
  throw new ReadinessGateError('sld_ready', blockers);
}

/**
 * Gate: Short circuit analysis requires shortCircuitReady=true.
 * @throws ReadinessGateError if short circuit analysis is not ready.
 */
export function requireShortCircuitReady(profile: ReadinessProfileV1): void {
  if (profile.shortCircuitReady) return;
  const blockers = profile.issues.filter(
    i => i.priority === ReadinessPriority.BLOCKER &&
      (i.area === ReadinessAreaV1.TOPOLOGY ||
       i.area === ReadinessAreaV1.SOURCES ||
       i.area === ReadinessAreaV1.CATALOGS),
  );
  throw new ReadinessGateError('short_circuit_ready', blockers);
}

/**
 * Gate: Load flow analysis requires loadFlowReady=true.
 * @throws ReadinessGateError if load flow analysis is not ready.
 */
export function requireLoadFlowReady(profile: ReadinessProfileV1): void {
  if (profile.loadFlowReady) return;
  const blockers = profile.issues.filter(
    i => i.priority === ReadinessPriority.BLOCKER &&
      (i.area === ReadinessAreaV1.TOPOLOGY ||
       i.area === ReadinessAreaV1.SOURCES ||
       i.area === ReadinessAreaV1.CATALOGS),
  );
  throw new ReadinessGateError('load_flow_ready', blockers);
}

/**
 * Gate: Export requires ALL readiness flags=true.
 * @throws ReadinessGateError if any blockers exist.
 */
export function requireExportReady(profile: ReadinessProfileV1): void {
  const allBlockers = profile.issues.filter(
    i => i.priority === ReadinessPriority.BLOCKER,
  );
  if (allBlockers.length === 0) return;
  throw new ReadinessGateError('export_ready', allBlockers);
}

// =============================================================================
// Field/Device readiness gates (RUN #3F §3)
// =============================================================================

/**
 * Gate: All station fields must have required apparatus.
 * Blocks when any field.device_missing.* BLOCKER exists.
 * @throws ReadinessGateError
 */
export function requireFieldsComplete(profile: ReadinessProfileV1): void {
  const blockers = profile.issues.filter(
    i => i.priority === ReadinessPriority.BLOCKER &&
      i.code.startsWith('field.device_missing.'),
  );
  if (blockers.length === 0) return;
  throw new ReadinessGateError('fields_complete', blockers);
}

/**
 * Gate: All critical apparatus must have parameters (CB rating, CT ratio, etc.).
 * Blocks when any device.*.missing BLOCKER exists.
 * @throws ReadinessGateError
 */
export function requireDevicesParametrized(profile: ReadinessProfileV1): void {
  const blockers = profile.issues.filter(
    i => i.priority === ReadinessPriority.BLOCKER &&
      (i.code.startsWith('device.') || i.code === 'catalog.ref_missing'),
  );
  if (blockers.length === 0) return;
  throw new ReadinessGateError('devices_parametrized', blockers);
}

/**
 * Gate: All relays must be bound to breakers (CB).
 * Blocks when protection.relay_binding_missing or protection.relay_cb_binding_missing.
 * @throws ReadinessGateError
 */
export function requireProtectionBindings(profile: ReadinessProfileV1): void {
  const blockers = profile.issues.filter(
    i => i.priority === ReadinessPriority.BLOCKER &&
      i.code.startsWith('protection.'),
  );
  if (blockers.length === 0) return;
  throw new ReadinessGateError('protection_bindings', blockers);
}
