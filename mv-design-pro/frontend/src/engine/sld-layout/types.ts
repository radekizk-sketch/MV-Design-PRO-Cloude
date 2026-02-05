/**
 * SLD Full Auto-Layout Engine — Core Types
 *
 * CANONICAL ALIGNMENT:
 * - Sugiyama Framework: layered drawing, crossing minimization
 * - ETAP Auto-Build: rule-based placement, composite networks
 * - PowerFactory Diagram Layout Tool: k-neighbourhood expansion
 *
 * KEY DESIGN PRINCIPLES:
 * - DYNAMIC VOLTAGES: Napięcia odczytywane z MODELU, nie hardkodowane
 * - DETERMINISTIC: Ten sam model → identyczny pixel output
 * - INCREMENTAL: Małe zmiany nie resetują całego schematu
 * - NO AUTO-LAYOUT BUTTON: Layout działa automatycznie
 */

// =============================================================================
// PODSTAWOWE TYPY GEOMETRYCZNE
// =============================================================================

/**
 * Punkt 2D w przestrzeni canvas.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Prostokąt (bounding box).
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Segment ścieżki (dla orthogonal routing).
 */
export interface PathSegment {
  from: Point;
  to: Point;
  kind: 'H' | 'V'; // Horizontal or Vertical
}

// =============================================================================
// VOLTAGE BAND — PASMA NAPIĘCIOWE (DYNAMICZNE!)
// =============================================================================

/**
 * Pasmo napięciowe w schemacie SLD.
 *
 * KLUCZOWE: Napięcia są DYNAMICZNE — odczytywane z modelu,
 * NIE hardkodowane (np. if voltage === 15).
 */
export interface VoltageBand {
  /** Unikalny identyfikator pasma */
  id: string;

  /** Napięcie znamionowe w kV (ODCZYTANE z modelu) */
  nominalVoltageKV: number;

  /** Górna krawędź pasma (Y canvas, mniejsze Y = wyżej) */
  yStart: number;

  /** Dolna krawędź pasma (Y canvas, większe Y = niżej) */
  yEnd: number;

  /** Kolor pasma (z konfigurowalnej mapy) */
  color: string;

  /** Etykieta do wyświetlenia (np. "15 kV", "0,4 kV") */
  label: string;

  /** Kategoria napięciowa (WN/SN/nN/DC) */
  category: VoltageCategory;

  /** Elementy należące do tego pasma (symbol IDs) */
  elementIds: string[];
}

/**
 * Kategoria napięciowa (używana do klasyfikacji, nie do pozycjonowania).
 */
export type VoltageCategory = 'NN' | 'WN' | 'SN' | 'nN' | 'DC' | 'unknown';

/**
 * Reguła przypisania koloru do napięcia.
 * Algorytm szuka ZAKRESU pasującego do napięcia, nie konkretnej wartości.
 */
export interface VoltageColorRule {
  /** Dolna granica zakresu (inclusive) */
  minKV: number;
  /** Górna granica zakresu (exclusive) */
  maxKV: number;
  /** Kolor w formacie hex */
  color: string;
  /** Nazwa kategorii (do wyświetlania) */
  category: VoltageCategory;
  /** Opis (do tooltipa) */
  description: string;
}

// =============================================================================
// BAY — POLE ZASILAJĄCE / FEEDER BAY
// =============================================================================

/**
 * Typ baya (pola zasilającego).
 *
 * Klasyfikacja wynika z elementów w bayu, nie z nazwy.
 */
export type BayType =
  | 'incomer' // Zasilanie z wyższego napięcia (TR WN/SN)
  | 'feeder' // Pole liniowe (kabel/linia → stacja/odbiornik)
  | 'tie' // Łącznik międzyszynowy (tie-CB, SZR)
  | 'generator' // Generator konwencjonalny
  | 'oze_pv' // Farma fotowoltaiczna
  | 'oze_wind' // Farma wiatrowa
  | 'bess' // Magazyn energii
  | 'capacitor' // Bateria kondensatorów
  | 'measurement' // Pole pomiarowe (CT + VT)
  | 'auxiliary' // Potrzeby własne
  | 'unknown'; // Niesklasyfikowany

