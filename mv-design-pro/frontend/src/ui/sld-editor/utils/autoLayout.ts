/**
 * AUTO-LAYOUT — ETAP-grade hierarchiczny algorytm rozmieszczania SLD
 *
 * PR-SLD-ETAP-GEOMETRY-01: ETAP-grade geometria SLD
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 5: Auto-Layout
 * - sldEtapStyle.ts: ETAP_GEOMETRY (single source of truth)
 * - ETAP software visual standards
 *
 * FEATURES:
 * - Deterministyczny (ten sam model → ten sam układ)
 * - Hierarchiczny WN → Trafo → SN → Feeders
 * - Szyny auto-expandujące (width based on bay count)
 * - Pola SN pionowo z szyny z równym odstępem
 * - Transformator osiowo między WN i SN
 * - Brak ukośnych przyłączy z szyn
 *
 * ALGORYTM (ETAP-GRADE):
 * 1. Identyfikacja typów szyn (WN/SN) i transformatorów
 * 2. Budowa hierarchii: Source → WN → Trafo → SN → Feeders/Loads
 * 3. Obliczenie szerokości szyn (auto-expansion)
 * 4. Pozycjonowanie warstwowe z ETAP_GEOMETRY tokens
 * 5. Pozycjonowanie feeders pionowo pod SN
 */

import type { AnySldSymbol, BranchSymbol, Position, SwitchSymbol, NodeSymbol } from '../types';
import {
  ETAP_GEOMETRY,
  calculateBusbarWidth,
  calculateBayPositions,
} from '../../sld/sldEtapStyle';

// =============================================================================
// STAŁE KONFIGURACYJNE
// =============================================================================

/** Konfiguracja auto-layoutu */
export interface AutoLayoutConfig {
  /** Rozmiar siatki (px) */
  gridSize: number;
  /** Odstęp między warstwami (px) */
  layerSpacing: number;
  /** Odstęp między węzłami w warstwie (px) */
  nodeSpacing: number;
  /** Minimalna szerokość szyny (px) */
  busMinWidth: number;
  /** Szerokość symbolu (px) */
  symbolWidth: number;
  /** Wysokość symbolu (px) */
  symbolHeight: number;
  /** Kierunek layoutu */
  direction: 'top-down' | 'left-right';
  /** Padding od krawędzi (px) */
  padding: number;
}

/** Domyślna konfiguracja — ETAP-GRADE LAYOUT (uses ETAP_GEOMETRY tokens) */
export const DEFAULT_LAYOUT_CONFIG: AutoLayoutConfig = {
  gridSize: ETAP_GEOMETRY.layout.gridSize,
  layerSpacing: ETAP_GEOMETRY.layout.layerSpacing,
  nodeSpacing: ETAP_GEOMETRY.layout.nodeSpacing,
  busMinWidth: ETAP_GEOMETRY.busbar.minWidth,
  symbolWidth: 60,
  symbolHeight: 40,
  direction: 'top-down',
  padding: ETAP_GEOMETRY.layout.padding,
};

/** Konfiguracja clearances dla czytelności SLD (łatwa do korekty). */
export interface CollisionConfig {
  /** Minimalny odstęp symbol↔symbol (px) */
  symbolClearance: number;
  /** Minimalny odstęp label↔symbol (px) */
  labelSymbolClearance: number;
  /** Minimalny odstęp label↔edge (px) */
  labelEdgeClearance: number;
  /** Wewnętrzny padding busbar (px) */
  busbarPadding: number;
  /** Przybliżona szerokość znaku w etykiecie (px) */
  labelCharWidth: number;
  /** Wysokość etykiety (px) */
  labelHeight: number;
  /** Grubość korytarza dla krawędzi (px) */
  edgeThickness: number;
  /** Maksymalna liczba iteracji korekt */
  maxIterations: number;
}

/** Domyślne clearances (PowerFactory/ETAP-grade). */
export const DEFAULT_COLLISION_CONFIG: CollisionConfig = {
  symbolClearance: 24,
  labelSymbolClearance: 16,
  labelEdgeClearance: 12,
  busbarPadding: 20,
  labelCharWidth: 7,
  labelHeight: 12,
  edgeThickness: 6,
  maxIterations: 20,
};

// =============================================================================
// TYPY WEWNĘTRZNE
// =============================================================================

