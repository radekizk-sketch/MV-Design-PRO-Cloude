/**
 * resolveElementSelection — Utility for resolving an ENM element ref
 * to a typed SelectedElement for the selection store.
 *
 * CANONICAL ALIGNMENT:
 * - No physics, no mutations.
 * - Deterministic: same snapshot + same id → same result.
 */

import type { EnergyNetworkModel } from '../../types/enm';
import type { ElementType, SelectedElement } from '../types';

/**
 * Map ENM branch.type discriminant to UI ElementType.
 */
function branchTypeToElementType(branchType: string): ElementType {
  switch (branchType) {
    case 'line_overhead':
    case 'cable':
      return 'LineBranch';
    case 'switch':
    case 'breaker':
    case 'bus_coupler':
    case 'disconnector':
      return 'Switch';
    case 'fuse':
      return 'Switch';
    default:
      return 'LineBranch';
  }
}

/**
 * Resolve an element reference (string ID) to a SelectedElement from
 * the given ENM snapshot.  Returns null when not found so callers can
 * decide whether to keep the current selection unchanged.
 *
 * @param snapshot  Current ENM snapshot (may be null when not yet loaded).
 * @param elementId ID of the element to resolve.
 * @param fallbackName Optional display name used when the element is not
 *                     found in the snapshot (e.g. from results index).
 */
export function resolveSelectedElementFromSnapshot(
  snapshot: EnergyNetworkModel | null,
  elementId: string,
  fallbackName?: string,
): SelectedElement | null {
  if (!elementId) return null;

  if (!snapshot) {
    if (!fallbackName) return null;
    return { id: elementId, type: 'Bus', name: fallbackName };
  }

  // Buses
  const bus = snapshot.buses.find((b) => b.id === elementId || b.ref_id === elementId);
  if (bus) return { id: bus.id, type: 'Bus', name: bus.name };

  // Branches (lines, cables, switches)
  const branch = snapshot.branches.find((b) => b.id === elementId || b.ref_id === elementId);
  if (branch) {
    return { id: branch.id, type: branchTypeToElementType(branch.type), name: branch.name };
  }

  // Transformers
  const transformer = snapshot.transformers.find(
    (t) => t.id === elementId || t.ref_id === elementId,
  );
  if (transformer) return { id: transformer.id, type: 'TransformerBranch', name: transformer.name };

  // Sources
  const source = snapshot.sources.find((s) => s.id === elementId || s.ref_id === elementId);
  if (source) return { id: source.id, type: 'Source', name: source.name };

  // Loads
  const load = snapshot.loads.find((l) => l.id === elementId || l.ref_id === elementId);
  if (load) return { id: load.id, type: 'Load', name: load.name };

  // Generators
  const generator = snapshot.generators.find((g) => g.id === elementId || g.ref_id === elementId);
  if (generator) return { id: generator.id, type: 'Generator', name: generator.name };

  // Substations (Stations)
  const substation = snapshot.substations.find(
    (s) => s.id === elementId || s.ref_id === elementId,
  );
  if (substation) return { id: substation.id, type: 'Station', name: substation.name };

  // Bays
  const bay = snapshot.bays.find((b) => b.id === elementId || b.ref_id === elementId);
  if (bay) return { id: bay.id, type: 'BaySN', name: bay.name };

  // Fallback: element not found in snapshot
  if (fallbackName) {
    return { id: elementId, type: 'Bus', name: fallbackName };
  }

  return null;
}
