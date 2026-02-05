/**
 * Phase 2: Bay Detection & Assignment
 *
 * ZADANIE: Rozpoznaj baye (feeder bays) odchodzące od szyn.
 *
 * BAY = pionowy łańcuch elementów odchodzący od szyny (busbara).
 * Każdy bay to ścieżka od busbara do terminala (load, source, sub-busbar).
 *
 * ALGORYTM:
 * 1. Znajdź wszystkie busbary (nodes z type = 'Bus')
 * 2. Dla każdego busbara: BFS w DÓŁ (follow edges downstream)
 * 3. Każda ścieżka od busbar do terminala = 1 bay
 * 4. Jeśli ścieżka zawiera sub-busbar → rekurencja (sub-bays)
 * 5. Klasyfikuj typ bay na podstawie elementów
 *
 * DETERMINIZM: Kolejność bayów = sortowanie po ID pierwszego elementu.
 */

import type {
  LayoutSymbol,
  Bay,
  BayType,
  BayElement,
  VoltageBand,
  PipelineContext,
} from './types';
import { findVoltageBandForSymbol, getSymbolMainVoltage } from './phase1-voltage-bands';

// =============================================================================
// GŁÓWNA FUNKCJA FAZY 2
// =============================================================================

/**
 * Faza 2: Wykrywanie bayów.
 *
 * @param context - Kontekst pipeline
 * @returns Zaktualizowany kontekst z bays
 */
export function detectBays(context: PipelineContext): PipelineContext {
  const { symbols, symbolById, elementToSymbol, voltageBands } = context;

  if (!voltageBands || voltageBands.length === 0) {
    return {
      ...context,
      bays: [],
    };
  }

  // Krok 1: Znajdź wszystkie busbary
  const busbars = symbols
    .filter((s) => s.elementType === 'Bus')
    .sort((a, b) => a.id.localeCompare(b.id)); // Determinizm

  // Krok 2: Buduj graf połączeń
  const connectionGraph = buildConnectionGraph(symbols);

  // Krok 3: Wykryj baye dla każdego busbara
  const allBays: Bay[] = [];
  const globalProcessedElements = new Set<string>();
  const processedBusbars = new Set<string>();

  for (const busbar of busbars) {
    if (processedBusbars.has(busbar.id)) {
      continue;
    }

    const bays = detectBaysFromBusbar(
      busbar,
      symbols,
      symbolById,
      elementToSymbol,
      connectionGraph,
      voltageBands,
      0, // depth = 0 (główne baye)
      globalProcessedElements,
      processedBusbars
    );

    allBays.push(...bays);
  }

  // Krok 4: Przypisz sloty (indeksy) bayom
  assignBaySlots(allBays);

  return {
    ...context,
    bays: allBays,
  };
}

// =============================================================================
// GRAF POŁĄCZEŃ
// =============================================================================

/**
 * Graf połączeń między elementami.
 */
interface ConnectionGraph {
  /** Mapa: element ID → lista połączonych element IDs */
  adjacency: Map<string, Set<string>>;

  /** Mapa: (from, to) → symbol ID łączący */
  edgeToSymbol: Map<string, string>;
}

/**
 * Buduj graf połączeń z symboli.
 *
 * @param symbols - Lista symboli
 * @returns Graf połączeń
 */
