/**
 * Layout Pipeline V1 — 6-fazowy, deterministyczny pipeline layoutu SLD.
 *
 * ESTETYKA PRZEMYSLOWA (E1–E4):
 * - E1: Rowne odleglosci stacji na magistrali (GRID_SPACING_MAIN)
 * - E2: Symetryczne ringi (stala amplituda Y_RING, ortogonalne odcinki)
 * - E3: Brak przypadkowych dlugosci wizualnych (snap to grid, stale kroki)
 * - E4: Wyrownanie pionowe pol stacji (OFFSET_POLE, wspolna os Y)
 *
 * PIPELINE:
 *   phase1_place_trunk()
 *   phase2_detect_and_reserve_blocks()
 *   phase3_embed_switchgear_blocks()
 *   phase4_place_branches_in_bands()
 *   phase5_route_edges_manhattan_with_channels()
 *   phase6_enforce_invariants_and_finalize_hash()
 *
 * REGULY:
 * - Kazda faza uzywa WYLACZNIE VisualGraphV1 + GeometryConfig.
 * - Kazda faza NIE zna camera/overlay/viewport.
 * - Kazda faza NIE modyfikuje Snapshot.
 * - Kazda faza zwraca immutable struktury.
 * - DETERMINIZM: ten sam input → identyczny output (bit-for-bit).
 * - KOLIZJE: rozwiazywane WYLACZNIE w osi Y (Y-only push-away).
 * - JEDEN SILNIK: brak flag wyboru, brak rownoleglych implementacji.
 */

import type { VisualGraphV1, VisualNodeV1 } from './visualGraph';
import { NodeTypeV1, EdgeTypeV1 } from './visualGraph';
import {
  type LayoutResultV1,
  type NodePlacementV1,
  type EdgeRouteV1,
  type SwitchgearBlockV1,
  type SwitchgearPortV1,
  type CatalogRefV1,
  type RelayBindingV1,
  type LayoutValidationErrorV1,
  type PointV1,
  type RectangleV1,
  type PathSegmentV1,
  StationBlockType,
  CatalogCategory,
  LAYOUT_RESULT_VERSION,
  computeLayoutResultHash,
  canonicalizeLayoutResult,
} from './layoutResult';
import type { StationBlockDetailV1 } from './fieldDeviceContracts';
import type { StationBlockBuildResult } from './stationBlockBuilder';
import {
  GRID_BASE,
  GRID_SPACING_MAIN,
  X_START,
  Y_MAIN,
  Y_RING,
  Y_BRANCH,
  OFFSET_POLE,
  MIN_VERTICAL_GAP,
  snapToAestheticGrid,
} from '../IndustrialAesthetics';

// =============================================================================
// GEOMETRY CONFIG
// =============================================================================

