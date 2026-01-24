/**
 * DesignerPage
 *
 * CANONICAL FLOW: project → case → snapshot → actions → run
 *
 * Composes SnapshotView, ActionsList, ActionResult.
 * Minimal orchestration: fetch data, pass to views.
 * No business logic. No interpretation.
 *
 * snapshotId is OPTIONAL:
 * - If not provided: show neutral message, no API calls
 * - If provided: load snapshot and actions per canonical flow
 */

import { useCallback, useEffect, useState } from 'react';

import type { ActionItem, ActionRunResult, Snapshot } from './types';
import { ApiError, fetchActions, fetchSnapshot, runAction } from './api';
import { SnapshotView } from './SnapshotView';
import { ActionsList } from './ActionsList';
import { ActionResult } from './ActionResult';
import { DesignerWizard, type WizardStep, type WizardStatus } from './DesignerWizard';

interface Props {
  snapshotId?: string;
}

/**
 * Format API error for display.
 * Shows HTTP status code and detail from API response.
 */
function formatError(e: unknown): string {
  if (e instanceof ApiError) {
    return `HTTP ${e.status} ${e.statusText} [${e.endpoint}]: ${e.detail ?? 'No detail'}`;
  }
  return e instanceof Error ? e.message : String(e);
}

const wizardStepDefinitions = [
  { stepNumber: 1, title: 'INICJALIZACJA PROJEKTU', actionTypes: [] },
  { stepNumber: 2, title: 'DEFINICJA ŹRÓDŁA ZASILANIA (GPZ)', actionTypes: ['add_source'] },
  {
    stepNumber: 3,
    title: 'BUDOWA TOPOLOGII SIECI',
    actionTypes: ['add_line', 'add_station', 'add_transformer'],
  },
  {
    stepNumber: 4,
    title: 'WERYFIKACJA KOMPLETNOŚCI DANYCH',
    actionTypes: [],
  },
  { stepNumber: 5, title: 'OBLICZENIA ZWARCIOWE', actionTypes: ['run_short_circuit'] },
  { stepNumber: 6, title: 'OBLICZENIA ROZPŁYWU MOCY', actionTypes: ['run_power_flow'] },
  { stepNumber: 7, title: 'ODBIORY I ŹRÓDŁA OZE', actionTypes: ['add_load', 'add_generator'] },
  {
    stepNumber: 8,
    title: 'PCC – PUNKT WSPÓLNEGO PRZYŁĄCZENIA',
    actionTypes: ['set_pcc'],
  },
  {
    stepNumber: 9,
    title: 'ZABEZPIECZENIA I SELEKTYWNOŚĆ',
    actionTypes: ['run_analysis'],
  },
  { stepNumber: 10, title: 'WALIDACJA KOŃCOWA', actionTypes: [] },
  {
    stepNumber: 11,
    title: 'DOKUMENTACJA',
    actionTypes: ['export_docx', 'export_pdf', 'export_json'],
  },
];

const rejectedStatuses = new Set(['REJECTED', 'rejected']);

function formatBlockedReason(reason: { code: string; description: string } | null): string | null {
  if (!reason) return null;
  return `code: ${reason.code}\ndescription: ${reason.description}`;
}

function formatActionResultReason(result: ActionRunResult): string | null {
  if (!rejectedStatuses.has(result.status)) return null;
  if ('reason' in result && result.reason) {
    return formatBlockedReason(result.reason);
  }
  if ('errors' in result && result.errors && result.errors.length > 0) {
    return result.errors
      .map((err) => `code: ${err.code}\nmessage: ${err.message}${err.path ? `\npath: ${err.path}` : ''}`)
      .join('\n\n');
  }
  return null;
}

function mapActionStatus(status: 'ALLOWED' | 'BLOCKED'): WizardStatus {
  return status === 'ALLOWED' ? 'ALLOW' : 'BLOCK';
}

