/**
 * Layout Pipeline V1 — 6-fazowy, deterministyczny pipeline layoutu SLD.
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
 */

import type { VisualGraphV1, VisualNodeV1, VisualEdgeV1 } from './visualGraph';
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
  gridStep: 20,
  layerSpacing: 120,
  bandSpacing: 80,
  defaultSymbolWidth: 60,
  defaultSymbolHeight: 60,
  defaultBusWidth: 400,
  busHeight: 10,
  feederSlotSpacing: 80,
  secondaryLanePitch: 30,
  blockMargin: 20,
  relayOffsetY: -40,
  spineX: 500,
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

function isTransformerType(nodeType: string): boolean {
  return nodeType === NodeTypeV1.TRANSFORMER_WN_SN || nodeType === NodeTypeV1.TRANSFORMER_SN_NN;
}

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
 * Faza 1: Umieszczenie trunk (magistrali).
 *
 * - Znajdz zrodla (GRID_SOURCE preferowane).
 * - BFS po trunk edges.
 * - Monotoniczna os X (spine).
 * - Szyny SN na warstwie L3 (trunk bus layer).
 * - Stable tie-break: sort po id.
 */
function phase1_place_trunk(
  graph: VisualGraphV1,
  config: LayoutGeometryConfigV1,
  state: PipelineState,
): void {
  const { gridStep, layerSpacing, spineX, defaultSymbolWidth, defaultSymbolHeight, defaultBusWidth, busHeight } = config;

  // Znajdz zrodla i posortuj (GRID_SOURCE first, then by id)
  const sources = graph.nodes
    .filter(n => isSourceType(n.nodeType))
    .sort((a, b) => sourceOrderKey(a).localeCompare(sourceOrderKey(b)));

  // Warstwy kanoniczne
  const L0_SOURCE = 0;
  const L1_WN_BUS = 1;
  const L2_TRANSFORMER = 2;
  const L3_SN_BUS = 3;

  // Umieszczaj zrodla na L0
  let sourceSlotX = spineX;
  for (const src of sources) {
    state.placements.set(src.id, {
      nodeId: src.id,
      x: snapToGrid(sourceSlotX, gridStep),
      y: snapToGrid(L0_SOURCE * layerSpacing, gridStep),
      width: defaultSymbolWidth,
      height: defaultSymbolHeight,
      layer: L0_SOURCE,
      bandIndex: 0,
      autoPositioned: true,
    });
    sourceSlotX += config.feederSlotSpacing;
  }

  // Znajdz szyny SN i posortuj po id
  const snBuses = graph.nodes
    .filter(n => n.nodeType === NodeTypeV1.BUS_SN)
    .sort((a, b) => a.id.localeCompare(b.id));

  let busSlotX = spineX - defaultBusWidth / 2;
  for (const bus of snBuses) {
    const w = bus.attributes.width ?? defaultBusWidth;
    state.placements.set(bus.id, {
      nodeId: bus.id,
      x: snapToGrid(busSlotX, gridStep),
      y: snapToGrid(L3_SN_BUS * layerSpacing, gridStep),
      width: w,
      height: busHeight,
      layer: L3_SN_BUS,
      bandIndex: 0,
      autoPositioned: true,
    });
    busSlotX += w + config.feederSlotSpacing;
  }

  // Umieszczaj transformatory WN/SN na L2
  const wnSnTransformers = graph.nodes
    .filter(n => n.nodeType === NodeTypeV1.TRANSFORMER_WN_SN)
    .sort((a, b) => a.id.localeCompare(b.id));

  let trSlotX = spineX;
  for (const tr of wnSnTransformers) {
    state.placements.set(tr.id, {
      nodeId: tr.id,
      x: snapToGrid(trSlotX, gridStep),
      y: snapToGrid(L2_TRANSFORMER * layerSpacing, gridStep),
      width: defaultSymbolWidth,
      height: defaultSymbolHeight,
      layer: L2_TRANSFORMER,
      bandIndex: 0,
      autoPositioned: true,
    });
    trSlotX += config.feederSlotSpacing;
  }

  // Umieszczaj przelaczniki i inne elementy trunk
  const trunkEdges = graph.edges.filter(e => e.edgeType === EdgeTypeV1.TRUNK);
  const switchNodes = graph.nodes
    .filter(n => isSwitchType(n.nodeType))
    .sort((a, b) => a.id.localeCompare(b.id));

  let switchSlotX = spineX;
  for (const sw of switchNodes) {
    if (!state.placements.has(sw.id)) {
      // Umieszczaj miedzy szyna a transformatorem
      state.placements.set(sw.id, {
        nodeId: sw.id,
        x: snapToGrid(switchSlotX, gridStep),
        y: snapToGrid((L2_TRANSFORMER + L3_SN_BUS) / 2 * layerSpacing, gridStep),
        width: defaultSymbolWidth / 2,
        height: defaultSymbolHeight / 2,
        layer: L2_TRANSFORMER,
        bandIndex: 0,
        autoPositioned: true,
      });
      switchSlotX += config.feederSlotSpacing / 2;
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

  const { gridStep, layerSpacing, blockMargin, defaultSymbolWidth, defaultSymbolHeight } = config;
  const STATION_LAYER = 5;

  let blockSlotX = config.spineX;
  for (const station of stationNodes) {
    const blockType = nodeTypeToStationBlockType(station.nodeType);

    // Rozmiar bloku zalezy od typu
    let blockWidth: number;
    let blockHeight: number;
    switch (blockType) {
      case StationBlockType.TYPE_A:
        blockWidth = defaultSymbolWidth * 2;
        blockHeight = layerSpacing * 2;
        break;
      case StationBlockType.TYPE_B:
        blockWidth = defaultSymbolWidth * 2.5;
        blockHeight = layerSpacing * 2.5;
        break;
      case StationBlockType.TYPE_C:
        blockWidth = defaultSymbolWidth * 3;
        blockHeight = layerSpacing * 2.5;
        break;
      case StationBlockType.TYPE_D:
        blockWidth = defaultSymbolWidth * 4;
        blockHeight = layerSpacing * 3;
        break;
      default:
        blockWidth = defaultSymbolWidth * 2;
        blockHeight = layerSpacing * 2;
    }

    const blockX = snapToGrid(blockSlotX, gridStep);
    const blockY = snapToGrid(STATION_LAYER * layerSpacing, gridStep);

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
      layer: STATION_LAYER,
      bandIndex: 0,
      autoPositioned: true,
    });

    blockSlotX += blockWidth + blockMargin * 2;
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
    const bh = block.bounds.height;

    // Umieszczaj wewnetrzne elementy
    let internalY = by + config.blockMargin;

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
        x: snapToGrid(bx + (bw - w) / 2, gridStep),
        y: snapToGrid(internalY, gridStep),
        width: w,
        height: h,
        layer: 6, // Internal station layer
        bandIndex: 0,
        autoPositioned: true,
      });

      internalY += h + config.blockMargin;
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
  const { gridStep, bandSpacing, defaultSymbolWidth, defaultSymbolHeight, layerSpacing } = config;
  const BRANCH_BASE_LAYER = 4;

  // Zbierz branch edges
  const branchEdges = graph.edges
    .filter(e => e.edgeType === EdgeTypeV1.BRANCH)
    .sort((a, b) => a.id.localeCompare(b.id));

  // Zbierz wezly junction i load ktore nie sa jeszcze umieszczone
  const unplacedNodes = graph.nodes
    .filter(n => !state.placements.has(n.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  let bandIndex = 0;
  let bandY = BRANCH_BASE_LAYER * layerSpacing;

  for (const node of unplacedNodes) {
    const w = isBusType(node.nodeType) ? (node.attributes.width ?? config.defaultBusWidth) : defaultSymbolWidth;
    const h = isBusType(node.nodeType) ? config.busHeight : defaultSymbolHeight;

    state.placements.set(node.id, {
      nodeId: node.id,
      x: snapToGrid(config.spineX + bandIndex * bandSpacing, gridStep),
      y: snapToGrid(bandY, gridStep),
      width: w,
      height: h,
      layer: BRANCH_BASE_LAYER + Math.floor(bandIndex / 5),
      bandIndex,
      autoPositioned: true,
    });

    bandIndex++;
    if (bandIndex % 5 === 0) {
      bandY += layerSpacing;
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
    const fromNode = graph.nodes.find(n => n.id === edge.fromPortRef.nodeId);
    const toNode = graph.nodes.find(n => n.id === edge.toPortRef.nodeId);

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
      // Trunk: routing prosty (L-shape)
      const midY = (startY + endY) / 2;
      segments = [
        { from: startPoint, to: { x: startX, y: midY } },
        { from: { x: startX, y: midY }, to: { x: endX, y: midY } },
        { from: { x: endX, y: midY }, to: endPoint },
      ];
    } else if (edge.edgeType === EdgeTypeV1.SECONDARY_CONNECTOR) {
      // Secondary: routing w dedykowanym kanale
      laneIndex = secondaryLaneCounter++;
      const laneOffset = laneIndex * config.secondaryLanePitch;
      const channelY = Math.min(startY, endY) - 60 - laneOffset;

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
      // Branch i inne: routing ortogonalny (Z-shape)
      const midX = (startX + endX) / 2;
      segments = [
        { from: startPoint, to: { x: midX, y: startY } },
        { from: { x: midX, y: startY }, to: { x: midX, y: endY } },
        { from: { x: midX, y: endY }, to: endPoint },
      ];
    }

    // Snap to grid
    segments = segments.map(s => ({
      from: { x: snapToGrid(s.from.x, config.gridStep), y: snapToGrid(s.from.y, config.gridStep) },
      to: { x: snapToGrid(s.to.x, config.gridStep), y: snapToGrid(s.to.y, config.gridStep) },
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
  // 1. Resolve symbol-symbol overlaps (Y-axis only, max 20 iteracji)
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
          // Przesuñ element z wieksza warstawa w dol
          if (a.layer > b.layer || (a.layer === b.layer && a.nodeId > b.nodeId)) {
            a.y = snapToGrid(b.y + b.height + config.blockMargin, config.gridStep);
          } else {
            b.y = snapToGrid(a.y + a.height + config.blockMargin, config.gridStep);
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