function buildConnectionGraph(symbols: LayoutSymbol[]): ConnectionGraph {
  const adjacency = new Map<string, Set<string>>();
  const edgeToSymbol = new Map<string, string>();

  // Pomocnicza funkcja do dodawania krawędzi
  const addEdge = (fromElementId: string, toElementId: string, symbolId: string) => {
    if (!adjacency.has(fromElementId)) {
      adjacency.set(fromElementId, new Set());
    }
    if (!adjacency.has(toElementId)) {
      adjacency.set(toElementId, new Set());
    }

    adjacency.get(fromElementId)!.add(toElementId);
    adjacency.get(toElementId)!.add(fromElementId);

    const edgeKey = makeEdgeKey(fromElementId, toElementId);
    edgeToSymbol.set(edgeKey, symbolId);
  };

  for (const symbol of symbols) {
    // Branch (Line, Transformer) łączy fromNodeId z toNodeId
    if (
      (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') &&
      symbol.fromNodeId &&
      symbol.toNodeId
    ) {
      addEdge(symbol.fromNodeId, symbol.toNodeId, symbol.id);
    }

    // Switch łączy fromNodeId z toNodeId
    if (symbol.elementType === 'Switch' && symbol.fromNodeId && symbol.toNodeId) {
      addEdge(symbol.fromNodeId, symbol.toNodeId, symbol.id);
    }

    // Source/Load są połączone do węzła
    if (
      (symbol.elementType === 'Source' || symbol.elementType === 'Load') &&
      symbol.connectedToNodeId
    ) {
      // Source/Load nie tworzą krawędzi w grafie — są terminalami
      // Dodajemy tylko węzeł do adjacency
      if (!adjacency.has(symbol.connectedToNodeId)) {
        adjacency.set(symbol.connectedToNodeId, new Set());
      }
    }
  }

  return { adjacency, edgeToSymbol };
}

/**
 * Utwórz klucz krawędzi (deterministyczny — sortowany).
 */
function makeEdgeKey(elementId1: string, elementId2: string): string {
  const sorted = [elementId1, elementId2].sort();
  return `${sorted[0]}::${sorted[1]}`;
}

// =============================================================================
// WYKRYWANIE BAYÓW
// =============================================================================

/**
 * Wykryj baye odchodzące od busbara.
 *
 * @param busbar - Symbol busbara
 * @param allSymbols - Wszystkie symbole
 * @param symbolById - Mapa symbol ID → symbol
 * @param elementToSymbol - Mapa element ID → symbol ID
 * @param graph - Graf połączeń
 * @param voltageBands - Pasma napięciowe
 * @param depth - Głębokość zagnieżdżenia
 * @param processedElements - Globalny zbiór przetworzonych elementów
 * @param processedBusbars - Globalny zbiór przetworzonych busbarów
 * @returns Lista bayów
 */
function detectBaysFromBusbar(
  busbar: LayoutSymbol,
  allSymbols: LayoutSymbol[],
  symbolById: Map<string, LayoutSymbol>,
  elementToSymbol: Map<string, string>,
  graph: ConnectionGraph,
  voltageBands: VoltageBand[],
  depth: number,
  processedElements: Set<string>,
  processedBusbars: Set<string>
): Bay[] {
  // Oznacz busbar jako przetworzony
  processedBusbars.add(busbar.id);
  processedElements.add(busbar.elementId);

  // Limit głębokości rekurencji (bezpieczeństwo)
  if (depth > 10) {
    return [];
  }

  const bays: Bay[] = [];
  const busbarElementId = busbar.elementId;

  // Znajdź wszystkie elementy bezpośrednio połączone z busbarem
  const connectedElementIds = graph.adjacency.get(busbarElementId) ?? new Set();

  // Sortuj dla determinizmu
  const sortedConnected = Array.from(connectedElementIds).sort();

  for (const connectedElementId of sortedConnected) {
    if (processedElements.has(connectedElementId)) {
      continue;
    }

    // Sprawdź czy to jest element łączący (Switch/Branch) czy terminal
    const connectedSymbolId = elementToSymbol.get(connectedElementId);
    const connectedSymbol = connectedSymbolId ? symbolById.get(connectedSymbolId) : undefined;

    // Znajdź symbol łączący busbar z tym elementem
    const edgeKey = makeEdgeKey(busbarElementId, connectedElementId);
    const linkingSymbolId = graph.edgeToSymbol.get(edgeKey);
    const linkingSymbol = linkingSymbolId ? symbolById.get(linkingSymbolId) : undefined;

    // BFS od busbara aby znaleźć wszystkie elementy w bayu
    const bayElements = collectBayElements(
      busbar,
      linkingSymbol ?? connectedSymbol,
      allSymbols,
      symbolById,
      elementToSymbol,
      graph,
      processedElements
    );

    if (bayElements.length === 0) {
      continue;
    }

    // Znajdź sub-busbary w bayu
    const subBusbarIds = bayElements
      .filter((e) => {
        const sym = symbolById.get(e.symbolId);
        return sym?.elementType === 'Bus';
      })
      .map((e) => e.symbolId);

    // Klasyfikuj typ baya
    const bayType = classifyBayType(bayElements, symbolById, allSymbols);

    // Znajdź pasmo napięciowe baya
    const voltageBand = findVoltageBandForSymbol(busbar, voltageBands);

    const bay: Bay = {
      id: `bay_${busbar.id}_${bays.length}`,
      parentBusbarId: busbar.id,
      parentBusbarElementId: busbarElementId,
      elements: bayElements,
      subBusbarIds,
      subBays: [], // Wypełnione później (rekurencja)
      bayType,
      depth,
      slotX: 0, // Wypełnione w assignBaySlots
      slotIndex: bays.length,
      voltageBandId: voltageBand?.id ?? '',
    };

    // Rekurencja dla sub-busbarów
    for (const subBusbarId of subBusbarIds) {
      // Sprawdź czy sub-busbar już był przetworzony
      if (processedBusbars.has(subBusbarId)) {
        continue;
      }

      const subBusbar = symbolById.get(subBusbarId);
      if (subBusbar) {
        const subBays = detectBaysFromBusbar(
          subBusbar,
          allSymbols,
          symbolById,
          elementToSymbol,
          graph,
          voltageBands,
          depth + 1,
          processedElements,
          processedBusbars
        );
        bay.subBays.push(...subBays);
      }
    }

    bays.push(bay);
  }

  // Sortuj baye dla determinizmu
  bays.sort((a, b) => {
    // Sortuj po typie (incomer pierwszy, tie ostatni)
    const typeOrder = BAY_TYPE_ORDER[a.bayType] - BAY_TYPE_ORDER[b.bayType];
    if (typeOrder !== 0) return typeOrder;

    // Potem po ID pierwszego elementu
    const aFirstId = a.elements[0]?.symbolId ?? '';
    const bFirstId = b.elements[0]?.symbolId ?? '';
    return aFirstId.localeCompare(bFirstId);
  });

  return bays;
}

/**
 * Zbierz elementy należące do baya (BFS od busbara).
 */
function collectBayElements(
  busbar: LayoutSymbol,
  startSymbol: LayoutSymbol | undefined,
  allSymbols: LayoutSymbol[],
  _symbolById: Map<string, LayoutSymbol>,
  elementToSymbol: Map<string, string>,
  graph: ConnectionGraph,
  processedElements: Set<string>
): BayElement[] {
  if (!startSymbol) {
    return [];
  }

  const elements: BayElement[] = [];
  const visited = new Set<string>();
  const queue: Array<{ symbol: LayoutSymbol; order: number }> = [];

  // Start od elementu łączącego
  queue.push({ symbol: startSymbol, order: 0 });
  visited.add(startSymbol.id);

  while (queue.length > 0) {
    const { symbol, order } = queue.shift()!;

    // Nie dodawaj początkowego busbara do baya
    if (symbol.id === busbar.id) {
      continue;
    }

    // Oznacz element jako przetworzony (globalnie)
    processedElements.add(symbol.elementId);

    // Dodaj do listy elementów baya
    elements.push({
      symbolId: symbol.id,
      elementId: symbol.elementId,
      elementType: symbol.elementType,
      orderInBay: order,
      voltageKV: getSymbolMainVoltage(symbol),
    });

    // Jeśli to sub-busbar — zatrzymaj eksplorację (będzie osobna rekurencja)
    if (symbol.elementType === 'Bus' && symbol.id !== busbar.id) {
      continue;
    }

    // Jeśli to terminal (Source/Load) — koniec ścieżki
    if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      continue;
    }

    // Znajdź sąsiadów
    const neighbors = findSymbolNeighbors(symbol, allSymbols, elementToSymbol, graph);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id) && neighbor.id !== busbar.id) {
        visited.add(neighbor.id);
        queue.push({ symbol: neighbor, order: order + 1 });
      }
    }
  }

  // Sortuj elementy po orderInBay
  elements.sort((a, b) => a.orderInBay - b.orderInBay);

  // Renumeruj order
  elements.forEach((e, i) => (e.orderInBay = i));

  return elements;
}

