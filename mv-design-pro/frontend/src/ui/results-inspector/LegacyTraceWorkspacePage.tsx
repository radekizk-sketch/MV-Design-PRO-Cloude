/**
 * LegacyTraceWorkspacePage — Wrapper exposing ResultsInspectorPage under
 * the legacy route alias used by the #proof hash route.
 *
 * Named "Legacy" because the Results Inspector will eventually be superseded
 * by the canonical Results Workspace (ResultsWorkspacePage).  Until then,
 * this re-export under the new module path keeps routing clean.
 *
 * BINDING: No physics. Read-only view.
 */

import { ResultsInspectorPage } from './ResultsInspectorPage';

export interface LegacyTraceWorkspacePageProps {
  runId?: string;
}

export function LegacyTraceWorkspacePage({ runId }: LegacyTraceWorkspacePageProps) {
  return <ResultsInspectorPage runId={runId} />;
}
