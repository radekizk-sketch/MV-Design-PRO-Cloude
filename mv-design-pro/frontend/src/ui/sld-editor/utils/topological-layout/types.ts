/**
 * TOPOLOGICAL AUTO-LAYOUT ENGINE — Type Definitions
 *
 * Kanoniczne typy dla silnika auto-layoutu topologicznego SLD.
 *
 * ZASADA: Wspolrzedne sa WYNIKIEM, nie wejsciem.
 * Layout operuje na TOPOLOGII, ROLACH I RELACJACH.
 *
 * DETERMINIZM: Te same dane wejsciowe -> identyczny output
 */

import type { AnySldSymbol, Position } from '../../types';

// =============================================================================
// TOPOLOGICAL ROLES
// =============================================================================

/**
 * Kanoniczne role topologiczne (MV-DESIGN-PRO).
 * Kazdy element MUSI miec dokladnie jedna role.
 */
export type TopologicalRole =
  | 'POWER_SOURCE'
  | 'BUSBAR'
  | 'SECTION'
  | 'FEEDER'
  | 'AXIAL_ELEMENT'
  | 'INLINE_ELEMENT';

/**
 * Assignment roli topologicznej do elementu.
 */
export interface RoleAssignment {
  /** Symbol ID */
  readonly symbolId: string;
  /** Element ID w NetworkModel */
  readonly elementId: string;
  /** Przypisana rola */
  readonly role: TopologicalRole;
  /** Poziom napiecia */
  readonly voltageLevel: VoltageLevel;
  /** ID sekcji do ktorej nalezy (jesli dotyczy) */
  readonly sectionId: string | null;
  /** ID szyny nadrzednej (jesli dotyczy) */
  readonly parentBusbarId: string | null;
  /** ID odpływu (feedera) do ktorego nalezy (jesli dotyczy) */
  readonly feederId: string | null;
  /** Warstwa kanoniczna */
  readonly canonicalLayer: CanonicalLayer;
}

/**
 * Poziom napiecia.
 */
export type VoltageLevel = 'WN' | 'SN' | 'nN' | 'unknown';

/**
 * Warstwy kanoniczne SLD (top-down).
 */
export type CanonicalLayer =
  | 'L0_SOURCE'
  | 'L1_WN_BUSBAR'
  | 'L2_TRANSFORMER'
  | 'L3_SN_BUSBAR'
  | 'L4_SN_FEEDER_SWITCH'
  | 'L5_SN_FEEDER_BRANCH'
  | 'L6_SN_CABLE'
  | 'L7_STATION_SWITCHGEAR'
  | 'L8_STATION_BREAKER'
  | 'L9_STATION_TRANSFORMER'
  | 'L10_NN_BUSBAR'
  | 'L11_NN_SWITCHGEAR'
  | 'L12_INVERTER_LOAD';

// =============================================================================
// GLOBAL ORIENTATION
// =============================================================================

/**
 * Globalna orientacja layoutu.
 * Stala dla calego projektu.
 */
export type GlobalOrientation = 'top-down' | 'left-right';

/**
 * Konfiguracja orientacji globalnej.
 */
export interface OrientationConfig {
  /** Orientacja glowna */
  readonly orientation: GlobalOrientation;
  /** Os glowna zasilania: 'vertical' (top-down) lub 'horizontal' (left-right) */
  readonly mainAxis: 'vertical' | 'horizontal';
  /** Os szyn: zawsze prostopadla do osi glownej */
  readonly busbarAxis: 'horizontal' | 'vertical';
  /** Kierunek odplywow: prostopadly do szyny, w dol/prawo */
  readonly feederDirection: 'down' | 'right';
}

// =============================================================================
// GEOMETRIC SKELETON
// =============================================================================

/**
 * Poziom (tier) w szkielecie geometrycznym.
 * Reprezentuje wiersz/kolumne w ukladzie.
 */
export interface SkeletonTier {
  /** Unikalne ID tieru */
  readonly tierId: string;
  /** Warstwa kanoniczna */
  readonly layer: CanonicalLayer;
  /** Pozycja na osi glownej (px) */
  readonly axialPosition: number;
  /** Symbole przypisane do tego tieru */
  readonly symbolIds: readonly string[];
}

/**
 * Slot odpływowy (feeder slot).
 */
export interface FeederSlot {
  /** Unikalne ID slotu */
  readonly slotId: string;
  /** ID sekcji nadrzednej */
  readonly sectionId: string;
  /** Indeks slotu w sekcji (0-based, od lewej) */
  readonly slotIndex: number;
  /** Pozycja na osi szyny (px) */
  readonly busbarAxisPosition: number;
  /** Symbole w tym slocie (od gory do dolu) */
  readonly symbolIds: readonly string[];
}

