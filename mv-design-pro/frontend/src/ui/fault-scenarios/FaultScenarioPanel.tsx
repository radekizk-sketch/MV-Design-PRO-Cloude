/**
 * FaultScenarioPanel — PR-19 → PR-24 compat
 *
 * Main container panel for fault scenario management.
 * Integrates ScenarioList and CreateScenarioModal.
 *
 * NOTE: This component is retained for backward compatibility.
 * PR-24 primary panel is FaultScenariosPanel.tsx.
 *
 * All labels in Polish. No project codenames.
 * Deterministic display order.
 */

import { useState, useCallback, useEffect } from 'react';
import { useFaultScenariosStore } from './store';
import { ScenarioList } from './ScenarioList';
import { CreateScenarioModal } from './CreateScenarioModal';
import type { CreateFaultScenarioRequest } from './types';

interface FaultScenarioPanelProps {
  studyCaseId: string;
  onScenarioSelected?: (scenarioId: string) => void;
}

export function FaultScenarioPanel({
  studyCaseId,
  onScenarioSelected,
}: FaultScenarioPanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    scenarios,
    selectedScenarioId,
    isLoading,
    error,
    loadScenarios,
    createScenario,
    deleteScenario,
    selectScenario,
    clearError,
  } = useFaultScenariosStore();

  useEffect(() => {
    loadScenarios(studyCaseId);
  }, [studyCaseId, loadScenarios]);

  const handleSelect = useCallback(
    (scenarioId: string) => {
      selectScenario(scenarioId);
      onScenarioSelected?.(scenarioId);
    },
    [selectScenario, onScenarioSelected]
  );

  const handleCreate = useCallback(
    async (request: CreateFaultScenarioRequest) => {
      await createScenario(studyCaseId, request);
    },
    [studyCaseId, createScenario]
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Scenariusze zwarcia</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600"
        >
          Nowy scenariusz
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded text-sm">
          {error}
          <button
            onClick={clearError}
            className="ml-2 underline text-xs"
          >
            Zamknij
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-500 p-4 text-center">
          Ładowanie scenariuszy...
        </div>
      ) : (
        <ScenarioList
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelect={handleSelect}
          onDelete={deleteScenario}
          isDeleting={isLoading}
        />
      )}

      {!isLoading && scenarios.length > 0 && (
        <div className="mt-3 text-xs text-gray-400 text-right">
          {scenarios.length}{' '}
          {scenarios.length === 1 ? 'scenariusz' : 'scenariuszy'}
        </div>
      )}

      {showCreateModal && (
        <CreateScenarioModal
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
          isCreating={isLoading}
        />
      )}
    </div>
  );
}
