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
  calculateTransformerPositions,
  calculateSectionedBusbar,
  calculateSectionBayPositions,
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
    /** PR-SLD-ETAP-GEOMETRY-FULL: Floating symbols (ETAP violation) */
    floatingSymbols: string[];
    /** Number of transformers in parallel */
    transformerCount: number;
    /** Busbar section info */
    busbarSections: Map<string, number>;
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
  /** Section assignment (for sectioned busbars) */
  sectionId?: string;
}

// EtapBusbarInfo interface reserved for future use with enhanced busbar metadata
// Currently, busbar info is tracked via separate Maps for simplicity

/**
 * Detect if a busbar is sectioned based on name patterns or coupler presence.
 * DETERMINISTIC: Same busbar name → same section detection.
 *
 * Patterns recognized:
 * - "SN-A" / "SN-B" → separate sections
 * - "SN sekcja 1" / "SN sekcja 2" → separate sections
 * - Single busbar with "sekcja" in name → 2 sections
 * - Busbar with coupler switch → 2 sections
 */
function detectBusbarSections(
  busbar: AnySldSymbol,
  symbols: AnySldSymbol[]
): number {
  const name = busbar.elementName.toLowerCase();

  // Check for section indicators in name
  if (name.includes('sekcja') || name.includes('section') || name.includes('system')) {
    // If name indicates multi-section, return 2
    if (/sekcj[ai]\s*[12ab]/i.test(name) || /section\s*[12ab]/i.test(name)) {
      return 1; // This is one section of a multi-section system
    }
    // Generic "sekcja" without number → assume 2 sections
    return 2;
  }

  // Check for coupler switch connected to busbar
  const hasCoupler = symbols.some((s) => {
    if (s.elementType !== 'Switch') return false;
    const sw = s as SwitchSymbol;
    const isCoupler =
      s.elementName.toLowerCase().includes('sprze') ||
      s.elementName.toLowerCase().includes('coupler') ||
      s.elementName.toLowerCase().includes('tie');
    const connectedToBus =
      sw.fromNodeId === busbar.elementId || sw.toNodeId === busbar.elementId;
    return isCoupler && connectedToBus;
  });

  if (hasCoupler) {
    return 2;
  }

  return 1; // No sectioning
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
// NO FLOATING SYMBOL HELPERS (PR-SLD-ETAP-GEOMETRY-FULL)
// =============================================================================

/**
 * Check if a symbol has any connection to positioned elements.
 * DETERMINISTIC: Connection check based on topology, not position.
 */
function checkSymbolConnection(
  symbol: AnySldSymbol,
  allSymbols: AnySldSymbol[],
  positions: Map<string, Position>,
  elementToSymbol: Map<string, string>
): boolean {
  // Branch has fromNodeId/toNodeId
  if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
    const branch = symbol as BranchSymbol;
    const fromSymbolId = elementToSymbol.get(branch.fromNodeId);
    const toSymbolId = elementToSymbol.get(branch.toNodeId);
    return (
      (fromSymbolId !== undefined && positions.has(fromSymbolId)) ||
      (toSymbolId !== undefined && positions.has(toSymbolId))
    );
  }

  // Switch has fromNodeId/toNodeId
  if (symbol.elementType === 'Switch') {
    const sw = symbol as SwitchSymbol;
    const fromSymbolId = elementToSymbol.get(sw.fromNodeId);
    const toSymbolId = elementToSymbol.get(sw.toNodeId);
    return (
      (fromSymbolId !== undefined && positions.has(fromSymbolId)) ||
      (toSymbolId !== undefined && positions.has(toSymbolId))
    );
  }

  // Source/Load has connectedToNodeId
  if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
    const connectedNodeId = (symbol as any).connectedToNodeId;
    if (connectedNodeId) {
      const connectedSymbolId = elementToSymbol.get(connectedNodeId);
      return connectedSymbolId !== undefined && positions.has(connectedSymbolId);
    }
  }

  // Bus: check if any element references this bus
  if (symbol.elementType === 'Bus') {
    // A bus is connected if any positioned element references it
    return allSymbols.some((s) => {
      if (!positions.has(s.id)) return false;

      if (s.elementType === 'LineBranch' || s.elementType === 'TransformerBranch') {
        const branch = s as BranchSymbol;
        return branch.fromNodeId === symbol.elementId || branch.toNodeId === symbol.elementId;
      }
      if (s.elementType === 'Switch') {
        const sw = s as SwitchSymbol;
        return sw.fromNodeId === symbol.elementId || sw.toNodeId === symbol.elementId;
      }
      if (s.elementType === 'Source' || s.elementType === 'Load') {
        return (s as any).connectedToNodeId === symbol.elementId;
      }
      return false;
    });
  }

  return false;
}

/**
 * Find a position for a symbol relative to its connected elements.
 * DETERMINISTIC: Same connections → same position.
 */