/**
 * Bay (pole zasilające) — pionowy łańcuch elementów od szyny.
 */
export interface Bay {
  /** Unikalny identyfikator baya */
  id: string;

  /** ID szyny nadrzędnej (busbar symbol ID) */
  parentBusbarId: string;

  /** Element ID szyny nadrzędnej (dla referencji topologicznych) */
  parentBusbarElementId: string;

  /** Uporządkowana lista elementów w bayu (od góry do dołu) */
  elements: BayElement[];

  /** Szyny niższego napięcia w tym bayu (sub-busbars) */
  subBusbarIds: string[];

  /** Zagnieżdżone baye (od sub-busbarów) */
  subBays: Bay[];

  /** Klasyfikacja typu baya */
  bayType: BayType;

  /** Głębokość zagnieżdżenia (0 = bezpośrednio od szyny głównej) */
  depth: number;

  /** Pozycja X baya (slot wzdłuż szyny) */
  slotX: number;

  /** Indeks slotu (dla crossing minimization) */
  slotIndex: number;

  /** Pasmo napięciowe baya */
  voltageBandId: string;
}

/**
 * Element w bayu.
 */
export interface BayElement {
  /** Symbol ID elementu */
  symbolId: string;

  /** Element ID (do NetworkModel) */
  elementId: string;

  /** Typ elementu */
  elementType: string;

  /** Pozycja w bayu (0 = najbliżej szyny) */
  orderInBay: number;

  /** Napięcie znamionowe (jeśli element je definiuje) */
  voltageKV?: number;
}

// =============================================================================
// LAYOUT CONFIG — KONFIGURACJA (KONFIGUROWALNA!)
// =============================================================================

/**
 * Konfiguracja layoutu SLD.
 *
 * WSZYSTKIE wartości są konfigurowalne — użytkownik może je nadpisać.
 */
export interface LayoutConfig {
  // --- Grid ---
  /** Rozmiar siatki (px) — snap to grid */
  gridSize: number;

  // --- Busbar ---
  /** Minimalna szerokość szyny (px) */
  busbarMinWidth: number;
  /** Szerokość dodawana na każdy bay (px) */
  busbarExtendPerBay: number;
  /** Wysokość szyny (px) — grubość linii */
  busbarHeight: number;

  // --- Bay spacing ---
  /** Odstęp między bayami (px) minimum */
  bayGap: number;
  /** Odstęp między elementami w bayu (pion, px) */
  elementGapY: number;
  /** Margines boczny elementu (px) */
  elementGapX: number;

  // --- Band spacing ---
  /** Odstęp między pasmami napięciowymi (px) */
  bandGap: number;
  /** Wysokość nagłówka pasma (px, na etykietę) */
  bandHeaderHeight: number;

  // --- Labels ---
  /** Offset etykiety od elementu w prawo (px) */
  labelOffsetX: number;
  /** Offset etykiety od elementu w górę (px) */
  labelOffsetY: number;
  /** Maksymalna szerokość etykiety (px) */
  labelMaxWidth: number;

  // --- Canvas ---
  /** Padding od krawędzi canvas (px) */
  canvasPadding: number;

  // --- Symbol sizes (default) ---
  /** Domyślna szerokość symbolu (px) */
  symbolDefaultWidth: number;
  /** Domyślna wysokość symbolu (px) */
  symbolDefaultHeight: number;

  // --- Transformers ---
  /** Odstęp transformatora od szyny WN (px) */
  transformerOffsetFromWN: number;
  /** Odstęp transformatora od szyny SN (px) */
  transformerOffsetToSN: number;

  // --- Source ---
  /** Wysokość symbolu źródła (px) */
  sourceHeight: number;
  /** Offset źródła nad szyną (px) */
  sourceOffsetAboveBusbar: number;
}