/** Węzeł w grafie layoutu */
interface LayoutNode {
  id: string;
  symbolId: string;
  elementType: string;
  layer: number;
  order: number; // Pozycja w warstwie
  x: number;
  y: number;
  width: number;
  height: number;
  connections: string[]; // ID połączonych węzłów
}

/** Krawędź w grafie layoutu */
interface LayoutEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  symbolId: string; // ID symbolu Branch/Switch
}

/** Graf layoutu */
interface LayoutGraph {
  nodes: Map<string, LayoutNode>;
  edges: LayoutEdge[];
}

/** Wynik auto-layoutu */
export interface AutoLayoutResult {
  /** Nowe pozycje symboli */
  positions: Map<string, Position>;
  /** Informacje debugowe */
  debug: {
    layers: Map<number, string[]>;
    totalLayers: number;
    totalNodes: number;
  };
}

// =============================================================================
// ETAP-GRADE LAYOUT — VOLTAGE LEVEL DETECTION
// =============================================================================

/**
 * Voltage level classification for ETAP layout.
 */
type VoltageLevel = 'WN' | 'SN' | 'nN' | 'unknown';

/**
 * Detect voltage level from bus name or voltage attribute.
 * DETERMINISTIC: Same name → same classification.
 *
 * WN (High Voltage): 110kV+
 * SN (Medium Voltage): 6-30kV
 * nN (Low Voltage): <1kV
 */
function detectBusVoltageLevel(symbol: AnySldSymbol): VoltageLevel {
  const name = symbol.elementName.toLowerCase();
  const voltage = (symbol as any).voltage || (symbol as any).voltageKV;

  // Check explicit voltage attribute
  if (voltage !== undefined) {
    const v = typeof voltage === 'string' ? parseFloat(voltage) : voltage;
    if (v >= 110) return 'WN';
    if (v >= 6) return 'SN';
    if (v > 0 && v < 1) return 'nN';
  }

  // Check name patterns (Polish naming conventions)
  if (name.includes('110') || name.includes('wn') || name.includes('wysokie')) {
    return 'WN';
  }
  if (
    name.includes('15') ||
    name.includes('20') ||
    name.includes('sn') ||
    name.includes('średnie') ||
    name.includes('srednie')
  ) {
    return 'SN';
  }
  if (name.includes('0.4') || name.includes('nn') || name.includes('niskie')) {
    return 'nN';
  }

  // Default to SN for most MV networks
  return 'SN';
}

/**
 * Check if a symbol is connected to a transformer.
 * Used to identify WN/SN busbar hierarchy.
 */
function isConnectedToTransformer(
  symbol: AnySldSymbol,
  transformers: AnySldSymbol[],
  elementToSymbol: Map<string, string>
): { connected: boolean; side: 'primary' | 'secondary' | null } {
  for (const trafo of transformers) {
    const branch = trafo as BranchSymbol;
    const fromSymbolId = elementToSymbol.get(branch.fromNodeId);
    const toSymbolId = elementToSymbol.get(branch.toNodeId);

    if (fromSymbolId === symbol.id) {
      return { connected: true, side: 'primary' };
    }
    if (toSymbolId === symbol.id) {
      return { connected: true, side: 'secondary' };
    }
  }
  return { connected: false, side: null };
}

// =============================================================================
// ETAP-GRADE LAYOUT — BAY IDENTIFICATION
// =============================================================================

/**
 * A "bay" is a feeder position on a busbar (switch + line/load).
 */
interface EtapBay {
  /** Busbar this bay connects to */
  busbarId: string;
  /** Switch symbol in the bay (if any) */
  switchId: string | null;
  /** Branch/line symbol in the bay (if any) */
  branchId: string | null;
  /** Load symbol in the bay (if any) */
  loadId: string | null;
  /** All symbols that are part of this bay */
  symbolIds: string[];
  /** Bay index for positioning */
  index: number;
}

/**
 * Identify bays (feeders) connected to a busbar.
 * A bay typically consists of: busbar → switch → line/load
 */
