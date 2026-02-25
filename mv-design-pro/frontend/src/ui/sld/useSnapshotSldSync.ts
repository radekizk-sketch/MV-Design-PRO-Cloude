/**
 * useSnapshotSldSync — Syncs ENM snapshot to SLD editor symbols.
 *
 * When the snapshot in the SnapshotStore changes, this hook converts ENM
 * elements into SLD symbols using a deterministic auto-layout algorithm
 * and pushes them into the SLD editor store.
 *
 * DETERMINISM: Sorted by ref_id before layout, positions are pure functions
 * of index. Same snapshot always produces same SLD symbols.
 *
 * LAYER: Application (visualization) — NO physics.
 */

import { useEffect } from 'react';
import { useSnapshotStore } from '../topology/snapshotStore';
import { useSldEditorStore } from '../sld-editor/SldEditorStore';
import type { EnergyNetworkModel } from '../../types/enm';
import type { AnySldSymbol } from '../sld-editor/types';

/**
 * Deterministic auto-layout: converts ENM elements into positioned SLD symbols.
 *
 * Layout strategy:
 * - Buses on a horizontal line (y=300) with 200px spacing
 * - Sources above their connected bus (y - 120)
 * - Line/Cable branches midpoint between from_bus and to_bus
 * - Switch branches midpoint between from_bus and to_bus
 * - Transformers midpoint between hv_bus and lv_bus
 * - Loads below their connected bus (y + 120)
 *
 * All collections sorted by ref_id for determinism.
 */
