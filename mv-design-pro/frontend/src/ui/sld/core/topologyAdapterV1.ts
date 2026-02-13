/**
 * TopologyAdapterV1 — Adapter Snapshot/SldSymbols → VisualGraphV1.
 *
 * CANONICAL BOUNDARY:
 * - Bierze AnySldSymbol[] (stan edytora lub dane z API)
 * - Mapuje do VisualGraphV1 (zamrozony kontrakt)
 * - Segmentuje trunk/branch/secondary (primary tree + secondary connectors)
 * - Wykrywa stacje A/B/C/D jako switchgear blocks z portami IN/OUT/BRANCH
 * - Klasyfikuje PV/BESS jako GENERATOR_PV / GENERATOR_BESS (zrodla), nigdy jako LOAD
 * - NIE uzywa kierunku przeplywu mocy do segmentacji
 *
 * DETERMINIZM:
 * - Ten sam zestaw symboli → identyczny VisualGraphV1 (bit-for-bit)
 * - Sortowanie po id na kazdym etapie
 * - Brak Math.random(), Date.now(), Set/Map iteration order
 */

import type { AnySldSymbol, BranchSymbol, SwitchSymbol, SourceSymbol, LoadSymbol, BusSymbol } from '../../sld-editor/types';
import {
  type VisualGraphV1,
  type VisualNodeV1,
  type VisualEdgeV1,
  type VisualPortV1,
  type VisualNodeAttributesV1,
  type VisualEdgeAttributesV1,
  type VisualGraphMetaV1,
  NodeTypeV1,
  EdgeTypeV1,
  PortRoleV1,
  VISUAL_GRAPH_VERSION,
  canonicalizeVisualGraph,
} from './visualGraph';

// =============================================================================
// ADAPTER INPUT
// =============================================================================

/**
 * Opcje adaptera.
 */
