/**
 * Station Geometry — typy i obliczenia geometrii stacji dla SLD.
 *
 * Rozszerzenie pipeline SLD o:
 * - StationBoundingBox (NO_ROUTE_RECT): ramka stacji, strefa wyłączona z routingu
 * - TrunkPath: ścieżka toru głównego SN (wyróżniona wizualnie)
 * - EntryPointMarker: punkt wejścia kabli do stacji
 *
 * DETERMINIZM: Ten sam input → identyczny output.
 * BINDING: Etykiety PL, bez nazw kodowych.
 */

import type { Point, Rectangle } from './types';

// =============================================================================
// TYPY — STATION BOUNDING BOX (NO_ROUTE_RECT)
// =============================================================================

/**
 * Prostokąt stacji na schemacie SLD (NO_ROUTE_RECT).
 *
 * Definiuje strefę, w której trasy kablowe NIE powinny przechodzić.
 * Wyrysowywany jako prostokąt z zaokrąglonymi rogami (CSS: border-radius).
 */
export interface StationBoundingBox {
  /** ref_id stacji (Substation) */
  substationRef: string;

  /** Nazwa stacji (do etykiety) */
  stationName: string;

  /** Typ stacji (GPZ, SN/nn, switching, customer) */
  stationType: 'gpz' | 'mv_lv' | 'switching' | 'customer';

  /** Prostokąt ograniczający */
  bounds: Rectangle;

  /** ref_id szyn wewnątrz stacji */
  busRefs: string[];

  /** Liczba pól (bay) w stacji */
  bayCount: number;

  /** Kolor obramowania (zależny od typu stacji) */
  borderColor: string;

  /** Kolor tła (półprzezroczysty) */
  fillColor: string;
}

// =============================================================================
// TYPY — TRUNK PATH (TOR GŁÓWNY)
// =============================================================================

/**
 * Segment toru głównego SN na schemacie SLD.
 *
 * Tor główny = ciąg gałęzi od GPZ do końca magistrali.
 * Wyrysowywany grubszą linią z wyróżnionym kolorem.
 */
export interface TrunkPathSegment {
  /** ref_id gałęzi */
  branchRef: string;

  /** Punkt początkowy */
  from: Point;

  /** Punkt końcowy */
  to: Point;

  /** Kolejność segmentu w torze głównym */
  order: number;

  /** Długość segmentu [km] */
  lengthKm: number;

  /** Czy segment jest wyróżniony (highlight) */
  isHighlighted: boolean;
}

// =============================================================================
// TYPY — ENTRY POINT MARKER
// =============================================================================

/**
 * Punkt wejścia kabli zewnętrznych do stacji.
 *
 * Wizualnie: trójkąt/strzałka na krawędzi ramki stacji.
 */
export interface EntryPointMarker {
  /** ref_id stacji */
  substationRef: string;

  /** ref_id szyny wejściowej */
  busRef: string;

  /** Strona wejścia na ramce stacji */
  entrySide: 'top' | 'bottom' | 'left' | 'right';

  /** Pozycja markera */
  position: Point;

  /** Etykieta (nazwa stacji) */
  label: string;
}

// =============================================================================
// TYPY — PEŁNA GEOMETRIA STACJI
// =============================================================================

/**
 * Pełna geometria stacyjna — overlay na schemacie SLD.
 *
 * INVARIANT: Ten sam ENM → identyczna geometria (determinizm).
 */
export interface StationGeometryResult {
  /** Prostokąty stacji (NO_ROUTE_RECT) */
  stationBoxes: StationBoundingBox[];

  /** Ścieżka toru głównego */
  trunkPath: TrunkPathSegment[];

  /** Punkty wejścia do stacji */
  entryPoints: EntryPointMarker[];
}

// =============================================================================
// KONFIGURACJA KOLORÓW STACJI
// =============================================================================

/**
 * Kolory stacji wg typu — konfigurowalne.
 */
export const STATION_COLORS: Record<
  StationBoundingBox['stationType'],
  { border: string; fill: string }
> = {
  gpz: { border: '#dc2626', fill: 'rgba(220, 38, 38, 0.06)' },
  mv_lv: { border: '#2563eb', fill: 'rgba(37, 99, 235, 0.06)' },
  switching: { border: '#d97706', fill: 'rgba(217, 119, 6, 0.06)' },
  customer: { border: '#059669', fill: 'rgba(5, 150, 105, 0.06)' },
};

/**
 * Konfiguracja toru głównego.
 */
export const TRUNK_PATH_CONFIG = {
  /** Grubość linii toru głównego [px] */
  strokeWidth: 4,
  /** Kolor toru głównego */
  color: '#dc2626',
  /** Styl linii */
  dashArray: 'none',
} as const;

// =============================================================================
// OBLICZENIA (DETERMINISTYCZNE)
// =============================================================================

/**
 * Oblicz geometrię stacji z danych ENM topology.
 *
 * @param substations - Lista substacji z ENM
 * @param bays - Lista pól (bay) z ENM
 * @param busPositions - Mapa ref_id → pozycja (z pipeline layout)
 * @param trunkSegments - Segmenty toru głównego (z TopologyGraph)
 * @param config - Konfiguracja (opcjonalna)
 */
