/**
 * SLD INDUSTRIAL AESTHETICS — Kontrakt estetyki przemysłowej
 *
 * Implementacja reguł wizualnych DIgSILENT/ABB/ETAP dla schematów SLD.
 *
 * ZASADA NADRZĘDNA:
 * - Deterministyczność: Ten sam Snapshot → identyczne współrzędne (piksel w piksel)
 * - Siatka rytmu: każda współrzędna jest wielokrotnością GRID_BASE
 * - Kanały Y: stałe poziomy dla magistrali, ringów, odgałęzień
 * - Równe odstępy stacji: GRID_SPACING_MAIN niezależnie od zawartości
 *
 * CANONICAL ALIGNMENT:
 * - docs/sld/SLD_LAYOUT_AESTHETIC_CONTRACT.md — pełna specyfikacja
 * - sldEtapStyle.ts — referencje do tych stałych
 *
 * ZAKAZ:
 * - Niecałkowite współrzędne (x % GRID_BASE !== 0)
 * - Wartości niezgodne z siatką
 * - Łuki i linie diagonalne
 * - Odstępy zależne od długości nazwy, metryki kabla itp.
 */

// =============================================================================
// § 1.1 SIATKA RYTMU (GLOBALNA)
// =============================================================================

/**
 * Podstawowa jednostka siatki SLD [px].
 * Wszystkie współrzędne x,y muszą być wielokrotnościami GRID_BASE.
 *
 * @invariant x % GRID_BASE === 0 && y % GRID_BASE === 0
 */
export const GRID_BASE = 20 as const;

// =============================================================================
// § 1.2 KANAŁY Y (STAŁE)
// =============================================================================

/**
 * Y magistrali głównej SN [px].
 * Stała globalna — magistrala ZAWSZE na tej wartości Y.
 */
export const Y_MAIN = 400 as const;

/**
 * Y ścieżki ringowej [px].
 * Ring biegnie 4*GRID_BASE powyżej magistrali.
 *
 * Y_RING = Y_MAIN - 4 * GRID_BASE = 320
 */
export const Y_RING = 320 as const;  // Y_MAIN - 4 * GRID_BASE

/**
 * Y odgałęzień (feeders) [px].
 * Odgałęzienia biegną 4*GRID_BASE poniżej magistrali.
 *
 * Y_BRANCH = Y_MAIN + 4 * GRID_BASE = 480
 */
export const Y_BRANCH = 480 as const;  // Y_MAIN + 4 * GRID_BASE

// =============================================================================
// § 1.3 RÓWNE ODLEGŁOŚCI STACJI NA MAGISTRALI
// =============================================================================

/**
 * Odległość centrum-centrum kolejnych stacji na magistrali [px].
 *
 * GRID_SPACING_MAIN = 14 * GRID_BASE = 280 px
 *
 * Pozycja i-tej stacji:
 *   X_i = X_START + i * GRID_SPACING_MAIN
 *   Y_i = Y_MAIN
 *
 * @invariant Stała niezależna od: długości nazwy stacji, liczby pól, długości kabla
 */
export const GRID_SPACING_MAIN = 280 as const;  // 14 * GRID_BASE

/**
 * Poziome przesunięcie startowe dla pierwszej stacji [px].
 * X pierwszej stacji = X_START.
 */
export const X_START = 40 as const;  // 2 * GRID_BASE

// =============================================================================
// § 1.6 WYRÓWNANIE PIONOWE PÓL W STACJI
// =============================================================================

/**
 * Pionowy odstęp między polami w stacji [px].
 *
 * OFFSET_POLE = 3 * GRID_BASE = 60 px
 *
 * Pola w stacji: Y_MAIN ± n * OFFSET_POLE
 */
export const OFFSET_POLE = 60 as const;  // 3 * GRID_BASE

// =============================================================================
// § 1.7 JEDNOLITA GRUBOŚĆ LINII
// =============================================================================

/**
 * Grubość linii magistrali (szyny zbiorczej) [px].
 * Magistrala = linia dominująca (najgrubsza).
 */
export const BUSBAR_STROKE_WIDTH = 3 as const;