/**
 * Znajdź sąsiadów symbolu w grafie.
 */
function findSymbolNeighbors(
  symbol: LayoutSymbol,
  allSymbols: LayoutSymbol[],
  elementToSymbol: Map<string, string>,
  graph: ConnectionGraph
): LayoutSymbol[] {
  const neighbors: LayoutSymbol[] = [];
  const symbolById = new Map(allSymbols.map((s) => [s.id, s]));

  // Dla Branch/Switch — szukaj przez fromNodeId/toNodeId
  if (symbol.fromNodeId) {
    // Szukaj elementów połączonych z fromNodeId
    const connected = graph.adjacency.get(symbol.fromNodeId) ?? new Set();
    for (const elementId of connected) {
      if (elementId !== symbol.toNodeId) {
        const symbolId = elementToSymbol.get(elementId);
        if (symbolId) {
          const neighborSymbol = symbolById.get(symbolId);
          if (neighborSymbol) {
            neighbors.push(neighborSymbol);
          }
        }
      }
    }
  }

  if (symbol.toNodeId) {
    // Szukaj elementów połączonych z toNodeId
    const connected = graph.adjacency.get(symbol.toNodeId) ?? new Set();
    for (const elementId of connected) {
      if (elementId !== symbol.fromNodeId) {
        const symbolId = elementToSymbol.get(elementId);
        if (symbolId) {
          const neighborSymbol = symbolById.get(symbolId);
          if (neighborSymbol) {
            neighbors.push(neighborSymbol);
          }
        }
      }
    }

    // Szukaj Source/Load połączonych z toNodeId
    for (const s of allSymbols) {
      if (
        (s.elementType === 'Source' || s.elementType === 'Load') &&
        s.connectedToNodeId === symbol.toNodeId
      ) {
        neighbors.push(s);
      }
    }
  }

  // Usuń duplikaty i sortuj dla determinizmu
  const uniqueNeighbors = Array.from(new Map(neighbors.map((n) => [n.id, n])).values());
  uniqueNeighbors.sort((a, b) => a.id.localeCompare(b.id));

  return uniqueNeighbors;
}