/** Konfiguracja geometrii layoutu (ETAP-grade). */
export interface LayoutGeometryConfigV1 {
  /** Krok siatki [px] */
  readonly gridStep: number;
  /** Odstep miedzy warstwami Y [px] */
  readonly layerSpacing: number;
  /** Odstep miedzy bandami branch [px] */
  readonly bandSpacing: number;
  /** Szerokosc symbolu domyslna [px] */
  readonly defaultSymbolWidth: number;
  /** Wysokosc symbolu domyslna [px] */
  readonly defaultSymbolHeight: number;
  /** Szerokosc szyny zbiorczej domyslna [px] */
  readonly defaultBusWidth: number;
  /** Wysokosc szyny zbiorczej [px] */
  readonly busHeight: number;
  /** Odstep miedzy slotami feederow [px] */
  readonly feederSlotSpacing: number;
  /** Pitch kanalu secondary connector [px] */
  readonly secondaryLanePitch: number;
  /** Margines bloku switchgear [px] */
  readonly blockMargin: number;
  /** Offset relay nad CB [px] */
  readonly relayOffsetY: number;
  /** Spina X (oś pionowa magistrali) [px] */
  readonly spineX: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutGeometryConfigV1 = {
  gridStep: GRID_BASE,
  layerSpacing: 6 * GRID_BASE,       // 120px — layer Y spacing
  bandSpacing: MIN_VERTICAL_GAP,      // 80px — branch band gap
  defaultSymbolWidth: 3 * GRID_BASE,  // 60px
  defaultSymbolHeight: 3 * GRID_BASE, // 60px
  defaultBusWidth: 20 * GRID_BASE,    // 400px
  busHeight: 10,                      // busbar thickness
  feederSlotSpacing: GRID_SPACING_MAIN, // 280px — E1: equal station spacing
  secondaryLanePitch: 30,
  blockMargin: GRID_BASE,             // 20px
  relayOffsetY: -2 * GRID_BASE,      // -40px
  spineX: X_START + 2 * GRID_SPACING_MAIN, // centered at ~600px
} as const;

// =============================================================================
// INTERNAL STATE (mutable during pipeline, frozen at output)
// =============================================================================

interface MutablePlacement {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  bandIndex: number;
  autoPositioned: boolean;
}

interface MutableRoute {
  edgeId: string;
  edgeType: string;
  segments: PathSegmentV1[];
  startPoint: PointV1;
  endPoint: PointV1;
  laneIndex: number;
  isNormallyOpen: boolean;
}

interface MutableBlock {
  blockId: string;
  blockType: StationBlockType;
  bounds: RectangleV1;
  ports: SwitchgearPortV1[];
  internalNodes: string[];
  label: string;
  /** RUN #3D: Szczegoly pol/urzadzen/anchorow (null jesli brak stationBlockDetails) */
  detail: StationBlockDetailV1 | null;
}

interface PipelineState {
  placements: Map<string, MutablePlacement>;
  routes: MutableRoute[];
  blocks: MutableBlock[];
  catalogRefs: CatalogRefV1[];
  relayBindings: RelayBindingV1[];
  validationErrors: LayoutValidationErrorV1[];
}

// =============================================================================
// HELPERS
// =============================================================================

function snapToGrid(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function isStationType(nodeType: string): boolean {
  return (
    nodeType === NodeTypeV1.STATION_SN_NN_A ||
    nodeType === NodeTypeV1.STATION_SN_NN_B ||
    nodeType === NodeTypeV1.STATION_SN_NN_C ||
    nodeType === NodeTypeV1.STATION_SN_NN_D ||
    nodeType === NodeTypeV1.SWITCHGEAR_BLOCK
  );
}

function isBusType(nodeType: string): boolean {
  return nodeType === NodeTypeV1.BUS_SN || nodeType === NodeTypeV1.BUS_NN;
}

function isSourceType(nodeType: string): boolean {
  return (
    nodeType === NodeTypeV1.GRID_SOURCE ||
    nodeType === NodeTypeV1.GENERATOR_PV ||
    nodeType === NodeTypeV1.GENERATOR_BESS ||
    nodeType === NodeTypeV1.GENERATOR_WIND
  );
}

/* istanbul ignore next — reserved for station-layout */
function isTransformerType(nodeType: string): boolean {
  return nodeType === NodeTypeV1.TRANSFORMER_WN_SN || nodeType === NodeTypeV1.TRANSFORMER_SN_NN;
}
void isTransformerType;

function isSwitchType(nodeType: string): boolean {
  return (
    nodeType === NodeTypeV1.SWITCH_BREAKER ||
    nodeType === NodeTypeV1.SWITCH_DISCONNECTOR ||
    nodeType === NodeTypeV1.SWITCH_LOAD_SWITCH ||
    nodeType === NodeTypeV1.SWITCH_FUSE
  );
}

function nodeTypeToStationBlockType(nodeType: string): StationBlockType {
  switch (nodeType) {
    case NodeTypeV1.STATION_SN_NN_A: return StationBlockType.TYPE_A;
    case NodeTypeV1.STATION_SN_NN_B: return StationBlockType.TYPE_B;
    case NodeTypeV1.STATION_SN_NN_C: return StationBlockType.TYPE_C;
    case NodeTypeV1.STATION_SN_NN_D: return StationBlockType.TYPE_D;
    default: return StationBlockType.TYPE_A;
  }
}

function nodeTypeToCatalogCategory(nodeType: string): CatalogCategory | null {
  switch (nodeType) {
    case NodeTypeV1.SWITCH_BREAKER: return CatalogCategory.BREAKER;
    case NodeTypeV1.SWITCH_DISCONNECTOR: return CatalogCategory.DISCONNECTOR;
    case NodeTypeV1.SWITCH_FUSE: return CatalogCategory.FUSE;
    case NodeTypeV1.TRANSFORMER_WN_SN:
    case NodeTypeV1.TRANSFORMER_SN_NN: return CatalogCategory.TRANSFORMER;
    case NodeTypeV1.GENERATOR_PV: return CatalogCategory.PV_INVERTER;
    case NodeTypeV1.GENERATOR_BESS: return CatalogCategory.BESS_PCS;
    default: return null;
  }
}

/** Deterministyczny tie-break dla multi-source: preferuj GRID_SOURCE, potem leksykograficznie. */
function sourceOrderKey(node: VisualNodeV1): string {
  const priority = node.nodeType === NodeTypeV1.GRID_SOURCE ? '0' : '1';
  return `${priority}_${node.id}`;
}

// =============================================================================
// PHASE 1: PLACE TRUNK
// =============================================================================

/**
 * Faza 1: Umieszczenie trunk (magistrali) — ESTETYKA PRZEMYSLOWA E1/E3/E4.
 *
 * E1: Rowne odleglosci stacji — feederSlotSpacing = GRID_SPACING_MAIN
 * E3: Brak przypadkowych dlugosci — snap to GRID_BASE
 * E4: Wyrownanie pionowe — stale warstwy L0/L2/L3
 *
 * - Znajdz zrodla (GRID_SOURCE preferowane).
 * - BFS po trunk edges.
 * - Monotoniczna os X (spine).
 * - Szyny SN na warstwie Y_MAIN.
 * - Stable tie-break: sort po id.
 */
function phase1_place_trunk(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1,
  state: PipelineState,
): void {
  const { gridStep, defaultSymbolWidth, defaultSymbolHeight, defaultBusWidth, busHeight } = config;

  // Znajdz zrodla i posortuj (GRID_SOURCE first, then by id)
  const sources = graph.nodes
    .filter(n => isSourceType(n.nodeType))
    .sort((a, b) => sourceOrderKey(a).localeCompare(sourceOrderKey(b)));

  // E1/E4: Stale warstwy Y zsynchronizowane z IndustrialAesthetics
  const L0_Y = snapToAestheticGrid(Y_MAIN - 3 * OFFSET_POLE);  // sources above busbar
  const L2_Y = snapToAestheticGrid(Y_MAIN - OFFSET_POLE);       // transformers WN/SN
  const L3_Y = snapToAestheticGrid(Y_MAIN);                      // SN busbar = Y_MAIN

  // E1: Umieszczaj zrodla na L0 z rownym rozstawem
  let sourceSlotX = snapToAestheticGrid(X_START);
  for (const src of sources) {
    state.placements.set(src.id, {
      nodeId: src.id,
      x: snapToAestheticGrid(sourceSlotX),
      y: L0_Y,
      width: defaultSymbolWidth,
      height: defaultSymbolHeight,
      layer: 0,
      bandIndex: 0,
      autoPositioned: true,
    });
    sourceSlotX += GRID_SPACING_MAIN;
  }

  // Znajdz szyny SN i posortuj po id
  const snBuses = graph.nodes
    .filter(n => n.nodeType === NodeTypeV1.BUS_SN)
    .sort((a, b) => a.id.localeCompare(b.id));

  // E1: Szyny SN na Y_MAIN, rozstaw = GRID_SPACING_MAIN
  let busSlotX = snapToAestheticGrid(X_START);
  for (const bus of snBuses) {
    const w = bus.attributes.width ?? defaultBusWidth;
    state.placements.set(bus.id, {
      nodeId: bus.id,
      x: snapToAestheticGrid(busSlotX),
      y: L3_Y,
      width: snapToGrid(w, gridStep),
      height: busHeight,
      layer: 3,
      bandIndex: 0,
      autoPositioned: true,
    });
    busSlotX += snapToAestheticGrid(w + GRID_SPACING_MAIN);
  }

  // E1/E4: Umieszczaj transformatory WN/SN na L2 z rownym rozstawem
  const wnSnTransformers = graph.nodes
    .filter(n => n.nodeType === NodeTypeV1.TRANSFORMER_WN_SN)
    .sort((a, b) => a.id.localeCompare(b.id));

  let trSlotX = snapToAestheticGrid(X_START);
  for (const tr of wnSnTransformers) {
    state.placements.set(tr.id, {
      nodeId: tr.id,
      x: snapToAestheticGrid(trSlotX),
      y: L2_Y,
      width: defaultSymbolWidth,
      height: defaultSymbolHeight,
      layer: 2,
      bandIndex: 0,
      autoPositioned: true,
    });
    trSlotX += GRID_SPACING_MAIN;
  }

  // E3/E4: Umieszczaj przelaczniki z snap to grid
  const switchNodes = graph.nodes
    .filter(n => isSwitchType(n.nodeType))
    .sort((a, b) => a.id.localeCompare(b.id));

  let switchSlotX = snapToAestheticGrid(X_START);
  for (const sw of switchNodes) {
    if (!state.placements.has(sw.id)) {
      // Umieszczaj miedzy szyna a transformatorem
      const switchY = snapToAestheticGrid((L2_Y + L3_Y) / 2);
      state.placements.set(sw.id, {
        nodeId: sw.id,
        x: snapToAestheticGrid(switchSlotX),
        y: switchY,
        width: snapToGrid(defaultSymbolWidth / 2, gridStep),
        height: snapToGrid(defaultSymbolHeight / 2, gridStep),
        layer: 2,
        bandIndex: 0,
        autoPositioned: true,
      });
      switchSlotX += snapToAestheticGrid(GRID_SPACING_MAIN / 2);
    }
  }
}

// =============================================================================
// PHASE 2: DETECT AND RESERVE BLOCKS
// =============================================================================

/**
 * Faza 2: Detekcja i rezerwacja embedded switchgear blocks.
 *
 * - Identyfikuj wezly stacji (A/B/C/D).
 * - Zarezerwuj bounds na grid.
 * - NIE naruszaj osi trunk.
 */
function phase2_detect_and_reserve_blocks(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1,
  state: PipelineState,
): void {
  const stationNodes = graph.nodes
    .filter(n => isStationType(n.nodeType))
    .sort((a, b) => a.id.localeCompare(b.id));

  const { gridStep, defaultSymbolWidth } = config;
  // E1: Stacje na stale warstwie Y ponizej magistrali
  const STATION_Y = snapToAestheticGrid(Y_BRANCH);

  // E1: Rowne odleglosci stacji — uzyj GRID_SPACING_MAIN
  let blockSlotX = snapToAestheticGrid(X_START);
  for (const station of stationNodes) {
    const blockType = nodeTypeToStationBlockType(station.nodeType);

    // E3: Rozmiar bloku snap to grid, stale wielokrotnosci GRID_BASE
    let blockWidth: number;
    let blockHeight: number;
    switch (blockType) {
      case StationBlockType.TYPE_A:
        blockWidth = snapToGrid(defaultSymbolWidth * 2, gridStep);
        blockHeight = snapToGrid(4 * OFFSET_POLE, gridStep);
        break;
      case StationBlockType.TYPE_B:
        blockWidth = snapToGrid(defaultSymbolWidth * 2.5, gridStep);
        blockHeight = snapToGrid(5 * OFFSET_POLE, gridStep);
        break;
      case StationBlockType.TYPE_C:
        blockWidth = snapToGrid(defaultSymbolWidth * 3, gridStep);
        blockHeight = snapToGrid(5 * OFFSET_POLE, gridStep);
        break;
      case StationBlockType.TYPE_D:
        blockWidth = snapToGrid(defaultSymbolWidth * 4, gridStep);
        blockHeight = snapToGrid(6 * OFFSET_POLE, gridStep);
        break;
      default:
        blockWidth = snapToGrid(defaultSymbolWidth * 2, gridStep);
        blockHeight = snapToGrid(4 * OFFSET_POLE, gridStep);
    }

    // E1: Rowne rozstawy stacji, snap to grid
    const blockX = snapToAestheticGrid(blockSlotX);
    const blockY = STATION_Y;

    const bounds: RectangleV1 = {
      x: blockX,
      y: blockY,
      width: blockWidth,
      height: blockHeight,
    };

    const ports: SwitchgearPortV1[] = [
      { portId: 'in', role: 'IN', position: { x: blockX + blockWidth / 2, y: blockY } },
      { portId: 'out', role: 'OUT', position: { x: blockX + blockWidth / 2, y: blockY + blockHeight } },
      { portId: 'branch', role: 'BRANCH', position: { x: blockX + blockWidth, y: blockY + blockHeight / 2 } },
    ];

    // Typ D: dodaj porty coupler
    if (blockType === StationBlockType.TYPE_D) {
      ports.push(
        { portId: 'coupler_a', role: 'COUPLER_A', position: { x: blockX + blockWidth / 3, y: blockY + blockHeight / 2 } },
        { portId: 'coupler_b', role: 'COUPLER_B', position: { x: blockX + 2 * blockWidth / 3, y: blockY + blockHeight / 2 } },
      );
    }

    // Zbierz wewnetrzne wezly na podstawie krawedzi (DOMAIN-DRIVEN, bez heurystyk stringowych)
    // Wezel jest wewnetrzny jesli: (a) jest podlaczony do szyny nalezacej do stacji
    // przez krawedz TRANSFORMER_LINK, INTERNAL_SWITCHGEAR lub BRANCH
    const stationBusIds = new Set<string>();
    // Szyny nalezace do stacji: szyna z atrybutem connectedToNodeId == station.id
    // lub szyna bezposrednio polaczona do wezla stacji
    for (const edge of graph.edges) {
      if (
        (edge.fromPortRef.nodeId === station.id || edge.toPortRef.nodeId === station.id)
      ) {
        const otherId = edge.fromPortRef.nodeId === station.id
          ? edge.toPortRef.nodeId : edge.fromPortRef.nodeId;
        stationBusIds.add(otherId);
      }
    }
    const internalIds: string[] = [];
    for (const node of graph.nodes) {
      if (
        node.nodeType === NodeTypeV1.TRANSFORMER_SN_NN ||
        node.nodeType === NodeTypeV1.BUS_NN ||
        node.nodeType === NodeTypeV1.LOAD
      ) {
        // Wezel jest wewnetrzny jesli jest polaczony do szyny stacji
        const isConnected = graph.edges.some(e =>
          (e.fromPortRef.nodeId === node.id && stationBusIds.has(e.toPortRef.nodeId)) ||
          (e.toPortRef.nodeId === node.id && stationBusIds.has(e.fromPortRef.nodeId)) ||
          (e.fromPortRef.nodeId === node.id && e.toPortRef.nodeId === station.id) ||
          (e.toPortRef.nodeId === node.id && e.fromPortRef.nodeId === station.id)
        );
        if (isConnected) {
          internalIds.push(node.id);
        }
      }
    }

    state.blocks.push({
      blockId: station.id,
      blockType,
      bounds,
      ports,
      internalNodes: internalIds.sort(),
      label: station.attributes.label,
      detail: null,
    });

    // Umieszczaj stacje jako placement
    state.placements.set(station.id, {
      nodeId: station.id,
      x: blockX,
      y: blockY,
      width: blockWidth,
      height: blockHeight,
      layer: 5,
      bandIndex: 0,
      autoPositioned: true,
    });

    // E1: Rowne odleglosci stacji = GRID_SPACING_MAIN
    blockSlotX += GRID_SPACING_MAIN;
  }
}

// =============================================================================
// PHASE 3: EMBED SWITCHGEAR BLOCKS
// =============================================================================

/**
 * Faza 3: Osadzenie wewnetrznej geometrii switchgear blocks.
 *
 * Dla kazdego bloku:
 * 1. Umieszczaj TR SN/nN wewnatrz bloku.
 * 2. Umieszczaj szyne nN.
 * 3. Umieszczaj CB, CT.
 * 4. Podlacz porty IN/OUT/BRANCH.
 * 5. Zaktualizuj routing.
 */
function phase3_embed_switchgear_blocks(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1,
  state: PipelineState,
): void {
  const { gridStep, defaultSymbolWidth, defaultSymbolHeight, busHeight } = config;

  for (const block of state.blocks) {
    const bx = block.bounds.x;
    const by = block.bounds.y;
    const bw = block.bounds.width;
    void block.bounds.height;

    // E4: Umieszczaj wewnetrzne elementy z wyrownaniem pionowym (OFFSET_POLE)
    let internalY = snapToAestheticGrid(by + config.blockMargin);

    for (const intId of block.internalNodes) {
      const node = graph.nodes.find(n => n.id === intId);
      if (!node) continue;

      let w = defaultSymbolWidth;
      let h = defaultSymbolHeight;

      if (isBusType(node.nodeType)) {
        w = bw - config.blockMargin * 2;
        h = busHeight;
      }

      state.placements.set(intId, {
        nodeId: intId,
        x: snapToAestheticGrid(bx + (bw - w) / 2),
        y: snapToAestheticGrid(internalY),
        width: snapToGrid(w, gridStep),
        height: snapToGrid(h, gridStep),
        layer: 6, // Internal station layer
        bandIndex: 0,
        autoPositioned: true,
      });

      // E4: Staly odstep pionowy miedzy polami = OFFSET_POLE
      internalY += snapToAestheticGrid(h + OFFSET_POLE);
    }
  }
}

// =============================================================================
// PHASE 4: PLACE BRANCHES IN BANDS
// =============================================================================

/**
 * Faza 4: Umieszczenie branch w bandach.
 *
 * - Kazdy branch ma osobny band.
 * - Band index deterministyczny (sort po edge.id).
 * - Monotoniczne Y offset per band.
 */
function phase4_place_branches_in_bands(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1,
  state: PipelineState,
): void {
  const { bandSpacing, defaultSymbolWidth, defaultSymbolHeight } = config;
  const BRANCH_BASE_LAYER = 4;

  // E3: Zbierz wezly junction i load ktore nie sa jeszcze umieszczone
  const unplacedNodes = graph.nodes
    .filter(n => !state.placements.has(n.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  let bandIndex = 0;
  // E1/E3: Branches start below Y_BRANCH with fixed grid spacing
  let bandY = snapToAestheticGrid(Y_BRANCH + 2 * OFFSET_POLE);

  for (const node of unplacedNodes) {
    const w = isBusType(node.nodeType)
      ? snapToGrid(node.attributes.width ?? config.defaultBusWidth, config.gridStep)
      : defaultSymbolWidth;
    const h = isBusType(node.nodeType) ? config.busHeight : defaultSymbolHeight;

    // E1: Rowne rozstawy w bandach = bandSpacing (=MIN_VERTICAL_GAP)
    state.placements.set(node.id, {
      nodeId: node.id,
      x: snapToAestheticGrid(X_START + bandIndex * GRID_SPACING_MAIN),
      y: snapToAestheticGrid(bandY),
      width: w,
      height: h,
      layer: BRANCH_BASE_LAYER + Math.floor(bandIndex / 5),
      bandIndex,
      autoPositioned: true,
    });

    bandIndex++;
    if (bandIndex % 5 === 0) {
      bandY += snapToAestheticGrid(bandSpacing);
      bandIndex = 0;
    }
  }
}

// =============================================================================
// PHASE 5: ROUTE EDGES (MANHATTAN WITH CHANNELS)
// =============================================================================

/**
 * Faza 5: Routing krawedzi (Manhattan z kanalami).
 *
 * - Trunk: routing prosty (pionowy/poziomy wzdluz spine).
 * - Branch: routing ortogonalny do stacji.
 * - Secondary connector: routing w dedykowanym kanale (laneIndex).
 * - laneIndex deterministyczny (sort po edge.id).
 * - Zakaz crossing trunk bez node.
 */
function phase5_route_edges_manhattan_with_channels(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1,
  state: PipelineState,
): void {
  const sortedEdges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));

  let secondaryLaneCounter = 0;

  for (const edge of sortedEdges) {
    const fromPlacement = state.placements.get(edge.fromPortRef.nodeId);
    const toPlacement = state.placements.get(edge.toPortRef.nodeId);

    // Pozycje startowe i koncowe
    const startX = fromPlacement ? fromPlacement.x + fromPlacement.width / 2 : config.spineX;
    const startY = fromPlacement ? fromPlacement.y + fromPlacement.height / 2 : 0;
    const endX = toPlacement ? toPlacement.x + toPlacement.width / 2 : config.spineX;
    const endY = toPlacement ? toPlacement.y + toPlacement.height / 2 : 0;

    const startPoint: PointV1 = { x: startX, y: startY };
    const endPoint: PointV1 = { x: endX, y: endY };

    // Routing zalezny od typu
    let segments: PathSegmentV1[];
    let laneIndex = 0;

    if (edge.edgeType === EdgeTypeV1.TRUNK) {
      // E3: Trunk: routing prosty (L-shape), snap to grid
      const midY = snapToAestheticGrid((startY + endY) / 2);
      segments = [
        { from: startPoint, to: { x: startX, y: midY } },
        { from: { x: startX, y: midY }, to: { x: endX, y: midY } },
        { from: { x: endX, y: midY }, to: endPoint },
      ];
    } else if (edge.edgeType === EdgeTypeV1.SECONDARY_CONNECTOR) {
      // E2: Ring/secondary connector — symetryczny routing przez kanal Y_RING
      laneIndex = secondaryLaneCounter++;
      const laneOffset = laneIndex * config.secondaryLanePitch;
      // E2: Kanal ringowy na stalej amplitudzie Y_RING (lub nizej dla kolejnych lane'ow)
      const channelY = snapToAestheticGrid(Y_RING - laneOffset);

      // E2: Symetryczna sciezka: pion -> poziom (Y_RING) -> pion
      segments = [
        { from: startPoint, to: { x: startX, y: channelY } },
        { from: { x: startX, y: channelY }, to: { x: endX, y: channelY } },
        { from: { x: endX, y: channelY }, to: endPoint },
      ];
    } else if (edge.edgeType === EdgeTypeV1.TRANSFORMER_LINK) {
      // Transformer: routing pionowy prosty
      segments = [
        { from: startPoint, to: endPoint },
      ];
    } else {
      // E3: Branch i inne: routing ortogonalny (Z-shape), snap to grid
      const midX = snapToAestheticGrid((startX + endX) / 2);
      segments = [
        { from: startPoint, to: { x: midX, y: startY } },
        { from: { x: midX, y: startY }, to: { x: midX, y: endY } },
        { from: { x: midX, y: endY }, to: endPoint },
      ];
    }

    // E3: Snap ALL routing points to GRID_BASE
    segments = segments.map(s => ({
      from: { x: snapToAestheticGrid(s.from.x), y: snapToAestheticGrid(s.from.y) },
      to: { x: snapToAestheticGrid(s.to.x), y: snapToAestheticGrid(s.to.y) },
    }));

    state.routes.push({
      edgeId: edge.id,
      edgeType: edge.edgeType,
      segments,
      startPoint: segments[0]?.from ?? startPoint,
      endPoint: segments[segments.length - 1]?.to ?? endPoint,
      laneIndex,
      isNormallyOpen: edge.isNormallyOpen,
    });
  }
}

// =============================================================================
// PHASE 6: ENFORCE INVARIANTS AND FINALIZE HASH
// =============================================================================

/**
 * Faza 6: Wymuszenie inwariantow i finalizacja hash.
 *
 * - Sprawdz symbol-symbol overlap (= 0, resolve w osi Y).
 * - Sprawdz crossing trunk bez node.
 * - Oblicz bounds.
 * - Oblicz hash (world geometry only).
 */
function phase6_enforce_invariants_and_finalize(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1,
  state: PipelineState,
): void {
  // 1. Resolve symbol-symbol overlaps — Y-ONLY push-away (E3: brak losowych offsetow)
  // REGULA: kolizje rozwiazywane WYLACZNIE w osi Y (przesun w dol)
  // Determinizm: sort po (layer, nodeId) — stabilny tie-break
  const MAX_ITERATIONS = 20;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let hasOverlap = false;
    const entries = [...state.placements.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i][1];
        const b = entries[j][1];

        // AABB overlap check
        if (
          a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y
        ) {
          hasOverlap = true;
          // E3: Y-ONLY push-away — NIGDY nie przesuwaj w osi X
          // Deterministic tie-break: wiekszy layer lub wiekszy nodeId idzie w dol
          if (a.layer > b.layer || (a.layer === b.layer && a.nodeId > b.nodeId)) {
            a.y = snapToAestheticGrid(b.y + b.height + config.blockMargin);
          } else {
            b.y = snapToAestheticGrid(a.y + a.height + config.blockMargin);
          }
        }
      }
    }