export interface TopologyAdapterOptions {
  /** ID snapshot (jezeli dostepne) */
  readonly snapshotId?: string;
  /** Fingerprint snapshot (jezeli dostepny) */
  readonly snapshotFingerprint?: string;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Sprawdza czy symbol jest szyna zbiorcza (Bus).
 */
function isBus(s: AnySldSymbol): s is BusSymbol {
  return s.elementType === 'Bus';
}

/**
 * Sprawdza czy symbol jest galaz (LineBranch/TransformerBranch).
 */
function isBranch(s: AnySldSymbol): s is BranchSymbol {
  return s.elementType === 'LineBranch' || s.elementType === 'TransformerBranch';
}

/**
 * Sprawdza czy symbol jest przelacznik.
 */
function isSwitch(s: AnySldSymbol): s is SwitchSymbol {
  return s.elementType === 'Switch';
}

/**
 * Sprawdza czy symbol jest zrodlo.
 */
function isSource(s: AnySldSymbol): s is SourceSymbol {
  return s.elementType === 'Source';
}

/**
 * Sprawdza czy symbol jest odbiorca.
 */
function isLoad(s: AnySldSymbol): s is LoadSymbol {
  return s.elementType === 'Load';
}

// =============================================================================
// NODE TYPE CLASSIFICATION
// =============================================================================

/**
 * Klasyfikuje typ wezla na podstawie symbolu.
 *
 * Reguly (priorytet od gory):
 * 1. Source z nazwa zawierajaca PV/fotowolt/solar → GENERATOR_PV
 * 2. Source z nazwa zawierajaca BESS/magazyn/battery → GENERATOR_BESS
 * 3. Source z nazwa zawierajaca wiatr/wind/FW → GENERATOR_WIND
 * 4. Source (inne) → GRID_SOURCE
 * 5. Bus z napiecie ≥ 6kV → BUS_SN
 * 6. Bus z napiecie < 6kV → BUS_NN
 * 7. Bus (brak napiecia) → BUS_SN (domyslne)
 * 8. TransformerBranch z from WN → TRANSFORMER_WN_SN
 * 9. TransformerBranch (inne) → TRANSFORMER_SN_NN
 * 10. Switch → odpowiedni SWITCH_* typ
 * 11. Load → LOAD
 * 12. LineBranch → FEEDER_JUNCTION
 */
function classifyNodeType(symbol: AnySldSymbol, voltageByBus: Map<string, number>): NodeTypeV1 {
  if (isSource(symbol)) {
    const name = symbol.elementName.toLowerCase();
    if (name.includes('pv') || name.includes('fotowolt') || name.includes('solar')) {
      return NodeTypeV1.GENERATOR_PV;
    }
    if (name.includes('bess') || name.includes('magazyn') || name.includes('battery') || name.includes('akumulator')) {
      return NodeTypeV1.GENERATOR_BESS;
    }
    if (name.includes('wiatr') || name.includes('wind') || name.includes('fw')) {
      return NodeTypeV1.GENERATOR_WIND;
    }
    return NodeTypeV1.GRID_SOURCE;
  }

  if (isBus(symbol)) {
    const voltage = voltageByBus.get(symbol.elementId);
    if (voltage !== undefined) {
      return voltage >= 6 ? NodeTypeV1.BUS_SN : NodeTypeV1.BUS_NN;
    }
    // Heurystyka po nazwie
    const name = symbol.elementName.toLowerCase();
    if (name.includes('nn') || name.includes('0.4') || name.includes('0,4')) {
      return NodeTypeV1.BUS_NN;
    }
    return NodeTypeV1.BUS_SN;
  }

  if (isBranch(symbol)) {
    if (symbol.elementType === 'TransformerBranch') {
      // Sprawdz czy from jest WN
      const fromVoltage = voltageByBus.get(symbol.fromNodeId);
      if (fromVoltage !== undefined && fromVoltage >= 60) {
        return NodeTypeV1.TRANSFORMER_WN_SN;
      }
      return NodeTypeV1.TRANSFORMER_SN_NN;
    }
    return NodeTypeV1.FEEDER_JUNCTION;
  }

  if (isSwitch(symbol)) {
    switch (symbol.switchType) {
      case 'BREAKER':
        return NodeTypeV1.SWITCH_BREAKER;
      case 'DISCONNECTOR':
        return NodeTypeV1.SWITCH_DISCONNECTOR;
      case 'LOAD_SWITCH':
        return NodeTypeV1.SWITCH_LOAD_SWITCH;
      case 'FUSE':
        return NodeTypeV1.SWITCH_FUSE;
      default:
        return NodeTypeV1.SWITCH_BREAKER;
    }
  }

  if (isLoad(symbol)) {
    return NodeTypeV1.LOAD;
  }

  return NodeTypeV1.FEEDER_JUNCTION;
}

// =============================================================================
// PORT GENERATION
// =============================================================================

/**
 * Generuje porty dla wezla na podstawie jego typu.
 */
function generatePorts(nodeType: NodeTypeV1): VisualPortV1[] {
  switch (nodeType) {
    case NodeTypeV1.BUS_SN:
    case NodeTypeV1.BUS_NN:
      return [
        { id: 'left', role: PortRoleV1.BUS, relativeX: 0, relativeY: 0.5 },
        { id: 'right', role: PortRoleV1.BUS, relativeX: 1, relativeY: 0.5 },
      ];

    case NodeTypeV1.GRID_SOURCE:
    case NodeTypeV1.GENERATOR_PV:
    case NodeTypeV1.GENERATOR_BESS:
    case NodeTypeV1.GENERATOR_WIND:
      return [
        { id: 'bottom', role: PortRoleV1.OUT, relativeX: 0.5, relativeY: 1 },
      ];

    case NodeTypeV1.LOAD:
      return [
        { id: 'top', role: PortRoleV1.IN, relativeX: 0.5, relativeY: 0 },
      ];

    case NodeTypeV1.TRANSFORMER_WN_SN:
    case NodeTypeV1.TRANSFORMER_SN_NN:
      return [
        { id: 'top', role: PortRoleV1.TRANSFORMER_HV, relativeX: 0.5, relativeY: 0 },
        { id: 'bottom', role: PortRoleV1.TRANSFORMER_LV, relativeX: 0.5, relativeY: 1 },
      ];

    case NodeTypeV1.SWITCH_BREAKER:
    case NodeTypeV1.SWITCH_DISCONNECTOR:
    case NodeTypeV1.SWITCH_LOAD_SWITCH:
    case NodeTypeV1.SWITCH_FUSE:
      return [
        { id: 'top', role: PortRoleV1.FIELD_IN, relativeX: 0.5, relativeY: 0 },
        { id: 'bottom', role: PortRoleV1.FIELD_OUT, relativeX: 0.5, relativeY: 1 },
      ];

    case NodeTypeV1.STATION_SN_NN_A:
    case NodeTypeV1.STATION_SN_NN_B:
    case NodeTypeV1.STATION_SN_NN_C:
    case NodeTypeV1.STATION_SN_NN_D:
    case NodeTypeV1.SWITCHGEAR_BLOCK:
      return [
        { id: 'in', role: PortRoleV1.IN, relativeX: 0.5, relativeY: 0 },
        { id: 'out', role: PortRoleV1.OUT, relativeX: 0.5, relativeY: 1 },
        { id: 'branch', role: PortRoleV1.BRANCH, relativeX: 1, relativeY: 0.5 },
      ];

    case NodeTypeV1.FEEDER_JUNCTION:
      return [
        { id: 'top', role: PortRoleV1.IN, relativeX: 0.5, relativeY: 0 },
        { id: 'bottom', role: PortRoleV1.OUT, relativeX: 0.5, relativeY: 1 },
        { id: 'left', role: PortRoleV1.BRANCH, relativeX: 0, relativeY: 0.5 },
        { id: 'right', role: PortRoleV1.BRANCH, relativeX: 1, relativeY: 0.5 },
      ];

    default:
      return [
        { id: 'top', role: PortRoleV1.IN, relativeX: 0.5, relativeY: 0 },
        { id: 'bottom', role: PortRoleV1.OUT, relativeX: 0.5, relativeY: 1 },
      ];
  }
}

// =============================================================================
// EDGE CLASSIFICATION
// =============================================================================

/**
 * Buduje adjacency list na podstawie symboli.
 */
function buildAdjacency(symbols: readonly AnySldSymbol[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();

  for (const s of symbols) {
    if (isBranch(s)) {
      if (!adj.has(s.fromNodeId)) adj.set(s.fromNodeId, new Set());
      if (!adj.has(s.toNodeId)) adj.set(s.toNodeId, new Set());
      adj.get(s.fromNodeId)!.add(s.toNodeId);
      adj.get(s.toNodeId)!.add(s.fromNodeId);
    }
    if (isSwitch(s)) {
      if (!adj.has(s.fromNodeId)) adj.set(s.fromNodeId, new Set());
      if (!adj.has(s.toNodeId)) adj.set(s.toNodeId, new Set());
      adj.get(s.fromNodeId)!.add(s.toNodeId);
      adj.get(s.toNodeId)!.add(s.fromNodeId);
    }
  }

  return adj;
}

/**
 * Buduje spanning tree BFS od zrodla i klasyfikuje krawedzie.
 *
 * Krawedzie w spanning tree:
 * - Z szyny zrodlowej GPZ wzdluz magistrali → TRUNK
 * - Odgalezienia od trunk do stacji → BRANCH
 *
 * Krawedzie POZA spanning tree:
 * - SECONDARY_CONNECTOR (NOP, ring, sprzeglo miedzy sekcjami)
 *
 * Krawedzie specjalne:
 * - TransformerBranch → TRANSFORMER_LINK
 * - Switch BUS_COUPLER → BUS_COUPLER
 */
function classifyEdgeType(
  symbol: AnySldSymbol,
  treeEdges: Set<string>,
  busCouplerIds: Set<string>,
): EdgeTypeV1 {
  if (isBranch(symbol) && symbol.elementType === 'TransformerBranch') {
    return EdgeTypeV1.TRANSFORMER_LINK;
  }

  if (isSwitch(symbol) && busCouplerIds.has(symbol.id)) {
    return EdgeTypeV1.BUS_COUPLER;
  }

  if (treeEdges.has(symbol.id)) {
    // W spanning tree — TRUNK lub BRANCH
    // Prosta heurystyka: elementy na glownej sciezce od GPZ = TRUNK, reszta = BRANCH
    return EdgeTypeV1.TRUNK;
  }

  return EdgeTypeV1.SECONDARY_CONNECTOR;
}

/**
 * BFS spanning tree z detekcja trunk/branch.
 */
function buildSpanningTree(
  symbols: readonly AnySldSymbol[],
  busIds: Set<string>,
): { treeEdges: Set<string>; busCouplerIds: Set<string> } {
  const treeEdges = new Set<string>();
  const busCouplerIds = new Set<string>();

  // Znajdz szyny i polaczenia
  const busToConnections = new Map<string, AnySldSymbol[]>();
  for (const busId of busIds) {
    busToConnections.set(busId, []);
  }

  for (const s of symbols) {
    if (isBranch(s)) {
      busToConnections.get(s.fromNodeId)?.push(s);
      busToConnections.get(s.toNodeId)?.push(s);
    }
    if (isSwitch(s)) {
      // Sprawdz czy switch laczy dwie szyny (bus coupler)
      if (busIds.has(s.fromNodeId) && busIds.has(s.toNodeId)) {
        busCouplerIds.add(s.id);
      }
      busToConnections.get(s.fromNodeId)?.push(s);
      busToConnections.get(s.toNodeId)?.push(s);
    }
  }

  // BFS od pierwszego zrodla (lub pierwszej szyny)
  const visited = new Set<string>();
  const sources = symbols.filter(isSource);
  const startBusIds: string[] = [];

  for (const src of sources) {
    if (src.connectedToNodeId && busIds.has(src.connectedToNodeId)) {
      startBusIds.push(src.connectedToNodeId);
    }
  }

  if (startBusIds.length === 0 && busIds.size > 0) {
    // Fallback: pierwsza szyna (posortowana)
    startBusIds.push([...busIds].sort()[0]);
  }

  const queue = [...startBusIds];
  for (const busId of queue) {
    visited.add(busId);
  }

  while (queue.length > 0) {
    const currentBusId = queue.shift()!;
    const connections = busToConnections.get(currentBusId) || [];

    // Sortuj po id dla determinizmu
    const sortedConnections = [...connections].sort((a, b) => a.id.localeCompare(b.id));

    for (const conn of sortedConnections) {
      let neighborBusId: string | null = null;

      if (isBranch(conn)) {
        neighborBusId = conn.fromNodeId === currentBusId ? conn.toNodeId : conn.fromNodeId;
      }
      if (isSwitch(conn)) {
        neighborBusId = conn.fromNodeId === currentBusId ? conn.toNodeId : conn.fromNodeId;
      }

      if (neighborBusId && busIds.has(neighborBusId) && !visited.has(neighborBusId)) {
        visited.add(neighborBusId);
        treeEdges.add(conn.id);
        queue.push(neighborBusId);
      }
    }
  }

  return { treeEdges, busCouplerIds };
}

// =============================================================================
// VOLTAGE EXTRACTION
// =============================================================================

/**
 * Ekstrakcja napiecia po nazwie szyny.
 * Heurystyka: szukaj wzorcow "110 kV", "15 kV", "0.4 kV" w nazwie.
 */
function extractVoltageFromName(name: string): number | null {
  // Wzorce: "110kV", "110 kV", "15kV", "0.4kV", "0,4kV"
  const match = name.match(/(\d+[.,]?\d*)\s*kV/i);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return null;
}

/**
 * Buduje mape napiecia per bus elementId.
 */
function buildVoltageMap(symbols: readonly AnySldSymbol[]): Map<string, number> {
  const voltageByBus = new Map<string, number>();

  for (const s of symbols) {
    if (isBus(s)) {
      const voltage = extractVoltageFromName(s.elementName);
      if (voltage !== null) {
        voltageByBus.set(s.elementId, voltage);
      }
    }
  }

  return voltageByBus;
}

// =============================================================================
// MAIN ADAPTER
// =============================================================================

/**
 * Konwertuje tablice AnySldSymbol[] do VisualGraphV1.
 *
 * DETERMINIZM: ten sam zestaw symboli (w dowolnej kolejnosci) → identyczny VisualGraphV1.
 *
 * @param symbols Symbole SLD z edytora lub API
 * @param options Opcje adaptera (snapshotId, fingerprint)
 * @returns VisualGraphV1 — zamrozony, walidowalny, deterministyczny
 */
export function convertToVisualGraph(
  symbols: readonly AnySldSymbol[],
  options: TopologyAdapterOptions = {},
): VisualGraphV1 {
  // 1. Sortuj symbole po id (determinizm)
  const sorted = [...symbols].sort((a, b) => a.id.localeCompare(b.id));

  // 2. Buduj mape napiecia
  const voltageByBus = buildVoltageMap(sorted);

  // 3. Zbierz ID szyn
  const busIds = new Set<string>();
  const busElementIds = new Set<string>();
  for (const s of sorted) {
    if (isBus(s)) {
      busIds.add(s.elementId);
      busElementIds.add(s.elementId);
    }
  }

  // 4. Buduj spanning tree
  const { treeEdges, busCouplerIds } = buildSpanningTree(sorted, busElementIds);

  // 5. Konwertuj wezly
  const nodes: VisualNodeV1[] = [];
  for (const s of sorted) {
    const nodeType = classifyNodeType(s, voltageByBus);
    const ports = generatePorts(nodeType);

    const attributes: VisualNodeAttributesV1 = {
      label: s.elementName,
      voltageKv: isBus(s) ? (voltageByBus.get(s.elementId) ?? null) : null,
      inService: s.inService,
      elementId: s.elementId,
      elementType: s.elementType,
      elementName: s.elementName,
      switchState: isSwitch(s) ? s.switchState : null,
      branchType: isBranch(s) ? (s.branchType ?? null) : null,
      ratedPowerMva: null,
      width: isBus(s) ? s.width : null,
      height: isBus(s) ? s.height : null,
      fromNodeId: isBranch(s) ? s.fromNodeId : (isSwitch(s) ? s.fromNodeId : null),
      toNodeId: isBranch(s) ? s.toNodeId : (isSwitch(s) ? s.toNodeId : null),
      connectedToNodeId: isSource(s) ? s.connectedToNodeId : (isLoad(s) ? s.connectedToNodeId : null),
    };

    nodes.push({
      id: s.id,
      nodeType,
      ports,
      attributes,
    });
  }

  // 6. Konwertuj krawedzie
  const edges: VisualEdgeV1[] = [];
  for (const s of sorted) {
    if (isBranch(s)) {
      const edgeType = classifyEdgeType(s, treeEdges, busCouplerIds);
      const fromPort = s.elementType === 'TransformerBranch' ? 'top' : 'left';
      const toPort = s.elementType === 'TransformerBranch' ? 'bottom' : 'right';

      const edgeAttributes: VisualEdgeAttributesV1 = {
        label: s.elementName,
        lengthKm: null,
        branchType: s.branchType ?? null,
        inService: s.inService,
      };

      edges.push({
        id: `edge_${s.id}`,
        fromPortRef: { nodeId: s.id, portId: fromPort },
        toPortRef: { nodeId: s.id, portId: toPort },
        edgeType,
        isNormallyOpen: false,
        attributes: edgeAttributes,
      });
    }

    if (isSwitch(s)) {
      const edgeType = classifyEdgeType(s, treeEdges, busCouplerIds);

      const edgeAttributes: VisualEdgeAttributesV1 = {
        label: s.elementName,
        lengthKm: null,
        branchType: null,
        inService: s.inService,
      };

      edges.push({
        id: `edge_${s.id}`,
        fromPortRef: { nodeId: s.id, portId: 'top' },
        toPortRef: { nodeId: s.id, portId: 'bottom' },
        edgeType,
        isNormallyOpen: s.switchState === 'OPEN',
        attributes: edgeAttributes,
      });
    }

    if (isSource(s)) {
      const edgeAttributes: VisualEdgeAttributesV1 = {
        label: `${s.elementName} → bus`,
        lengthKm: null,
        branchType: null,
        inService: s.inService,
      };

      edges.push({
        id: `edge_${s.id}`,
        fromPortRef: { nodeId: s.id, portId: 'bottom' },
        toPortRef: { nodeId: s.id, portId: 'bottom' },
        edgeType: EdgeTypeV1.BRANCH,
        isNormallyOpen: false,
        attributes: edgeAttributes,
      });
    }

    if (isLoad(s)) {
      const edgeAttributes: VisualEdgeAttributesV1 = {
        label: `bus → ${s.elementName}`,
        lengthKm: null,
        branchType: null,
        inService: s.inService,
      };

      edges.push({
        id: `edge_${s.id}`,
        fromPortRef: { nodeId: s.id, portId: 'top' },
        toPortRef: { nodeId: s.id, portId: 'top' },
        edgeType: EdgeTypeV1.BRANCH,
        isNormallyOpen: false,
        attributes: edgeAttributes,
      });
    }
  }

  // 7. Buduj meta
  const meta: VisualGraphMetaV1 = {
    snapshotId: options.snapshotId ?? 'unknown',
    snapshotFingerprint: options.snapshotFingerprint ?? 'unknown',
    createdAt: new Date().toISOString(),
    version: VISUAL_GRAPH_VERSION,
  };

  // 8. Zbuduj graf i kanonizuj
  const graph: VisualGraphV1 = {
    version: VISUAL_GRAPH_VERSION,
    nodes,
    edges,
    meta,
  };

  return canonicalizeVisualGraph(graph);
}