/**
 * Sekcja szyny.
 */
export interface BusbarSection {
  /** Unikalne ID sekcji */
  readonly sectionId: string;
  /** ID szyny nadrzednej */
  readonly busbarId: string;
  /** Indeks sekcji (0-based) */
  readonly sectionIndex: number;
  /** Sloty odpływowe */
  readonly slots: readonly FeederSlot[];
  /** Poczatek sekcji na osi szyny (px) */
  readonly startPosition: number;
  /** Koniec sekcji na osi szyny (px) */
  readonly endPosition: number;
  /** Szerokosc sekcji (px) */
  readonly width: number;
}

/**
 * Szyna z sekcjami.
 */
export interface BusbarLayout {
  /** Symbol ID szyny */
  readonly busbarId: string;
  /** Element ID szyny */
  readonly elementId: string;
  /** Poziom napiecia */
  readonly voltageLevel: VoltageLevel;
  /** Sekcje */
  readonly sections: readonly BusbarSection[];
  /** Calkowita szerokosc szyny (px) */
  readonly totalWidth: number;
  /** Pozycja srodkowa na osi szyny (px) */
  readonly centerPosition: number;
  /** Pozycja na osi glownej (px) */
  readonly axialPosition: number;
}

/**
 * Szkielet geometryczny - kompletny opis struktury layoutu.
 */
export interface GeometricSkeleton {
  /** Pozycja spine (oś główna zasilania, px) */
  readonly spinePosition: number;
  /** Tiery (kolejne warstwy od gory) */
  readonly tiers: readonly SkeletonTier[];
  /** Szyny z sekcjami */
  readonly busbars: readonly BusbarLayout[];
  /** Sloty odpływowe (flat list) */
  readonly allSlots: readonly FeederSlot[];
  /** Mapa: symbolId -> pozycja finalna */
  readonly positions: ReadonlyMap<string, Position>;
}

// =============================================================================
// LAYOUT GEOMETRY CONFIG
// =============================================================================

/**
 * Konfiguracja geometrii layoutu.
 * Wszystkie wartosci w px.
 */
export interface LayoutGeometryConfig {
  /** Rozmiar siatki */
  readonly gridSize: number;
  /** Padding od krawedzi canvas */
  readonly padding: number;
  /** Odstep miedzy tierami (warstwami) */
  readonly tierSpacing: number;
  /** Stala szerokosc slotu (odpływu) */
  readonly slotWidth: number;
  /** Odstep miedzy slotami */
  readonly slotGap: number;
  /** Odstep miedzy sekcjami szyny */
  readonly sectionGap: number;
  /** Minimalna szerokosc szyny */
  readonly minBusbarWidth: number;
  /** Wysokosc symbolu zrodla */
  readonly sourceHeight: number;
  /** Odstep zrodla od szyny */
  readonly sourceOffset: number;
  /** Wysokosc symbolu transformatora */
  readonly transformerHeight: number;
  /** Odstep transformatora od szyny WN */
  readonly transformerOffsetFromWN: number;
  /** Odstep transformatora do szyny SN */
  readonly transformerOffsetToSN: number;
  /** Wysokosc szyny */
  readonly busbarHeight: number;
  /** Odstep miedzy elementami w odplywie */
  readonly feederElementSpacing: number;
  /** Szerokosc symbolu wyłacznika */
  readonly switchWidth: number;
  /** Wysokosc symbolu wyłacznika */
  readonly switchHeight: number;
  /** Szerokosc symbolu gałezi */
  readonly branchWidth: number;
  /** Wysokosc symbolu gałezi */
  readonly branchHeight: number;
  /** Szerokosc symbolu odbiornika */
  readonly loadWidth: number;
  /** Wysokosc symbolu odbiornika */
  readonly loadHeight: number;
  /** Margines wokol symbolu (clearance zone) */
  readonly symbolClearance: number;
}

// =============================================================================
// COLLISION DETECTION
// =============================================================================

/**
 * Bounding box symbolu (AABB).
 */
export interface SymbolBounds {
  /** Symbol ID */
  readonly symbolId: string;
  /** Srodek X */
  readonly cx: number;
  /** Srodek Y */
  readonly cy: number;
  /** Polowa szerokosci */
  readonly halfWidth: number;
  /** Polowa wysokosci */
  readonly halfHeight: number;
}

