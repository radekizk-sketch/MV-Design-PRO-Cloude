/**
 * Phase 4: Coordinate Assignment
 *
 * ZADANIE: Przypisz dokładne współrzędne X,Y każdemu elementowi.
 *
 * ALGORYTM:
 * 1. Oblicz wymiary busbarów (width = f(liczba_bayów))
 * 2. Rozłóż baye wzdłuż busbara z równym odstępem
 * 3. Dla każdego baya → rozłóż elementy PIONOWO
 * 4. Snap all to GRID_SIZE
 * 5. Collision detection + push-away
 *
 * KLUCZOWE ZASADY:
 * - Source/Grid → ZAWSZE na GÓRZE
 * - Transformator → na GRANICY między pasmami
 * - Load/Generator → na DOLE baya
 * - Busbar → POZIOMO
 */

import type {
  Bay,
  BusbarGeometry,
  ElementPosition,
  LayoutConfig,
  LayoutSymbol,
  PipelineContext,
  Rectangle,
  VoltageBand,
  UserPositionOverride,
} from './types';
import { findVoltageBandForSymbol, getTransformersBetweenBands } from './phase1-voltage-bands';

// =============================================================================
// AESTHETICS CONFIG — PHASE 4/5 TUNING PARAMETERS
// =============================================================================

/** Gap between terminal elements along sub-busbar (horizontal spread) */
export const SUBBUS_TERMINAL_SPREAD_GAP_X = 80;

/** Step size for deterministic push-away collision resolution */
export const PUSH_AWAY_STEP_X = 40;

/** Maximum iterations for collision resolution */
export const COLLISION_MAX_ITERATIONS = 20;

// =============================================================================
// GŁÓWNA FUNKCJA FAZY 4
// =============================================================================

/**
 * Faza 4: Przypisanie współrzędnych.
 *
 * @param context - Kontekst pipeline
 * @returns Zaktualizowany kontekst z positions i busbarGeometries
 */
export function assignCoordinates(context: PipelineContext): PipelineContext {
  const { symbols, symbolById, config, voltageBands, orderedBays, userOverrides } = context;

  if (!voltageBands || voltageBands.length === 0) {
    return {
      ...context,
      positions: new Map(),
      busbarGeometries: new Map(),
    };
  }

  const positions = new Map<string, ElementPosition>();
  const busbarGeometries = new Map<string, BusbarGeometry>();
  const quarantinedSymbols: string[] = [];

  // Krok 1: Oblicz SPINE X (główna oś pionowa)
  const spineX = calculateSpineX(symbols, config);

  // Krok 2: Pozycjonuj busbary
  positionBusbars(
    symbols,
    symbolById,
    voltageBands,
    orderedBays ?? [],
    config,
    spineX,
    positions,
    busbarGeometries
  );

  // Krok 3: Pozycjonuj źródła (nad busbarami)
  positionSources(symbols, symbolById, voltageBands, config, spineX, positions);

  // Krok 4: Pozycjonuj transformatory (na granicy pasm)
  positionTransformers(symbols, symbolById, voltageBands, config, spineX, positions);

  // Krok 5: Pozycjonuj baye
  positionBays(
    orderedBays ?? [],
    symbolById,
    config,
    positions,
    busbarGeometries,
    voltageBands
  );

  // Krok 6: Pozycjonuj elementy bez baya (quarantine)
  positionQuarantinedElements(
    symbols,
    positions,
    config,
    quarantinedSymbols
  );

  // Krok 6b: PHASE4 AESTHETICS — Propagate bay X positions through the entire hierarchy
  // This ensures that all elements in a bay chain inherit the correct horizontal position
  propagateBayXPositions(orderedBays ?? [], positions, busbarGeometries, symbolById, config);

  // Krok 7: Zastosuj user overrides
  applyUserOverrides(positions, userOverrides, config);

  // Krok 8: Rozwiąż kolizje (pierwsza iteracja)
  let collisionsResolved = resolveCollisions(positions, symbolById, config);

  // Krok 9: Snap all to grid
  snapToGrid(positions, config.gridSize);

  // Krok 10: Rozwiąż kolizje ponownie (po snap to grid)
  // Grid snap może wprowadzić nowe kolizje
  collisionsResolved += resolveCollisions(positions, symbolById, config);

  // Krok 11: Snap again to ensure final positions are on grid
  snapToGrid(positions, config.gridSize);

  return {
    ...context,
    positions,
    busbarGeometries,
    debug: {
      ...context.debug,
      spineX,
      quarantinedSymbols,
      collisionsResolved,
    },
  };
}

