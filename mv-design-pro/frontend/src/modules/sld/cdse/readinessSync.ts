/**
 * CDSE Readiness Sync — manages "Braki danych" (missing data) panel.
 *
 * After every domain operation:
 * 1. Update readiness state from DomainOpResponse
 * 2. Highlight elements with missing data on SLD
 * 3. Auto-remove resolved blockers
 * 4. Link fix_actions to appropriate modals
 *
 * INVARIANTS:
 * - Readiness state comes ONLY from backend
 * - No local readiness computation
 * - Polish labels required for all messages
 * - Fix actions must link to real modals
 */

/**
 * Readiness blocker — prevents analysis from running.
 */
export interface ReadinessBlocker {
  /** Unique code (e.g., "source.voltage_invalid") */
  code: string;
  /** Polish message for user */
  message_pl: string;
  /** Severity: BLOCKER prevents analysis, WARNING allows with notice */
  severity: 'BLOCKER' | 'WARNING';
  /** Element ID affected (for SLD highlighting) */
  elementId?: string;
  /** Fix action available */
  fixAction?: ReadinessFixAction;
}

/**
 * Fix action — links a readiness issue to a modal that can fix it.
 */
export interface ReadinessFixAction {
  /** Action code */
  code: string;
  /** Action type (OPEN_MODAL, NAVIGATE, AUTO_FIX) */
  actionType: 'OPEN_MODAL' | 'NAVIGATE' | 'AUTO_FIX';
  /** Modal to open (if actionType is OPEN_MODAL) */
  modalType?: string;
  /** Polish label for the fix button */
  label_pl: string;
  /** Element ID to target */
  targetElementId?: string;
}

/**
 * Full readiness state for the current Snapshot.
 */
export interface ReadinessState {
  /** Active blockers (prevent analysis) */
  blockers: ReadinessBlocker[];
  /** Active warnings (allow analysis with notice) */
  warnings: ReadinessBlocker[];
  /** Whether analysis can run (no blockers) */
  canRunAnalysis: boolean;
  /** Element IDs that have issues (for SLD highlighting) */
  affectedElementIds: string[];
  /** Summary message (Polish) */
  summary_pl: string;
}

/**
 * Create initial readiness state (empty, analysis allowed).
 */
export function createInitialReadiness(): ReadinessState {
  return {
    blockers: [],
    warnings: [],
    canRunAnalysis: true,
    affectedElementIds: [],
    summary_pl: 'Model gotowy do analizy',
  };
}

/**
 * Sync readiness state from a DomainOpResponse.
 *
 * @param readiness - Readiness data from backend response
 * @param fixActions - Fix actions from backend response
 * @returns Updated ReadinessState
 */
export function syncFromResponse(
  readiness: {
    blockers: Array<{ code: string; message_pl: string; severity: string; element_id?: string }>;
    warnings: Array<{ code: string; message_pl: string; element_id?: string }>;
  },
  fixActions: Array<{
    code: string;
    action_type: string;
    modal_type?: string;
    label_pl: string;
    target_element_id?: string;
  }>,
): ReadinessState {
  // Build fix action map for quick lookup
  const fixActionMap = new Map<string, ReadinessFixAction>();
  for (const fa of fixActions) {
    fixActionMap.set(fa.code, {
      code: fa.code,
      actionType: fa.action_type as ReadinessFixAction['actionType'],
      modalType: fa.modal_type,
      label_pl: fa.label_pl,
      targetElementId: fa.target_element_id,
    });
  }

  // Map blockers
  const blockers: ReadinessBlocker[] = readiness.blockers.map((b) => ({
    code: b.code,
    message_pl: b.message_pl,
    severity: 'BLOCKER' as const,
    elementId: b.element_id,
    fixAction: fixActionMap.get(b.code),
  }));

  // Map warnings
  const warnings: ReadinessBlocker[] = readiness.warnings.map((w) => ({
    code: w.code,
    message_pl: w.message_pl,
    severity: 'WARNING' as const,
    elementId: w.element_id,
    fixAction: fixActionMap.get(w.code),
  }));

  // Collect affected element IDs (sorted for determinism)
  const affectedElementIds = [
    ...blockers.filter((b) => b.elementId).map((b) => b.elementId!),
    ...warnings.filter((w) => w.elementId).map((w) => w.elementId!),
  ];
  affectedElementIds.sort();

  const canRunAnalysis = blockers.length === 0;
  const summary_pl = canRunAnalysis
    ? warnings.length > 0
      ? `Uwagi: ${warnings.length} (analiza możliwa)`
      : 'Model gotowy do analizy'
    : `Blokady: ${blockers.length} — uzupełnij dane`;

  return {
    blockers,
    warnings,
    canRunAnalysis,
    affectedElementIds,
    summary_pl,
  };
}

/**
 * Get fix action for a specific readiness code.
 *
 * @param state - Current readiness state
 * @param code - Readiness code to look up
 * @returns Fix action or undefined
 */
export function getFixAction(
  state: ReadinessState,
  code: string,
): ReadinessFixAction | undefined {
  const blocker = state.blockers.find((b) => b.code === code);
  if (blocker?.fixAction) return blocker.fixAction;
  const warning = state.warnings.find((w) => w.code === code);
  return warning?.fixAction;
}

/**
 * Check if a specific element has readiness issues.
 *
 * @param state - Current readiness state
 * @param elementId - Element to check
 * @returns True if element has blockers or warnings
 */
export function hasReadinessIssue(
  state: ReadinessState,
  elementId: string,
): boolean {
  return state.affectedElementIds.includes(elementId);
}