/**
 * Domyślna konfiguracja layoutu (ETAP-grade).
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  // Grid
  gridSize: 20,

  // Busbar
  busbarMinWidth: 400,
  busbarExtendPerBay: 120,
  busbarHeight: 8,

  // Bay spacing
  bayGap: 160,
  elementGapY: 100,
  elementGapX: 40,

  // Band spacing
  bandGap: 80,
  bandHeaderHeight: 30,

  // Labels
  labelOffsetX: 60,
  labelOffsetY: -10,
  labelMaxWidth: 140,

  // Canvas
  canvasPadding: 80,

  // Symbol sizes
  symbolDefaultWidth: 60,
  symbolDefaultHeight: 40,

  // Transformers
  transformerOffsetFromWN: 100,
  transformerOffsetToSN: 80,

  // Source
  sourceHeight: 60,
  sourceOffsetAboveBusbar: 40,
};

// =============================================================================
// LAYOUT INPUT — DANE WEJŚCIOWE
// =============================================================================

/**
 * Symbol wejściowy do layoutu.
 * Rozszerzenie podstawowego SldSymbol o pole napięcia.
 */
export interface LayoutSymbol {
  /** Symbol ID */
  id: string;

  /** Element ID (bijection to NetworkModel) */
  elementId: string;

  /** Typ elementu */
  elementType: string;

  /** Nazwa elementu (do etykiety) */
  elementName: string;

  /** Napięcie znamionowe w kV (WYMAGANE dla poprawnego layoutu) */
  voltageKV?: number;

  /** Dla transformatorów: napięcie strony HV */
  voltageHV?: number;

  /** Dla transformatorów: napięcie strony LV */
  voltageLV?: number;

  /** Aktualna pozycja (może być undefined dla nowych elementów) */
  position?: Point;

  /** Rozmiar symbolu (jeśli znany) */
  size?: { width: number; height: number };

  /** Czy w służbie (dla stylowania) */
  inService: boolean;

  /** Czy pozycja jest "przypięta" przez użytkownika (manual override) */
  userPinned?: boolean;

  // --- Pola połączeń (zależnie od typu) ---
  /** Dla Branch: ID węzła źródłowego */
  fromNodeId?: string;
  /** Dla Branch: ID węzła docelowego */
  toNodeId?: string;
  /** Dla Source/Load: ID węzła, do którego podłączony */
  connectedToNodeId?: string;

  // --- Pola specyficzne dla typu ---
  /** Dla Switch: typ wyłącznika */
  switchType?: 'BREAKER' | 'DISCONNECTOR' | 'LOAD_SWITCH' | 'FUSE';
  /** Dla Switch: stan */
  switchState?: 'OPEN' | 'CLOSED';
  /** Dla Bus: szerokość szyny */
  busWidth?: number;
  /** Dla Bus: wysokość szyny */
  busHeight?: number;
  /** Dla LineBranch: typ (LINE = napowietrzna, CABLE = kablowa) */
  branchType?: 'LINE' | 'CABLE';

  /** Dla Generator: typ generatora (PV, WIND, BESS, etc.) */
  generatorType?: 'PV' | 'WIND' | 'BESS' | 'DIESEL' | 'GAS' | 'HYDRO' | 'OTHER';
}

/**
 * Dane wejściowe do pełnego layoutu.
 */
export interface LayoutInput {
  /** Symbole do rozłożenia */
  symbols: LayoutSymbol[];

  /** Konfiguracja layoutu (opcjonalna, użyje domyślnej) */
  config?: Partial<LayoutConfig>;

  /** Mapa kolorów napięciowych (opcjonalna, użyje domyślnej) */
  voltageColorMap?: VoltageColorRule[];

  /** Poprzedni wynik layoutu (dla incremental) */
  previousResult?: LayoutResult;
}

// =============================================================================
// LAYOUT RESULT — WYNIK LAYOUTU
// =============================================================================

/**
 * Pozycja elementu w wyniku layoutu.
 */
