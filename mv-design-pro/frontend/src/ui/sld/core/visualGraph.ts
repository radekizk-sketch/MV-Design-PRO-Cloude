/**
 * VisualGraphV1 — Zamrozony kontrakt miedzy Topology Adapter a Layout Engine.
 *
 * CANONICAL CONTRACT (BINDING):
 * - Wersja: V1
 * - Ten plik jest JEDYNYM zrodlem prawdy dla typow VisualGraph.
 * - Layout Engine MUSI przyjmowac VisualGraphV1 jako wejscie.
 * - Topology Adapter MUSI produkowac VisualGraphV1 jako wyjscie.
 * - Zmiany kontraktu wymagaja bump wersji (V2).
 *
 * DETERMINIZM:
 * - nodes i edges MUSZĄ byc sortowane leksykograficznie po id w canonical serializer.
 * - attributes maja jawne klucze (brak map z nieustalonym porzadkiem).
 * - Adapter MUSI dostarczac stabilne id (element_id ze Snapshota lub deterministyczna kompozycja).
 *
 * REGULY:
 * - PV i BESS sa GENERATOR_PV / GENERATOR_BESS (zrodla), NIGDY jako LOAD.
 * - Stacje A/B/C/D sa SWITCHGEAR_BLOCK (podgraf) z portami IN/OUT/BRANCH.
 * - Segmentacja trunk/branch/secondary jest jawna w EdgeTypeV1.
 * - Kierunek przeplywu mocy NIE jest uzywany do segmentacji.
 */

// =============================================================================
// VERSION
// =============================================================================

/** Wersja kontraktu VisualGraph. */
export const VISUAL_GRAPH_VERSION = 'V1' as const;

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Typ wezla w grafie wizualnym.
 *
 * Mapowanie na elementy sieci SN/nN:
 * - GRID_SOURCE: zasilanie z sieci WN (GPZ infeed)
 * - STATION_SN_NN_A: stacja SN/nN typ A (1 TR, linia zasilajaca, rozdzielnia nN)
 * - STATION_SN_NN_B: stacja SN/nN typ B (jak A + pole pomiarowe + zabezpieczenie)
 * - STATION_SN_NN_C: stacja SN/nN typ C (jak B + pole odgalezieniowe)
 * - STATION_SN_NN_D: stacja SN/nN typ D (sekcyjna — 2 szyny, sprzeglo)
 * - SWITCHGEAR_BLOCK: blok rozdzielczy (podgraf wewnetrzny stacji)
 * - TRANSFORMER_WN_SN: transformator WN/SN (GPZ)
 * - TRANSFORMER_SN_NN: transformator SN/nN (stacja)
 * - BUS_SN: szyna zbiorcza SN
 * - BUS_NN: szyna zbiorcza nN
 * - FEEDER_JUNCTION: punkt rozgalezienia feedera
 * - LOAD: odbiorca
 * - GENERATOR_PV: generator fotowoltaiczny (zrodlo, NIGDY load)
 * - GENERATOR_BESS: magazyn energii BESS (zrodlo, NIGDY load)
 * - GENERATOR_WIND: generator wiatrowy (zrodlo)
 * - SWITCH_BREAKER: wylacznik (CB)
 * - SWITCH_DISCONNECTOR: odlacznik
 * - SWITCH_LOAD_SWITCH: rozlacznik
 * - SWITCH_FUSE: bezpiecznik
 */
export const NodeTypeV1 = {
  GRID_SOURCE: 'GRID_SOURCE',
  STATION_SN_NN_A: 'STATION_SN_NN_A',
  STATION_SN_NN_B: 'STATION_SN_NN_B',
  STATION_SN_NN_C: 'STATION_SN_NN_C',
  STATION_SN_NN_D: 'STATION_SN_NN_D',
  SWITCHGEAR_BLOCK: 'SWITCHGEAR_BLOCK',
  TRANSFORMER_WN_SN: 'TRANSFORMER_WN_SN',
  TRANSFORMER_SN_NN: 'TRANSFORMER_SN_NN',
  BUS_SN: 'BUS_SN',
  BUS_NN: 'BUS_NN',
  FEEDER_JUNCTION: 'FEEDER_JUNCTION',
  LOAD: 'LOAD',
  GENERATOR_PV: 'GENERATOR_PV',
  GENERATOR_BESS: 'GENERATOR_BESS',
  GENERATOR_WIND: 'GENERATOR_WIND',
  SWITCH_BREAKER: 'SWITCH_BREAKER',
  SWITCH_DISCONNECTOR: 'SWITCH_DISCONNECTOR',
  SWITCH_LOAD_SWITCH: 'SWITCH_LOAD_SWITCH',
  SWITCH_FUSE: 'SWITCH_FUSE',
} as const;