function findConnectedPosition(
  symbol: AnySldSymbol,
  _allSymbols: AnySldSymbol[], // Reserved for future topology-aware positioning
  positions: Map<string, Position>,
  elementToSymbol: Map<string, string>,
  config: AutoLayoutConfig
): Position | null {
  const { gridSize } = config;

  // Find connected positioned symbol
  let connectedSymbolId: string | undefined;
  let connectionOffset: { x: number; y: number } = { x: 0, y: ETAP_GEOMETRY.bay.elementSpacing };

  if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
    const branch = symbol as BranchSymbol;
    const fromSymbolId = elementToSymbol.get(branch.fromNodeId);
    const toSymbolId = elementToSymbol.get(branch.toNodeId);
    connectedSymbolId = fromSymbolId && positions.has(fromSymbolId) ? fromSymbolId : toSymbolId;
  } else if (symbol.elementType === 'Switch') {
    const sw = symbol as SwitchSymbol;
    const fromSymbolId = elementToSymbol.get(sw.fromNodeId);
    const toSymbolId = elementToSymbol.get(sw.toNodeId);
    connectedSymbolId = fromSymbolId && positions.has(fromSymbolId) ? fromSymbolId : toSymbolId;
  } else if (symbol.elementType === 'Source') {
    const connectedNodeId = (symbol as any).connectedToNodeId;
    connectedSymbolId = connectedNodeId ? elementToSymbol.get(connectedNodeId) : undefined;
    connectionOffset = { x: 0, y: -ETAP_GEOMETRY.source.offsetAboveBusbar }; // Source above busbar
  } else if (symbol.elementType === 'Load') {
    const connectedNodeId = (symbol as any).connectedToNodeId;
    connectedSymbolId = connectedNodeId ? elementToSymbol.get(connectedNodeId) : undefined;
    connectionOffset = { x: 0, y: ETAP_GEOMETRY.bay.elementSpacing }; // Load below
  }

  if (connectedSymbolId && positions.has(connectedSymbolId)) {
    const connectedPos = positions.get(connectedSymbolId)!;
    return {
      x: Math.round((connectedPos.x + connectionOffset.x) / gridSize) * gridSize,
      y: Math.round((connectedPos.y + connectionOffset.y) / gridSize) * gridSize,
    };
  }

  return null;
}

/**
 * Generate fallback positions for symbols that couldn't be positioned.
 * These symbols will be marked as "floating" (ETAP violation).
 */