/**
 * Para kolidujacych symboli.
 */
export interface CollisionPair {
  /** Symbol A */
  readonly symbolA: string;
  /** Symbol B */
  readonly symbolB: string;
  /** Nakładanie X (px) */
  readonly overlapX: number;
  /** Nakładanie Y (px) */
  readonly overlapY: number;
}

/**
 * Wynik walidacji kolizji.
 */
export interface CollisionReport {
  /** Czy sa kolizje symbol-symbol */
  readonly hasCollisions: boolean;
  /** Lista par kolidujacych */
  readonly pairs: readonly CollisionPair[];
  /** Liczba unikalnych symboli w kolizji */
  readonly affectedSymbolCount: number;
}

// =============================================================================
// AUTO-INSERT
// =============================================================================

/**
 * Typ operacji na modelu.
 */
export type ModelOperation =
  | { readonly kind: 'ADD'; readonly symbol: AnySldSymbol }
  | { readonly kind: 'REMOVE'; readonly symbolId: string }
  | { readonly kind: 'MODIFY'; readonly symbol: AnySldSymbol };

/**
 * Wynik auto-insertu.
 */
export interface AutoInsertResult {
  /** Nowe/zmienione pozycje */
  readonly updatedPositions: ReadonlyMap<string, Position>;
  /** ID symboli ktorych pozycje sie zmienily */
  readonly changedSymbolIds: readonly string[];
  /** ID symboli ktorych pozycje NIE zmienily sie */
  readonly stableSymbolIds: readonly string[];
  /** Nowa konfiguracja sekcji (jesli zmieniona) */
  readonly updatedSections: readonly BusbarSection[] | null;
}

// =============================================================================
// COMPLETE ENGINE RESULT
// =============================================================================

/**
 * Kompletny wynik silnika auto-layoutu topologicznego.
 */
export interface TopologicalLayoutResult {
  /** Mapa: symbolId -> pozycja finalna */
  readonly positions: ReadonlyMap<string, Position>;
  /** Przypisania rol topologicznych */
  readonly roleAssignments: ReadonlyMap<string, RoleAssignment>;
  /** Szkielet geometryczny */
  readonly skeleton: GeometricSkeleton;
  /** Raport kolizji */
  readonly collisionReport: CollisionReport;
  /** Dane diagnostyczne */
  readonly diagnostics: LayoutDiagnostics;
}

/**
 * Dane diagnostyczne layoutu.
 */
export interface LayoutDiagnostics {
  /** Orientacja globalna */
  readonly orientation: GlobalOrientation;
  /** Pozycja spine */
  readonly spinePosition: number;
  /** Liczba tierow */
  readonly tierCount: number;
  /** Liczba szyn */
  readonly busbarCount: number;
  /** Liczba sekcji */
  readonly sectionCount: number;
  /** Liczba slotow */
  readonly slotCount: number;
  /** Liczba symboli z przypisana rola */
  readonly assignedRoleCount: number;
  /** Symbole bez roli (blad) */
  readonly unassignedSymbolIds: readonly string[];
  /** Symbole w kwarantannie (bez polaczen) */
  readonly quarantinedSymbolIds: readonly string[];
  /** Odfiltrowane BoundaryNode */
  readonly filteredPccIds: readonly string[];
  /** Stosy stacyjne */
  readonly stationStacks: ReadonlyMap<string, readonly string[]>;
  /** Czas wykonania layoutu (ms) */
  readonly layoutTimeMs: number;
  /** Czy uklad jest pusty (brak topologii) */
  readonly isEmpty: boolean;
}

// =============================================================================
// TOPOLOGY GRAPH (internal)
// =============================================================================

/**
 * Wezel w grafie topologicznym (wewnetrzny).
 */
export interface TopologyNode {
  readonly symbolId: string;
  readonly elementId: string;
  readonly elementType: string;
  readonly elementName: string;
  readonly voltageLevel: VoltageLevel;
  readonly neighbors: readonly string[];
}

/**
 * Krawedz w grafie topologicznym (wewnetrzna).
 */
export interface TopologyEdge {
  readonly symbolId: string;
  readonly fromElementId: string;
  readonly toElementId: string;
  readonly elementType: string;
}

/**
 * Graf topologiczny (wewnetrzny).
 */
export interface TopologyGraph {
  readonly nodes: ReadonlyMap<string, TopologyNode>;
  readonly edges: readonly TopologyEdge[];
  readonly elementToSymbol: ReadonlyMap<string, string>;
  readonly symbolById: ReadonlyMap<string, AnySldSymbol>;
}