function identifyBays(
  busbarSymbol: AnySldSymbol,
  symbols: AnySldSymbol[],
  _elementToSymbol: Map<string, string>
): EtapBay[] {
  const bays: EtapBay[] = [];
  const busbarElementId = busbarSymbol.elementId;

  // Find all switches connected to this busbar
  const connectedSwitches = symbols.filter((s) => {
    if (s.elementType !== 'Switch') return false;
    const sw = s as SwitchSymbol;
    return sw.fromNodeId === busbarElementId || sw.toNodeId === busbarElementId;
  });

  // For each switch, find what it connects to (line/load)
  connectedSwitches.forEach((switchSymbol, index) => {
    const sw = switchSymbol as SwitchSymbol;
    const otherNodeId = sw.fromNodeId === busbarElementId ? sw.toNodeId : sw.fromNodeId;

    const bay: EtapBay = {
      busbarId: busbarSymbol.id,
      switchId: switchSymbol.id,
      branchId: null,
      loadId: null,
      symbolIds: [switchSymbol.id],
      index,
    };

    // Find what the switch connects to
    const connectedBranch = symbols.find((s) => {
      if (s.elementType !== 'LineBranch') return false;
      const branch = s as BranchSymbol;
      return branch.fromNodeId === otherNodeId || branch.toNodeId === otherNodeId;
    });

    if (connectedBranch) {
      bay.branchId = connectedBranch.id;
      bay.symbolIds.push(connectedBranch.id);
    }

    const connectedLoad = symbols.find((s) => {
      if (s.elementType !== 'Load') return false;
      return (s as any).connectedToNodeId === otherNodeId;
    });

    if (connectedLoad) {
      bay.loadId = connectedLoad.id;
      bay.symbolIds.push(connectedLoad.id);
    }

    bays.push(bay);
  });

  // Also find direct branch connections (without switch)
  const directBranches = symbols.filter((s) => {
    if (s.elementType !== 'LineBranch' && s.elementType !== 'TransformerBranch') return false;
    const branch = s as BranchSymbol;
    // Check if directly connected to busbar and not already in a bay
    const isConnected = branch.fromNodeId === busbarElementId || branch.toNodeId === busbarElementId;
    if (!isConnected) return false;
    // Check if already covered by a switch bay
    return !bays.some((b) => b.branchId === s.id);
  });

  directBranches.forEach((branch) => {
    bays.push({
      busbarId: busbarSymbol.id,
      switchId: null,
      branchId: branch.id,
      loadId: null,
      symbolIds: [branch.id],
      index: bays.length,
    });
  });

  // Sort bays by switch ID for determinism
  bays.sort((a, b) => {
    const aKey = a.switchId || a.branchId || '';
    const bKey = b.switchId || b.branchId || '';
    return aKey.localeCompare(bKey);
  });

  // Re-index after sorting
  bays.forEach((bay, i) => (bay.index = i));

  return bays;
}

// =============================================================================
// GŁÓWNA FUNKCJA AUTO-LAYOUT (ETAP-GRADE)
// =============================================================================

/**
 * Wygeneruj deterministyczny ETAP-grade layout dla symboli SLD.
 *
 * PR-SLD-ETAP-GEOMETRY-01: ETAP-grade geometria SLD
 *
 * DETERMINIZM: Ten sam zestaw symboli → ten sam układ
 *
 * ETAP RULES:
 * - WN busbar at top
 * - Transformer between WN and SN
 * - SN busbar below transformer
 * - Feeders exit VERTICALLY from SN busbar
 * - Busbars auto-expand based on bay count
 *
 * @param symbols - Symbole SLD do rozmieszczenia
 * @param config - Konfiguracja layoutu (opcjonalna)
 * @returns Mapa ID symbolu → nowa pozycja
 */
