/**
 * SLD Overlay Store — PR-16 Zustand State Management
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 * - SYSTEM_SPEC.md: Overlay = pure projection of ResultSet
 *
 * STATE:
 * - activeRunId: Currently loaded run (null = no overlay)
 * - overlay: Full OverlayPayloadV1 from backend
 * - enabled: Toggle for overlay visibility
 *
 * INVARIANTS:
 * - NO physics calculations
 * - NO interpretation of results
 * - NO model mutations
 * - Store is a pure data holder + visibility toggle
 * - Clearing overlay resets ALL state to initial
 * - Loading new overlay replaces ALL previous state
 */

import { create } from 'zustand';
import type { OverlayPayloadV1 } from './overlayTypes';

/**
 * Overlay store state interface.
 */
interface OverlayStoreState {
  /** Currently active run ID (null = no overlay loaded) */
  activeRunId: string | null;

  /** Full overlay payload from backend (null = not loaded) */
  overlay: OverlayPayloadV1 | null;

  /** Whether overlay is visually enabled/visible */
  enabled: boolean;

  /**
   * Load overlay payload for a specific run.
   * Replaces any existing overlay completely.
   */
  loadOverlay: (payload: OverlayPayloadV1) => void;

  /**
   * Clear all overlay state.
   * Resets to initial (no overlay, no run).
   */
  clearOverlay: () => void;

  /**
   * Toggle overlay visibility.
   * If forced is provided, sets to that value.
   */
  toggleOverlay: (forced?: boolean) => void;
}

/**
 * Initial state values.
 */
const initialState = {
  activeRunId: null as string | null,
  overlay: null as OverlayPayloadV1 | null,
  enabled: true,
};

/**
 * Zustand store for SLD Overlay Runtime.
 *
 * USAGE:
 * - loadOverlay(): Feed payload from backend API response
 * - clearOverlay(): Reset when switching runs/projects
 * - toggleOverlay(): User toggle for visibility
 */
export const useOverlayStore = create<OverlayStoreState>((set) => ({
  ...initialState,

  loadOverlay: (payload) => {
    set({
      activeRunId: payload.run_id,
      overlay: payload,
      enabled: true,
    });
  },

  clearOverlay: () => {
    set(initialState);
  },

  toggleOverlay: (forced) => {
    set((state) => ({
      enabled: forced !== undefined ? forced : !state.enabled,
    }));
  },
}));