// =============================================================================
// OBLICZANIE SPINE X
// =============================================================================

/**
 * Oblicz główną oś pionową (SPINE X).
 *
 * SPINE to centralna oś, wokół której rozkładany jest schemat.
 */
function calculateSpineX(symbols: LayoutSymbol[], config: LayoutConfig): number {
  // Zlicz elementy w każdym paśmie
  let maxElements = 1;
  const busbars = symbols.filter((s) => s.elementType === 'Bus');

  for (const bus of busbars) {
    // Policz elementy połączone z tym busbarem
    const connected = symbols.filter(
      (s) =>
        s.fromNodeId === bus.elementId ||
        s.toNodeId === bus.elementId ||
        s.connectedToNodeId === bus.elementId
    );
    maxElements = Math.max(maxElements, connected.length);
  }

  // SPINE X = środek canvas (uwzględniając wymaganą szerokość)
  const requiredWidth = config.busbarMinWidth + maxElements * config.busbarExtendPerBay;
  const centerX = config.canvasPadding + requiredWidth / 2;

  // Snap to grid
  return Math.round(centerX / config.gridSize) * config.gridSize;
}

// =============================================================================
// POZYCJONOWANIE BUSBARÓW
// =============================================================================

/**
 * Pozycjonuj busbary.
 */
function positionBusbars(
  symbols: LayoutSymbol[],
  _symbolById: Map<string, LayoutSymbol>,
  voltageBands: VoltageBand[],
  bays: Bay[],
  config: LayoutConfig,
  spineX: number,
  positions: Map<string, ElementPosition>,
  busbarGeometries: Map<string, BusbarGeometry>
): void {
  const busbars = symbols
    .filter((s) => s.elementType === 'Bus')
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const busbar of busbars) {
    const band = findVoltageBandForSymbol(busbar, voltageBands);
    if (!band) continue;

    // Policz baye dla tego busbara
    const busbarBays = bays.filter((b) => b.parentBusbarId === busbar.id);
    const bayCount = Math.max(1, busbarBays.length);

    // Oblicz szerokość busbara
    const width = Math.max(
      config.busbarMinWidth,
      bayCount * config.bayGap + 2 * config.canvasPadding
    );

    // Pozycja Y = środek pasma napięciowego
    const y = (band.yStart + band.yEnd) / 2;

    // Pozycja X = SPINE (środek)
    const x = spineX;

    // Zapisz pozycję
    const position: ElementPosition = {
      symbolId: busbar.id,
      position: { x, y },
      size: { width, height: config.busbarHeight },
      bounds: {
        x: x - width / 2,
        y: y - config.busbarHeight / 2,
        width,
        height: config.busbarHeight,
      },
      voltageBandId: band.id,
      bayId: undefined,
      autoPositioned: true,
      isQuarantined: false,
    };
    positions.set(busbar.id, position);

    // Zapisz geometrię busbara
    const geometry: BusbarGeometry = {
      symbolId: busbar.id,
      p0: { x: x - width / 2, y },
      p1: { x: x + width / 2, y },
      width,
      height: config.busbarHeight,
      orientation: 'horizontal',
      voltageBandId: band.id,
      bayCount,
      isSectioned: false,
      sectionCount: 1,
    };
    busbarGeometries.set(busbar.id, geometry);
  }
}

// =============================================================================
// POZYCJONOWANIE ŹRÓDEŁ
// =============================================================================

/**
 * Pozycjonuj źródła (nad busbarami).
 */