export function generateAutoLayout(
  symbols: AnySldSymbol[],
  config: Partial<AutoLayoutConfig> = {}
): AutoLayoutResult {
  const cfg: AutoLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };

  // If no symbols, return empty result
  if (symbols.length === 0) {
    return {
      positions: new Map(),
      debug: {
        layers: new Map(),
        totalLayers: 0,
        totalNodes: 0,
      },
    };
  }

  // Build element ID to symbol ID mapping
  const elementToSymbol = new Map<string, string>();
  symbols.forEach((s) => elementToSymbol.set(s.elementId, s.id));

  // Build symbol ID to symbol mapping
  const symbolById = new Map<string, AnySldSymbol>();
  symbols.forEach((s) => symbolById.set(s.id, s));

  // Classify symbols
  const busbars = symbols.filter((s) => s.elementType === 'Bus');
  const transformers = symbols.filter((s) => s.elementType === 'TransformerBranch');
  const sources = symbols.filter((s) => s.elementType === 'Source');
  const switches = symbols.filter((s) => s.elementType === 'Switch');
  const lineBranches = symbols.filter((s) => s.elementType === 'LineBranch');
  const loads = symbols.filter((s) => s.elementType === 'Load');

  // Detect voltage levels for busbars
  const busbarVoltages = new Map<string, VoltageLevel>();
  busbars.forEach((bus) => {
    let level = detectBusVoltageLevel(bus);

    // If connected to transformer primary side, it's likely WN
    const trafoConnection = isConnectedToTransformer(bus, transformers, elementToSymbol);
    if (trafoConnection.connected) {
      if (trafoConnection.side === 'primary') {
        level = 'WN';
      } else if (trafoConnection.side === 'secondary') {
        level = 'SN';
      }
    }

    busbarVoltages.set(bus.id, level);
  });

  // Find WN and SN busbars
  const wnBusbars = busbars.filter((b) => busbarVoltages.get(b.id) === 'WN');
  const snBusbars = busbars.filter((b) => busbarVoltages.get(b.id) === 'SN');
  // Note: nN busbars support can be added later if needed
  // const nnBusbars = busbars.filter((b) => busbarVoltages.get(b.id) === 'nN');

  // If no clear hierarchy, treat all busbars as SN
  const hasHierarchy = wnBusbars.length > 0 && snBusbars.length > 0;

  // Identify bays for each SN busbar
  const baysByBusbar = new Map<string, EtapBay[]>();
  const targetBusbars = hasHierarchy ? snBusbars : busbars;
  targetBusbars.forEach((bus) => {
    const bays = identifyBays(bus, symbols, elementToSymbol);
    baysByBusbar.set(bus.id, bays);
  });

  // Calculate positions
  const positions = new Map<string, Position>();
  const { gridSize, padding } = cfg;

  // Calculate canvas center X
  const maxBayCount = Math.max(
    1,
    ...Array.from(baysByBusbar.values()).map((bays) => bays.length)
  );
  const maxBusbarWidth = calculateBusbarWidth(maxBayCount);
  const centerX = Math.round((padding + maxBusbarWidth / 2) / gridSize) * gridSize;

  // Track Y position as we build layers
  let currentY = padding;

  // LAYER 0: Sources (above WN busbar)
  if (sources.length > 0) {
    const sourceSpacing = cfg.nodeSpacing;
    const totalSourceWidth = (sources.length - 1) * sourceSpacing;
    const startX = centerX - totalSourceWidth / 2;

    sources.sort((a, b) => a.id.localeCompare(b.id)); // Determinism
    sources.forEach((source, i) => {
      const x = Math.round((startX + i * sourceSpacing) / gridSize) * gridSize;
      const y = Math.round(currentY / gridSize) * gridSize;
      positions.set(source.id, { x, y });
    });
    currentY += ETAP_GEOMETRY.source.symbolHeight + ETAP_GEOMETRY.source.offsetAboveBusbar;
  }

  // LAYER 1: WN Busbar (if present)
  if (hasHierarchy && wnBusbars.length > 0) {
    const wnBusbar = wnBusbars[0]; // Assume single WN busbar
    const wnBays = baysByBusbar.get(wnBusbar.id) || [];
    const wnBusbarWidth = calculateBusbarWidth(Math.max(1, wnBays.length, transformers.length));

    const wnY = Math.round(currentY / gridSize) * gridSize;
    positions.set(wnBusbar.id, { x: centerX, y: wnY });

    // Store busbar width for later use
    const wnNodeSymbol = wnBusbar as NodeSymbol;
    if ('width' in wnNodeSymbol) {
      (wnNodeSymbol as any).width = wnBusbarWidth;
    }

    currentY = wnY + ETAP_GEOMETRY.transformer.offsetFromWN;
  }

  // LAYER 2: Transformers (between WN and SN)
  if (transformers.length > 0) {
    const trafoSpacing = cfg.nodeSpacing;
    const totalTrafoWidth = (transformers.length - 1) * trafoSpacing;
    const startX = centerX - totalTrafoWidth / 2;

    transformers.sort((a, b) => a.id.localeCompare(b.id)); // Determinism
    transformers.forEach((trafo, i) => {
      const x = Math.round((startX + i * trafoSpacing) / gridSize) * gridSize;
      const y = Math.round(currentY / gridSize) * gridSize;
      positions.set(trafo.id, { x, y });
    });
    currentY += ETAP_GEOMETRY.transformer.symbolHeight + ETAP_GEOMETRY.transformer.offsetToSN;
  }

  // LAYER 3: SN Busbar
  const snY = Math.round(currentY / gridSize) * gridSize;
  targetBusbars.forEach((bus) => {
    const bays = baysByBusbar.get(bus.id) || [];
    const busbarWidth = calculateBusbarWidth(bays.length);

    // Position busbar
    const busX = centerX;
    positions.set(bus.id, { x: busX, y: snY });

    // Store busbar width
    const nodeSymbol = bus as NodeSymbol;
    if ('width' in nodeSymbol) {
      (nodeSymbol as any).width = busbarWidth;
    }

    // LAYER 4+: Bays (feeders) — VERTICAL from SN busbar
    if (bays.length > 0) {
      const bayPositions = calculateBayPositions(bays.length, busX, busbarWidth);

      bays.forEach((bay, bayIndex) => {
        const bayX = bayPositions[bayIndex];
        let bayY = snY + ETAP_GEOMETRY.bay.verticalOffset;

        // Position switch (if present)
        if (bay.switchId) {
          const switchY = Math.round(bayY / gridSize) * gridSize;
          positions.set(bay.switchId, { x: bayX, y: switchY });
          bayY += ETAP_GEOMETRY.bay.elementSpacing;
        }

        // Position branch (if present)
        if (bay.branchId) {
          const branchY = Math.round(bayY / gridSize) * gridSize;
          positions.set(bay.branchId, { x: bayX, y: branchY });
          bayY += ETAP_GEOMETRY.bay.elementSpacing;
        }

        // Position load (if present)
        if (bay.loadId) {
          const loadY = Math.round(bayY / gridSize) * gridSize;
          positions.set(bay.loadId, { x: bayX, y: loadY });
        }
      });
    }
  });

  // Position any remaining unpositioned symbols using fallback layout
  const unpositioned = symbols.filter((s) => !positions.has(s.id));
  if (unpositioned.length > 0) {
    // Use legacy BFS layout for unpositioned symbols
    const legacyResult = generateLegacyLayout(unpositioned, cfg, positions);
    legacyResult.forEach((pos, id) => {
      if (!positions.has(id)) {
        positions.set(id, pos);
      }
    });
  }

  // Build debug info
  const layers = new Map<number, string[]>();
  let layerIndex = 0;

  // Add sources to layer 0
  if (sources.length > 0) {
    layers.set(layerIndex++, sources.map((s) => s.id));
  }

  // Add WN busbars to next layer
  if (wnBusbars.length > 0) {
    layers.set(layerIndex++, wnBusbars.map((s) => s.id));
  }

  // Add transformers
  if (transformers.length > 0) {
    layers.set(layerIndex++, transformers.map((s) => s.id));
  }

  // Add SN busbars
  if (targetBusbars.length > 0) {
    layers.set(layerIndex++, targetBusbars.map((s) => s.id));
  }

  // Add switches
  if (switches.length > 0) {
    layers.set(layerIndex++, switches.map((s) => s.id));
  }

  // Add line branches
  if (lineBranches.length > 0) {
    layers.set(layerIndex++, lineBranches.map((s) => s.id));
  }

  // Add loads
  if (loads.length > 0) {
    layers.set(layerIndex++, loads.map((s) => s.id));
  }

  return {
    positions,
    debug: {
      layers,
      totalLayers: layerIndex,
      totalNodes: symbols.length,
    },
  };
}