// =============================================================================
// KLASYFIKACJA TYPU BAYA
// =============================================================================

/**
 * Kolejność typów bayów (dla sortowania).
 */
const BAY_TYPE_ORDER: Record<BayType, number> = {
  incomer: 0,
  measurement: 1,
  feeder: 2,
  generator: 3,
  oze_pv: 4,
  oze_wind: 5,
  bess: 6,
  capacitor: 7,
  auxiliary: 8,
  tie: 9,
  unknown: 10,
};

/**
 * Klasyfikuj typ baya na podstawie elementów.
 *
 * @param elements - Elementy w bayu
 * @param symbolById - Mapa symbol ID → symbol
 * @param allSymbols - Wszystkie symbole
 * @returns Typ baya
 */
function classifyBayType(
  elements: BayElement[],
  symbolById: Map<string, LayoutSymbol>,
  _allSymbols: LayoutSymbol[]
): BayType {
  const symbols = elements.map((e) => symbolById.get(e.symbolId)).filter(Boolean) as LayoutSymbol[];

  // Sprawdź terminale (końcowe elementy)
  const terminals = symbols.filter(
    (s) => s.elementType === 'Source' || s.elementType === 'Load' || s.elementType === 'Bus'
  );

  // Czy kończy się na sub-busbar?
  const hasSubBusbar = terminals.some((t) => t.elementType === 'Bus');

  // Czy zawiera transformator?
  const hasTransformer = symbols.some((s) => s.elementType === 'TransformerBranch');

  // Czy łączy dwa busbary? (tie)
  const busbarsInBay = symbols.filter((s) => s.elementType === 'Bus');
  if (busbarsInBay.length >= 2) {
    return 'tie';
  }

  // Sprawdź typ na podstawie terminali
  for (const terminal of terminals) {
    const nameLower = terminal.elementName.toLowerCase();

    // PV / Fotowoltaika
    if (
      terminal.elementType === 'Source' &&
      (nameLower.includes('pv') ||
        nameLower.includes('fotowolt') ||
        nameLower.includes('solar') ||
        nameLower.includes('fotowolaik'))
    ) {
      return 'oze_pv';
    }

    // Wiatr / Farm wiatrowa
    if (
      terminal.elementType === 'Source' &&
      (nameLower.includes('fw') ||
        nameLower.includes('wiatr') ||
        nameLower.includes('wind') ||
        nameLower.includes('turbine'))
    ) {
      return 'oze_wind';
    }

    // BESS / Magazyn energii
    if (
      terminal.elementType === 'Source' &&
      (nameLower.includes('bess') ||
        nameLower.includes('magazyn') ||
        nameLower.includes('battery') ||
        nameLower.includes('storage'))
    ) {
      return 'bess';
    }

    // Generator konwencjonalny
    if (
      terminal.elementType === 'Source' &&
      (nameLower.includes('generator') ||
        nameLower.includes('gen') ||
        nameLower.includes('agregat'))
    ) {
      return 'generator';
    }

    // Bateria kondensatorów
    if (
      (terminal.elementType === 'Source' || terminal.elementType === 'Load') &&
      (nameLower.includes('kondensator') ||
        nameLower.includes('capacitor') ||
        nameLower.includes('cap') ||
        nameLower.includes('bk'))
    ) {
      return 'capacitor';
    }

    // Potrzeby własne
    if (
      nameLower.includes('potrzeby własne') ||
      nameLower.includes('auxiliary') ||
      nameLower.includes('pz') ||
      nameLower.includes('p.w.')
    ) {
      return 'auxiliary';
    }
  }

  // Incomer: bay z transformatorem od wyższego napięcia
  if (hasTransformer) {
    // Sprawdź czy transformator łączy z wyższym napięciem
    const trafo = symbols.find((s) => s.elementType === 'TransformerBranch');
    if (trafo) {
      const hvVoltage = trafo.voltageHV ?? 0;
      const lvVoltage = trafo.voltageLV ?? 0;

      // Jeśli bay zawiera stronę LV transformatora → incomer
      if (hvVoltage > lvVoltage) {
        return 'incomer';
      }
    }
  }

  // Pole pomiarowe: tylko CT i VT
  const onlyCTVT = symbols.every(
    (s) =>
      s.elementType === 'Switch' ||
      s.elementType === 'Bus' ||
      s.elementName.toLowerCase().includes('ct') ||
      s.elementName.toLowerCase().includes('vt') ||
      s.elementName.toLowerCase().includes('przekładnik')
  );
  if (onlyCTVT && symbols.length <= 3) {
    return 'measurement';
  }

  // Feeder: podstawowy typ (kabel/linia → stacja/odbiornik)
  if (
    terminals.some((t) => t.elementType === 'Load') ||
    hasSubBusbar ||
    symbols.some((s) => s.elementType === 'LineBranch')
  ) {
    return 'feeder';
  }

  return 'unknown';
}

