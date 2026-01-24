/**
 * DesignerPage
 *
 * Composes ProjectStateView, ActionsList, ActionResult.
 * Minimal orchestration: fetch data, pass to views.
 * No business logic. No interpretation.
 */

import { useCallback, useEffect, useState } from 'react';

import type { ActionItem, ActionRunResult, ActionType, ProjectState } from './types';
import { fetchActions, fetchProjectState, runAction } from './api';
import { ProjectStateView } from './ProjectStateView';
import { ActionsList } from './ActionsList';
import { ActionResult } from './ActionResult';

export function DesignerPage() {
  const [state, setState] = useState<ProjectState | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  const [actions, setActions] = useState<ActionItem[] | null>(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);

  const [runningAction, setRunningAction] = useState<ActionType | null>(null);
  const [actionResult, setActionResult] = useState<ActionRunResult | null>(null);

  const loadState = useCallback(async () => {
    setStateLoading(true);
    setStateError(null);
    try {
      const data = await fetchProjectState();
      setState(data);
    } catch (e) {
      setStateError(e instanceof Error ? e.message : String(e));
    } finally {
      setStateLoading(false);
    }
  }, []);

  const loadActions = useCallback(async () => {
    setActionsLoading(true);
    setActionsError(null);
    try {
      const data = await fetchActions();
      setActions(data);
    } catch (e) {
      setActionsError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionsLoading(false);
    }
  }, []);

  const handleRunAction = useCallback(async (actionType: ActionType) => {
    setRunningAction(actionType);
    setActionResult(null);
    try {
      const result = await runAction(actionType);
      setActionResult(result);
      await loadState();
      await loadActions();
    } catch (e) {
      setActionResult({
        action_type: actionType,
        status: 'REJECTED',
        reason: {
          code: 'network_error',
          description: e instanceof Error ? e.message : String(e),
        },
      });
    } finally {
      setRunningAction(null);
    }
  }, [loadState, loadActions]);

  const handleRefresh = useCallback(() => {
    loadState();
    loadActions();
  }, [loadState, loadActions]);

  useEffect(() => {
    loadState();
    loadActions();
  }, [loadState, loadActions]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Designer</h1>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Refresh
          </button>
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
          <ProjectStateView
            state={state}
            loading={stateLoading}
            error={stateError}
          />
          <ActionsList
            actions={actions}
            loading={actionsLoading}
            error={actionsError}
            onRunAction={handleRunAction}
            runningAction={runningAction}
          />
        </div>
      </div>
    </div>
  );
}