function positionSources(
  symbols: LayoutSymbol[],
  symbolById: Map<string, LayoutSymbol>,
  voltageBands: VoltageBand[],
  config: LayoutConfig,
  _spineX: number,
  positions: Map<string, ElementPosition>
): void {
  const sources = symbols
    .filter((s) => s.elementType === 'Source')
    .sort((a, b) => a.id.localeCompare(b.id));

  // Grupuj źródła po połączonym busbarze
  const sourcesByBusbar = new Map<string, LayoutSymbol[]>();

  for (const source of sources) {
    const connectedBusbarId = source.connectedToNodeId;
    if (connectedBusbarId) {
      const connectedSymbol = Array.from(symbolById.values()).find(
        (s) => s.elementId === connectedBusbarId
      );
      if (connectedSymbol) {
        const existing = sourcesByBusbar.get(connectedSymbol.id) ?? [];
        existing.push(source);
        sourcesByBusbar.set(connectedSymbol.id, existing);
      }
    }
  }

  // Pozycjonuj źródła dla każdego busbara
  for (const [busbarId, busbarSources] of sourcesByBusbar) {
    const busbarPosition = positions.get(busbarId);
    if (!busbarPosition) continue;

    const band = findVoltageBandForSymbol(symbolById.get(busbarId)!, voltageBands);

    // Rozmieść źródła nad busbarem
    const sourceCount = busbarSources.length;
    const totalWidth = (sourceCount - 1) * config.bayGap;
    const startX = busbarPosition.position.x - totalWidth / 2;

    busbarSources.forEach((source, index) => {
      const x = sourceCount === 1 ? busbarPosition.position.x : startX + index * config.bayGap;
      const y = busbarPosition.position.y - config.sourceOffsetAboveBusbar;

      const position: ElementPosition = {
        symbolId: source.id,
        position: { x, y },
        size: { width: config.symbolDefaultWidth, height: config.sourceHeight },
        bounds: {
          x: x - config.symbolDefaultWidth / 2,
          y: y - config.sourceHeight / 2,
          width: config.symbolDefaultWidth,
          height: config.sourceHeight,
        },
        voltageBandId: band?.id ?? '',
        bayId: undefined,
        autoPositioned: true,
        isQuarantined: false,
      };
      positions.set(source.id, position);
    });
  }
}

// =============================================================================
// POZYCJONOWANIE TRANSFORMATORÓW
// =============================================================================

/**
 * Pozycjonuj transformatory (na granicy pasm napięciowych).
 */
function positionTransformers(
  symbols: LayoutSymbol[],
  symbolById: Map<string, LayoutSymbol>,
  voltageBands: VoltageBand[],
  config: LayoutConfig,
  spineX: number,
  positions: Map<string, ElementPosition>
): void {
  const transformerConnections = getTransformersBetweenBands(symbols, voltageBands);

  // Grupuj transformatory po parze pasm
  const trafosByBandPair = new Map<string, typeof transformerConnections>();

  for (const conn of transformerConnections) {
    const pairKey = `${conn.hvBandId}::${conn.lvBandId}`;
    const existing = trafosByBandPair.get(pairKey) ?? [];
    existing.push(conn);
    trafosByBandPair.set(pairKey, existing);
  }

  // Pozycjonuj transformatory dla każdej pary pasm
  for (const [_pairKey, trafos] of trafosByBandPair) {
    if (trafos.length === 0) continue;

    // Znajdź pasma
    const hvBand = voltageBands.find((b) => b.id === trafos[0].hvBandId);
    const lvBand = voltageBands.find((b) => b.id === trafos[0].lvBandId);

    if (!hvBand || !lvBand) continue;

    // Pozycja Y = między pasmami
    const y = (hvBand.yEnd + lvBand.yStart) / 2;

    // Rozmieść transformatory wzdłuż SPINE
    const trafoCount = trafos.length;
    const totalWidth = (trafoCount - 1) * config.bayGap;
    const startX = spineX - totalWidth / 2;

    trafos.forEach((conn, index) => {
      const trafo = symbolById.get(conn.transformerSymbolId);
      if (!trafo) return;

      const x = trafoCount === 1 ? spineX : startX + index * config.bayGap;

      const position: ElementPosition = {
        symbolId: trafo.id,
        position: { x, y },
        size: { width: config.symbolDefaultWidth, height: config.symbolDefaultHeight + 20 },
        bounds: {
          x: x - config.symbolDefaultWidth / 2,
          y: y - (config.symbolDefaultHeight + 20) / 2,
          width: config.symbolDefaultWidth,
          height: config.symbolDefaultHeight + 20,
        },
        voltageBandId: hvBand.id, // Transformator należy do pasma HV
        bayId: undefined,
        autoPositioned: true,
        isQuarantined: false,
      };
      positions.set(trafo.id, position);
    });
  }
}

// =============================================================================
// POZYCJONOWANIE BAYÓW
// =============================================================================