/**
 * Legacy BFS-based layout for unpositioned symbols.
 * Used as fallback for symbols not covered by ETAP-grade layout.
 */
function generateLegacyLayout(
  symbols: AnySldSymbol[],
  config: AutoLayoutConfig,
  existingPositions: Map<string, Position>
): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Find the maximum Y from existing positions
  let maxY = config.padding;
  existingPositions.forEach((pos) => {
    maxY = Math.max(maxY, pos.y);
  });

  // Position unpositioned symbols below existing ones
  const startY = maxY + config.layerSpacing;
  const centerX = config.padding + config.busMinWidth / 2;

  symbols.sort((a, b) => a.id.localeCompare(b.id)); // Determinism
  symbols.forEach((symbol, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;

    const x = Math.round((centerX + (col - 1.5) * config.nodeSpacing) / config.gridSize) * config.gridSize;
    const y = Math.round((startY + row * config.layerSpacing) / config.gridSize) * config.gridSize;

    positions.set(symbol.id, { x, y });
  });

  return positions;
}

// =============================================================================
// LEGACY FUNCTIONS (kept for reference, not used by ETAP-grade layout)
// PR-SLD-ETAP-GEOMETRY-01: These functions are from the original BFS-based layout
// algorithm. The new ETAP-grade layout uses a different approach based on
// voltage level hierarchy and bay identification.
// These functions can be removed once the ETAP-grade layout is fully validated.
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore - Legacy functions kept for reference