function autoLayoutSymbols(enm: EnergyNetworkModel): AnySldSymbol[] {
  const symbols: AnySldSymbol[] = [];
  const busPositions = new Map<string, { x: number; y: number }>();

  // Sort buses deterministically by ref_id
  const sortedBuses = [...(enm.buses ?? [])].sort((a, b) =>
    a.ref_id.localeCompare(b.ref_id),
  );

  // Layout buses on a horizontal line with 200px spacing
  sortedBuses.forEach((bus, index) => {
    const x = 200 + index * 200;
    const y = 300;
    busPositions.set(bus.ref_id, { x, y });
    symbols.push({
      id: bus.ref_id,
      elementId: bus.ref_id,
      elementType: 'Bus',
      elementName: bus.name,
      position: { x, y },
      inService: true,
      width: 100,
      height: 10,
    } as AnySldSymbol);
  });

  // Sources above their connected bus
  const sortedSources = [...(enm.sources ?? [])].sort((a, b) =>
    a.ref_id.localeCompare(b.ref_id),
  );
  sortedSources.forEach((source) => {
    const busPos = busPositions.get(source.bus_ref) ?? { x: 200, y: 300 };
    symbols.push({
      id: source.ref_id,
      elementId: source.ref_id,
      elementType: 'Source',
      elementName: source.name,
      position: { x: busPos.x, y: busPos.y - 120 },
      inService: true,
      connectedToNodeId: source.bus_ref,
    } as AnySldSymbol);
  });

  // Branches between buses (line_overhead, cable, switch/breaker/disconnector/bus_coupler, fuse)
  const allBranches = [...(enm.branches ?? [])].sort((a, b) =>
    a.ref_id.localeCompare(b.ref_id),
  );
  allBranches.forEach((branch) => {
    const fromPos = busPositions.get(branch.from_bus_ref) ?? { x: 200, y: 300 };
    const toPos = busPositions.get(branch.to_bus_ref) ?? { x: 400, y: 300 };
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;

    const isSwitch =
      branch.type === 'switch' ||
      branch.type === 'breaker' ||
      branch.type === 'bus_coupler' ||
      branch.type === 'disconnector';

    if (isSwitch) {
      let switchType: 'BREAKER' | 'DISCONNECTOR' | 'LOAD_SWITCH' | 'FUSE' = 'DISCONNECTOR';
      if (branch.type === 'breaker') switchType = 'BREAKER';
      if (branch.type === 'bus_coupler') switchType = 'LOAD_SWITCH';

      symbols.push({
        id: branch.ref_id,
        elementId: branch.ref_id,
        elementType: 'Switch',
        elementName: branch.name,
        position: { x: midX, y: midY },
        inService: branch.status === 'closed',
        fromNodeId: branch.from_bus_ref,
        toNodeId: branch.to_bus_ref,
        switchState: branch.status === 'closed' ? 'CLOSED' : 'OPEN',
        switchType,
      } as AnySldSymbol);
    } else if (branch.type === 'fuse') {
      symbols.push({
        id: branch.ref_id,
        elementId: branch.ref_id,
        elementType: 'Switch',
        elementName: branch.name,
        position: { x: midX, y: midY },
        inService: branch.status === 'closed',
        fromNodeId: branch.from_bus_ref,
        toNodeId: branch.to_bus_ref,
        switchState: branch.status === 'closed' ? 'CLOSED' : 'OPEN',
        switchType: 'FUSE',
      } as AnySldSymbol);
    } else {
      // line_overhead or cable
      const branchType = branch.type === 'cable' ? 'CABLE' : 'LINE';
      symbols.push({
        id: branch.ref_id,
        elementId: branch.ref_id,
        elementType: 'LineBranch',
        elementName: branch.name,
        position: { x: midX, y: midY },
        inService: branch.status === 'closed',
        fromNodeId: branch.from_bus_ref,
        toNodeId: branch.to_bus_ref,
        points: [],
        branchType,
      } as AnySldSymbol);
    }
  });

  // Transformers between hv_bus and lv_bus
  const sortedTransformers = [...(enm.transformers ?? [])].sort((a, b) =>
    a.ref_id.localeCompare(b.ref_id),
  );
  sortedTransformers.forEach((tr) => {
    const fromPos = busPositions.get(tr.hv_bus_ref) ?? { x: 200, y: 300 };
    const toPos = busPositions.get(tr.lv_bus_ref) ?? { x: 400, y: 300 };
    symbols.push({
      id: tr.ref_id,
      elementId: tr.ref_id,
      elementType: 'TransformerBranch',
      elementName: tr.name,
      position: {
        x: (fromPos.x + toPos.x) / 2,
        y: (fromPos.y + toPos.y) / 2,
      },
      inService: true,
      fromNodeId: tr.hv_bus_ref,
      toNodeId: tr.lv_bus_ref,
      points: [],
    } as AnySldSymbol);
  });

  // Loads below their connected bus
  const sortedLoads = [...(enm.loads ?? [])].sort((a, b) =>
    a.ref_id.localeCompare(b.ref_id),
  );
  // Track per-bus load offset so multiple loads on the same bus spread horizontally
  const busLoadOffsets = new Map<string, number>();
  sortedLoads.forEach((load) => {
    const busPos = busPositions.get(load.bus_ref) ?? { x: 200, y: 300 };
    const offset = busLoadOffsets.get(load.bus_ref) ?? 0;
    busLoadOffsets.set(load.bus_ref, offset + 1);
    symbols.push({
      id: load.ref_id,
      elementId: load.ref_id,
      elementType: 'Load',
      elementName: load.name,
      position: { x: busPos.x + offset * 80 - 40, y: busPos.y + 120 },
      inService: true,
      connectedToNodeId: load.bus_ref,
    } as AnySldSymbol);
  });

  // Generators below their connected bus (offset further down)
  const sortedGenerators = [...(enm.generators ?? [])].sort((a, b) =>
    a.ref_id.localeCompare(b.ref_id),
  );
  const busGenOffsets = new Map<string, number>();
  sortedGenerators.forEach((gen) => {
    const busPos = busPositions.get(gen.bus_ref) ?? { x: 200, y: 300 };
    const offset = busGenOffsets.get(gen.bus_ref) ?? 0;
    busGenOffsets.set(gen.bus_ref, offset + 1);
    symbols.push({
      id: gen.ref_id,
      elementId: gen.ref_id,
      elementType: 'Generator',
      elementName: gen.name,
      position: { x: busPos.x + offset * 80 - 40, y: busPos.y + 200 },
      inService: true,
      connectedToNodeId: gen.bus_ref,
    } as AnySldSymbol);
  });

  return symbols;
}

/**
 * Hook: Sync ENM snapshot changes to SLD editor symbols.
 *
 * Watches the snapshot in useSnapshotStore. When the snapshot reference
 * changes and contains elements, runs the deterministic auto-layout
 * algorithm and pushes the resulting symbols into the SLD editor store.
 */
export function useSnapshotSldSync(): void {
  const snapshot = useSnapshotStore((state) => state.snapshot);

  useEffect(() => {
    if (!snapshot) return;

    const hasElements =
      (snapshot.buses?.length ?? 0) > 0 || (snapshot.sources?.length ?? 0) > 0;
    if (!hasElements) return;

    const symbols = autoLayoutSymbols(snapshot);
    if (symbols.length > 0) {
      useSldEditorStore.getState().setSymbols(symbols);
    }
  }, [snapshot]);
}
