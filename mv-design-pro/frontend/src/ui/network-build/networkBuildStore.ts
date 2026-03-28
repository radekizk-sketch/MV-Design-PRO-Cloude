/**
 * Network Build Store — Zustand store dla procesu budowy sieci SN.
 *
 * KANONICZNA ROLA:
 * - Derywuje stan budowy z istniejącego snapshotStore (ZERO duplikacji danych)
 * - Zarządza aktywnym formularzem operacji domenowej
 * - Zapewnia selektory dla ProcessPanel, ReadinessBar, ActiveTerminals
 *
 * DETERMINIZM:
 * - Ten sam snapshot → ten sam buildPhase, te same listy
 * - Sortowanie po id na każdym etapie
 *
 * BINDING: 100% PL etykiety, brak kodów projektowych.
 */

import { create } from 'zustand';
import { useSnapshotStore } from '../topology/snapshotStore';
import type {
  EnergyNetworkModel,
  LogicalViewsV1,
  ReadinessInfo,
  TerminalRef,
} from '../../types/enm';
import type { CanonicalOpName } from '../../types/domainOps';

// =============================================================================
// Types
// =============================================================================

/** Faza budowy sieci — deterministycznie obliczana ze snapshot. */
export type BuildPhase =
  | 'NO_SOURCE'        // Brak źródła zasilania
  | 'HAS_SOURCE'       // Źródło zdefiniowane, brak magistral
  | 'HAS_TRUNKS'       // Magistrale istnieją, brak stacji
  | 'HAS_STATIONS'     // Stacje osadzone
  | 'READY';           // Gotowość do analizy

/** Aktywny formularz operacji domenowej. */
export type ActiveOperationForm =
  | null
  | { op: 'add_grid_source_sn'; context?: Record<string, unknown> }
  | { op: 'continue_trunk_segment_sn'; context?: Record<string, unknown> }
  | { op: 'insert_station_on_segment_sn'; context?: Record<string, unknown> }
  | { op: 'insert_branch_pole_on_segment_sn'; context?: Record<string, unknown> }
  | { op: 'insert_zksn_on_segment_sn'; context?: Record<string, unknown> }
  | { op: 'start_branch_segment_sn'; context?: Record<string, unknown> }
  | { op: 'insert_section_switch_sn'; context?: Record<string, unknown> }
  | { op: 'connect_secondary_ring_sn'; context?: Record<string, unknown> }
  | { op: 'set_normal_open_point'; context?: Record<string, unknown> }
  | { op: 'add_transformer_sn_nn'; context?: Record<string, unknown> }
  | { op: 'add_pv_inverter_nn'; context?: Record<string, unknown> }
  | { op: 'add_bess_inverter_nn'; context?: Record<string, unknown> }
  | { op: 'assign_catalog_to_element'; context?: Record<string, unknown> }
  | { op: 'update_element_parameters'; context?: Record<string, unknown> };

/** Aktywny widok karty obiektu. */
export type ActiveObjectCard =
  | null
  | { kind: 'source'; elementId: string }
  | { kind: 'trunk'; corridorRef: string }
  | { kind: 'station'; elementId: string }
  | { kind: 'line_segment'; elementId: string }
  | { kind: 'transformer'; elementId: string }
  | { kind: 'switch'; elementId: string }
  | { kind: 'bay'; elementId: string }
  | { kind: 'nn_switchgear'; elementId: string }
  | { kind: 'renewable_source'; elementId: string };

/** Port odgałęźny wolny do użycia. */
export interface AvailableBranchPort {
  stationId: string;
  stationName: string;
  bayId: string;
  bayRole: string;
  busRef: string;
}

/** Para terminali kandydujących do ringu. */
export interface RingCandidate {
  terminalA: TerminalRef;
  terminalB: TerminalRef;
}

/** Podsumowanie stacji dla ProcessPanel. */
export interface StationSummary {
  id: string;
  name: string;
  stationType: string;
  trunkRef: string | null;
  hasTransformer: boolean;
  hasNnPart: boolean;
  freeBranchPorts: number;
  readinessOk: boolean;
}

/** Podsumowanie transformatora. */
export interface TransformerSummary {
  id: string;
  name: string;
  stationRef: string | null;
  stationName: string | null;
  catalogRef: string | null;
  snKva: number;
  ukPercent: number;
}