/**
 * [LEGACY] Buduj graf layoutu z symboli SLD.
 */
// @ts-ignore - Legacy function, kept for reference
function _buildLayoutGraph(symbols: AnySldSymbol[]): LayoutGraph {
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];

  // Mapuj element ID → symbol ID dla szybkiego lookup
  const elementToSymbol = new Map<string, string>();
  symbols.forEach((s) => elementToSymbol.set(s.elementId, s.id));

  // Dodaj węzły (Bus, Source, Load)
  symbols.forEach((symbol) => {
    if (symbol.elementType === 'Bus' || symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const nodeSymbol = symbol as NodeSymbol;
      nodes.set(symbol.id, {
        id: symbol.id,
        symbolId: symbol.id,
        elementType: symbol.elementType,
        layer: -1, // Nieprzypisana
        order: 0,
        x: 0,
        y: 0,
        width: symbol.elementType === 'Bus' && 'width' in symbol ? nodeSymbol.width : 60,
        height: symbol.elementType === 'Bus' && 'height' in symbol ? nodeSymbol.height : 40,
        connections: [],
      });
    }
  });

  // Dodaj krawędzie (Branch, Switch) i połączenia
  symbols.forEach((symbol) => {
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;
      const fromSymbolId = elementToSymbol.get(branch.fromNodeId);
      const toSymbolId = elementToSymbol.get(branch.toNodeId);

      if (fromSymbolId && toSymbolId) {
        edges.push({
          id: `edge_${symbol.id}`,
          fromNodeId: fromSymbolId,
          toNodeId: toSymbolId,
          symbolId: symbol.id,
        });

        // Dodaj połączenia do węzłów
        const fromNode = nodes.get(fromSymbolId);
        const toNode = nodes.get(toSymbolId);
        if (fromNode) fromNode.connections.push(toSymbolId);
        if (toNode) toNode.connections.push(fromSymbolId);
      }
    }

    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;
      const fromSymbolId = elementToSymbol.get(sw.fromNodeId);
      const toSymbolId = elementToSymbol.get(sw.toNodeId);

      if (fromSymbolId && toSymbolId) {
        edges.push({
          id: `edge_${symbol.id}`,
          fromNodeId: fromSymbolId,
          toNodeId: toSymbolId,
          symbolId: symbol.id,
        });

        const fromNode = nodes.get(fromSymbolId);
        const toNode = nodes.get(toSymbolId);
        if (fromNode) fromNode.connections.push(toSymbolId);
        if (toNode) toNode.connections.push(fromSymbolId);
      }
    }

    // Source i Load mają connectedToNodeId
    if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const connectedNodeId = (symbol as any).connectedToNodeId;
      if (connectedNodeId) {
        const connectedSymbolId = elementToSymbol.get(connectedNodeId);
        if (connectedSymbolId) {
          edges.push({
            id: `edge_${symbol.id}`,
            fromNodeId: symbol.id,
            toNodeId: connectedSymbolId,
            symbolId: symbol.id,
          });

          const sourceNode = nodes.get(symbol.id);
          const connectedNode = nodes.get(connectedSymbolId);
          if (sourceNode) sourceNode.connections.push(connectedSymbolId);
          if (connectedNode) connectedNode.connections.push(symbol.id);
        }
      }
    }
  });

  return { nodes, edges };
}

// =============================================================================
// KROK 2: ZNAJDŹ ŹRÓDŁA (ROOTS)
// =============================================================================

/**
 * [LEGACY] Znajdź węzły źródłowe (Source, lub węzły bez krawędzi wchodzących).
 */
