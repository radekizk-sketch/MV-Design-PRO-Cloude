/**
 * DesignerPage
 *
 * CANONICAL FLOW: project → case → snapshot → actions → run
 *
 * Composes SnapshotView, ActionsList, ActionResult.
 * Minimal orchestration: fetch data, pass to views.
 * No business logic. No interpretation.
 *
 * REQUIRES: snapshotId prop - actions are ONLY available when snapshot is active.
 */

import { useCallback, useEffect, useState } from 'react';

import type { ActionItem, ActionRunResult, Snapshot } from './types';
import { ApiError, fetchActions, fetchSnapshot, runAction } from './api';
import { SnapshotView } from './SnapshotView';
import { ActionsList } from './ActionsList';
import { ActionResult } from './ActionResult';

interface Props {
  snapshotId: string;
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
    loadSnapshot();
    loadActions();
  }, [loadSnapshot, loadActions]);

  // Load snapshot first, then load actions only after snapshot is available
  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    // Actions are ONLY visible when snapshot is loaded
    if (snapshot) {
      loadActions();
    }
  }, [snapshot, loadActions]);

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