/** Podsumowanie źródła OZE/BESS. */
export interface OzeSourceSummary {
  id: string;
  name: string;
  genType: string;
  stationRef: string | null;
  pMw: number;
  connectionVariant: string | null;
  hasTransformer: boolean;
}

// =============================================================================
// Store State
// =============================================================================

export interface NetworkBuildState {
  /** Aktywny formularz operacji. */
  activeOperationForm: ActiveOperationForm;
  /** Aktywna karta obiektu (modal). */
  activeObjectCard: ActiveObjectCard;
  /** Zwinięte sekcje w ProcessPanel. */
  collapsedSections: Set<string>;

  // Actions
  setActiveOperationForm: (form: ActiveOperationForm) => void;
  openOperationForm: (op: CanonicalOpName, context?: Record<string, unknown>) => void;
  closeOperationForm: () => void;
  setActiveObjectCard: (card: ActiveObjectCard) => void;
  closeObjectCard: () => void;
  toggleSection: (sectionId: string) => void;
  reset: () => void;
}

// =============================================================================
// Store
// =============================================================================

export const useNetworkBuildStore = create<NetworkBuildState>((set) => ({
  activeOperationForm: null,
  activeObjectCard: null,
  collapsedSections: new Set<string>(),

  setActiveOperationForm: (form) => set({ activeOperationForm: form }),

  openOperationForm: (op, context) =>
    set({ activeOperationForm: { op, context } as ActiveOperationForm }),

  closeOperationForm: () => set({ activeOperationForm: null }),

  setActiveObjectCard: (card) => set({ activeObjectCard: card }),

  closeObjectCard: () => set({ activeObjectCard: null }),

  toggleSection: (sectionId) =>
    set((state) => {
      const next = new Set(state.collapsedSections);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return { collapsedSections: next };
    }),

  reset: () =>
    set({
      activeOperationForm: null,
      activeObjectCard: null,
      collapsedSections: new Set<string>(),
    }),
}));

// =============================================================================
// Pure Selectors (derived from snapshotStore — NO local state duplication)
// =============================================================================

/**
 * Oblicza fazę budowy sieci na podstawie snapshot.
 * Deterministyczne: ten sam snapshot → ta sama faza.
 */
export function computeBuildPhase(
  snapshot: EnergyNetworkModel | null,
  logicalViews: LogicalViewsV1 | null,
  readiness: ReadinessInfo | null,
): BuildPhase {
  if (!snapshot) return 'NO_SOURCE';
  if (snapshot.sources.length === 0) return 'NO_SOURCE';

  const hasTrunks = (logicalViews?.trunks?.length ?? 0) > 0;
  if (!hasTrunks) return 'HAS_SOURCE';

  const hasStations = (snapshot.substations?.length ?? 0) > 0;
  if (!hasStations) return 'HAS_TRUNKS';

  if (readiness?.ready) return 'READY';

  return 'HAS_STATIONS';
}

/**
 * Zwraca otwarte terminale magistral — punkty kontynuacji.
 * Sortowane deterministycznie po element_id.
 */
export function selectOpenTerminals(logicalViews: LogicalViewsV1 | null): TerminalRef[] {
  if (!logicalViews?.terminals) return [];
  return logicalViews.terminals
    .filter((t) => t.status === 'OTWARTY')
    .sort((a, b) => a.element_id.localeCompare(b.element_id));
}

/**
 * Zwraca terminale zarezerwowane pod ring.
 */
export function selectRingReservedTerminals(logicalViews: LogicalViewsV1 | null): TerminalRef[] {
  if (!logicalViews?.terminals) return [];
  return logicalViews.terminals
    .filter((t) => t.status === 'ZAREZERWOWANY_DLA_RINGU')
    .sort((a, b) => a.element_id.localeCompare(b.element_id));
}

/**
 * Zwraca wolne porty odgałęźne z stacji (Bay role=ODG bez powiązanych branches).
 */
