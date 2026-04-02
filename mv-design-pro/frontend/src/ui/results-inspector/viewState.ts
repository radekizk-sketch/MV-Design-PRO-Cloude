import type { ResultsInspectorTab } from './types';

export function resolveResultsRunId(
  routeRunId: string | null | undefined,
  activeRunId: string | null | undefined,
): string | null {
  return routeRunId ?? activeRunId ?? null;
}

export function resolveAvailableResultsTabs(
  forcedTab: ResultsInspectorTab | undefined,
  hasShortCircuit: boolean,
): ResultsInspectorTab[] {
  if (forcedTab) {
    return [forcedTab];
  }

  const tabs: ResultsInspectorTab[] = ['BUSES', 'BRANCHES'];
  if (hasShortCircuit) {
    tabs.push('SHORT_CIRCUIT');
  }
  tabs.push('TRACE');
  return tabs;
}