/**
 * Pozycjonuj baye i ich elementy.
 *
 * PHASE4 AESTHETICS:
 * - Sub-busbary są repozycjonowane na slotX ich parent baya
 * - Zapewnia to prawidłowe rozłożenie poziome elementów na różnych poziomach napięcia
 */
function positionBays(
  bays: Bay[],
  symbolById: Map<string, LayoutSymbol>,
  config: LayoutConfig,
  positions: Map<string, ElementPosition>,
  busbarGeometries: Map<string, BusbarGeometry>,
  voltageBands: VoltageBand[]
): void {
  // Grupuj baye po parent busbar
  const baysByBusbar = new Map<string, Bay[]>();

  for (const bay of bays) {
    const existing = baysByBusbar.get(bay.parentBusbarId) ?? [];
    existing.push(bay);
    baysByBusbar.set(bay.parentBusbarId, existing);
  }

  // Pozycjonuj baye dla każdego busbara
  for (const [busbarId, busbarBays] of baysByBusbar) {
    const busbarGeometry = busbarGeometries.get(busbarId);
    if (!busbarGeometry) continue;

    // Oblicz pozycje X dla bayów
    const bayXPositions = calculateBayXPositions(busbarBays.length, busbarGeometry, config);

    // Pozycjonuj każdy bay
    busbarBays.forEach((bay, index) => {
      bay.slotX = bayXPositions[index];

      // PHASE4 AESTHETICS: Reposition sub-busbars to follow bay slotX
      // This ensures that elements under sub-busbars inherit the correct X spread
      repositionSubBusbars(bay, symbolById, config, positions, busbarGeometries);

      // Pozycjonuj elementy w bayu
      positionBayElements(bay, symbolById, config, positions, busbarGeometry, voltageBands);

      // Rekurencja dla sub-bayów
      if (bay.subBays.length > 0) {
        positionBays(bay.subBays, symbolById, config, positions, busbarGeometries, voltageBands);
      }
    });
  }
}

/**
 * Reposition sub-busbars and ALL bay elements to follow their parent bay's slotX.
 *
 * This ensures that the vertical chain of elements under each bay
 * inherits the correct horizontal position from the bay's slot.
 *
 * PHASE4 AESTHETICS:
 * - Sub-busbars are moved to bay.slotX
 * - All bay elements (except parent busbar) are also moved to bay.slotX
 * - This propagates horizontal spread through the entire bay chain
 */
function repositionSubBusbars(
  bay: Bay,
  _symbolById: Map<string, LayoutSymbol>,
  _config: LayoutConfig,
  positions: Map<string, ElementPosition>,
  busbarGeometries: Map<string, BusbarGeometry>
): void {
  const newX = bay.slotX;

  // Find sub-busbars in this bay and update their positions and geometries
  for (const subBusbarId of bay.subBusbarIds) {
    const subBusbarPos = positions.get(subBusbarId);
    const subBusbarGeom = busbarGeometries.get(subBusbarId);

    if (!subBusbarPos || !subBusbarGeom) continue;

    const deltaX = newX - subBusbarPos.position.x;

    if (Math.abs(deltaX) > 1) {
      // Update position
      subBusbarPos.position.x = newX;
      subBusbarPos.bounds.x = newX - subBusbarPos.size.width / 2;

      // Update geometry - this is critical for sub-bays to inherit correct X
      subBusbarGeom.p0.x = newX - subBusbarGeom.width / 2;
      subBusbarGeom.p1.x = newX + subBusbarGeom.width / 2;
    }
  }

  // Also update ALL elements in this bay to follow slotX
  // This ensures elements like switches, transformers, loads, generators
  // all inherit the correct horizontal position
  for (const element of bay.elements) {
    const elementPos = positions.get(element.symbolId);
    if (!elementPos) continue;

    // Skip sub-busbars (already handled above)
    if (bay.subBusbarIds.includes(element.symbolId)) continue;

    // Update element X to follow bay slotX
    const deltaX = newX - elementPos.position.x;
    if (Math.abs(deltaX) > 1 && elementPos.autoPositioned) {
      elementPos.position.x = newX;
      elementPos.bounds.x = newX - elementPos.size.width / 2;
    }
  }
}

/**
 * Propagate bay X positions through the entire bay hierarchy.
 *
 * PHASE4 AESTHETICS:
 * This function ensures that all elements in a bay chain inherit the correct
 * horizontal position from their top-level bay. It recursively traverses the
 * bay hierarchy and updates element positions.
 *
 * For wind farms: gen_wt1, gen_wt2, gen_wt3 should inherit X positions from
 * their respective top-level bays under bus_sn.
 */
