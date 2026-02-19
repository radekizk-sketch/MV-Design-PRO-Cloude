/**
 * CDSE Operation Executor — executes domain operations through backend.
 *
 * Pipeline:
 *   validate(payload) → POST ENM_OP → DomainOpResponse
 *   → updateSnapshot() → updateLogicalViews() → selectionSync()
 *   → readinessSync() → overlayUpdater()
 *
 * INVARIANTS:
 * - NO manual graph mutations
 * - NO manual ReactFlow node additions
 * - All changes flow through DomainOpResponse
 * - Deterministic: same payload → same result
 */

/**
 * Domain operation payload — sent to backend.
 */
export interface DomainOpPayload {
  /** Canonical operation name */
  operation: string;
  /** Operation-specific parameters */
  params: Record<string, unknown>;
  /** Snapshot base hash for optimistic consistency check */
  snapshotBaseHash?: string;
}

/**
 * Domain operation response from backend — V1 contract.
 */
export interface DomainOpResponse {
  /** New snapshot after operation */
  snapshot: unknown;
  /** Updated LogicalViews */
  logicalViews: unknown;
  /** Readiness state after operation */
  readiness: {
    blockers: Array<{ code: string; message_pl: string; severity: string }>;
    warnings: Array<{ code: string; message_pl: string }>;
  };
  /** Fix actions available */
  fixActions: Array<{
    code: string;
    action_type: string;
    modal_type?: string;
    label_pl: string;
  }>;
  /** Selection hint for UI sync */
  selectionHint: {
    elementId: string;
    action: 'SELECT' | 'FOCUS' | 'EXPAND';
  } | null;
  /** Domain events generated */
  domainEvents: Array<{ type: string; elementId: string }>;
  /** Materialized parameters (solver fields copied from catalog) */
  materializedParams: Record<string, unknown>;
  /** Audit trail entry */
  auditTrail: {
    operation: string;
    timestamp: string;
    snapshotHashBefore: string;
    snapshotHashAfter: string;
  };
}

/**
 * Execution result — wraps response with metadata.
 */
export interface ExecutionResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Response from backend (if success) */
  response?: DomainOpResponse;
  /** Error message (if failure) */
  error?: string;
  /** Error code (if failure) */
  errorCode?: string;
}

/**
 * Callbacks for post-operation pipeline stages.
 */
export interface ExecutionCallbacks {
  /** Update snapshot store with new snapshot */
  updateSnapshot: (snapshot: unknown, logicalViews: unknown) => void;
  /** Sync selection based on hint */
  syncSelection: (hint: DomainOpResponse['selectionHint']) => void;
  /** Update readiness panel */
  syncReadiness: (readiness: DomainOpResponse['readiness'], fixActions: DomainOpResponse['fixActions']) => void;
  /** Trigger overlay refresh */
  refreshOverlay: () => void;
  /** Show error to user */
  showError: (message: string) => void;
}

/**
 * Execute a domain operation through the CDSE pipeline.
 *
 * This is the SINGLE entry point for all model-mutating operations.
 * Components MUST NOT call backend directly.
 *
 * @param payload - Operation payload
 * @param postToBackend - Function to POST to ENM endpoint
 * @param callbacks - Post-operation pipeline callbacks
 * @returns ExecutionResult
 */
export async function executeOperation(
  payload: DomainOpPayload,
  postToBackend: (payload: DomainOpPayload) => Promise<DomainOpResponse>,
  callbacks: ExecutionCallbacks,
): Promise<ExecutionResult> {
  try {
    // 1. Execute on backend
    const response = await postToBackend(payload);

    // 2. Pipeline: update stores in order
    callbacks.updateSnapshot(response.snapshot, response.logicalViews);

    // 3. Selection sync
    if (response.selectionHint) {
      callbacks.syncSelection(response.selectionHint);
    }

    // 4. Readiness sync
    callbacks.syncReadiness(response.readiness, response.fixActions);

    // 5. Overlay refresh (invalidate current overlay since model changed)
    callbacks.refreshOverlay();

    return { success: true, response };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany błąd operacji';
    callbacks.showError(message);
    return { success: false, error: message };
  }
}

/**
 * Validate payload before sending to backend.
 *
 * Client-side validation for immediate feedback.
 * Backend performs authoritative validation.
 *
 * @param payload - Operation payload to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validatePayload(payload: DomainOpPayload): string[] {
  const errors: string[] = [];

  if (!payload.operation) {
    errors.push('Brak nazwy operacji');
  }

  if (!payload.params || typeof payload.params !== 'object') {
    errors.push('Brak parametrów operacji');
  }

  return errors;
}
