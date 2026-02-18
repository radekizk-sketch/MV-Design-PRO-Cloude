/**
 * Protection Engine v1 — Zustand Store (PR-26)
 *
 * State management for relay configuration, test points, and results.
 * READ-ONLY results (no mutations of backend data).
 *
 * INVARIANTS:
 * - No heuristics, no auto-defaults
 * - Deterministic serialization of input
 * - 100% PL labels
 */

import { create } from 'zustand';
import type {
  RelayV1,
  TestPoint,
  ProtectionResultSetV1,
  ExecuteProtectionResponse,
  ValidationResponse,
} from './types';

// =============================================================================
// State Interface
// =============================================================================

interface ProtectionEngineV1State {
  // Relay configuration
  relays: RelayV1[];
  addRelay: (relay: RelayV1) => void;
  removeRelay: (relayId: string) => void;
  updateRelay: (relayId: string, updates: Partial<RelayV1>) => void;

  // Test points
  testPoints: TestPoint[];
  addTestPoint: (point: TestPoint) => void;
  removeTestPoint: (pointId: string) => void;
  updateTestPoint: (pointId: string, updates: Partial<TestPoint>) => void;

  // Results
  result: ProtectionResultSetV1 | null;
  inputHash: string | null;
  isExecuting: boolean;
  executeError: string | null;

  // Validation
  validation: ValidationResponse | null;
  isValidating: boolean;

  // Actions
  execute: () => Promise<void>;
  validate: () => Promise<void>;
  clearResults: () => void;
  reset: () => void;
}

// =============================================================================
// API Calls
// =============================================================================

const API_BASE = '/api/protection-engine/v1';

async function apiExecute(
  relays: RelayV1[],
  testPoints: TestPoint[],
): Promise<ExecuteProtectionResponse> {
  const response = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relays, test_points: testPoints }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Blad HTTP ${response.status}`);
  }
  return response.json();
}

async function apiValidate(
  relays: RelayV1[],
  testPoints: TestPoint[],
): Promise<ValidationResponse> {
  const response = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relays, test_points: testPoints }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Blad HTTP ${response.status}`);
  }
  return response.json();
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  relays: [] as RelayV1[],
  testPoints: [] as TestPoint[],
  result: null as ProtectionResultSetV1 | null,
  inputHash: null as string | null,
  isExecuting: false,
  executeError: null as string | null,
  validation: null as ValidationResponse | null,
  isValidating: false,
};

// =============================================================================
// Store
// =============================================================================

export const useProtectionEngineV1Store = create<ProtectionEngineV1State>(
  (set, get) => ({
    ...initialState,

    addRelay: (relay) =>
      set((state) => ({ relays: [...state.relays, relay] })),

    removeRelay: (relayId) =>
      set((state) => ({
        relays: state.relays.filter((r) => r.relay_id !== relayId),
      })),

    updateRelay: (relayId, updates) =>
      set((state) => ({
        relays: state.relays.map((r) =>
          r.relay_id === relayId ? { ...r, ...updates } : r,
        ),
      })),

    addTestPoint: (point) =>
      set((state) => ({ testPoints: [...state.testPoints, point] })),

    removeTestPoint: (pointId) =>
      set((state) => ({
        testPoints: state.testPoints.filter((tp) => tp.point_id !== pointId),
      })),

    updateTestPoint: (pointId, updates) =>
      set((state) => ({
        testPoints: state.testPoints.map((tp) =>
          tp.point_id === pointId ? { ...tp, ...updates } : tp,
        ),
      })),

    execute: async () => {
      const { relays, testPoints } = get();
      set({ isExecuting: true, executeError: null });
      try {
        const response = await apiExecute(relays, testPoints);
        set({
          result: response.result,
          inputHash: response.input_hash,
          isExecuting: false,
        });
      } catch (error) {
        set({
          executeError:
            error instanceof Error ? error.message : 'Nieznany blad',
          isExecuting: false,
        });
      }
    },

    validate: async () => {
      const { relays, testPoints } = get();
      set({ isValidating: true });
      try {
        const validation = await apiValidate(relays, testPoints);
        set({ validation, isValidating: false });
      } catch (error) {
        set({
          validation: {
            valid: false,
            issues: [
              {
                code: 'validation.error',
                message_pl:
                  error instanceof Error ? error.message : 'Blad walidacji',
                severity: 'BLOCKER',
              },
            ],
            issue_count: 1,
          },
          isValidating: false,
        });
      }
    },

    clearResults: () => set({ result: null, inputHash: null, executeError: null }),

    reset: () => set(initialState),
  }),
);