function propagateBayXPositions(
  bays: Bay[],
  positions: Map<string, ElementPosition>,
  busbarGeometries: Map<string, BusbarGeometry>,
  symbolById: Map<string, LayoutSymbol>,
  _config: LayoutConfig
): void {
  // Process each top-level bay and propagate its slotX to all nested elements
  for (const bay of bays) {
    propagateBayX(bay, bay.slotX, positions, busbarGeometries, symbolById);
  }
}

/**
 * Recursively propagate the X position through a bay and its sub-bays.
 *
 * IMPORTANT: We NEVER move terminal elements (Load, Generator) - they keep their
 * positions from positionBayElements which handles horizontal spreading.
 *
 * We only propagate X to:
 * 1. Non-terminal elements (switches, transformers) in this bay
 * 2. Sub-busbars in this bay (and their geometries)
 *
 * This ensures:
 * - Multiple terminals in the same bay stay spread (e.g., loads under bus_nn)
 * - Single terminals in deep sub-bays inherit correct X (via sub-busbar geometry)
 */
function propagateBayX(
  bay: Bay,
  inheritedX: number,
  positions: Map<string, ElementPosition>,
  busbarGeometries: Map<string, BusbarGeometry>,
  symbolById: Map<string, LayoutSymbol>
): void {
  // Update non-terminal elements in this bay
  for (const element of bay.elements) {
    const elementPos = positions.get(element.symbolId);
    if (!elementPos || !elementPos.autoPositioned) continue;

    const symbol = symbolById.get(element.symbolId);
    const isTerminal = symbol && (symbol.elementType === 'Load' || symbol.elementType === 'Generator');

    // NEVER move terminals - they keep their spread from positionBayElements
    if (isTerminal) continue;

    // Move non-terminal element to inherited X position
    const deltaX = inheritedX - elementPos.position.x;
    if (Math.abs(deltaX) > 1) {
      elementPos.position.x = inheritedX;
      elementPos.bounds.x = inheritedX - elementPos.size.width / 2;
    }
  }

  // Update sub-busbars to follow inherited X
  // This is critical for sub-bays to calculate correct slotX
  for (const subBusbarId of bay.subBusbarIds) {
    const subBusbarPos = positions.get(subBusbarId);
    const subBusbarGeom = busbarGeometries.get(subBusbarId);

    if (!subBusbarPos) continue;

    const deltaX = inheritedX - subBusbarPos.position.x;
    if (Math.abs(deltaX) > 1) {
      subBusbarPos.position.x = inheritedX;
      subBusbarPos.bounds.x = inheritedX - subBusbarPos.size.width / 2;

      // Update geometry - this allows sub-bays to use correct X
      if (subBusbarGeom) {
        subBusbarGeom.p0.x = inheritedX - subBusbarGeom.width / 2;
        subBusbarGeom.p1.x = inheritedX + subBusbarGeom.width / 2;
      }
    }
  }

  // Recursively process sub-bays with the same inherited X
  for (const subBay of bay.subBays) {
    propagateBayX(subBay, inheritedX, positions, busbarGeometries, symbolById);
  }
}

/**
 * Oblicz pozycje X dla bayów wzdłuż busbara.
 */
function calculateBayXPositions(
  bayCount: number,
  busbarGeometry: BusbarGeometry,
  config: LayoutConfig
): number[] {
  if (bayCount === 0) return [];
  if (bayCount === 1) return [busbarGeometry.p0.x + busbarGeometry.width / 2];

  const positions: number[] = [];
  const usableWidth = busbarGeometry.width - 2 * config.canvasPadding;
  const spacing = usableWidth / (bayCount - 1);
  const startX = busbarGeometry.p0.x + config.canvasPadding;

  for (let i = 0; i < bayCount; i++) {
    positions.push(startX + i * spacing);
  }

  return positions;
}

/**
 * Pozycjonuj elementy w bayu.
 *
 * PHASE4 AESTHETICS:
 * - Elementy terminalne (Generator, Load) na sub-busbarach są rozkładane poziomo
 * - Używa SUBBUS_TERMINAL_SPREAD_GAP_X do rozłożenia terminali wzdłuż szerokości sub-busbara
 * - Sort terminali po id dla determinizmu
 */