/**
 * Grubość linii odgałęzień i gałęzi [px].
 * Odgałęzienia = linie podrzędne.
 */
export const BRANCH_STROKE_WIDTH = 2 as const;

/**
 * Grubość linii ringowej [px].
 * Ring = linia przerywana (styl dashed).
 */
export const RING_STROKE_WIDTH = 2 as const;

/**
 * Wzorzec kreskowania linii ringowej (SVG stroke-dasharray).
 * Format: "dash_length gap_length"
 */
export const RING_DASH_ARRAY = '6 4' as const;

// =============================================================================
// § 1.8 MINIMALNE MARGINESY
// =============================================================================

/**
 * Minimalny odstęp poziomy między stacjami [px].
 * = GRID_SPACING_MAIN
 */
export const MIN_HORIZONTAL_GAP = GRID_SPACING_MAIN;

/**
 * Minimalny odstęp pionowy między elementami [px].
 * = 4 * GRID_BASE = 80 px
 */
export const MIN_VERTICAL_GAP = 80 as const;  // 4 * GRID_BASE

// =============================================================================
// § 3.5 SNAP-TO-GRID (FINAŁ)
// =============================================================================

/**
 * Normalizuj wartość do siatki estetycznej.
 *
 * x = round(x / GRID_BASE) * GRID_BASE
 *
 * @param value — wartość do normalizacji
 * @param grid — rozmiar siatki (domyślnie GRID_BASE = 20)
 * @returns wartość znormalizowana do siatki
 *
 * @example
 * snapToAestheticGrid(37) // → 40
 * snapToAestheticGrid(25) // → 20
 * snapToAestheticGrid(280) // → 280 ✓
 */
export function snapToAestheticGrid(value: number, grid: number = GRID_BASE): number {
  return Math.round(value / grid) * grid;
}

/**
 * Normalizuj pozycję (x,y) do siatki estetycznej.
 *
 * @param pos — pozycja do normalizacji
 * @returns pozycja znormalizowana
 */
export function snapPositionToAestheticGrid(
  pos: { x: number; y: number },
  grid: number = GRID_BASE
): { x: number; y: number } {
  return {
    x: snapToAestheticGrid(pos.x, grid),
    y: snapToAestheticGrid(pos.y, grid),
  };
}

// =============================================================================
// WALIDACJA KONTRAKTU
// =============================================================================

/**
 * Wynik walidacji wyrównania siatki.
 */
export interface GridAlignmentResult {
  /** Czy wszystkie współrzędne są wielokrotnościami GRID_BASE */
  allAligned: boolean;
  /** Lista naruszeń (symbolId → {x,y}) */
  violations: Array<{ symbolId: string; x: number; y: number; offX: number; offY: number }>;
}

/**
 * Waliduj wyrównanie siatki dla zestawu pozycji.
 *
 * Używane w testach deterministycznych.
 *
 * @param positions — mapa symbolId → {x, y}
 * @returns wynik walidacji
 */
export function validateGridAlignment(
  positions: Map<string, { x: number; y: number }> | ReadonlyMap<string, { x: number; y: number }>
): GridAlignmentResult {
  const violations: GridAlignmentResult['violations'] = [];

  for (const [symbolId, pos] of positions) {
    const offX = pos.x % GRID_BASE;
    const offY = pos.y % GRID_BASE;
    if (offX !== 0 || offY !== 0) {
      violations.push({ symbolId, x: pos.x, y: pos.y, offX, offY });
    }
  }

  return {
    allAligned: violations.length === 0,
    violations,
  };
}

/**
 * Wynik walidacji rozstawu stacji.
 */
export interface StationSpacingResult {
  /** Czy wszystkie stacje są rozmieszczone co GRID_SPACING_MAIN */
  uniformSpacing: boolean;
  /** Lista rozstawów stacji */
  spacings: Array<{ from: string; to: string; dx: number; expected: number }>;
  /** Czy rozstaw jest jednolity */
  violations: Array<{ from: string; to: string; dx: number; expected: number }>;
}