export interface ElementPosition {
  /** Symbol ID */
  symbolId: string;

  /** Pozycja (center point) */
  position: Point;

  /** Rozmiar (po obliczeniu) */
  size: { width: number; height: number };

  /** Bounding box */
  bounds: Rectangle;

  /** ID pasma napięciowego */
  voltageBandId: string;

  /** ID baya (jeśli należy do baya) */
  bayId?: string;

  /** Czy pozycja była przypisana automatycznie */
  autoPositioned: boolean;

  /** Czy element jest w "quarantine zone" (floating) */
  isQuarantined: boolean;
}

/**
 * Geometria szyny (busbara).
 */
export interface BusbarGeometry {
  /** Symbol ID szyny */
  symbolId: string;

  /** Punkt początkowy (lewy koniec dla poziomej) */
  p0: Point;

  /** Punkt końcowy (prawy koniec dla poziomej) */
  p1: Point;

  /** Szerokość szyny (px) */
  width: number;

  /** Wysokość/grubość szyny (px) */
  height: number;

  /** Orientacja */
  orientation: 'horizontal' | 'vertical';

  /** ID pasma napięciowego */
  voltageBandId: string;

  /** Liczba bayów podłączonych do tej szyny */
  bayCount: number;

  /** Czy szyna jest sekcjonowana (coupler) */
  isSectioned: boolean;

  /** Liczba sekcji (jeśli sekcjonowana) */
  sectionCount: number;
}

/**
 * Routed edge (połączenie).
 */
export interface RoutedEdge {
  /** Unikalny ID krawędzi */
  id: string;

  /** Symbol ID źródła */
  fromSymbolId: string;

  /** Port źródłowy */
  fromPort: 'top' | 'bottom' | 'left' | 'right';

  /** Symbol ID celu */
  toSymbolId: string;

  /** Port docelowy */
  toPort: 'top' | 'bottom' | 'left' | 'right';

  /** Ścieżka (polyline) — orthogonal segments */
  path: Point[];

  /** Segmenty ścieżki (dla renderingu) */
  segments: PathSegment[];

  /** Typ połączenia (dla stylowania) */
  connectionType: 'branch' | 'switch' | 'source' | 'load' | 'busbar';

  /** ID pasma napięciowego (dla koloru) */
  voltageBandId: string;
}

/**
 * Pozycja etykiety.
 */
export interface LabelPosition {
  /** Symbol ID, do którego należy etykieta */
  symbolId: string;

  /** Pozycja etykiety (anchor point) */
  position: Point;

  /** Wyrównanie (text-anchor) */
  anchor: 'start' | 'middle' | 'end';

  /** Pozycja bazowa (top/bottom/left/right względem symbolu) */
  placement: 'top' | 'bottom' | 'left' | 'right';

  /** Offset od pozycji bazowej */
  offset: Point;

  /** Czy etykieta była przesunięta z powodu kolizji */
  adjusted: boolean;
}

/**
 * Pełny wynik layoutu.
 */
export interface LayoutResult {
  /** Pozycje wszystkich elementów */
  positions: Map<string, ElementPosition>;

  /** Geometrie szyn */
  busbarGeometries: Map<string, BusbarGeometry>;

  /** Przetrasowane krawędzie */
  routedEdges: Map<string, RoutedEdge>;

  /** Pozycje etykiet */
  labelPositions: Map<string, LabelPosition>;

  /** Pasma napięciowe */
  voltageBands: VoltageBand[];

  /** Wykryte baye */
  bays: Bay[];

  /** Bounding box całego schematu */
  bounds: Rectangle;

  /** Informacje debugowe */
  debug: LayoutDebugInfo;
}

/**
 * Informacje debugowe layoutu.
 */
export interface LayoutDebugInfo {
  /** Warstwy (layer index → symbol IDs) */
  layers: Map<number, string[]>;

  /** Łączna liczba warstw */
  totalLayers: number;

  /** Łączna liczba elementów */
  totalNodes: number;