function positionBayElements(
  bay: Bay,
  symbolById: Map<string, LayoutSymbol>,
  config: LayoutConfig,
  positions: Map<string, ElementPosition>,
  busbarGeometry: BusbarGeometry,
  voltageBands: VoltageBand[]
): void {
  const bayX = bay.slotX;
  let currentY = busbarGeometry.p0.y + config.elementGapY;

  // Sortuj elementy po orderInBay
  const sortedElements = [...bay.elements].sort((a, b) => a.orderInBay - b.orderInBay);

  // Separate terminal elements (Generators, Loads) for horizontal spreading
  const terminalElements = sortedElements.filter((el) => {
    const symbol = symbolById.get(el.symbolId);
    return symbol && (symbol.elementType === 'Generator' || symbol.elementType === 'Load');
  });

  const nonTerminalElements = sortedElements.filter((el) => {
    const symbol = symbolById.get(el.symbolId);
    return symbol && symbol.elementType !== 'Generator' && symbol.elementType !== 'Load';
  });

  // Position non-terminal elements vertically
  for (const element of nonTerminalElements) {
    const symbol = symbolById.get(element.symbolId);
    if (!symbol) continue;

    // Pomiń busbary (już pozycjonowane)
    if (symbol.elementType === 'Bus') continue;

    // Pomiń źródła (już pozycjonowane w positionSources)
    if (symbol.elementType === 'Source' && positions.has(symbol.id)) {
      continue;
    }

    // Pomiń transformatory (już pozycjonowane)
    if (symbol.elementType === 'TransformerBranch' && positions.has(symbol.id)) {
      continue;
    }

    // Oblicz rozmiar
    const size = getSymbolSize(symbol, config);

    // Pozycja
    const x = bayX;
    const y = currentY;

    // Znajdź pasmo napięciowe
    const band = findVoltageBandForSymbol(symbol, voltageBands);

    const position: ElementPosition = {
      symbolId: symbol.id,
      position: { x, y },
      size,
      bounds: {
        x: x - size.width / 2,
        y: y - size.height / 2,
        width: size.width,
        height: size.height,
      },
      voltageBandId: band?.id ?? bay.voltageBandId,
      bayId: bay.id,
      autoPositioned: true,
      isQuarantined: false,
    };
    positions.set(symbol.id, position);

    // Następny element poniżej
    currentY += size.height + config.elementGapY;
  }

  // Position terminal elements with horizontal spreading (for sub-busbars)
  if (terminalElements.length > 0) {
    // Sort terminals by id for determinism
    const sortedTerminals = [...terminalElements].sort((a, b) =>
      a.symbolId.localeCompare(b.symbolId)
    );

    const terminalCount = sortedTerminals.length;
    const terminalY = currentY;

    // Calculate X spread: distribute terminals evenly across sub-busbar width
    // or use SUBBUS_TERMINAL_SPREAD_GAP_X if bay is narrow
    const spreadWidth = Math.max(
      (terminalCount - 1) * SUBBUS_TERMINAL_SPREAD_GAP_X,
      busbarGeometry.width * 0.5
    );
    const startX = terminalCount === 1 ? bayX : bayX - spreadWidth / 2;
    const stepX = terminalCount > 1 ? spreadWidth / (terminalCount - 1) : 0;

    sortedTerminals.forEach((element, index) => {
      const symbol = symbolById.get(element.symbolId);
      if (!symbol) return;

      const size = getSymbolSize(symbol, config);

      // Calculate X position with horizontal spread
      const x = startX + index * stepX;
      const y = terminalY;

      const band = findVoltageBandForSymbol(symbol, voltageBands);

      const position: ElementPosition = {
        symbolId: symbol.id,
        position: { x, y },
        size,
        bounds: {
          x: x - size.width / 2,
          y: y - size.height / 2,
          width: size.width,
          height: size.height,
        },
        voltageBandId: band?.id ?? bay.voltageBandId,
        bayId: bay.id,
        autoPositioned: true,
        isQuarantined: false,
      };
      positions.set(symbol.id, position);
    });
  }
}

/**
 * Pobierz rozmiar symbolu.
 */
