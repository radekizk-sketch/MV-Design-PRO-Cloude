/**
 * Reference Patterns Store — Wzorce odniesienia
 *
 * Zustand store for managing reference patterns UI state.
 * READ-ONLY: No mutations of backend data, only UI state management.
 */

import { create } from 'zustand';
import type {
  PatternMetadata,
  FixtureMetadata,
  PatternRunResult,
  ReferencePatternsTab,
} from './types';
import {
  fetchPatterns,
  fetchPatternFixtures,
  runPatternWithFixture,
} from './api';

// =============================================================================
// Store State Interface
// =============================================================================

interface ReferencePatternsState {
  // Patterns list
  patterns: PatternMetadata[];
  selectedPatternId: string | null;
  isLoadingPatterns: boolean;

  // Fixtures list
  fixtures: FixtureMetadata[];
  selectedFixtureId: string | null;
  isLoadingFixtures: boolean;

  // Pattern run result
  runResult: PatternRunResult | null;
  isRunningPattern: boolean;
  runError: string | null;

  // Active tab
  activeTab: ReferencePatternsTab;

  // Trace search
  traceSearchQuery: string;

  // Actions
  loadPatterns: () => Promise<void>;
  selectPattern: (patternId: string) => void;
  loadFixtures: (patternId: string) => Promise<void>;
  selectFixture: (fixtureId: string) => void;
  runSelectedFixture: () => Promise<void>;
  runFixture: (fixtureFilename: string) => Promise<void>;
  setActiveTab: (tab: ReferencePatternsTab) => void;
  setTraceSearchQuery: (query: string) => void;
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  patterns: [],
  selectedPatternId: null,
  isLoadingPatterns: false,
  fixtures: [],
  selectedFixtureId: null,
  isLoadingFixtures: false,
  runResult: null,
  isRunningPattern: false,
  runError: null,
  activeTab: 'WYNIK' as ReferencePatternsTab,
  traceSearchQuery: '',
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useReferencePatternsStore = create<ReferencePatternsState>((set, get) => ({
  ...initialState,

  loadPatterns: async () => {
    set({ isLoadingPatterns: true });
    try {
      const response = await fetchPatterns();
      set({
        patterns: response.patterns,
        isLoadingPatterns: false,
      });

      // Auto-select first pattern if available
      if (response.patterns.length > 0 && !get().selectedPatternId) {
        const firstPatternId = response.patterns[0].pattern_id;
        set({ selectedPatternId: firstPatternId });
        get().loadFixtures(firstPatternId);
      }
    } catch (error) {
      console.error('Failed to load patterns:', error);
      set({ isLoadingPatterns: false });
    }
  },

  selectPattern: (patternId) => {
    set({
      selectedPatternId: patternId,
      selectedFixtureId: null,
      fixtures: [],
      runResult: null,
      runError: null,
    });
    get().loadFixtures(patternId);
  },

  loadFixtures: async (patternId) => {
    set({ isLoadingFixtures: true });
    try {
      const response = await fetchPatternFixtures(patternId);
      set({
        fixtures: response.fixtures,
        isLoadingFixtures: false,
      });
    } catch (error) {
      console.error('Failed to load fixtures:', error);
      set({ isLoadingFixtures: false, fixtures: [] });
    }
  },

  selectFixture: (fixtureId) => {
    set({
      selectedFixtureId: fixtureId,
      runResult: null,
      runError: null,
    });
  },

  runSelectedFixture: async () => {
    const { selectedFixtureId, fixtures } = get();
    if (!selectedFixtureId) return;

    const fixture = fixtures.find((f) => f.fixture_id === selectedFixtureId);
    if (!fixture) return;

    await get().runFixture(fixture.filename);
  },

  runFixture: async (fixtureFilename) => {
    set({ isRunningPattern: true, runError: null });
    try {
      const result = await runPatternWithFixture(fixtureFilename);
      set({
        runResult: result,
        isRunningPattern: false,
        activeTab: 'WYNIK',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      console.error('Failed to run pattern:', error);
      set({
        runResult: null,
        isRunningPattern: false,
        runError: errorMessage,
      });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setTraceSearchQuery: (query) => set({ traceSearchQuery: query }),

  reset: () => set(initialState),
}));

// =============================================================================
// Selector Hooks
// =============================================================================

export function useIsLoading() {
  return useReferencePatternsStore(
    (state) =>
      state.isLoadingPatterns ||
      state.isLoadingFixtures ||
      state.isRunningPattern
  );
}

export function useSelectedPattern() {
  return useReferencePatternsStore((state) => {
    if (!state.selectedPatternId) return null;
    return state.patterns.find((p) => p.pattern_id === state.selectedPatternId) ?? null;
  });
}

export function useSelectedFixture() {
  return useReferencePatternsStore((state) => {
    if (!state.selectedFixtureId) return null;
    return state.fixtures.find((f) => f.fixture_id === state.selectedFixtureId) ?? null;
  });
}

export function useFilteredTrace() {
  return useReferencePatternsStore((state) => {
    if (!state.runResult) return [];
    const { trace } = state.runResult;
    const { traceSearchQuery } = state;

    if (!traceSearchQuery) return trace;

    const lowerQuery = traceSearchQuery.toLowerCase();
    return trace.filter(
      (step) =>
        step.step.toLowerCase().includes(lowerQuery) ||
        step.description_pl.toLowerCase().includes(lowerQuery)
    );
  });
}
