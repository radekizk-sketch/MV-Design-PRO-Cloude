/**
 * FIX-04 — Voltage Profile Utilities
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Analysis layer (interpretation only, no physics)
 * - No physics calculations - only data transformation
 *
 * This module provides utilities for:
 * - Extracting feeders from network topology
 * - Calculating cumulative distances along feeders
 * - Building voltage profile data for visualization
 */

import type {
  Feeder,
  NetworkBranch,
  NetworkSnapshot,
  PowerFlowResultForProfile,
  ProfileDataPoint,
  VoltageViolationType,
} from './types';
import { DEFAULT_PROFILE_CONFIG } from './types';

// =============================================================================
// Violation Detection
// =============================================================================

/**
 * Check if voltage violates limits.
 *
 * @param v_pu Voltage in per unit
 * @param umin Minimum voltage limit [p.u.] (default 0.95)
 * @param umax Maximum voltage limit [p.u.] (default 1.05)
 * @returns Violation type or null if within limits
 */
export function checkVoltageViolation(
  v_pu: number,
  umin: number = DEFAULT_PROFILE_CONFIG.umin,
  umax: number = DEFAULT_PROFILE_CONFIG.umax
): VoltageViolationType {
  if (v_pu > umax) return 'OVERVOLTAGE';
  if (v_pu < umin) return 'UNDERVOLTAGE';
  return null;
}

/**
 * Calculate voltage deviation from nominal (1.0 p.u.).
 *
 * @param v_pu Voltage in per unit
 * @returns Deviation percentage (positive or negative)
 */
export function calculateDeviation(v_pu: number): number {
  return (v_pu - 1.0) * 100;
}

// =============================================================================
// Feeder Extraction
// =============================================================================

/**
 * Build adjacency map from branches.
 * Maps bus_id -> array of { branchId, neighborBusId }
 */
function buildAdjacencyMap(
  branches: NetworkBranch[]
): Map<string, Array<{ branchId: string; neighborBusId: string; lengthKm: number }>> {
  const adjacency = new Map<string, Array<{ branchId: string; neighborBusId: string; lengthKm: number }>>();

  for (const branch of branches) {
    // Skip transformers for feeder extraction (they connect different voltage levels)
    if (branch.branch_type === 'TRANSFORMER') continue;

    // Add forward direction
    if (!adjacency.has(branch.from_bus_id)) {
      adjacency.set(branch.from_bus_id, []);
    }
    adjacency.get(branch.from_bus_id)!.push({
      branchId: branch.id,
      neighborBusId: branch.to_bus_id,
      lengthKm: branch.length_km || 0,
    });

    // Add reverse direction
    if (!adjacency.has(branch.to_bus_id)) {
      adjacency.set(branch.to_bus_id, []);
    }
    adjacency.get(branch.to_bus_id)!.push({
      branchId: branch.id,
      neighborBusId: branch.from_bus_id,
      lengthKm: branch.length_km || 0,
    });
  }

  return adjacency;
}

/**
 * Find end nodes (buses with only one connection) in the network.
 */
function findEndNodes(
  adjacency: Map<string, Array<{ branchId: string; neighborBusId: string; lengthKm: number }>>,
  startBusId: string
): string[] {
  const endNodes: string[] = [];

  for (const [busId, neighbors] of adjacency.entries()) {
    // End node has exactly one neighbor and is not the start bus
    if (neighbors.length === 1 && busId !== startBusId) {
      endNodes.push(busId);
    }
  }

  return endNodes;
}

/**
 * Trace a path from start bus to end bus using BFS.
 * Returns the path as array of bus IDs and corresponding branch IDs.
 */
function tracePath(
  adjacency: Map<string, Array<{ branchId: string; neighborBusId: string; lengthKm: number }>>,
  startBusId: string,
  endBusId: string
): { busIds: string[]; branchIds: string[]; totalLengthKm: number } | null {
  const visited = new Set<string>();
  const parent = new Map<string, { busId: string; branchId: string }>();
  const queue: string[] = [startBusId];
  visited.add(startBusId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === endBusId) {
      // Reconstruct path
      const busIds: string[] = [];
      const branchIds: string[] = [];
      let totalLengthKm = 0;
      let node = current;

      while (node !== startBusId) {
        busIds.unshift(node);
        const parentInfo = parent.get(node)!;
        branchIds.unshift(parentInfo.branchId);

        // Get branch length
        const neighbors = adjacency.get(parentInfo.busId) || [];
        const edge = neighbors.find(n => n.branchId === parentInfo.branchId);
        if (edge) {
          totalLengthKm += edge.lengthKm;
        }

        node = parentInfo.busId;
      }
      busIds.unshift(startBusId);

      return { busIds, branchIds, totalLengthKm };
    }

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.neighborBusId)) {
        visited.add(neighbor.neighborBusId);
        parent.set(neighbor.neighborBusId, { busId: current, branchId: neighbor.branchId });
        queue.push(neighbor.neighborBusId);
      }
    }
  }

  return null;
}

/**
 * Extract feeders from network snapshot.
 *
 * A feeder is a radial path from a source bus to an end node.
 * This function identifies all such paths in the network.
 *
 * @param snapshot Network snapshot with buses and branches
 * @param sourceBusId Optional source bus ID (uses first bus if not provided)
 * @returns Array of feeder definitions
 */
