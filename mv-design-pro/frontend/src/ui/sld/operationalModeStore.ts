/**
 * Operational Mode Store — §4 UX 10/10
 *
 * Globalny przełącznik trybu pracy SLD:
 *   [ Normalny ] [ Awaryjny ] [ Zwarcie ]
 *
 * TRYBY:
 * - NORMALNY: Standardowy overlay rozpływu. Kliknięcia = edycja/selekcja.
 * - AWARYJNY: Klik elementu = toggle out-of-service. Natychmiastowy przelicznik.
 *             Overlay aktualizowany po każdej zmianie.
 * - ZWARCIE:  Klik węzła = wybór miejsca zwarcia. Wybór typu zwarcia (3F/2F/1F).
 *             Overlay Ik'', ip, Ith.
 *
 * INVARIANTS:
 * - Przełączanie bez reload
 * - Mode-aware overlay rendering
 * - Deterministic mode transitions
 * - All labels Polish
 * - No model mutations from store (delegated to CDSE pipeline)
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export type OperationalMode = 'NORMALNY' | 'AWARYJNY' | 'ZWARCIE';

export const OPERATIONAL_MODE_LABELS: Record<OperationalMode, string> = {
  NORMALNY: 'Normalny',
  AWARYJNY: 'Awaryjny',
  ZWARCIE: 'Zwarcie',
};

export const OPERATIONAL_MODE_DESCRIPTIONS: Record<OperationalMode, string> = {
  NORMALNY: 'Standardowy widok z overlayem rozpływu mocy',
  AWARYJNY: 'Kliknij element aby wyłączyć z eksploatacji — natychmiastowy przelicznik',
  ZWARCIE: 'Kliknij węzeł aby wskazać miejsce zwarcia — analiza Ik″, ip, Ith',
};

export type FaultType = 'SC_3F' | 'SC_2F' | 'SC_1F' | 'SC_2F_RF';

export const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  SC_3F: 'Zwarcie trójfazowe (3F)',
  SC_2F: 'Zwarcie dwufazowe (2F)',
  SC_1F: 'Zwarcie jednofazowe (1F)',
  SC_2F_RF: 'Zwarcie 2F z impedancją zwarcia',
};

/**
 * SC overlay result type — which value to show.
 */
export type ScOverlayField = 'IK_PP' | 'IP' | 'ITH' | 'IDYN';

export const SC_OVERLAY_LABELS: Record<ScOverlayField, string> = {
  IK_PP: 'Ik″ — prąd zwarciowy początkowy',
  IP: 'ip — prąd udarowy',
  ITH: 'Ith — prąd cieplny (termiczny)',
  IDYN: 'Idyn — prąd dynamiczny',
};

// =============================================================================
// Store Interface
// =============================================================================

interface OperationalModeState {
  // Current mode
  mode: OperationalMode;

  // Fault mode state
  selectedFaultType: FaultType;
  selectedFaultBusId: string | null;
  scOverlayField: ScOverlayField;

  // Emergency mode state
  pendingOutOfServiceIds: string[];
  emergencyRecalcPending: boolean;

  // Actions
  setMode: (mode: OperationalMode) => void;
  setFaultType: (ft: FaultType) => void;
  selectFaultBus: (busId: string | null) => void;
  setScOverlayField: (field: ScOverlayField) => void;
  toggleOutOfService: (elementId: string) => void;
  clearOutOfServicePending: () => void;
  setEmergencyRecalcPending: (pending: boolean) => void;
  reset: () => void;
}

// =============================================================================
// Store
// =============================================================================

export const useOperationalModeStore = create<OperationalModeState>()((set, get) => ({
  // Defaults
  mode: 'NORMALNY',
  selectedFaultType: 'SC_3F',
  selectedFaultBusId: null,
  scOverlayField: 'IK_PP',
  pendingOutOfServiceIds: [],
  emergencyRecalcPending: false,

  setMode: (mode: OperationalMode) => {
    set({
      mode,
      // Reset mode-specific state on switch
      selectedFaultBusId: null,
      pendingOutOfServiceIds: [],
      emergencyRecalcPending: false,
    });
  },

  setFaultType: (ft: FaultType) => {
    set({ selectedFaultType: ft });
  },

  selectFaultBus: (busId: string | null) => {
    set({ selectedFaultBusId: busId });
  },

  setScOverlayField: (field: ScOverlayField) => {
    set({ scOverlayField: field });
  },

  toggleOutOfService: (elementId: string) => {
    const { pendingOutOfServiceIds } = get();
    if (pendingOutOfServiceIds.includes(elementId)) {
      set({
        pendingOutOfServiceIds: pendingOutOfServiceIds.filter((id) => id !== elementId),
        emergencyRecalcPending: true,
      });
    } else {
      set({
        pendingOutOfServiceIds: [...pendingOutOfServiceIds, elementId],
        emergencyRecalcPending: true,
      });
    }
  },

  clearOutOfServicePending: () => {
    set({ pendingOutOfServiceIds: [], emergencyRecalcPending: false });
  },

  setEmergencyRecalcPending: (pending: boolean) => {
    set({ emergencyRecalcPending: pending });
  },

  reset: () => {
    set({
      mode: 'NORMALNY',
      selectedFaultType: 'SC_3F',
      selectedFaultBusId: null,
      scOverlayField: 'IK_PP',
      pendingOutOfServiceIds: [],
      emergencyRecalcPending: false,
    });
  },
}));

// =============================================================================
// Derived Selectors
// =============================================================================

export function useOperationalMode(): OperationalMode {
  return useOperationalModeStore((s) => s.mode);
}

export function useIsNormalMode(): boolean {
  return useOperationalModeStore((s) => s.mode === 'NORMALNY');
}

export function useIsEmergencyMode(): boolean {
  return useOperationalModeStore((s) => s.mode === 'AWARYJNY');
}

export function useIsFaultMode(): boolean {
  return useOperationalModeStore((s) => s.mode === 'ZWARCIE');
}

export function useSelectedFaultBus(): string | null {
  return useOperationalModeStore((s) => s.selectedFaultBusId);
}