function getSymbolSize(
  symbol: LayoutSymbol,
  config: LayoutConfig
): { width: number; height: number } {
  // Użyj rozmiaru z symbolu jeśli jest
  if (symbol.size) {
    return symbol.size;
  }

  // Domyślne rozmiary na podstawie typu
  switch (symbol.elementType) {
    case 'Bus':
      return {
        width: symbol.busWidth ?? config.busbarMinWidth,
        height: symbol.busHeight ?? config.busbarHeight,
      };
    case 'Source':
      return { width: config.symbolDefaultWidth, height: config.sourceHeight };
    case 'Load':
      return { width: config.symbolDefaultWidth - 20, height: config.symbolDefaultHeight - 10 };
    case 'TransformerBranch':
      return { width: config.symbolDefaultWidth, height: config.symbolDefaultHeight + 20 };
    case 'Switch':
      return { width: config.symbolDefaultWidth, height: config.symbolDefaultHeight };
    case 'LineBranch':
      return { width: config.symbolDefaultWidth - 10, height: config.symbolDefaultHeight };
    default:
      return { width: config.symbolDefaultWidth, height: config.symbolDefaultHeight };
  }
}

// =============================================================================
// QUARANTINE (FLOATING ELEMENTS)
// =============================================================================

/**
 * Pozycjonuj elementy bez baya (quarantine zone).
 */
function positionQuarantinedElements(
  symbols: LayoutSymbol[],
  positions: Map<string, ElementPosition>,
  config: LayoutConfig,
  quarantinedSymbols: string[]
): void {
  // Znajdź elementy bez pozycji
  const unpositioned = symbols.filter((s) => !positions.has(s.id));

  if (unpositioned.length === 0) return;

  // Znajdź maksymalne Y
  let maxY = config.canvasPadding;
  for (const pos of positions.values()) {
    maxY = Math.max(maxY, pos.bounds.y + pos.bounds.height);
  }

  // Quarantine zone zaczyna się pod wszystkimi pozycjonowanymi elementami
  const quarantineStartY = maxY + config.bandGap * 2;
  const centerX = config.canvasPadding + config.busbarMinWidth / 2;

  // Rozmieść elementy w siatce
  unpositioned.forEach((symbol, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;

    const x = centerX + (col - 1.5) * config.bayGap;
    const y = quarantineStartY + row * config.elementGapY;

    const size = getSymbolSize(symbol, config);

    const position: ElementPosition = {
      symbolId: symbol.id,
      position: { x, y },
      size,
      bounds: {
        x: x - size.width / 2,
        y: y - size.height / 2,
        width: size.width,
        height: size.height,
      },
      voltageBandId: '',
      bayId: undefined,
      autoPositioned: true,
      isQuarantined: true,
    };
    positions.set(symbol.id, position);

    quarantinedSymbols.push(symbol.id);
  });
}

// =============================================================================
// USER OVERRIDES
// =============================================================================

/**
 * Zastosuj user overrides (ręczne przesunięcia).
 */
function applyUserOverrides(
  positions: Map<string, ElementPosition>,
  userOverrides: Map<string, UserPositionOverride>,
  _config: LayoutConfig
): void {
  for (const [symbolId, override] of userOverrides) {
    const position = positions.get(symbolId);
    if (!position) continue;

    // Zastosuj nową pozycję
    const newX = override.position.x;
    const newY = override.position.y;

    position.position = { x: newX, y: newY };
    position.bounds = {
      x: newX - position.size.width / 2,
      y: newY - position.size.height / 2,
      width: position.size.width,
      height: position.size.height,
    };
    position.autoPositioned = false;
  }
}

// =============================================================================
// COLLISION DETECTION & RESOLUTION
// =============================================================================

/**
 * Rozwiąż kolizje między elementami.
 *
 * ALGORYTM DETERMINISTYCZNY (Phase4 Aesthetics):
 * 1. Sortuj elementy po (y, x, id) dla stabilności
 * 2. Dla każdej kolizji — push-away w osi X (stały krok)
 * 3. Limit iteracji z COLLISION_MAX_ITERATIONS
 * 4. Tiebreak po id (string sort)
 *
 * @returns Liczba rozwiązanych kolizji
 */