function generateFallbackPositions(
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

  // Position unpositioned symbols below existing ones (with warning indicator offset)
  const startY = maxY + config.layerSpacing * 2; // Extra offset to visually indicate issue
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
        floatingSymbols: [],
        transformerCount: 0,
        busbarSections: new Map(),
      },
    };
  }

  // Build element ID to symbol ID mapping
  const elementToSymbol = new Map<string, string>();
  symbols.forEach((s) => elementToSymbol.set(s.elementId, s.id));

  // Build symbol ID to symbol mapping
  const symbolById = new Map<string, AnySldSymbol>();
  symbols.forEach((s) => symbolById.set(s.id, s));

  // Classify symbols — SORT BY ID FOR DETERMINISM
  // This ensures that the same set of symbols always produces the same layout
  // regardless of input order
  const busbars = symbols.filter((s) => s.elementType === 'Bus').sort((a, b) => a.id.localeCompare(b.id));
  const transformers = symbols.filter((s) => s.elementType === 'TransformerBranch').sort((a, b) => a.id.localeCompare(b.id));
  const sources = symbols.filter((s) => s.elementType === 'Source').sort((a, b) => a.id.localeCompare(b.id));
  const switches = symbols.filter((s) => s.elementType === 'Switch').sort((a, b) => a.id.localeCompare(b.id));
  const lineBranches = symbols.filter((s) => s.elementType === 'LineBranch').sort((a, b) => a.id.localeCompare(b.id));
  const loads = symbols.filter((s) => s.elementType === 'Load').sort((a, b) => a.id.localeCompare(b.id));

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

  // Find WN and SN busbars (already sorted by ID from busbars array)
  const wnBusbars = busbars.filter((b) => busbarVoltages.get(b.id) === 'WN');
  const snBusbars = busbars.filter((b) => busbarVoltages.get(b.id) === 'SN');
  // Note: nN busbars support can be added later if needed
  // const nnBusbars = busbars.filter((b) => busbarVoltages.get(b.id) === 'nN');

  // If no clear hierarchy, treat all busbars as SN (already sorted)
  const hasHierarchy = wnBusbars.length > 0 && snBusbars.length > 0;

  // Identify bays for each SN busbar
  const baysByBusbar = new Map<string, EtapBay[]>();
  // targetBusbars is already sorted since busbars is sorted
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

  // LAYER 2: Transformers (between WN and SN) — MULTI-TRANSFORMER ETAP-GRADE
  if (transformers.length > 0) {
    // Sort transformers by ID for determinism
    transformers.sort((a, b) => a.id.localeCompare(b.id));

    // Use ETAP-grade transformer positioning
    const trafoPositions = calculateTransformerPositions(transformers.length, centerX);
    const trafoY = Math.round(currentY / gridSize) * gridSize;

    transformers.forEach((trafo, i) => {
      const x = trafoPositions[i];
      positions.set(trafo.id, { x, y: trafoY });
    });

    currentY += ETAP_GEOMETRY.transformer.symbolHeight + ETAP_GEOMETRY.transformer.offsetToSN;
  }

  // LAYER 3: SN Busbar — WITH SECTIONED BUSBAR SUPPORT (ETAP-GRADE)
  const snY = Math.round(currentY / gridSize) * gridSize;
  targetBusbars.forEach((bus) => {
    const bays = baysByBusbar.get(bus.id) || [];

    // Detect if busbar should be sectioned
    const sectionCount = detectBusbarSections(bus, symbols);

    // Calculate sectioned busbar layout
    // Note: couplerPositions can be used for coupler switch positioning in future enhancements
    const { sections, totalWidth } = calculateSectionedBusbar(
      bays.length,
      sectionCount,
      centerX
    );

    // Position busbar at center
    const busX = centerX;
    positions.set(bus.id, { x: busX, y: snY });

    // Store busbar width (use total width for sectioned busbars)
    const nodeSymbol = bus as NodeSymbol;
    if ('width' in nodeSymbol) {
      (nodeSymbol as any).width = totalWidth;
    }

    // Assign bays to sections and position them
    if (bays.length > 0 && sections.length > 0) {
      // Position bays within each section
      sections.forEach((section) => {
        const sectionBayPositions = calculateSectionBayPositions(section);

        section.bayIndices.forEach((bayIndex, posIndex) => {
          if (bayIndex >= bays.length) return;

          const bay = bays[bayIndex];
          const bayX = sectionBayPositions[posIndex] ?? centerX;
          let bayY = snY + ETAP_GEOMETRY.bay.verticalOffset;

          // Assign section ID to bay
          bay.sectionId = section.sectionId;

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
      });
    }

    // Note: Coupler switches would be positioned at couplerPositions if present
    // This is handled by the normal bay positioning when the coupler is detected
  });

  // PR-SLD-ETAP-GEOMETRY-FULL: NO FLOATING SYMBOL RULE
  // ETAP Rule: Every symbol must be connected to the main topology
  // Instead of using legacy fallback (which creates floating symbols),
  // we now track unpositioned symbols and report them as validation warnings.
  const unpositioned = symbols.filter((s) => !positions.has(s.id));
  const floatingSymbols: string[] = [];

  if (unpositioned.length > 0 && ETAP_GEOMETRY.validation.noFloatingSymbol) {
    // Categorize unpositioned symbols
    unpositioned.forEach((symbol) => {
      // Check if symbol has any connection to positioned elements
      const hasConnection = checkSymbolConnection(symbol, symbols, positions, elementToSymbol);

      if (hasConnection) {
        // Symbol has connection but wasn't positioned - try to position it relative to connected element
        const connectedPos = findConnectedPosition(symbol, symbols, positions, elementToSymbol, cfg);
        if (connectedPos) {
          positions.set(symbol.id, connectedPos);
        } else {
          // Cannot find valid position - mark as floating
          floatingSymbols.push(symbol.id);
        }
      } else {
        // Symbol has NO connection - this is a floating symbol (ETAP violation)
        floatingSymbols.push(symbol.id);
      }
    });

    // For any remaining unpositioned symbols, place them but mark as floating
    // This allows the validator to highlight them instead of having invisible symbols
    const stillUnpositioned = symbols.filter((s) => !positions.has(s.id));
    if (stillUnpositioned.length > 0) {
      const fallbackResult = generateFallbackPositions(stillUnpositioned, cfg, positions);
      fallbackResult.forEach((pos, id) => {
        if (!positions.has(id)) {
          positions.set(id, pos);
          floatingSymbols.push(id);
        }
      });
    }
  } else if (unpositioned.length > 0) {
    // Legacy mode: use fallback layout (disabled by default in ETAP_GEOMETRY.validation)
    const legacyResult = generateFallbackPositions(unpositioned, cfg, positions);
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

  // Build busbar section info for debug
  const busbarSections = new Map<string, number>();
  targetBusbars.forEach((bus) => {
    const sectionCount = detectBusbarSections(bus, symbols);
    busbarSections.set(bus.id, sectionCount);
  });

  return {
    positions,
    debug: {
      layers,
      totalLayers: layerIndex,
      totalNodes: symbols.length,
      floatingSymbols,
      transformerCount: transformers.length,
      busbarSections,
    },
  };
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