export function computeStationGeometry(
  substations: SubstationInput[],
  bays: BayInput[],
  busPositions: Map<string, Point>,
  trunkSegments: TrunkSegmentInput[],
  config?: Partial<StationGeometryConfig>
): StationGeometryResult {
  const cfg: StationGeometryConfig = { ...DEFAULT_STATION_CONFIG, ...config };

  // 1. Station bounding boxes
  const stationBoxes = computeStationBoxes(substations, bays, busPositions, cfg);

  // 2. Trunk path
  const trunkPath = computeTrunkPath(trunkSegments, busPositions);

  // 3. Entry points
  const entryPoints = computeEntryPoints(substations, busPositions, stationBoxes);

  return { stationBoxes, trunkPath, entryPoints };
}

// =============================================================================
// INPUT TYPES (z ENM)
// =============================================================================

export interface SubstationInput {
  ref_id: string;
  name: string;
  station_type: 'gpz' | 'mv_lv' | 'switching' | 'customer';
  bus_refs: string[];
  entry_point_ref?: string | null;
}

export interface BayInput {
  ref_id: string;
  substation_ref: string;
}

export interface TrunkSegmentInput {
  branch_ref: string;
  from_bus_ref: string;
  to_bus_ref: string;
  order: number;
  length_km: number;
}

export interface StationGeometryConfig {
  /** Margines wokół elementów stacji [px] */
  stationPadding: number;
  /** Minimalna szerokość ramki stacji [px] */
  stationMinWidth: number;
  /** Minimalna wysokość ramki stacji [px] */
  stationMinHeight: number;
}

const DEFAULT_STATION_CONFIG: StationGeometryConfig = {
  stationPadding: 40,
  stationMinWidth: 200,
  stationMinHeight: 160,
};

// =============================================================================
// INTERNALS
// =============================================================================

function computeStationBoxes(
  substations: SubstationInput[],
  bays: BayInput[],
  busPositions: Map<string, Point>,
  config: StationGeometryConfig
): StationBoundingBox[] {
  const boxes: StationBoundingBox[] = [];

  // Bay count per substation
  const bayCounts = new Map<string, number>();
  for (const bay of bays) {
    bayCounts.set(bay.substation_ref, (bayCounts.get(bay.substation_ref) ?? 0) + 1);
  }

  // Sort for determinism
  const sortedSubs = [...substations].sort((a, b) => a.ref_id.localeCompare(b.ref_id));

  for (const sub of sortedSubs) {
    const coords: Point[] = [];
    for (const busRef of sub.bus_refs) {
      const pos = busPositions.get(busRef);
      if (pos) coords.push(pos);
    }
    if (coords.length === 0) continue;

    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);

    const rawWidth = Math.max(...xs) - Math.min(...xs) + config.stationPadding * 2;
    const rawHeight = Math.max(...ys) - Math.min(...ys) + config.stationPadding * 2;
    const width = Math.max(rawWidth, config.stationMinWidth);
    const height = Math.max(rawHeight, config.stationMinHeight);

    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

    const colors = STATION_COLORS[sub.station_type];

    boxes.push({
      substationRef: sub.ref_id,
      stationName: sub.name,
      stationType: sub.station_type,
      bounds: {
        x: Math.round((cx - width / 2) * 10) / 10,
        y: Math.round((cy - height / 2) * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
      },
      busRefs: [...sub.bus_refs].sort(),
      bayCount: bayCounts.get(sub.ref_id) ?? 0,
      borderColor: colors.border,
      fillColor: colors.fill,
    });
  }

  return boxes;
}

function computeTrunkPath(
  trunkSegments: TrunkSegmentInput[],
  busPositions: Map<string, Point>
): TrunkPathSegment[] {
  const segments: TrunkPathSegment[] = [];

  // Sort by order for determinism
  const sorted = [...trunkSegments].sort((a, b) => a.order - b.order);

  for (const trunk of sorted) {
    const fromPos = busPositions.get(trunk.from_bus_ref);
    const toPos = busPositions.get(trunk.to_bus_ref);

    if (fromPos && toPos) {
      segments.push({
        branchRef: trunk.branch_ref,
        from: { x: Math.round(fromPos.x * 10) / 10, y: Math.round(fromPos.y * 10) / 10 },
        to: { x: Math.round(toPos.x * 10) / 10, y: Math.round(toPos.y * 10) / 10 },
        order: trunk.order,
        lengthKm: trunk.length_km,
        isHighlighted: true,
      });
    }
  }

  return segments;
}

function computeEntryPoints(
  substations: SubstationInput[],
  _busPositions: Map<string, Point>,
  stationBoxes: StationBoundingBox[]
): EntryPointMarker[] {
  const markers: EntryPointMarker[] = [];
  const boxMap = new Map(stationBoxes.map((b) => [b.substationRef, b]));

  const sorted = [...substations].sort((a, b) => a.ref_id.localeCompare(b.ref_id));

  for (const sub of sorted) {
    if (!sub.entry_point_ref) continue;

    const box = boxMap.get(sub.ref_id);
    if (!box) continue;

    // Default entry point: top center of station box
    markers.push({
      substationRef: sub.ref_id,
      busRef: sub.entry_point_ref,
      entrySide: 'top',
      position: {
        x: Math.round((box.bounds.x + box.bounds.width / 2) * 10) / 10,
        y: Math.round(box.bounds.y * 10) / 10,
      },
      label: `Wejście: ${sub.name}`,
    });
  }

  return markers;
}
