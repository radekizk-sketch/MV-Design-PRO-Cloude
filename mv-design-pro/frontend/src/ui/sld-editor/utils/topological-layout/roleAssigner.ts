/**
 * TOPOLOGICAL AUTO-LAYOUT ENGINE — Phase 1: Role Assigner
 *
 * Analizuje topologie sieci i przypisuje kanoniczne role topologiczne
 * kazdemu elementowi SLD.
 *
 * ZASADY:
 * - Kazdy element ma DOKLADNIE jedna role
 * - Brak roli = blad modelu (guard)
 * - Rola wynika z TOPOLOGII, nie z pozycji
 *
 * DETERMINIZM: Ten sam model -> identyczne przypisania
 */

import type { AnySldSymbol, BranchSymbol, SwitchSymbol } from '../../types';
import type {
  TopologicalRole,
  RoleAssignment,
  VoltageLevel,
  CanonicalLayer,
  TopologyGraph,
  TopologyNode,
  TopologyEdge,
} from './types';

// =============================================================================
// TOPOLOGY GRAPH BUILDER
// =============================================================================

/**
 * Build topology graph from SLD symbols.
 * DETERMINISTIC: Sorted by ID.
 */
export function buildTopologyGraph(symbols: readonly AnySldSymbol[]): TopologyGraph {
  const sorted = [...symbols].sort((a, b) => a.id.localeCompare(b.id));
  const elementToSymbol = new Map<string, string>();
  const symbolById = new Map<string, AnySldSymbol>();
  const adjacency = new Map<string, Set<string>>();
  const edges: TopologyEdge[] = [];

  for (const s of sorted) {
    symbolById.set(s.id, s);
    elementToSymbol.set(s.elementId, s.id);
    adjacency.set(s.elementId, new Set());
  }

  for (const s of sorted) {
    if (s.elementType === 'LineBranch' || s.elementType === 'TransformerBranch') {
      const b = s as BranchSymbol;
      adjacency.get(b.fromNodeId)?.add(b.toNodeId);
      adjacency.get(b.toNodeId)?.add(b.fromNodeId);
      edges.push({
        symbolId: s.id,
        fromElementId: b.fromNodeId,
        toElementId: b.toNodeId,
        elementType: s.elementType,
      });
    }
    if (s.elementType === 'Switch') {
      const sw = s as SwitchSymbol;
      adjacency.get(sw.fromNodeId)?.add(sw.toNodeId);
      adjacency.get(sw.toNodeId)?.add(sw.fromNodeId);
      edges.push({
        symbolId: s.id,
        fromElementId: sw.fromNodeId,
        toElementId: sw.toNodeId,
        elementType: 'Switch',
      });
    }
    if (s.elementType === 'Source' || s.elementType === 'Load') {
      const connId = (s as any).connectedToNodeId as string | undefined;
      if (connId) {
        adjacency.get(s.elementId)?.add(connId);
        adjacency.get(connId)?.add(s.elementId);
      }
    }
  }

  const nodes = new Map<string, TopologyNode>();
  for (const s of sorted) {
    if (s.elementType === 'Bus' || s.elementType === 'Source' || s.elementType === 'Load') {
      const neighbors = Array.from(adjacency.get(s.elementId) ?? []).sort();
      nodes.set(s.elementId, {
        symbolId: s.id,
        elementId: s.elementId,
        elementType: s.elementType,
        elementName: s.elementName,
        voltageLevel: detectVoltageLevel(s),
        neighbors,
      });
    }
  }

  return { nodes, edges, elementToSymbol, symbolById };
}

// =============================================================================
// VOLTAGE LEVEL DETECTION
// =============================================================================

/**
 * Detect voltage level from symbol.
 * DETERMINISTIC: Same name -> same classification.
 */
export function detectVoltageLevel(symbol: AnySldSymbol): VoltageLevel {
  const name = symbol.elementName.toLowerCase();
  const voltage = (symbol as any).voltage || (symbol as any).voltageKV;

  if (voltage !== undefined) {
    const v = typeof voltage === 'string' ? parseFloat(voltage) : voltage;
    if (v >= 110) return 'WN';
    if (v >= 6) return 'SN';
    if (v > 0 && v < 1) return 'nN';
  }

  if (name.includes('110') || name.includes('wn') || name.includes('wysokie')) return 'WN';
  if (
    name.includes('15') ||
    name.includes('20') ||
    name.includes('sn') ||
    name.includes('srednie') ||
    name.includes('średnie')
  ) {
    return 'SN';
  }
  if (name.includes('0.4') || name.includes('nn') || name.includes('niskie')) return 'nN';

  return 'SN';
}