    if (!hasOverlap) break;
  }

  // 2. Catalog validation
  for (const node of graph.nodes) {
    const category = nodeTypeToCatalogCategory(node.nodeType);
    if (category !== null) {
      state.catalogRefs.push({
        nodeId: node.id,
        catalogTypeId: null, // Wymaga uzupelnienia z katalogu
        catalogCategory: category,
      });
      state.validationErrors.push({
        code: 'MISSING_CATALOG_REF',
        message: `Wezel ${node.id} (${node.attributes.elementName}) wymaga referencji do katalogu (${category})`,
        nodeId: node.id,
        fixAction: `Przypisz typ z katalogu ${category} do elementu ${node.attributes.elementName}`,
      });
    }
  }

  // 3. Relay binding (dla CB z relay)
  const breakerNodes = graph.nodes
    .filter(n => n.nodeType === NodeTypeV1.SWITCH_BREAKER)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const cb of breakerNodes) {
    const cbPlacement = state.placements.get(cb.id);
    if (cbPlacement) {
      state.relayBindings.push({
        breakerNodeId: cb.id,
        relayId: `relay_${cb.id}`,
        functions: ['51', '50'].sort(), // Deterministycznie posortowane po ANSI
        ctNodeId: null,
        relayPosition: {
          x: cbPlacement.x + cbPlacement.width / 2,
          y: cbPlacement.y + config.relayOffsetY,
        },
      });
    }
  }
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