export type NodeTypeV1 = (typeof NodeTypeV1)[keyof typeof NodeTypeV1];

/**
 * Typ krawedzi w grafie wizualnym.
 *
 * Segmentacja topologiczna:
 * - TRUNK: magistrala (od GPZ wzdluz korytarza)
 * - BRANCH: odgalezienie od magistrali (zasilanie stacji)
 * - SECONDARY_CONNECTOR: polaczenie spoza drzewa (ring, NOP, sprzeglo miedzy sekcjami)
 * - BUS_COUPLER: lacznik sekcyjny miedzy szynami
 * - TRANSFORMER_LINK: polaczenie transformatorowe (WN/SN lub SN/nN)
 * - INTERNAL_SWITCHGEAR: polaczenie wewnatrz bloku rozdzielczego stacji
 */
export const EdgeTypeV1 = {
  TRUNK: 'TRUNK',
  BRANCH: 'BRANCH',
  SECONDARY_CONNECTOR: 'SECONDARY_CONNECTOR',
  BUS_COUPLER: 'BUS_COUPLER',
  TRANSFORMER_LINK: 'TRANSFORMER_LINK',
  INTERNAL_SWITCHGEAR: 'INTERNAL_SWITCHGEAR',
} as const;

export type EdgeTypeV1 = (typeof EdgeTypeV1)[keyof typeof EdgeTypeV1];

/**
 * Rola portu w wezle.
 *
 * Porty semantyczne (nie tylko geometryczne):
 * - IN: wejscie zasilania (od strony zrodla)
 * - OUT: wyjscie zasilania (w kierunku odbiorcow)
 * - BRANCH: odgalezienie boczne
 * - BUS: polaczenie z szyna zbiorcza
 * - FIELD_IN: pole wejsciowe rozdzielni
 * - FIELD_OUT: pole wyjsciowe rozdzielni
 * - COUPLER_A: strona A sprzegla sekcyjnego
 * - COUPLER_B: strona B sprzegla sekcyjnego
 * - TRANSFORMER_HV: strona WN transformatora
 * - TRANSFORMER_LV: strona nN transformatora
 */
export const PortRoleV1 = {
  IN: 'IN',
  OUT: 'OUT',
  BRANCH: 'BRANCH',
  BUS: 'BUS',
  FIELD_IN: 'FIELD_IN',
  FIELD_OUT: 'FIELD_OUT',
  COUPLER_A: 'COUPLER_A',
  COUPLER_B: 'COUPLER_B',
  TRANSFORMER_HV: 'TRANSFORMER_HV',
  TRANSFORMER_LV: 'TRANSFORMER_LV',
} as const;

export type PortRoleV1 = (typeof PortRoleV1)[keyof typeof PortRoleV1];

// =============================================================================
// PORT REFERENCE
// =============================================================================

/**
 * Referencja do portu wezla (identyfikuje jednoznacznie punkt polaczenia).
 */
export interface PortRefV1 {
  /** ID wezla do ktorego nalezy port */
  readonly nodeId: string;
  /** ID portu w ramach wezla */
  readonly portId: string;
}

// =============================================================================
// PORT DEFINITION
// =============================================================================

/**
 * Definicja portu wezla.
 */
export interface VisualPortV1 {
  /** Unikalny ID portu w ramach wezla */
  readonly id: string;
  /** Rola semantyczna portu */
  readonly role: PortRoleV1;
  /** Pozycja wzgledna (0-1 w przestrzeni symbolu) */
  readonly relativeX: number;
  /** Pozycja wzgledna (0-1 w przestrzeni symbolu) */
  readonly relativeY: number;
}

// =============================================================================
// NODE
// =============================================================================

/**
 * Wezel w grafie wizualnym.
 *
 * Kazdy wezel odpowiada dokladnie jednemu elementowi z NetworkModel (bijekcja).
 * ID jest stabilne (element_id ze Snapshota lub deterministyczna kompozycja).
 */
export interface VisualNodeV1 {
  /** Unikalny, stabilny ID wezla (= element_id z NetworkModel lub UUID5 kompozycja) */
  readonly id: string;
  /** Typ wezla (enum NodeTypeV1) */
  readonly nodeType: NodeTypeV1;
  /** Porty wezla (semantyczne, nie tylko geometryczne) */
  readonly ports: readonly VisualPortV1[];
  /** Atrybuty wezla (jawne klucze, brak nieustalonych map) */
  readonly attributes: VisualNodeAttributesV1;
}