// @ts-ignore - Legacy function, kept for reference
function _findRoots(graph: LayoutGraph, _symbols: AnySldSymbol[]): string[] {
  const roots: string[] = [];

  // Priorytet 1: Source (utility_feeder, generator, pv, fw, bess)
  graph.nodes.forEach((layoutNode, id) => {
    if (layoutNode.elementType === 'Source') {
      roots.push(id);
    }
  });

  // Jeśli brak Source, znajdź węzły bez krawędzi wchodzących
  if (roots.length === 0) {
    const hasIncoming = new Set<string>();
    graph.edges.forEach((edge) => {
      hasIncoming.add(edge.toNodeId);
    });

    graph.nodes.forEach((_layoutNode, id) => {
      if (!hasIncoming.has(id)) {
        roots.push(id);
      }
    });
  }

  // Fallback: pierwszy węzeł Bus (sortowany po ID dla determinizmu)
  if (roots.length === 0) {
    const busNodes = Array.from(graph.nodes.values())
      .filter((n) => n.elementType === 'Bus')
      .sort((a, b) => a.id.localeCompare(b.id));
    if (busNodes.length > 0) {
      roots.push(busNodes[0].id);
    }
  }

  // DETERMINIZM: Sortuj roots
  roots.sort();

  return roots;
}

// =============================================================================
// KROK 3: PRZYPISZ WARSTWY (BFS)
// =============================================================================

/**
 * [LEGACY] Przypisz warstwy węzłom (BFS od źródeł).
 * Źródła mają layer=0, sąsiedzi layer=1, itd.
 */
// @ts-ignore - Legacy function, kept for reference
function _assignLayers(graph: LayoutGraph, roots: string[]): void {
  const visited = new Set<string>();
  const queue: Array<{ id: string; layer: number }> = [];

  // Inicjalizuj kolejkę źródłami
  roots.forEach((rootId) => {
    queue.push({ id: rootId, layer: 0 });
    visited.add(rootId);
  });

  // BFS
  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    const node = graph.nodes.get(id);
    if (!node) continue;

    node.layer = layer;

    // Dodaj sąsiadów do kolejki
    node.connections.forEach((neighborId) => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, layer: layer + 1 });
      }
    });
  }

  // Przypisz nieodwiedzone węzły do ostatniej warstwy (wyspy)
  const maxLayer = Math.max(...Array.from(graph.nodes.values()).map((n) => n.layer), 0);
  graph.nodes.forEach((node) => {
    if (node.layer === -1) {
      node.layer = maxLayer + 1;
    }
  });
}

// =============================================================================
// KROK 4: SORTUJ W WARSTWACH (MINIMALIZACJA SKRZYŻOWAŃ)
// =============================================================================

/**
 * [LEGACY] Sortuj węzły w każdej warstwie, minimalizując skrzyżowania.
 * Używa heurystyki barycentric (średnia pozycja sąsiadów).
 */
// @ts-ignore - Legacy function, kept for reference
function _sortWithinLayers(graph: LayoutGraph): void {
  // Grupuj węzły po warstwach
  const layers = new Map<number, LayoutNode[]>();
  graph.nodes.forEach((node) => {
    if (!layers.has(node.layer)) {
      layers.set(node.layer, []);
    }
    layers.get(node.layer)!.push(node);
  });

  // Sortuj każdą warstwę
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

  sortedLayers.forEach((layerNum, layerIndex) => {
    const nodesInLayer = layers.get(layerNum)!;

    if (layerIndex === 0) {
      // Pierwsza warstwa: sortuj po ID (determinizm)
      nodesInLayer.sort((a, b) => a.id.localeCompare(b.id));
    } else {
      // Pozostałe warstwy: barycentric ordering
      const prevLayer = layers.get(sortedLayers[layerIndex - 1]) || [];
      const prevPositions = new Map<string, number>();
      prevLayer.forEach((node, idx) => prevPositions.set(node.id, idx));

      // Oblicz barycenter dla każdego węzła
      nodesInLayer.forEach((node) => {
        const neighborPositions = node.connections
          .filter((nId) => prevPositions.has(nId))
          .map((nId) => prevPositions.get(nId)!);

        if (neighborPositions.length > 0) {
          node.order = neighborPositions.reduce((a, b) => a + b, 0) / neighborPositions.length;
        } else {
          node.order = Infinity; // Węzły bez sąsiadów w poprzedniej warstwie na końcu
        }
      });

      // Sortuj po barycenter, tie-break po ID
      nodesInLayer.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.id.localeCompare(b.id);
      });
    }

    // Przypisz finalne order
    nodesInLayer.forEach((node, idx) => {
      node.order = idx;
    });
  });
}

