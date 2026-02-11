/**
 * Fault Scenario Store — PR-19 (Zustand)
 *
 * State management for fault scenarios.
 * Deterministic sorting. Polish error messages.
 * No heuristics. No default physical values.
 */

import { create } from 'zustand';
import type {
  FaultScenario,
  CreateFaultScenarioRequest,
} from './types';
import * as api from './api';

interface FaultScenarioStore {
  // Data
  studyCaseId: string | null;
  scenarios: FaultScenario[];
  selectedScenarioId: string | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;

  // Error
  error: string | null;

  // Actions
  setStudyCaseId: (studyCaseId: string) => void;
  loadScenarios: (studyCaseId: string) => Promise<void>;
  createScenario: (
    studyCaseId: string,
    request: CreateFaultScenarioRequest
  ) => Promise<FaultScenario>;
  deleteScenario: (scenarioId: string) => Promise<boolean>;
  selectScenario: (scenarioId: string | null) => void;
  clearError: () => void;
}

export const useFaultScenarioStore = create<FaultScenarioStore>(
  (set, get) => ({
    // Initial state
    studyCaseId: null,
    scenarios: [],
    selectedScenarioId: null,
    isLoading: false,
    isCreating: false,
    isDeleting: false,
    error: null,

    setStudyCaseId: (studyCaseId) => {
      set({ studyCaseId });
      get().loadScenarios(studyCaseId);
    },

    loadScenarios: async (studyCaseId) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.listFaultScenarios(studyCaseId);
        set({ scenarios: response.scenarios, isLoading: false });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Błąd ładowania scenariuszy';
        set({ error: message, isLoading: false });
      }
    },

    createScenario: async (studyCaseId, request) => {
      set({ isCreating: true, error: null });
      try {
        const scenario = await api.createFaultScenario(
          studyCaseId,
          request
        );
        // Reload to get deterministic sorted list
        const { studyCaseId: currentCaseId } = get();
        if (currentCaseId) {
          await get().loadScenarios(currentCaseId);
        }
        set({ isCreating: false });
        return scenario;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Błąd tworzenia scenariusza';
        set({ error: message, isCreating: false });
        throw err;
      }
    },

    deleteScenario: async (scenarioId) => {
      set({ isDeleting: true, error: null });
      try {
        await api.deleteFaultScenario(scenarioId);
        const { studyCaseId, selectedScenarioId } = get();
        if (studyCaseId) {
          await get().loadScenarios(studyCaseId);
        }
        if (selectedScenarioId === scenarioId) {
          set({ selectedScenarioId: null });
        }
        set({ isDeleting: false });
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Błąd usuwania scenariusza';
        set({ error: message, isDeleting: false });
        return false;
      }
    },

    selectScenario: (scenarioId) => {
      set({ selectedScenarioId: scenarioId });
    },

    clearError: () => set({ error: null }),
  })
);