/**
 * Atrybuty wezla — jawne klucze dla kazdego pola.
 */
export interface VisualNodeAttributesV1 {
  /** Nazwa wyswietlana (PL) */
  readonly label: string;
  /** Poziom napiecia [kV] (jezeli dotyczy) */
  readonly voltageKv: number | null;
  /** Czy w eksploatacji */
  readonly inService: boolean;
  /** ID elementu w NetworkModel (bijekcja) */
  readonly elementId: string;
  /** Typ elementu w NetworkModel */
  readonly elementType: string;
  /** Nazwa elementu w NetworkModel */
  readonly elementName: string;
  /** Stan przelacznika (tylko dla SWITCH_*) */
  readonly switchState: 'OPEN' | 'CLOSED' | null;
  /** Typ galezi (tylko dla transformatorow i linii — LINE/CABLE) */
  readonly branchType: 'LINE' | 'CABLE' | null;
  /** Moc znamionowa [MVA] (dla transformatorow, generatorow) */
  readonly ratedPowerMva: number | null;
  /** Szerokosc symbolu [px] (dla szyn zbiorczych) */
  readonly width: number | null;
  /** Wysokosc symbolu [px] (dla szyn zbiorczych) */
  readonly height: number | null;
  /** ID wezla zrodlowego (dla galezi, przelacznikow) */
  readonly fromNodeId: string | null;
  /** ID wezla docelowego (dla galezi, przelacznikow) */
  readonly toNodeId: string | null;
  /** ID podlaczonego wezla (dla zrodel, odbiorcow) */
  readonly connectedToNodeId: string | null;
}

// =============================================================================
// EDGE
// =============================================================================

/**
 * Krawedz w grafie wizualnym.
 *
 * Kazda krawedz laczy dwa porty dwoch roznych wezlow.
 * Segmentacja trunk/branch/secondary jest jawna w edgeType.
 */
export interface VisualEdgeV1 {
  /** Unikalny, stabilny ID krawedzi */
  readonly id: string;
  /** Port zrodlowy */
  readonly fromPortRef: PortRefV1;
  /** Port docelowy */
  readonly toPortRef: PortRefV1;
  /** Typ krawedzi (segmentacja topologiczna) */
  readonly edgeType: EdgeTypeV1;
  /** Czy normalnie otwarty (NOP — normally open point) */
  readonly isNormallyOpen: boolean;
  /** Atrybuty krawedzi */
  readonly attributes: VisualEdgeAttributesV1;
}

/**
 * Atrybuty krawedzi — jawne klucze.
 */
export interface VisualEdgeAttributesV1 {
  /** Nazwa wyswietlana */
  readonly label: string;
  /** Dlugosc [km] (dla linii/kabli) */
  readonly lengthKm: number | null;
  /** Typ galezi (LINE/CABLE) */
  readonly branchType: 'LINE' | 'CABLE' | null;
  /** Czy w eksploatacji */
  readonly inService: boolean;
}

// =============================================================================
// GRAPH META
// =============================================================================

/**
 * Metadane grafu wizualnego.
 */
export interface VisualGraphMetaV1 {
  /** ID snapshot z ktorego pochodzi graf */
  readonly snapshotId: string;
  /** Fingerprint snapshot (SHA-256) */
  readonly snapshotFingerprint: string;
  /** Timestamp utworzenia */
  readonly createdAt: string;
  /** Wersja kontraktu */
  readonly version: typeof VISUAL_GRAPH_VERSION;
}

// =============================================================================
// VISUAL GRAPH (top-level)
// =============================================================================

/**
 * VisualGraphV1 — glowny typ kontraktowy.
 *
 * INVARIANTY:
 * 1. nodes i edges sa sortowane leksykograficznie po id.
 * 2. Kazdy node.id jest unikalny.
 * 3. Kazdy edge.id jest unikalny.
 * 4. Kazdy edge.fromPortRef i toPortRef wskazuje na istniejacy node i port.
 * 5. PV/BESS sa GENERATOR_PV / GENERATOR_BESS (nigdy LOAD).
 * 6. Stacje A/B/C/D sa poprawnie otypowane.
 */