function buildWizardSteps(
  snapshot: Snapshot | null,
  actions: ActionItem[] | null,
  actionResult: ActionRunResult | null,
  snapshotError: string | null,
): WizardStep[] {
  return wizardStepDefinitions.map((definition) => {
    if (definition.stepNumber === 1) {
      const status: WizardStatus = snapshot ? 'ALLOW' : snapshotError ? 'BLOCK' : 'WARNING';
      const reason = snapshotError ? snapshotError : null;
      return {
        stepNumber: definition.stepNumber,
        title: definition.title,
        status,
        reason,
      };
    }

    const matchingAction = actions?.find((action) =>
      definition.actionTypes.includes(action.action_type.toLowerCase()),
    );

    if (!matchingAction) {
      return {
        stepNumber: definition.stepNumber,
        title: definition.title,
        status: 'WARNING',
        reason: null,
      };
    }

    const resultReason = actionResult && actionResult.action_id === matchingAction.action_id
      ? formatActionResultReason(actionResult)
      : null;

    return {
      stepNumber: definition.stepNumber,
      title: definition.title,
      status: mapActionStatus(matchingAction.status),
      reason: resultReason ?? formatBlockedReason(matchingAction.blocked_reason),
    };
  });
}

export function DesignerPage({ snapshotId }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [actions, setActions] = useState<ActionItem[] | null>(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);

  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ActionRunResult | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!snapshotId) {
      setSnapshot(null);
      return;
    }
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const data = await fetchSnapshot(snapshotId);
      setSnapshot(data);
    } catch (e) {
      setSnapshotError(formatError(e));
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }, [snapshotId]);

  const loadActions = useCallback(async () => {
    // Actions are ONLY fetched when snapshot is active
    if (!snapshotId) {
      setActions(null);
      return;
    }
    setActionsLoading(true);
    setActionsError(null);
    try {
      const data = await fetchActions(snapshotId);
      setActions(data);
    } catch (e) {
      setActionsError(formatError(e));
      setActions(null);
    } finally {
      setActionsLoading(false);
    }
  }, [snapshotId]);

  const handleRunAction = useCallback(async (actionId: string) => {
    if (!snapshotId) return;
    setRunningAction(actionId);
    setActionResult(null);
    try {
      const result = await runAction(snapshotId, actionId);
      setActionResult(result);
      // After success: refresh snapshot and actions
      await loadSnapshot();
      await loadActions();
    } catch (e) {
      // Display HTTP error as rejection
      setActionResult({
        action_id: actionId,
        status: 'REJECTED',
        reason: {
          code: e instanceof ApiError ? `http_${e.status}` : 'network_error',
          description: formatError(e),
        },
      });
    } finally {
      setRunningAction(null);
    }
  }, [snapshotId, loadSnapshot, loadActions]);

  const handleRefresh = useCallback(() => {
    if (!snapshotId) return;
    loadSnapshot();
    loadActions();
  }, [snapshotId, loadSnapshot, loadActions]);

  // Load snapshot when snapshotId changes
  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Load actions only after snapshot is available
  useEffect(() => {
    if (snapshot) {
      loadActions();
    }
  }, [snapshot, loadActions]);

  // No snapshot selected: show neutral message
  if (!snapshotId) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Designer</h1>
          <div className="p-4 border rounded bg-white text-gray-500">
            No active snapshot selected.
          </div>
        </div>
      </div>
    );
  }

  const wizardSteps = buildWizardSteps(snapshot, actions, actionResult, snapshotError);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Designer</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">
              snapshot: {snapshotId}
            </span>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-4">
          <DesignerWizard steps={wizardSteps} />
        </div>

        {actionResult && (
          <div className="mb-4">
            <ActionResult
              result={actionResult}
              onDismiss={() => setActionResult(null)}
            />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <SnapshotView
            snapshot={snapshot}
            loading={snapshotLoading}
            error={snapshotError}
          />
          {/* Actions are ONLY shown when snapshot is active */}
          {snapshot ? (
            <ActionsList
              actions={actions}
              loading={actionsLoading}
              error={actionsError}
              onRunAction={handleRunAction}
              runningAction={runningAction}
            />
          ) : (
            <div className="p-4 border rounded bg-white text-gray-500">
              Actions available only when snapshot is active.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
