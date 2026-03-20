/**
 * useNetworkTreeElements — zasilenie drzewa projektu danymi z ENM snapshot.
 *
 * Czyta model sieci z snapshotStore i mapuje na format oczekiwany
 * przez ProjectTree (PowerFactoryLayout.treeElements).
 *
 * DETERMINISTIC: wynik posortowany po ref_id.
 * CANONICAL: brak fizyki, brak mutacji — pure read.
 */

import { useMemo } from 'react';
import { useSnapshotStore } from './snapshotStore';

interface NetworkElement {
  id: string;
  name: string;
  element_type: string;
  in_service?: boolean;
  branch_type?: 'LINE' | 'CABLE';
}

export interface NetworkTreeElements {
  buses: NetworkElement[];
  lines: NetworkElement[];
  cables: NetworkElement[];
  transformers: NetworkElement[];
  switches: NetworkElement[];
  sources: NetworkElement[];
  loads: NetworkElement[];
}

/**
 * Hook that derives tree elements from the ENM snapshot in snapshotStore.
 * Returns sorted, deterministic arrays for each element category.
 */
export function useNetworkTreeElements(): NetworkTreeElements {
  const snapshot = useSnapshotStore((state) => state.snapshot);

  return useMemo(() => {
    if (!snapshot) {
      return {
        buses: [],
        lines: [],
        cables: [],
        transformers: [],
        switches: [],
        sources: [],
        loads: [],
      };
    }

    const buses: NetworkElement[] = (snapshot.buses ?? [])
      .map((b) => ({
        id: b.ref_id,
        name: b.name,
        element_type: 'Bus',
        in_service: true,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const lines: NetworkElement[] = (snapshot.branches ?? [])
      .filter((br) => br.type === 'line_overhead')
      .map((br) => ({
        id: br.ref_id,
        name: br.name,
        element_type: 'Line',
        in_service: br.status === 'closed',
        branch_type: 'LINE' as const,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const cables: NetworkElement[] = (snapshot.branches ?? [])
      .filter((br) => br.type === 'cable')
      .map((br) => ({
        id: br.ref_id,
        name: br.name,
        element_type: 'Cable',
        in_service: br.status === 'closed',
        branch_type: 'CABLE' as const,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const switches: NetworkElement[] = (snapshot.branches ?? [])
      .filter((br) =>
        br.type === 'switch' ||
        br.type === 'breaker' ||
        br.type === 'bus_coupler' ||
        br.type === 'disconnector' ||
        br.type === 'fuse',
      )
      .map((br) => ({
        id: br.ref_id,
        name: br.name,
        element_type: 'Switch',
        in_service: br.status === 'closed',
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const transformers: NetworkElement[] = (snapshot.transformers ?? [])
      .map((tr) => ({
        id: tr.ref_id,
        name: tr.name,
        element_type: 'Transformer2W',
        in_service: true,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const sources: NetworkElement[] = [
      ...(snapshot.sources ?? []).map((s) => ({
        id: s.ref_id,
        name: s.name,
        element_type: 'Source',
        in_service: true,
      })),
      ...(snapshot.generators ?? []).map((g) => ({
        id: g.ref_id,
        name: g.name,
        element_type: 'Generator',
        in_service: true,
      })),
    ].sort((a, b) => a.id.localeCompare(b.id));

    const loads: NetworkElement[] = (snapshot.loads ?? [])
      .map((l) => ({
        id: l.ref_id,
        name: l.name,
        element_type: 'Load',
        in_service: true,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return { buses, lines, cables, transformers, switches, sources, loads };
  }, [snapshot]);
}

/**
 * Hook that derives network statistics (counts) from the ENM snapshot.
 * Used by StatusBar for real-time element counts.
 */
export function useNetworkStats(): { nodeCount: number; branchCount: number } {
  const snapshot = useSnapshotStore((state) => state.snapshot);

  return useMemo(() => {
    if (!snapshot) return { nodeCount: 0, branchCount: 0 };
    return {
      nodeCount: (snapshot.buses ?? []).length,
      branchCount:
        (snapshot.branches ?? []).length + (snapshot.transformers ?? []).length,
    };
  }, [snapshot]);
}