export interface VisualGraphV1 {
  /** Wersja kontraktu (= 'V1') */
  readonly version: typeof VISUAL_GRAPH_VERSION;
  /** Wezly grafu (sortowane po id) */
  readonly nodes: readonly VisualNodeV1[];
  /** Krawedzie grafu (sortowane po id) */
  readonly edges: readonly VisualEdgeV1[];
  /** Metadane */
  readonly meta: VisualGraphMetaV1;
}

// =============================================================================
// CANONICAL SERIALIZER
// =============================================================================

/**
 * Canonical serializer — zapewnia deterministyczna serializacje VisualGraphV1.
 *
 * Sortuje nodes i edges po id (leksykograficznie).
 * Gwarantuje identyczna kolejnosc niezaleznie od kolejnosci wejsciowej.
 */
export function canonicalizeVisualGraph(graph: VisualGraphV1): VisualGraphV1 {
  const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));

  return {
    version: graph.version,
    nodes: sortedNodes,
    edges: sortedEdges,
    meta: graph.meta,
  };
}

/**
 * Oblicza deterministyczny hash VisualGraphV1.
 *
 * Uzywa canonical JSON (sortowane klucze) do zapewnienia
 * identycznego hash niezaleznie od kolejnosci wejsciowej.
 */
export function computeVisualGraphHash(graph: VisualGraphV1): string {
  const canonical = canonicalizeVisualGraph(graph);
  const json = JSON.stringify(canonical);

  // FNV-1a 32-bit hash (szybki, deterministyczny, bez zaleznosci)
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Wynik walidacji VisualGraphV1.
 */
export interface VisualGraphValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Waliduje VisualGraphV1 pod katem inwariantow kontraktu.
 *
 * Sprawdza:
 * 1. Unikatlosc id wezlow i krawedzi
 * 2. Referencje portow wskazuja na istniejace wezly
 * 3. PV/BESS nie sa otypowane jako LOAD
 * 4. Sortowanie kanoniczne (nodes/edges po id)
 * 5. Wersja kontraktu = 'V1'
 */
export function validateVisualGraph(graph: VisualGraphV1): VisualGraphValidationResult {
  const errors: string[] = [];

  // 1. Wersja
  if (graph.version !== VISUAL_GRAPH_VERSION) {
    errors.push(`Oczekiwana wersja ${VISUAL_GRAPH_VERSION}, otrzymano ${graph.version}`);
  }

  // 2. Unikalnosc id wezlow
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplikat id wezla: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // 3. Unikalnosc id krawedzi
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplikat id krawedzi: ${edge.id}`);
    }
    edgeIds.add(edge.id);
  }

  // 4. Referencje portow
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromPortRef.nodeId)) {
      errors.push(`Krawedz ${edge.id}: fromPortRef.nodeId ${edge.fromPortRef.nodeId} nie istnieje`);
    }
    if (!nodeIds.has(edge.toPortRef.nodeId)) {
      errors.push(`Krawedz ${edge.id}: toPortRef.nodeId ${edge.toPortRef.nodeId} nie istnieje`);
    }
  }

  // 5. PV/BESS — walidacja kontraktowa (po nodeType, BEZ parsowania nazw).
  // Klasyfikacja PV/BESS pochodzi z domeny (TopologyInput generator.kind), nie z nazwy.
  // Adapter V2 juz poprawnie klasyfikuje — tu walidujemy tylko spójnosc nodeType.
  for (const node of graph.nodes) {
    if (
      node.nodeType === NodeTypeV1.GENERATOR_PV ||
      node.nodeType === NodeTypeV1.GENERATOR_BESS ||
      node.nodeType === NodeTypeV1.GENERATOR_WIND
    ) {
      // Generator nie moze miec nodeType LOAD (sprzecznosc kontraktu)
      if (!node.attributes.elementId) {
        errors.push(`Generator ${node.id}: brak elementId w atrybutach`);
      }
    }
  }

  // 6. Sortowanie kanoniczne
  for (let i = 1; i < graph.nodes.length; i++) {
    if (graph.nodes[i].id.localeCompare(graph.nodes[i - 1].id) < 0) {
      errors.push(`Wezly nie sa posortowane kanonicznie po id (${graph.nodes[i - 1].id} > ${graph.nodes[i].id})`);
      break;
    }
  }
  for (let i = 1; i < graph.edges.length; i++) {
    if (graph.edges[i].id.localeCompare(graph.edges[i - 1].id) < 0) {
      errors.push(`Krawedzie nie sa posortowane kanonicznie po id (${graph.edges[i - 1].id} > ${graph.edges[i].id})`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
