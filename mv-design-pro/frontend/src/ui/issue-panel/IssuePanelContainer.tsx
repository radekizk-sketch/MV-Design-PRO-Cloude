/**
 * Issue Panel Container — P30d
 *
 * Container for Issue Panel with data fetching and navigation logic.
 *
 * Features:
 * - Fetch issues from API (GET /api/issues/study-cases/{case_id}/issues)
 * - Navigate to object on click (Tree + SLD highlight)
 * - Mode gating (MODEL_EDIT / RESULT_VIEW)
 */

import React, { useEffect, useState } from 'react';
import { IssuePanel } from './IssuePanel';
import type { Issue, IssueSeverity, IssueSource } from '../types';
import { useSldEditorStore } from '../sld-editor/SldEditorStore';
import { useAppStateStore } from '../app-state/store';

// =============================================================================
// API Client
// =============================================================================

interface IssuesResponse {
  issues: Issue[];
  total_count: number;
  by_severity: Record<IssueSeverity, number>;
  by_source: Record<IssueSource, number>;
}

async function fetchIssues(caseId: string): Promise<IssuesResponse> {
  const response = await fetch(`/api/issues/study-cases/${caseId}/issues`);
  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }
  return response.json();
}

// =============================================================================
// Container Component
// =============================================================================

export interface IssuePanelContainerProps {
  caseId: string | null;
}

export const IssuePanelContainer: React.FC<IssuePanelContainerProps> = ({ caseId }) => {
  const [issuesData, setIssuesData] = useState<IssuesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sldStore = useSldEditorStore();
  const activeMode = useAppStateStore((state) => state.activeMode);

  // Fetch issues when case changes
  useEffect(() => {
    if (!caseId) {
      setIssuesData(null);
      return;
    }

    let cancelled = false;

    const loadIssues = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchIssues(caseId);
        if (!cancelled) {
          setIssuesData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIssuesData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadIssues();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  /**
   * Handle issue click: navigate to object and highlight on SLD.
   */
  const handleIssueClick = (issue: Issue) => {
    if (!issue.object_ref) return;

    const { id, type } = issue.object_ref;

    // Highlight on SLD with severity-based color
    sldStore.highlightSymbols([id], issue.severity);

    // TODO: Navigate to object in Tree
    // This would use a ProjectTree API to expand and select the node
    // For now, just highlight on SLD

    // In RESULT_VIEW, show info that editing is not allowed
    if (activeMode === 'RESULT_VIEW') {
      console.info('RESULT_VIEW: Edycja elementu niedostępna w trybie przeglądania wyników.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-gray-500">Ładowanie problemów...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-red-600">Błąd: {error}</div>
      </div>
    );
  }

  // No case selected
  if (!caseId || !issuesData) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-gray-500 text-sm text-center">
          Wybierz przypadek obliczeniowy<br />aby zobaczyć problemy.
        </div>
      </div>
    );
  }

  return (
    <IssuePanel
      issues={issuesData.issues}
      bySeverity={issuesData.by_severity}
      bySource={issuesData.by_source}
      onIssueClick={handleIssueClick}
    />
  );
};