// =============================================================================
// KROK 5: OBLICZ WSPÓŁRZĘDNE X/Y — SPINE LAYOUT (PLANS STYLE)
// =============================================================================

/**
 * [LEGACY] Oblicz finalne współrzędne X/Y dla każdego węzła.
 *
 * SPINE LAYOUT (inspiracja Plans):
 * - Główna ścieżka (spine) na jednej osi X
 * - Elementy ułożone PIONOWO (góra → dół)
 * - Szyny poziome w wyznaczonych miejscach
 * - Odbiory i źródła jako gałęzie boczne
 */
// @ts-ignore - Legacy function, kept for reference
function _computeCoordinates(
  graph: LayoutGraph,
  config: AutoLayoutConfig
): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Grupuj po warstwach
  const layers = new Map<number, LayoutNode[]>();
  graph.nodes.forEach((node) => {
    if (!layers.has(node.layer)) {
      layers.set(node.layer, []);
    }
    layers.get(node.layer)!.push(node);
  });

  // SPINE LAYOUT: Oblicz centralną oś X
  // Dla większości topologii sieci SN/nN używamy jednej osi pionowej
  const maxNodesInLayer = Math.max(...Array.from(layers.values()).map(l => l.length), 1);

  // Oblicz szerokość canvas potrzebną dla bocznych gałęzi
  const canvasWidth = config.padding * 2 + maxNodesInLayer * config.nodeSpacing;
  const SPINE_X = Math.round(canvasWidth / 2 / config.gridSize) * config.gridSize;

  // Oblicz pozycje
  const sortedLayerNums = Array.from(layers.keys()).sort((a, b) => a - b);

  sortedLayerNums.forEach((layerNum) => {
    const nodesInLayer = layers.get(layerNum)!;
    // Sortuj po order
    nodesInLayer.sort((a, b) => a.order - b.order);

    nodesInLayer.forEach((node, idx) => {
      let x: number;
      let y: number;

      if (config.direction === 'top-down') {
        // SPINE LAYOUT: Główna oś na środku
        if (nodesInLayer.length === 1) {
          // Pojedynczy węzeł na warstwie → na spine
          x = SPINE_X;
        } else {
          // Wiele węzłów na warstwie → rozłóż wokół spine
          const layerWidth = (nodesInLayer.length - 1) * config.nodeSpacing;
          const startX = SPINE_X - layerWidth / 2;
          x = startX + idx * config.nodeSpacing;
        }
        y = config.padding + layerNum * config.layerSpacing;
      } else {
        // left-right (rzadko używane dla SLD)
        x = config.padding + layerNum * config.layerSpacing;
        if (nodesInLayer.length === 1) {
          y = SPINE_X;
        } else {
          const layerHeight = (nodesInLayer.length - 1) * config.nodeSpacing;
          const startY = SPINE_X - layerHeight / 2;
          y = startY + idx * config.nodeSpacing;
        }
      }

      // Snap to grid
      x = Math.round(x / config.gridSize) * config.gridSize;
      y = Math.round(y / config.gridSize) * config.gridSize;

      node.x = x;
      node.y = y;

      positions.set(node.symbolId, { x, y });
    });
  });

  return positions;
}

/* eslint-enable @typescript-eslint/no-unused-vars */

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

/**
 * Zastosuj wynik auto-layoutu do symboli.
 *
 * @param symbols - Oryginalne symbole
 * @param positions - Nowe pozycje z auto-layoutu
 * @returns Symbole z nowymi pozycjami
 */
export function applyLayoutToSymbols(
  symbols: AnySldSymbol[],
  positions: Map<string, Position>
): AnySldSymbol[] {
  return symbols.map((symbol) => {
    const newPos = positions.get(symbol.id);
    if (newPos) {
      return { ...symbol, position: newPos };
    }
    return symbol;
  });
}

/**
 * Weryfikuj czy layout jest deterministyczny.
 *
 * @param symbols - Symbole SLD
 * @returns true jeśli layout jest deterministyczny
 */
export function verifyLayoutDeterminism(symbols: AnySldSymbol[]): boolean {
  const result1 = generateAutoLayout(symbols);
  const result2 = generateAutoLayout(symbols);

  // Porównaj pozycje
  for (const [id, pos1] of result1.positions) {
    const pos2 = result2.positions.get(id);
    if (!pos2 || pos1.x !== pos2.x || pos1.y !== pos2.y) {
      return false;
    }
  }

  return true;
}