  /** Floating symbols (ETAP violation) */
  floatingSymbols: string[];

  /** Quarantined symbols (w strefie kwarantanny) */
  quarantinedSymbols: string[];

  /** Liczba transformatorów */
  transformerCount: number;

  /** Sekcje szyn (busbar ID → section count) */
  busbarSections: Map<string, number>;

  /** PCC nodes filtered from render */
  filteredPccNodes: string[];

  /** Station stacks (root ID → symbol IDs) */
  stationStacks: Map<string, string[]>;

  /** Canonical layer assignments (symbol ID → layer name) */
  canonicalLayerAssignments: Map<string, string>;

  /** SPINE X coordinate (główna oś pionowa) */
  spineX: number;

  /** Czy stan pusty (brak valid topology) */
  isEmptyState: boolean;

  /** Liczba rozwiązanych kolizji */
  collisionsResolved: number;

  /** Czas wykonania layoutu (ms) */
  executionTimeMs: number;

  /** Crossing minimization iterations */
  crossingMinIterations: number;

  /** Initial crossings */
  initialCrossings: number;

  /** Final crossings */
  finalCrossings: number;
}

// =============================================================================
// INCREMENTAL LAYOUT — REGION OF INTEREST
// =============================================================================

/**
 * Typ zmiany dla incremental layout.
 */
export type ChangeType =
  | 'add_element' // Dodano element
  | 'remove_element' // Usunięto element
  | 'add_connection' // Dodano połączenie
  | 'remove_connection' // Usunięto połączenie
  | 'user_drag' // Użytkownik przesunął element
  | 'topology_change' // Zmiana topologii (general)
  | 'full_recalc'; // Pełne przeliczenie

/**
 * Zmiana dla incremental layout.
 */
export interface LayoutChange {
  /** Typ zmiany */
  type: ChangeType;

  /** Affected symbol IDs */
  affectedSymbolIds: string[];

  /** Affected bay IDs (jeśli dotyczy) */
  affectedBayIds?: string[];

  /** Timestamp zmiany */
  timestamp: number;
}

/**
 * User position override (pin).
 */
export interface UserPositionOverride {
  /** Symbol ID */
  symbolId: string;

  /** Pozycja ustawiona przez użytkownika */
  position: Point;

  /** Timestamp przypięcia */
  timestamp: number;
}

// =============================================================================
// PIPELINE CONTEXT — KONTEKST MIĘDZY FAZAMI
// =============================================================================

/**
 * Kontekst przekazywany między fazami pipeline.
 */
export interface PipelineContext {
  /** Symbole wejściowe */
  symbols: LayoutSymbol[];

  /** Konfiguracja */
  config: LayoutConfig;

  /** Mapa kolorów napięciowych */
  voltageColorMap: VoltageColorRule[];

  /** Mapa element ID → symbol ID */
  elementToSymbol: Map<string, string>;

  /** Mapa symbol ID → symbol */
  symbolById: Map<string, LayoutSymbol>;

  // --- Wyniki poszczególnych faz ---
  /** Faza 1: Pasma napięciowe */
  voltageBands?: VoltageBand[];

  /** Faza 2: Wykryte baye */
  bays?: Bay[];

  /** Faza 3: Uporządkowane baye (po crossing min) */
  orderedBays?: Bay[];

  /** Faza 4: Pozycje elementów */
  positions?: Map<string, ElementPosition>;

  /** Faza 4: Geometrie szyn */
  busbarGeometries?: Map<string, BusbarGeometry>;

  /** Faza 5: Routed edges */
  routedEdges?: Map<string, RoutedEdge>;

  /** Faza 5: Label positions */
  labelPositions?: Map<string, LabelPosition>;

  // --- User overrides ---
  /** Pozycje przypięte przez użytkownika */
  userOverrides: Map<string, UserPositionOverride>;

  // --- Debug info ---
  /** Debug info zbierana przez fazy */
  debug: Partial<LayoutDebugInfo>;
}