function resolveCollisions(
  positions: Map<string, ElementPosition>,
  symbolById: Map<string, LayoutSymbol>,
  config: LayoutConfig
): number {
  let resolved = 0;

  for (let iter = 0; iter < COLLISION_MAX_ITERATIONS; iter++) {
    const collisions = detectCollisions(positions);

    if (collisions.length === 0) break;

    // Sort collisions deterministically by (y, x, id) of first element
    const sortedCollisions = collisions
      .map(([idA, idB]): [string, string, ElementPosition, ElementPosition] => {
        const posA = positions.get(idA)!;
        const posB = positions.get(idB)!;
        return [idA, idB, posA, posB];
      })
      .sort((a, b) => {
        // Sort by Y first, then X, then ID
        const yDiff = a[2].position.y - b[2].position.y;
        if (Math.abs(yDiff) > 1) return yDiff;
        const xDiff = a[2].position.x - b[2].position.x;
        if (Math.abs(xDiff) > 1) return xDiff;
        return a[0].localeCompare(b[0]);
      });

    for (const [idA, idB, posA, posB] of sortedCollisions) {
      // Check if still colliding (may have been resolved by previous iteration)
      if (!rectanglesOverlap(posA.bounds, posB.bounds)) continue;

      // Determine which element to move (deterministic: larger ID moves)
      const [stableId, moveId] = idA.localeCompare(idB) < 0 ? [idA, idB] : [idB, idA];
      const toMove = positions.get(moveId)!;
      const stable = positions.get(stableId)!;

      // Don't move user-pinned elements
      if (!toMove.autoPositioned) continue;

      // Don't move busbars
      const symbol = symbolById.get(toMove.symbolId);
      if (symbol?.elementType === 'Bus') continue;

      // Calculate push direction: push right if toMove is right of stable, else push left
      // Then push down as fallback
      const dx = toMove.position.x - stable.position.x;
      const pushDirection = dx >= 0 ? 1 : -1;

      // Try horizontal push first
      const newX = toMove.position.x + pushDirection * PUSH_AWAY_STEP_X;
      const testBounds: Rectangle = {
        x: newX - toMove.size.width / 2,
        y: toMove.bounds.y,
        width: toMove.bounds.width,
        height: toMove.bounds.height,
      };

      // Check if horizontal push resolves collision
      if (!rectanglesOverlap(stable.bounds, testBounds)) {
        toMove.position.x = newX;
        toMove.bounds.x = newX - toMove.size.width / 2;
      } else {
        // Fallback: push down
        toMove.position.y += config.elementGapY;
        toMove.bounds.y += config.elementGapY;
      }

      resolved++;
    }
  }

  return resolved;
}

/**
 * Wykryj kolizje między elementami.
 *
 * @returns Lista par kolidujących elementów (symbol IDs)
 */
function detectCollisions(positions: Map<string, ElementPosition>): [string, string][] {
  const collisions: [string, string][] = [];
  const entries = Array.from(positions.entries());

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [idA, posA] = entries[i];
      const [idB, posB] = entries[j];

      if (rectanglesOverlap(posA.bounds, posB.bounds)) {
        collisions.push([idA, idB]);
      }
    }
  }

  return collisions;
}

/**
 * Sprawdź czy dwa prostokąty się nakładają.
 */
function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

// =============================================================================
// SNAP TO GRID
// =============================================================================

/**
 * Snap wszystkie pozycje do siatki.
 */
function snapToGrid(positions: Map<string, ElementPosition>, gridSize: number): void {
  for (const position of positions.values()) {
    position.position.x = Math.round(position.position.x / gridSize) * gridSize;
    position.position.y = Math.round(position.position.y / gridSize) * gridSize;

    position.bounds.x = position.position.x - position.size.width / 2;
    position.bounds.y = position.position.y - position.size.height / 2;
  }
}

// =============================================================================
// FUNKCJE EKSPORTOWANE
// =============================================================================

/**
 * Oblicz bounding box całego schematu.
 */
export function calculateSchemaBounds(
  positions: Map<string, ElementPosition>,
  config: LayoutConfig
): Rectangle {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const position of positions.values()) {
    minX = Math.min(minX, position.bounds.x);
    minY = Math.min(minY, position.bounds.y);
    maxX = Math.max(maxX, position.bounds.x + position.bounds.width);
    maxY = Math.max(maxY, position.bounds.y + position.bounds.height);
  }

  // Dodaj padding
  return {
    x: minX - config.canvasPadding,
    y: minY - config.canvasPadding,
    width: maxX - minX + 2 * config.canvasPadding,
    height: maxY - minY + 2 * config.canvasPadding,
  };
}