// =============================================================================
// PRZYPISANIE SLOTÓW
// =============================================================================

/**
 * Przypisz sloty (indeksy X) bayom.
 *
 * @param bays - Lista bayów
 */
function assignBaySlots(bays: Bay[]): void {
  // Grupuj baye po parent busbar
  const baysByBusbar = new Map<string, Bay[]>();

  for (const bay of bays) {
    const existing = baysByBusbar.get(bay.parentBusbarId) ?? [];
    existing.push(bay);
    baysByBusbar.set(bay.parentBusbarId, existing);
  }

  // Dla każdego busbara — przypisz sloty
  for (const [_busbarId, busbarBays] of baysByBusbar) {
    // Sortuj po typie i ID
    busbarBays.sort((a, b) => {
      const typeOrder = BAY_TYPE_ORDER[a.bayType] - BAY_TYPE_ORDER[b.bayType];
      if (typeOrder !== 0) return typeOrder;
      return a.id.localeCompare(b.id);
    });

    // Przypisz slotIndex
    busbarBays.forEach((bay, index) => {
      bay.slotIndex = index;
    });
  }
}

// =============================================================================
// FUNKCJE POMOCNICZE DLA INNYCH FAZ
// =============================================================================

/**
 * Znajdź bay zawierający dany symbol.
 *
 * @param symbolId - ID symbolu
 * @param bays - Lista bayów
 * @returns Bay lub undefined
 */