export function extractFeeders(
  snapshot: NetworkSnapshot,
  sourceBusId?: string
): Feeder[] {
  if (snapshot.branches.length === 0 || snapshot.buses.length === 0) {
    return [];
  }

  // Build adjacency map (excluding transformers)
  const adjacency = buildAdjacencyMap(snapshot.branches);

  // Determine start bus
  const startBusId = sourceBusId || snapshot.buses[0]?.id;
  if (!startBusId || !adjacency.has(startBusId)) {
    // If start bus has no line/cable connections, try to find one with connections
    for (const bus of snapshot.buses) {
      if (adjacency.has(bus.id)) {
        return extractFeeders(snapshot, bus.id);
      }
    }
    return [];
  }

  // Find all end nodes
  const endNodes = findEndNodes(adjacency, startBusId);

  // Trace paths from start to each end node
  const feeders: Feeder[] = [];
  const busMap = new Map(snapshot.buses.map(b => [b.id, b]));

  for (let i = 0; i < endNodes.length; i++) {
    const endBusId = endNodes[i];
    const path = tracePath(adjacency, startBusId, endBusId);

    if (path && path.busIds.length > 1) {
      const endBus = busMap.get(endBusId);
      const startBus = busMap.get(startBusId);

      feeders.push({
        id: `feeder-${i + 1}`,
        name: `Feeder ${i + 1}: ${startBus?.name || startBusId} → ${endBus?.name || endBusId}`,
        startBusId,
        branchIds: path.branchIds,
        busIds: path.busIds,
        totalLengthKm: path.totalLengthKm,
      });
    }
  }

  return feeders;
}

// =============================================================================
// Profile Data Calculation
// =============================================================================

/**
 * Calculate voltage profile data for a feeder.
 *
 * @param feeder Feeder definition
 * @param pfResult Power flow result
 * @param snapshot Network snapshot
 * @param umin Minimum voltage limit [p.u.]
 * @param umax Maximum voltage limit [p.u.]
 * @returns Array of profile data points
 */
export function calculateProfileData(
  feeder: Feeder,
  pfResult: PowerFlowResultForProfile,
  snapshot: NetworkSnapshot,
  umin: number = DEFAULT_PROFILE_CONFIG.umin,
  umax: number = DEFAULT_PROFILE_CONFIG.umax
): ProfileDataPoint[] {
  const points: ProfileDataPoint[] = [];
  const busMap = new Map(snapshot.buses.map(b => [b.id, b]));
  const branchMap = new Map(snapshot.branches.map(b => [b.id, b]));
  const resultMap = new Map(pfResult.bus_results.map(r => [r.bus_id, r]));

  let cumulativeDistance = 0;

  for (let i = 0; i < feeder.busIds.length; i++) {
    const busId = feeder.busIds[i];
    const bus = busMap.get(busId);
    const result = resultMap.get(busId);

    if (!bus || !result) continue;

    // Add branch length for buses after the first
    if (i > 0) {
      const branchId = feeder.branchIds[i - 1];
      const branch = branchMap.get(branchId);
      if (branch) {
        cumulativeDistance += branch.length_km || 0;
      }
    }

    const v_pu = result.v_pu;
    const voltage_kv = result.voltage_kv ?? v_pu * bus.voltage_kv;

    points.push({
      bus_id: busId,
      bus_name: bus.name,
      distance_km: Math.round(cumulativeDistance * 1000) / 1000, // Round to 3 decimals
      voltage_pu: Math.round(v_pu * 10000) / 10000, // Round to 4 decimals
      voltage_kv: Math.round(voltage_kv * 100) / 100, // Round to 2 decimals
      violation: checkVoltageViolation(v_pu, umin, umax),
      deviation_pct: Math.round(calculateDeviation(v_pu) * 100) / 100, // Round to 2 decimals
    });
  }

  return points;
}

/**
 * Get profile statistics.
 */
export function getProfileStats(data: ProfileDataPoint[]): {
  minVoltage: number;
  maxVoltage: number;
  avgVoltage: number;
  violationCount: number;
  overvoltageCount: number;
  undervoltageCount: number;
} {
  if (data.length === 0) {
    return {
      minVoltage: 0,
      maxVoltage: 0,
      avgVoltage: 0,
      violationCount: 0,
      overvoltageCount: 0,
      undervoltageCount: 0,
    };
  }

  const voltages = data.map(d => d.voltage_pu);
  const overvoltages = data.filter(d => d.violation === 'OVERVOLTAGE');
  const undervoltages = data.filter(d => d.violation === 'UNDERVOLTAGE');

  return {
    minVoltage: Math.min(...voltages),
    maxVoltage: Math.max(...voltages),
    avgVoltage: voltages.reduce((a, b) => a + b, 0) / voltages.length,
    violationCount: overvoltages.length + undervoltages.length,
    overvoltageCount: overvoltages.length,
    undervoltageCount: undervoltages.length,
  };
}

/**
 * Format voltage for display.
 */
export function formatVoltage(v_pu: number, decimals: number = 4): string {
  return v_pu.toFixed(decimals);
}

/**
 * Format distance for display.
 */
export function formatDistance(km: number, decimals: number = 3): string {
  return km.toFixed(decimals);
}