export function selectAvailableBranchPorts(
  snapshot: EnergyNetworkModel | null,
  logicalViews: LogicalViewsV1 | null,
): AvailableBranchPort[] {
  if (!snapshot) return [];

  // Zbierz bus_ref_ids używane jako from_element w branches
  const usedBusRefs = new Set<string>();
  for (const branch of logicalViews?.branches ?? []) {
    usedBusRefs.add(branch.from_element_id);
  }

  const result: AvailableBranchPort[] = [];
  for (const bay of snapshot.bays ?? []) {
    if (bay.bay_role !== 'OUT' && bay.bay_role !== 'FEEDER' && bay.bay_role !== 'OZE') continue;

    // Sprawdź czy port już użyty
    if (usedBusRefs.has(bay.bus_ref)) continue;

    const station = snapshot.substations?.find((s) => s.id === bay.substation_ref);
    if (!station) continue;

    result.push({
      stationId: station.id,
      stationName: station.name,
      bayId: bay.id,
      bayRole: bay.bay_role,
      busRef: bay.bus_ref,
    });
  }

  return result.sort((a, b) => a.stationId.localeCompare(b.stationId));
}

/**
 * Zwraca pary kandydatów do domknięcia ringu.
 * Para: dwa otwarte terminale na różnych trunk_id o tym samym napięciu.
 */
export function selectRingCandidates(
  snapshot: EnergyNetworkModel | null,
  logicalViews: LogicalViewsV1 | null,
): RingCandidate[] {
  if (!snapshot || !logicalViews) return [];

  const openTerminals = selectOpenTerminals(logicalViews);
  if (openTerminals.length < 2) return [];

  // Buduj mapę bus → voltage
  const busVoltage = new Map<string, number>();
  for (const bus of snapshot.buses ?? []) {
    busVoltage.set(bus.ref_id, bus.voltage_kv);
  }

  const candidates: RingCandidate[] = [];
  for (let i = 0; i < openTerminals.length; i++) {
    for (let j = i + 1; j < openTerminals.length; j++) {
      const a = openTerminals[i];
      const b = openTerminals[j];

      // Muszą być na różnych trunk'ach lub przynajmniej różnych gałęziach
      if (a.trunk_id && b.trunk_id && a.trunk_id === b.trunk_id) continue;

      // Sprawdź zgodność napięciową
      const vA = busVoltage.get(a.element_id);
      const vB = busVoltage.get(b.element_id);
      if (vA !== undefined && vB !== undefined && vA === vB) {
        candidates.push({ terminalA: a, terminalB: b });
      }
    }
  }

  return candidates;
}

/**
 * Zwraca podsumowania stacji dla ProcessPanel.
 */