export function findBayContainingSymbol(symbolId: string, bays: Bay[]): Bay | undefined {
  for (const bay of bays) {
    if (bay.elements.some((e) => e.symbolId === symbolId)) {
      return bay;
    }

    // Sprawdź sub-baye
    const subBay = findBayContainingSymbol(symbolId, bay.subBays);
    if (subBay) {
      return subBay;
    }
  }

  return undefined;
}

/**
 * Znajdź wszystkie baye dla danego busbara.
 *
 * @param busbarId - ID busbara
 * @param bays - Lista bayów
 * @returns Lista bayów
 */
export function findBaysForBusbar(busbarId: string, bays: Bay[]): Bay[] {
  return bays.filter((bay) => bay.parentBusbarId === busbarId);
}

/**
 * Policz łączną liczbę bayów (włącznie z sub-bayami).
 *
 * @param bays - Lista bayów
 * @returns Łączna liczba
 */
export function countTotalBays(bays: Bay[]): number {
  let count = bays.length;
  for (const bay of bays) {
    count += countTotalBays(bay.subBays);
  }
  return count;
}

/**
 * Wykryj tie-baye (łączniki międzyszynowe).
 *
 * @param bays - Lista bayów
 * @returns Lista tie-bayów
 */
export function findTieBays(bays: Bay[]): Bay[] {
  return bays.filter((bay) => bay.bayType === 'tie');
}

/**
 * Wykryj SZR (samoczynne załączanie rezerwy).
 *
 * SZR to specjalny przypadek tie-bay z normalnie otwartym łącznikiem.
 *
 * @param bays - Lista bayów
 * @param symbolById - Mapa symbol ID → symbol
 * @returns Lista SZR bayów
 */
export function findSZRBays(bays: Bay[], symbolById: Map<string, LayoutSymbol>): Bay[] {
  return bays.filter((bay) => {
    if (bay.bayType !== 'tie') {
      return false;
    }

    // Sprawdź czy zawiera normalnie otwarty switch
    for (const element of bay.elements) {
      const symbol = symbolById.get(element.symbolId);
      if (symbol?.elementType === 'Switch' && symbol.switchState === 'OPEN') {
        // Sprawdź nazwę
        const nameLower = symbol.elementName.toLowerCase();
        if (
          nameLower.includes('szr') ||
          nameLower.includes('ats') ||
          nameLower.includes('samoczynne') ||
          nameLower.includes('n.o.') ||
          nameLower.includes('normally open')
        ) {
          return true;
        }
      }
    }

    return false;
  });
}
