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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Designer</h1>
            <button
              onClick={handleRefresh}
              disabled={stateLoading || actionsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className={`w-4 h-4 ${stateLoading || actionsLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Action Result - displayed above the grid when present */}
        {actionResult && (
          <div className="mb-6">
            <ActionResult
              result={actionResult}
              onDismiss={() => setActionResult(null)}
            />
          </div>
        )}

        {/* Two-column layout on larger screens */}
        <div className="grid gap-6 lg:grid-cols-2">
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
      </main>
    </div>
  );
}