// =============================================================================
// PCC FILTERING
// =============================================================================

const PCC_NAME_PATTERNS = ['pcc', 'point of common coupling', 'punkt przyłączenia', 'punkt wspólnego'];
const PCC_ID_PATTERNS = ['bus_pcc', 'pcc_', '_pcc'];
const PCC_TYPE_PATTERNS = ['pcc', 'connection_point', 'virtual_node'];

/**
 * Check if a symbol is a PCC node (to be filtered from layout).
 */
export function isPccNode(symbol: AnySldSymbol): boolean {
  const nameLower = symbol.elementName.toLowerCase();
  const typeLower = symbol.elementType.toLowerCase();
  const idLower = symbol.id.toLowerCase();
  const elementIdLower = symbol.elementId.toLowerCase();

  for (const p of PCC_NAME_PATTERNS) {
    if (nameLower.includes(p)) return true;
  }
  for (const p of PCC_ID_PATTERNS) {
    if (idLower.includes(p) || elementIdLower.includes(p)) return true;
  }
  for (const p of PCC_TYPE_PATTERNS) {
    if (typeLower.includes(p)) return true;
  }
  return false;
}

/**
 * Filter PCC nodes from symbols.
 * DETERMINISTIC: Sorted by ID.
 */
export function filterPccNodes(
  symbols: readonly AnySldSymbol[]
): { filtered: AnySldSymbol[]; pccIds: string[] } {
  const sorted = [...symbols].sort((a, b) => a.id.localeCompare(b.id));
  const pccIds: string[] = [];
  const filtered: AnySldSymbol[] = [];

  for (const s of sorted) {
    if (isPccNode(s)) {
      pccIds.push(s.id);
    } else {
      filtered.push(s);
    }
  }
  return { filtered, pccIds };
}

// =============================================================================
// TRANSFORMER SIDE DETECTION
// =============================================================================

/**
 * Determine which side of a transformer a bus is on.
 */
function getBusTransformerSide(
  busElementId: string,
  symbols: AnySldSymbol[]
): { connected: boolean; side: 'primary' | 'secondary' | null; trafoId: string | null } {
  const trafos = symbols.filter((s) => s.elementType === 'TransformerBranch');
  for (const t of trafos) {
    const b = t as BranchSymbol;
    if (b.fromNodeId === busElementId) return { connected: true, side: 'primary', trafoId: t.id };
    if (b.toNodeId === busElementId) return { connected: true, side: 'secondary', trafoId: t.id };
  }
  return { connected: false, side: null, trafoId: null };
}

// =============================================================================
// FEEDER CHAIN DETECTION
// =============================================================================

/**
 * Find all feeder chains from a busbar.
 * A feeder chain: busbar -> [switch] -> branch/load
 */
interface FeederChain {
  busbarElementId: string;
  switchId: string | null;
  branchId: string | null;
  loadIds: string[];
  sourceIds: string[];
  allSymbolIds: string[];
}

