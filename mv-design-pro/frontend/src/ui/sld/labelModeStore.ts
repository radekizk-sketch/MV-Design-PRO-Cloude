/**
 * Label Mode Store — §8 UX 10/10
 *
 * Zustand store for SLD label display mode.
 *
 * MODES:
 * - MINIMALNY: Basic names and states only
 * - TECHNICZNY: Cable lengths, types, loading percentages
 * - ANALITYCZNY: Impedances, power directions, protection settings
 *
 * INVARIANTS:
 * - Mode persisted across navigation
 * - No model mutations
 * - Deterministic rendering
 */

import { create } from 'zustand';
import type { LabelMode } from './sldLabelLayer';

interface LabelModeState {
  mode: LabelMode;
  visible: boolean;
  setMode: (mode: LabelMode) => void;
  setVisible: (visible: boolean) => void;
  toggleVisible: () => void;
  cycleMode: () => void;
}

const MODE_ORDER: LabelMode[] = ['MINIMALNY', 'TECHNICZNY', 'ANALITYCZNY'];

export const useLabelModeStore = create<LabelModeState>()((set, get) => ({
  mode: 'TECHNICZNY',
  visible: true,

  setMode: (mode: LabelMode) => set({ mode }),

  setVisible: (visible: boolean) => set({ visible }),

  toggleVisible: () => set((s) => ({ visible: !s.visible })),

  cycleMode: () => {
    const current = get().mode;
    const idx = MODE_ORDER.indexOf(current);
    const next = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
    set({ mode: next });
  },
}));

export function useLabelMode(): LabelMode {
  return useLabelModeStore((s) => s.mode);
}

export function useLabelsVisible(): boolean {
  return useLabelModeStore((s) => s.visible);
}