export function selectStationSummaries(
  snapshot: EnergyNetworkModel | null,
  readiness: ReadinessInfo | null,
): StationSummary[] {
  if (!snapshot) return [];

  const blockerElements = new Set<string>();
  for (const b of readiness?.blockers ?? []) {
    if (b.element_ref) blockerElements.add(b.element_ref);
  }

  return (snapshot.substations ?? [])
    .map((s) => {
      const stationBays = (snapshot.bays ?? []).filter((b) => b.substation_ref === s.id);
      const branchBays = stationBays.filter(
        (b) => b.bay_role === 'OUT' || b.bay_role === 'FEEDER' || b.bay_role === 'OZE',
      );
      const hasTransformer = s.transformer_refs.length > 0;
      const nnBuses = (snapshot.buses ?? []).filter(
        (bus) => bus.voltage_kv < 1 && s.bus_refs.includes(bus.ref_id),
      );

      return {
        id: s.id,
        name: s.name,
        stationType: s.station_type,
        trunkRef: null,
        hasTransformer,
        hasNnPart: nnBuses.length > 0,
        freeBranchPorts: branchBays.length,
        readinessOk: !blockerElements.has(s.id),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Zwraca podsumowania transformatorów.
 */
export function selectTransformerSummaries(
  snapshot: EnergyNetworkModel | null,
): TransformerSummary[] {
  if (!snapshot) return [];

  return (snapshot.transformers ?? [])
    .map((t) => {
      const station = (snapshot.substations ?? []).find((s) =>
        s.transformer_refs.includes(t.ref_id),
      );

      return {
        id: t.ref_id,
        name: t.name,
        stationRef: station?.id ?? null,
        stationName: station?.name ?? null,
        catalogRef: t.catalog_ref ?? null,
        snKva: t.sn_mva * 1000,
        ukPercent: t.uk_percent,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Zwraca podsumowania źródeł OZE/BESS.
 */
export function selectOzeSourceSummaries(
  snapshot: EnergyNetworkModel | null,
): OzeSourceSummary[] {
  if (!snapshot) return [];

  return (snapshot.generators ?? [])
    .filter((g) =>
      g.gen_type === 'pv_inverter' ||
      g.gen_type === 'wind_inverter' ||
      g.gen_type === 'bess',
    )
    .map((g) => ({
      id: g.ref_id,
      name: g.name,
      genType: g.gen_type ?? 'unknown',
      stationRef: g.station_ref ?? null,
      pMw: g.p_mw,
      connectionVariant: g.connection_variant ?? null,
      hasTransformer: g.blocking_transformer_ref != null || g.connection_variant === 'nn_side',
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Zwraca liczbę blokerów per kategoria.
 */
export function selectBlockersByCategory(readiness: ReadinessInfo | null): {
  topologia: number;
  katalogi: number;
  eksploatacja: number;
  analiza: number;
  total: number;
} {
  const result = { topologia: 0, katalogi: 0, eksploatacja: 0, analiza: 0, total: 0 };
  if (!readiness?.blockers) return result;

  for (const b of readiness.blockers) {
    const code = b.code.toLowerCase();
    if (
      code.includes('topology') ||
      code.includes('island') ||
      code.includes('disconnected') ||
      code.includes('voltage_mismatch') ||
      code.includes('grounding') ||
      code.includes('isolated')
    ) {
      result.topologia++;
    } else if (
      code.includes('catalog') ||
      code.includes('missing_type') ||
      code.includes('no_catalog') ||
      code.includes('impedance') ||
      code.includes('zero_seq') ||
      code.includes('missing_rating')
    ) {
      result.katalogi++;
    } else if (
      code.includes('switch_state') ||
      code.includes('nop') ||
      code.includes('normal_state') ||
      code.includes('coupler') ||
      code.includes('tap_position') ||
      code.includes('operating')
    ) {
      result.eksploatacja++;
    } else {
      result.analiza++;
    }
    result.total++;
  }

  return result;
}

/**
 * Etykieta PL fazy budowy.
 */
export function buildPhaseLabel(phase: BuildPhase): string {
  switch (phase) {
    case 'NO_SOURCE':
      return 'Brak źródła zasilania';
    case 'HAS_SOURCE':
      return 'Źródło zdefiniowane — dodaj magistrale';
    case 'HAS_TRUNKS':
      return 'Magistrale zbudowane — osadź stacje';
    case 'HAS_STATIONS':
      return 'Stacje osadzone — uzupełnij dane';
    case 'READY':
      return 'Gotowy do analizy';
  }
}

// =============================================================================
// Hook: useNetworkBuildDerived — derived data from snapshotStore
// =============================================================================

/**
 * Hook łączący dane ze snapshotStore w derywowane obiekty dla ProcessPanel.
 * Nie duplikuje danych — czyste selektory.
 */
export function useNetworkBuildDerived() {
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const logicalViews = useSnapshotStore((s) => s.logicalViews);
  const readiness = useSnapshotStore((s) => s.readiness);
  const fixActions = useSnapshotStore((s) => s.fixActions);

  const buildPhase = computeBuildPhase(snapshot, logicalViews, readiness);
  const openTerminals = selectOpenTerminals(logicalViews);
  const ringReservedTerminals = selectRingReservedTerminals(logicalViews);
  const availableBranchPorts = selectAvailableBranchPorts(snapshot, logicalViews);
  const ringCandidates = selectRingCandidates(snapshot, logicalViews);
  const stationSummaries = selectStationSummaries(snapshot, readiness);
  const transformerSummaries = selectTransformerSummaries(snapshot);
  const ozeSourceSummaries = selectOzeSourceSummaries(snapshot);
  const blockersByCategory = selectBlockersByCategory(readiness);

  return {
    buildPhase,
    buildPhaseLabel: buildPhaseLabel(buildPhase),
    snapshot,
    logicalViews,
    readiness,
    fixActions,
    openTerminals,
    ringReservedTerminals,
    availableBranchPorts,
    ringCandidates,
    stationSummaries,
    transformerSummaries,
    ozeSourceSummaries,
    blockersByCategory,
    sourceCount: snapshot?.sources?.length ?? 0,
    trunkCount: logicalViews?.trunks?.length ?? 0,
    branchCount: logicalViews?.branches?.length ?? 0,
    stationCount: snapshot?.substations?.length ?? 0,
    transformerCount: snapshot?.transformers?.length ?? 0,
    generatorCount: snapshot?.generators?.length ?? 0,
    isReady: readiness?.ready ?? false,
  };
}
