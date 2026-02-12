/**
 * ScenarioList — PR-19
 *
 * Displays fault scenarios for a study case in deterministic order.
 * All labels in Polish. No project codenames. No heuristics.
 */

import React, { useState, useCallback } from 'react';
import type { FaultScenario } from './types';
import {
  FAULT_TYPE_LABELS,
  LOCATION_TYPE_LABELS,
  FAULT_TYPE_BG_COLORS,
  FAULT_TYPE_COLORS,
} from './types';

interface ScenarioListProps {
  scenarios: FaultScenario[];
  selectedScenarioId: string | null;
  onSelect: (scenarioId: string) => void;
  onDelete: (scenarioId: string) => Promise<boolean>;
  isDeleting: boolean;
}

export function ScenarioList({
  scenarios,
  selectedScenarioId,
  onSelect,
  onDelete,
  isDeleting,
}: ScenarioListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (scenarioId: string) => {
      const success = await onDelete(scenarioId);
      if (success) {
        setDeleteConfirmId(null);
      }
    },
    [onDelete]
  );

  if (scenarios.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 text-center">
        Brak scenariuszy zwarcia. Utwórz nowy scenariusz.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scenarios.map((scenario) => {
        const isSelected = selectedScenarioId === scenario.scenario_id;
        const bgColor = FAULT_TYPE_BG_COLORS[scenario.fault_type];

        return (
          <div
            key={scenario.scenario_id}
            className={`p-3 border rounded cursor-pointer transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : `border-gray-200 hover:border-gray-400 ${bgColor}`
            }`}
            onClick={() => onSelect(scenario.scenario_id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    FAULT_TYPE_COLORS[scenario.fault_type]
                  }`}
                >
                  {FAULT_TYPE_LABELS[scenario.fault_type]}
                </span>
              </div>

              {deleteConfirmId !== scenario.scenario_id ? (
                <button
                  className="text-xs text-gray-400 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(scenario.scenario_id);
                  }}
                  title="Usuń scenariusz"
                >
                  Usuń
                </button>
              ) : (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="text-xs bg-red-500 text-white px-2 py-0.5 rounded"
                    disabled={isDeleting}
                    onClick={() => handleDelete(scenario.scenario_id)}
                  >
                    {isDeleting ? 'Usuwanie...' : 'Potwierdź'}
                  </button>
                  <button
                    className="text-xs bg-gray-300 text-gray-700 px-2 py-0.5 rounded"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Anuluj
                  </button>
                </div>
              )}
            </div>

            <div className="mt-1 text-xs text-gray-600">
              <span>
                {LOCATION_TYPE_LABELS[scenario.location.location_type]}:{' '}
                <strong>{scenario.location.element_ref}</strong>
              </span>
              {scenario.location.position !== null && (
                <span className="ml-2">
                  Pozycja: {scenario.location.position.toFixed(2)}
                </span>
              )}
            </div>

            <div className="mt-1 text-xs text-gray-400 font-mono">
              {scenario.content_hash.slice(0, 12)}...
            </div>
          </div>
        );
      })}
    </div>
  );
}