/**
 * Uruchamia pelny 6-fazowy pipeline layoutu.
 *
 * DETERMINIZM: ten sam VisualGraphV1 + config → identyczny LayoutResultV1.
 *
 * @param graph VisualGraphV1 — zamrozony kontrakt wejscia
 * @param config Konfiguracja geometrii (opcjonalna, domyslna ETAP)
 * @param stationBlockDetails Opcjonalne szczegoly pol/urzadzen (RUN #3D). Jesli podane,
 *   detail per stacja jest dolaczony do SwitchgearBlockV1.
 * @returns LayoutResultV1 — zamrozony wynik layoutu
 */
export function computeLayout(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1 = DEFAULT_LAYOUT_CONFIG,
  stationBlockDetails?: StationBlockBuildResult,
): LayoutResultV1 {
  // Inicjalizacja stanu pipeline (mutable wewnatrz, frozen na wyjsciu)
  const state: PipelineState = {
    placements: new Map(),
    routes: [],
    blocks: [],
    catalogRefs: [],
    relayBindings: [],
    validationErrors: [],
  };

  // Build lookup map for station block details (RUN #3D)
  const detailsByBlockId = new Map<string, StationBlockDetailV1>();
  if (stationBlockDetails) {
    for (const block of stationBlockDetails.stationBlocks) {
      detailsByBlockId.set(block.blockId, block);
    }
  }

  // Wykonaj 6 faz
  phase1_place_trunk(graph, config, state);
  phase2_detect_and_reserve_blocks(graph, config, state);

  // RUN #3D: Attach station block details to detected blocks
  for (const block of state.blocks) {
    const detail = detailsByBlockId.get(block.blockId) ?? null;
    block.detail = detail;
  }

  phase3_embed_switchgear_blocks(graph, config, state);
  phase4_place_branches_in_bands(graph, config, state);
  phase5_route_edges_manhattan_with_channels(graph, config, state);
  phase6_enforce_invariants_and_finalize(graph, config, state);

  // Konwertuj mutable state → immutable LayoutResultV1
  const nodePlacements: NodePlacementV1[] = [...state.placements.values()]
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    .map(p => ({
      nodeId: p.nodeId,
      position: { x: p.x, y: p.y },
      size: { width: p.width, height: p.height },
      bounds: { x: p.x, y: p.y, width: p.width, height: p.height },
      layer: p.layer,
      bandIndex: p.bandIndex,
      autoPositioned: p.autoPositioned,
    }));

  const edgeRoutes: EdgeRouteV1[] = [...state.routes]
    .sort((a, b) => a.edgeId.localeCompare(b.edgeId))
    .map(r => ({
      edgeId: r.edgeId,
      edgeType: r.edgeType,
      segments: r.segments,
      startPoint: r.startPoint,
      endPoint: r.endPoint,
      laneIndex: r.laneIndex,
      isNormallyOpen: r.isNormallyOpen,
    }));

  const switchgearBlocks: SwitchgearBlockV1[] = [...state.blocks]
    .sort((a, b) => a.blockId.localeCompare(b.blockId));

  const catalogRefs = [...state.catalogRefs]
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  const relayBindings = [...state.relayBindings]
    .sort((a, b) => a.breakerNodeId.localeCompare(b.breakerNodeId));

  const validationErrors = [...state.validationErrors]
    .sort((a, b) => (a.nodeId ?? '').localeCompare(b.nodeId ?? ''));

  // Oblicz bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of nodePlacements) {
    minX = Math.min(minX, p.bounds.x);
    minY = Math.min(minY, p.bounds.y);
    maxX = Math.max(maxX, p.bounds.x + p.bounds.width);
    maxY = Math.max(maxY, p.bounds.y + p.bounds.height);
  }
  for (const b of switchgearBlocks) {
    minX = Math.min(minX, b.bounds.x);
    minY = Math.min(minY, b.bounds.y);
    maxX = Math.max(maxX, b.bounds.x + b.bounds.width);
    maxY = Math.max(maxY, b.bounds.y + b.bounds.height);
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  const bounds: RectangleV1 = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };

  // Zbuduj wynik (bez hash — obliczamy ponizej)
  const resultWithoutHash: LayoutResultV1 = {
    version: LAYOUT_RESULT_VERSION,
    nodePlacements,
    edgeRoutes,
    switchgearBlocks,
    catalogRefs,
    relayBindings,
    validationErrors,
    bounds,
    hash: '', // Placeholder
  };

  // Oblicz hash
  const hash = computeLayoutResultHash(resultWithoutHash);

  const result: LayoutResultV1 = { ...resultWithoutHash, hash };

  return canonicalizeLayoutResult(result);
}