/**
 * Waliduj równy rozstaw stacji na magistrali.
 *
 * @param stationXPositions — lista pozycji X stacji na magistrali (w kolejności)
 * @param stationIds — lista ID stacji (opcjonalnie, do raportowania)
 * @returns wynik walidacji
 */
export function validateStationSpacing(
  stationXPositions: number[],
  stationIds?: string[]
): StationSpacingResult {
  const spacings: StationSpacingResult['spacings'] = [];
  const violations: StationSpacingResult['violations'] = [];

  for (let i = 1; i < stationXPositions.length; i++) {
    const from = stationIds?.[i - 1] ?? `station_${i - 1}`;
    const to = stationIds?.[i] ?? `station_${i}`;
    const dx = stationXPositions[i] - stationXPositions[i - 1];
    const expected = GRID_SPACING_MAIN;
    spacings.push({ from, to, dx, expected });
    if (dx !== expected) {
      violations.push({ from, to, dx, expected });
    }
  }

  return {
    uniformSpacing: violations.length === 0,
    spacings,
    violations,
  };
}

/**
 * Wynik walidacji geometrii ringu.
 */
export interface RingGeometryResult {
  /** Czy ring ma 4 ortogonalne odcinki */
  valid: boolean;
  /** Ile odcinków ma ring */
  segmentCount: number;
  /** Czy ring jest na poziomie Y_RING */
  onRingChannel: boolean;
  /** Błędy */
  errors: string[];
}

/**
 * Waliduj geometrię połączenia ringowego.
 *
 * Ring powinien mieć dokładnie 4 punkty tworzące ścieżkę:
 * (X_i, Y_MAIN) → (X_i, Y_RING) → (X_j, Y_RING) → (X_j, Y_MAIN)
 *
 * @param path — lista punktów ścieżki połączenia ringowego
 * @returns wynik walidacji
 */
export function validateRingGeometry(
  path: Array<{ x: number; y: number }>
): RingGeometryResult {
  const errors: string[] = [];

  if (path.length !== 4) {
    errors.push(`Ring powinien mieć 4 punkty, ma: ${path.length}`);
    return { valid: false, segmentCount: path.length - 1, onRingChannel: false, errors };
  }

  const [p0, p1, p2, p3] = path;

  // Sprawdź pionowe wpięcia (p0→p1 i p3→p2)
  if (p0.x !== p1.x) {
    errors.push(`Wpięcie 1 (p0→p1) nie jest pionowe: x0=${p0.x}, x1=${p1.x}`);
  }
  if (p2.x !== p3.x) {
    errors.push(`Wpięcie 2 (p2→p3) nie jest pionowe: x2=${p2.x}, x3=${p3.x}`);
  }

  // Sprawdź poziomy bieg ringu (p1→p2)
  if (p1.y !== p2.y) {
    errors.push(`Bieg poziomy ringu (p1→p2) nie jest poziomy: y1=${p1.y}, y2=${p2.y}`);
  }

  // Sprawdź kanał Y_RING
  const onRingChannel = p1.y === Y_RING && p2.y === Y_RING;
  if (!onRingChannel) {
    errors.push(`Ring nie jest na kanale Y_RING (${Y_RING}): y1=${p1.y}, y2=${p2.y}`);
  }

  // Sprawdź wpięcia z Y_MAIN
  if (p0.y !== Y_MAIN) {
    errors.push(`Punkt startowy ringu nie jest na Y_MAIN (${Y_MAIN}): y0=${p0.y}`);
  }
  if (p3.y !== Y_MAIN) {
    errors.push(`Punkt końcowy ringu nie jest na Y_MAIN (${Y_MAIN}): y3=${p3.y}`);
  }

  return {
    valid: errors.length === 0,
    segmentCount: 3,
    onRingChannel,
    errors,
  };
}

// =============================================================================
// OBLICZANIE POZYCJI STACJI
// =============================================================================

/**
 * Oblicz pozycję X i-tej stacji na magistrali.
 *
 * X_i = X_START + i * GRID_SPACING_MAIN
 *
 * @param stationIndex — indeks stacji (0-based, deterministyczny)
 * @returns pozycja X stacji [px]
 *
 * @invariant Wynik % GRID_BASE === 0
 */