function findFeederChains(
  busbarElementId: string,
  symbols: AnySldSymbol[]
): FeederChain[] {
  const chains: FeederChain[] = [];

  // Find switches connected to this busbar
  const connectedSwitches = symbols
    .filter((s) => {
      if (s.elementType !== 'Switch') return false;
      const sw = s as SwitchSymbol;
      return sw.fromNodeId === busbarElementId || sw.toNodeId === busbarElementId;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const sw of connectedSwitches) {
    const swCast = sw as SwitchSymbol;
    const otherNodeId =
      swCast.fromNodeId === busbarElementId ? swCast.toNodeId : swCast.fromNodeId;

    // Skip if otherNodeId is also a busbar (coupler)
    const otherIsBus = symbols.some(
      (s) => s.elementType === 'Bus' && s.elementId === otherNodeId
    );
    if (otherIsBus) continue;

    const chain: FeederChain = {
      busbarElementId,
      switchId: sw.id,
      branchId: null,
      loadIds: [],
      sourceIds: [],
      allSymbolIds: [sw.id],
    };

    // Find branch connected to otherNodeId
    const branch = symbols.find((s) => {
      if (s.elementType !== 'LineBranch' && s.elementType !== 'TransformerBranch') return false;
      const b = s as BranchSymbol;
      return b.fromNodeId === otherNodeId || b.toNodeId === otherNodeId;
    });
    if (branch) {
      chain.branchId = branch.id;
      chain.allSymbolIds.push(branch.id);
    }

    // Find loads/sources connected to otherNodeId
    for (const s of symbols) {
      if (s.elementType === 'Load' && (s as any).connectedToNodeId === otherNodeId) {
        chain.loadIds.push(s.id);
        chain.allSymbolIds.push(s.id);
      }
      if (s.elementType === 'Source' && (s as any).connectedToNodeId === otherNodeId) {
        chain.sourceIds.push(s.id);
        chain.allSymbolIds.push(s.id);
      }
    }

    chains.push(chain);
  }

  // Direct branches (without switch)
  // Exclude transformers that connect two busbars (those are structural, not feeders)
  const busbarsElementIds = new Set(
    symbols.filter((s) => s.elementType === 'Bus').map((s) => s.elementId)
  );
  const directBranches = symbols
    .filter((s) => {
      if (s.elementType !== 'LineBranch' && s.elementType !== 'TransformerBranch') return false;
      const b = s as BranchSymbol;
      const connected = b.fromNodeId === busbarElementId || b.toNodeId === busbarElementId;
      if (!connected) return false;
      // Skip branches that connect two busbars (e.g., WN/SN transformer)
      if (busbarsElementIds.has(b.fromNodeId) && busbarsElementIds.has(b.toNodeId)) return false;
      return !chains.some((c) => c.branchId === s.id);
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const branch of directBranches) {
    chains.push({
      busbarElementId,
      switchId: null,
      branchId: branch.id,
      loadIds: [],
      sourceIds: [],
      allSymbolIds: [branch.id],
    });
  }

  return chains;
}

// =============================================================================
// STATION DETECTION
// =============================================================================

interface StationInfo {
  rootTrafoId: string;
  symbolIds: Set<string>;
  type: 'pv' | 'bess' | 'fw' | 'consumer' | 'unknown';
}

function detectStations(symbols: AnySldSymbol[]): StationInfo[] {
  const stations: StationInfo[] = [];

  const trafos = symbols
    .filter((s) => s.elementType === 'TransformerBranch')
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const trafo of trafos) {
    const b = trafo as BranchSymbol;
    const fromBus = symbols.find((s) => s.elementId === b.fromNodeId && s.elementType === 'Bus');
    const toBus = symbols.find((s) => s.elementId === b.toNodeId && s.elementType === 'Bus');
    if (!fromBus || !toBus) continue;

    const fromV = detectVoltageLevel(fromBus);
    const toV = detectVoltageLevel(toBus);
    const isSnNn =
      (fromV === 'SN' && toV === 'nN') || (fromV === 'nN' && toV === 'SN');
    if (!isSnNn) continue;

    const nnBusId = fromV === 'nN' ? b.fromNodeId : b.toNodeId;
    const ids = new Set<string>([trafo.id]);

    const nnBus = symbols.find((s) => s.elementId === nnBusId);
    if (nnBus) ids.add(nnBus.id);

    let stationType: StationInfo['type'] = 'unknown';
    for (const s of symbols) {
      if (s.elementType === 'Load' && (s as any).connectedToNodeId === nnBusId) {
        ids.add(s.id);
        stationType = 'consumer';
      }
      if (s.elementType === 'Source' && (s as any).connectedToNodeId === nnBusId) {
        ids.add(s.id);
        const nameLower = s.elementName.toLowerCase();
        if (nameLower.includes('pv') || nameLower.includes('fotowoltaik')) stationType = 'pv';
        else if (nameLower.includes('bess') || nameLower.includes('magazyn')) stationType = 'bess';
        else if (nameLower.includes('fw') || nameLower.includes('wiatr')) stationType = 'fw';
      }
      if (s.elementType === 'Switch') {
        const sw = s as SwitchSymbol;
        if (sw.fromNodeId === nnBusId || sw.toNodeId === nnBusId) {
          ids.add(s.id);
        }
      }
    }

    stations.push({ rootTrafoId: trafo.id, symbolIds: ids, type: stationType });
  }

  return stations;
}

// =============================================================================
// CANONICAL LAYER ASSIGNMENT
// =============================================================================

function assignLayer(
  symbol: AnySldSymbol,
  voltageLevel: VoltageLevel,
  isStationElement: boolean
): CanonicalLayer {
  if (symbol.elementType === 'Source') return 'L0_SOURCE';

  if (symbol.elementType === 'Bus') {
    if (voltageLevel === 'WN') return 'L1_WN_BUSBAR';
    if (voltageLevel === 'nN') return isStationElement ? 'L10_NN_BUSBAR' : 'L10_NN_BUSBAR';
    return 'L3_SN_BUSBAR';
  }

  if (symbol.elementType === 'TransformerBranch') {
    return isStationElement ? 'L9_STATION_TRANSFORMER' : 'L2_TRANSFORMER';
  }

  if (symbol.elementType === 'Switch') {
    if (isStationElement) return 'L8_STATION_BREAKER';
    if (voltageLevel === 'nN') return 'L11_NN_SWITCHGEAR';
    return 'L4_SN_FEEDER_SWITCH';
  }

  if (symbol.elementType === 'LineBranch') {
    if (isStationElement) return 'L6_SN_CABLE';
    return 'L5_SN_FEEDER_BRANCH';
  }

  if (symbol.elementType === 'Load') return 'L12_INVERTER_LOAD';

  return 'L5_SN_FEEDER_BRANCH';
}

// =============================================================================
// MAIN ROLE ASSIGNMENT
// =============================================================================

/**
 * Assign topological roles to all symbols.
 *
 * DETERMINISTIC: Same input -> same output.
 * Every symbol gets exactly one role.
 *
 * @param symbols - SLD symbols (will be sorted internally)
 * @returns Map of symbolId -> RoleAssignment
 */
export function assignTopologicalRoles(
  symbols: readonly AnySldSymbol[]
): {
  assignments: Map<string, RoleAssignment>;
  pccIds: string[];
  stationSymbolIds: Set<string>;
  feederChainsByBusbar: Map<string, FeederChain[]>;
} {
  const { filtered, pccIds } = filterPccNodes(symbols);
  const sorted = [...filtered].sort((a, b) => a.id.localeCompare(b.id));
  const assignments = new Map<string, RoleAssignment>();

  // Detect stations
  const stations = detectStations(sorted);
  const stationSymbolIds = new Set<string>();
  for (const st of stations) {
    for (const id of st.symbolIds) stationSymbolIds.add(id);
  }

  // Classify busbars by voltage level
  const busbarVoltages = new Map<string, VoltageLevel>();
  const busbars = sorted.filter((s) => s.elementType === 'Bus');
  for (const bus of busbars) {
    let level = detectVoltageLevel(bus);
    const trafoSide = getBusTransformerSide(bus.elementId, sorted);
    if (trafoSide.connected) {
      if (trafoSide.side === 'primary') level = 'WN';
      else if (trafoSide.side === 'secondary') level = 'SN';
    }
    busbarVoltages.set(bus.id, level);
  }

  // Find feeder chains per busbar
  const feederChainsByBusbar = new Map<string, FeederChain[]>();
  const feederSymbolIds = new Map<string, string>(); // symbolId -> feederId
  for (const bus of busbars) {
    const chains = findFeederChains(bus.elementId, sorted);
    feederChainsByBusbar.set(bus.id, chains);
    for (const chain of chains) {
      const feederId = `feeder_${bus.id}_${chain.switchId ?? chain.branchId ?? 'direct'}`;
      for (const sid of chain.allSymbolIds) {
        feederSymbolIds.set(sid, feederId);
      }
    }
  }

  // Detect section relationships (busbar couplers)
  const busbarPairs = new Map<string, string>(); // busId -> paired busId via coupler
  for (const sw of sorted.filter((s) => s.elementType === 'Switch')) {
    const swCast = sw as SwitchSymbol;
    const fromIsBus = busbars.some((b) => b.elementId === swCast.fromNodeId);
    const toIsBus = busbars.some((b) => b.elementId === swCast.toNodeId);
    if (fromIsBus && toIsBus && swCast.fromNodeId !== swCast.toNodeId) {
      const fromBusSymbol = busbars.find((b) => b.elementId === swCast.fromNodeId);
      const toBusSymbol = busbars.find((b) => b.elementId === swCast.toNodeId);
      if (fromBusSymbol && toBusSymbol) {
        busbarPairs.set(fromBusSymbol.id, toBusSymbol.id);
        busbarPairs.set(toBusSymbol.id, fromBusSymbol.id);
      }
    }
  }

  // Assign roles
  for (const symbol of sorted) {
    const isStation = stationSymbolIds.has(symbol.id);
    let role: TopologicalRole;
    let voltageLevel: VoltageLevel = 'SN';
    let sectionId: string | null = null;
    let parentBusbarId: string | null = null;
    const feederId = feederSymbolIds.get(symbol.id) ?? null;

    switch (symbol.elementType) {
      case 'Source':
        role = 'POWER_SOURCE';
        voltageLevel = 'WN';
        // Find connected bus
        {
          const connId = (symbol as any).connectedToNodeId;
          if (connId) {
            const busSymbol = busbars.find((b) => b.elementId === connId);
            if (busSymbol) {
              parentBusbarId = busSymbol.id;
              voltageLevel = busbarVoltages.get(busSymbol.id) ?? 'WN';
            }
          }
        }
        break;

      case 'Bus':
        voltageLevel = busbarVoltages.get(symbol.id) ?? 'SN';
        if (busbarPairs.has(symbol.id)) {
          role = 'SECTION';
          parentBusbarId = busbarPairs.get(symbol.id) ?? null;
          sectionId = symbol.id;
        } else {
          role = 'BUSBAR';
        }
        break;

      case 'TransformerBranch':
        role = 'AXIAL_ELEMENT';
        voltageLevel = 'SN';
        break;

      case 'Switch': {
        const sw = symbol as SwitchSymbol;
        // Check if this is a bus coupler
        const fromIsBus = busbars.some((b) => b.elementId === sw.fromNodeId);
        const toIsBus = busbars.some((b) => b.elementId === sw.toNodeId);
        if (fromIsBus && toIsBus) {
          role = 'AXIAL_ELEMENT'; // Coupler is axial between sections
        } else {
          role = 'AXIAL_ELEMENT'; // Switch on feeder axis
        }

        // Find parent busbar
        const parentBus = busbars.find(
          (b) => b.elementId === sw.fromNodeId || b.elementId === sw.toNodeId
        );
        if (parentBus) {
          parentBusbarId = parentBus.id;
          voltageLevel = busbarVoltages.get(parentBus.id) ?? 'SN';
        }
        break;
      }

      case 'LineBranch': {
        role = 'FEEDER';
        const branch = symbol as BranchSymbol;
        const parentBus = busbars.find(
          (b) => b.elementId === branch.fromNodeId || b.elementId === branch.toNodeId
        );
        if (parentBus) {
          parentBusbarId = parentBus.id;
          voltageLevel = busbarVoltages.get(parentBus.id) ?? 'SN';
        }
        break;
      }

      case 'Load':
        role = 'FEEDER';
        voltageLevel = 'nN';
        {
          const connId = (symbol as any).connectedToNodeId;
          if (connId) {
            const busSymbol = busbars.find((b) => b.elementId === connId);
            if (busSymbol) {
              parentBusbarId = busSymbol.id;
              voltageLevel = busbarVoltages.get(busSymbol.id) ?? 'nN';
            }
          }
        }
        break;

      default:
        role = 'INLINE_ELEMENT';
        break;
    }

    const layer = assignLayer(symbol, voltageLevel, isStation);

    assignments.set(symbol.id, {
      symbolId: symbol.id,
      elementId: symbol.elementId,
      role,
      voltageLevel,
      sectionId,
      parentBusbarId,
      feederId,
      canonicalLayer: layer,
    });
  }

  return { assignments, pccIds, stationSymbolIds, feederChainsByBusbar };
}