export function stationX(stationIndex: number): number {
  return X_START + stationIndex * GRID_SPACING_MAIN;
}

/**
 * Oblicz pozycję Y pola w stacji.
 *
 * Y = Y_MAIN ± n * OFFSET_POLE
 *
 * @param poleIndex — indeks pola (0 = najbliżej magistrali, +1 = dalej w dół)
 * @param direction — kierunek (+1 = poniżej Y_MAIN, -1 = powyżej Y_MAIN)
 * @returns pozycja Y pola [px]
 */
export function poleY(poleIndex: number, direction: 1 | -1 = 1): number {
  return Y_MAIN + direction * (poleIndex + 1) * OFFSET_POLE;
}

/**
 * Oblicz canoniczną ścieżkę ringu między dwoma stacjami.
 *
 * Ścieżka: (X_i, Y_MAIN) → (X_i, Y_RING) → (X_j, Y_RING) → (X_j, Y_MAIN)
 *
 * @param stationIndexA — indeks stacji A (mniejszy X)
 * @param stationIndexB — indeks stacji B (większy X)
 * @returns 4-punktowa ścieżka ringu
 */
export function ringPath(
  stationIndexA: number,
  stationIndexB: number
): Array<{ x: number; y: number }> {
  const xi = stationX(Math.min(stationIndexA, stationIndexB));
  const xj = stationX(Math.max(stationIndexA, stationIndexB));
  return [
    { x: xi, y: Y_MAIN },
    { x: xi, y: Y_RING },
    { x: xj, y: Y_RING },
    { x: xj, y: Y_MAIN },
  ];
}

// =============================================================================
// STAŁA WERYFIKACYJNA (dla testów)
// =============================================================================

/**
 * Weryfikacja niezmienników kontraktu (używana w testach).
 * Zwraca true jeśli wszystkie niezmienniki są spełnione.
 */
export function verifyAestheticContract(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // § 1.1: GRID_BASE = 20
  if (GRID_BASE !== 20) errors.push(`GRID_BASE musi wynosić 20, jest: ${GRID_BASE}`);

  // § 1.2: Kanały Y
  if (Y_RING !== Y_MAIN - 4 * GRID_BASE) {
    errors.push(`Y_RING musi wynosić Y_MAIN - 4*GRID_BASE = ${Y_MAIN - 4 * GRID_BASE}, jest: ${Y_RING}`);
  }
  if (Y_BRANCH !== Y_MAIN + 4 * GRID_BASE) {
    errors.push(`Y_BRANCH musi wynosić Y_MAIN + 4*GRID_BASE = ${Y_MAIN + 4 * GRID_BASE}, jest: ${Y_BRANCH}`);
  }

  // § 1.3: GRID_SPACING_MAIN = 14 * GRID_BASE
  if (GRID_SPACING_MAIN !== 14 * GRID_BASE) {
    errors.push(`GRID_SPACING_MAIN musi wynosić 14*GRID_BASE = ${14 * GRID_BASE}, jest: ${GRID_SPACING_MAIN}`);
  }

  // § 1.6: OFFSET_POLE = 3 * GRID_BASE
  if (OFFSET_POLE !== 3 * GRID_BASE) {
    errors.push(`OFFSET_POLE musi wynosić 3*GRID_BASE = ${3 * GRID_BASE}, jest: ${OFFSET_POLE}`);
  }

  // Wszystkie stałe muszą być wielokrotnościami GRID_BASE
  const toCheck: Array<[string, number]> = [
    ['Y_MAIN', Y_MAIN],
    ['Y_RING', Y_RING],
    ['Y_BRANCH', Y_BRANCH],
    ['GRID_SPACING_MAIN', GRID_SPACING_MAIN],
    ['X_START', X_START],
    ['OFFSET_POLE', OFFSET_POLE],
    ['MIN_VERTICAL_GAP', MIN_VERTICAL_GAP],
  ];

  for (const [name, value] of toCheck) {
    if (value % GRID_BASE !== 0) {
      errors.push(`${name} (${value}) nie jest wielokrotnością GRID_BASE (${GRID_BASE})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
