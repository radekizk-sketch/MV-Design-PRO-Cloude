# KANONICZNA GEOMETRIA ORTOGONALNA SLD

**Data:** 2026-03-14
**Wersja:** 1.0
**Status:** WIAZACY

---

## 1. CEL

Jeden kanoniczny silnik geometrii ortogonalnej SLD, zdolny obsluzyc model ogólny praktycznej sieci terenowej SN. Geometria wynika z topologii — nie odwrotnie.

---

## 2. WYMAGANIA KRYTYCZNE

| ID | Wymaganie | Priorytet |
|----|-----------|-----------|
| GK01 | Jedna dominujaca os magistrali (pionowa) | KRYTYCZNY |
| GK02 | Rozwój sieci w dól (GPZ u góry) | KRYTYCZNY |
| GK03 | Odgalezienia w bok (L-shape) | KRYTYCZNY |
| GK04 | Stacja przelotowa przejmuje tor glówny | KRYTYCZNY |
| GK05 | Stacje boczne odkładane deterministycznie | KRYTYCZNY |
| GK06 | Ring/NOP/rezerwa w osobnym kanale geometrycznym | WAZNY |
| GK07 | Etykiety parametrów na osobnej warstwie z buforem ochronnym | WAZNY |
| GK08 | Brak przypadkowych przesuniEc "na sztuke" | KRYTYCZNY |
| GK09 | Determinizm (ten sam model -> identyczny layout) | KRYTYCZNY |
| GK10 | Grid-snap 20px | WAZNY |

---

## 3. PARAMETRY GEOMETRII

```typescript
/**
 * SldGeometryRules — kanoniczne parametry geometrii SLD.
 *
 * Wszystkie wartosci w pikselach (px).
 * Grid-snap: 20px (wszystkie pozycje zaokraglane do wielokrotnosci 20).
 */
export interface SldGeometryRules {
  // === OS MAGISTRALI ===
  /** Os X pierwszej magistrali */
  readonly trunkAxisX: number;              // 400
  /** Odstep X miedzy magistralami (multi-trunk) */
  readonly trunkSpacingX: number;           // 600
  /** Krok Y miedzy elementami na magistrali */
  readonly mainVerticalPitch: number;       // 100
  /** Y poczatkowy (GPZ) */
  readonly gpzTopY: number;                 // 60

  // === ODGALEZIENIA ===
  /** Przesuniecie X odgalezienia od osi magistrali */
  readonly branchHorizontalPitch: number;   // 280
  /** Dodatkowe przesuniecie X per glebokosc zagniezdzenia */
  readonly subBranchOffsetX: number;        // 140
  /** Krok Y miedzy stacjami na odgalezieniu */
  readonly branchVerticalPitch: number;     // 100

  // === STACJE ===
  /** Minimalna odleglosc Y miedzy stacjami */
  readonly stationMinSpacingY: number;      // 200
  /** Szerokosc stacji inline */
  readonly inlineStationWidth: number;      // 200
  /** Wysokosc naglówka stacji */
  readonly stationHeaderHeight: number;     // 30
  /** Pitch pól wewnatrz stacji */
  readonly bayPitchX: number;               // 80
  /** Wysokosc pola (slot) */
  readonly baySlotHeight: number;           // 120

  // === GPZ ===
  /** Pitch pól na szynie GPZ */
  readonly gpzFieldPitch: number;           // 280
  /** Grubosc szyny GPZ */
  readonly gpzBusStrokeWidth: number;       // 8
  /** Grubosc szyny stacji */
  readonly stationBusStrokeWidth: number;   // 5

  // === KANAL REZERWOWY ===
  /** Przesuniecie X kanalu rezerwowego (ring/NOP) */
  readonly reserveChannelOffsetX: number;   // 80
  /** Dash array dla linii ring */
  readonly ringDashArray: string;           // '6 4'

  // === ETYKIETY ===
  /** Margines bezpieczenstwa etykiet od symboli */
  readonly parameterBoxSafeMargin: number;  // 10
  /** Szerokosc pola etykiety */
  readonly labelBoxWidth: number;           // 120
  /** Wysokosc pola etykiety */
  readonly labelBoxHeight: number;          // 20

  // === GRID ===
  /** Grid snap */
  readonly gridSnap: number;               // 20
}
```

---

## 4. ALGORYTMY

### 4.1 Algorytm rozmieszczania magistrali

```
WEJSCIE: SldSemanticModelV1.trunks[]
WYJSCIE: pozycje segmentów magistrali

ALGORYTM:
  1. Dla kazdej magistrali trunk[i]:
     a. trunkX = trunkAxisX + i * trunkSpacingX
     b. currentY = gpzTopY + gpzHeaderHeight
     c. Dla kazdego elementu na magistrali (w kolejnosci topologicznej):
        - Jesli segment: rysuj linie pionowa od currentY do currentY + mainVerticalPitch
        - Jesli stacja inline: rysuj blok stacji na (trunkX, currentY)
        - Jesli junction: zaznacz punkt odgalezienia
        - currentY += mainVerticalPitch (lub stationHeight jesli stacja)
     d. Grid-snap: zaokraglij currentY do wielokrotnosci gridSnap

DETERMINIZM: Kolejnosc elementów wynika z topologii (BFS), nie z losowosci.
```

### 4.2 Algorytm rozmieszczania stacji inline

```
WEJSCIE: InlineStation, trunkX, currentY
WYJSCIE: pozycje elementów stacji

ALGORYTM:
  1. Punkt wejscia: (trunkX, topY)
  2. Pole LINE_IN: pionowo od topY, urzadzenia w dól
  3. Szyna stacji: poziomo na busY = topY + incomingBayHeight
  4. Pola boczne: rozkladane od szyny w bok
     - TRANSFORMER: na lewo (domyslnie)
     - BRANCH: na prawo (domyslnie)
     - GENERATOR: na prawo (za BRANCH)
     - Strony deterministyczne: hash(stationId) -> left/right
  5. Pole LINE_OUT: pionowo w dól od szyny
  6. Punkt wyjscia: (trunkX, bottomY)
  7. bottomY = busY + outgoingBayHeight
  8. stationHeight = bottomY - topY

GWARANCJA: Incoming i outgoing na tej samej osi X (trunkX).
```

### 4.3 Algorytm rozmieszczania branch stations

```
WEJSCIE: BranchPath, junctionPoint, trunkX, junctionY
WYJSCIE: pozycje stacji na odgalezieniu

ALGORYTM:
  1. Strona odgalezienia: deterministic_side(hash(branchId))
     - lewo: branchX = trunkX - branchHorizontalPitch
     - prawo: branchX = trunkX + branchHorizontalPitch
  2. L-shape routing:
     a. Poziomo od junctionPoint do branchX
     b. Pionowo w dól od branchX
  3. Stacje na odgalezieniu:
     - currentBranchY = junctionY + branchVerticalPitch
     - Dla kazdej stacji na branch:
       - Rysuj blok stacji na (branchX, currentBranchY)
       - currentBranchY += stationMinSpacingY
  4. Podgalezienia (branch z branch):
     - Rekurencja: subBranchX = branchX +/- subBranchOffsetX
     - Glebokosc zagniezdzenia: nestingDepth * subBranchOffsetX

ALTERNACJA STRON:
  - Pierwsze odgalezienie: prawo
  - Drugie odgalezienie: lewo
  - Trzecie: prawo
  - ...
  - Deterministycznie: hash(branchId) % 2 == 0 ? prawo : lewo
```

### 4.4 Algorytm rozmieszczania sectional stations

```
WEJSCIE: SectionalStation, trunkX, currentY
WYJSCIE: pozycje elementów stacji sekcyjnej

ALGORYTM:
  1. Sekcja A: góra stacji
     - Szyna A: (trunkX, busAY)
     - Pola sekcji A powyzej szyny A
  2. Sprzeglo (tie bay): miedzy szynami A i B
     - Pozycja: (trunkX + tieOffsetX, midY)
  3. Sekcja B: dól stacji
     - Szyna B: (trunkX, busBY)
     - Pola sekcji B ponizej szyny B
  4. NOP: jesli istnieje, zaznaczony na polaczeniu rezerwy
  5. stationHeight = busBY + sectionBHeight - busAY + sectionAHeight
```

### 4.5 Algorytm reserve/ring channel

```
WEJSCIE: ReserveLinks[], trunkPositions
WYJSCIE: routing polaczen rezerwowych

ALGORYTM:
  1. Kanal rezerwowy: trunkX + reserveChannelOffsetX (lub - reserveChannelOffsetX)
  2. Routing ortogonalny:
     a. Z wezla A: poziomo do kanalu rezerwowego
     b. Pionowo w kanale rezerwowym
     c. Z kanalu rezerwowego: poziomo do wezla B
  3. NOP: symbol na srodku polaczenia
  4. Styl: linia przerywana (ringDashArray = '6 4')
  5. Kolor: SECONDARY_COLOR (szary / ciemnoszary)

GWARANCJA: Ring NIE przecina logiki magistrali glównej.
           Ring ma osobny kanal geometryczny.
```

### 4.6 Algorytm unikania kolizji

```
WEJSCIE: pozycje wszystkich elementów
WYJSCIE: skorygowane pozycje (bez kolizji)

ALGORYTM (CollisionGuard):
  1. Wykryj kolizje AABB (Axis-Aligned Bounding Box)
  2. Rozwiazuj kolizje Y-only (zachowanie kolumn X):
     a. Symbol-symbol: PRZESUNIECIE Y w dól o minSpacingY
     b. Label-symbol: PRZESUNIECIE Y etykiety
     c. Label-label: PRZESUNIECIE Y nizszej etykiety
  3. NIGDY nie przesuwaj X (zachowanie osi magistrali)
  4. Iteracja do braku kolizji (max 10 iteracji)

CI GATE: Jesli kolizja symbol-symbol po 10 iteracjach -> FAIL CI
```

### 4.7 Algorytm rozmieszczania parameter boxes

```
WEJSCIE: elementy + ich pozycje
WYJSCIE: pozycje etykiet parametrów

ALGORYTM:
  1. Etykiety na osobnej warstwie (z-index wyzej niz linie)
  2. Pozycja domyslna: obok elementu (prawo lub lewo, deterministycznie)
  3. Bufor ochronny: parameterBoxSafeMargin (10px) od kazdego symbolu
  4. Antykolizja:
     a. Sprawdz kolizje AABB z symbolami
     b. Sprawdz kolizje AABB z innymi etykietami
     c. Przesuniecie: Y w dól, potem X w bok
  5. Tlo etykiety: bialy prostokat z ramka (czytelnosc)
```

---

## 5. PRZYKLAD — ZLOTY UKLAD "terrain"

```
X=120  X=400  X=480  X=680  X=820

        GPZ (110/15 kV)
        ================
        SZYNA SN 15 kV
        ================
          |
          | seg_01 (XRUHAKXS 3x240, 2.1km)
   Y=200  |
   +------+------+
   | S1 przelotowa|
   | IN | szyna | OUT|
   | TR1 |       |   |
   +------+------+
          |
   Y=400  | seg_02
          |
   +------+------+        +------+------+
   | S2 odgalezna|------->| B1 przelotowa|
   | IN | szyna | OUT|    | IN | szyna | OUT|
   | TR2 |  BR   |   |    | TR  |       |   |
   +------+------+        +------+------+
          |                       |
   Y=600  | seg_03         +------+------+
          |                | B2 koncowa   |
   +------+------+        | IN  | TR     |
   | S3 przelotowa|       +------+------+
   | IN | szyna | OUT|
   | TR3 |       |   |    +------+------+
   +------+------+        | B3 PV        |
          |                | IN | TR | PV |
   Y=800  | seg_04         +------+------+
          |
   +------+------+------+
   | S4 sekcyjna          |
   | sec_A | TIE | sec_B  |
   | TR_A  |     | TR_B   |
   +------+------+------+
          |
   Y=1000 | seg_05
          |
   +------+------+        +------+------+
   | S5 odgalezna|------->| B4 przelotowa|
   | IN | szyna | OUT|    | IN | szyna | OUT|
   | TR5 |  BR   |   |    | TR  |       |   |
   +------+------+        +------+------+
          |                       |
   Y=1200 | seg_06         +------+------+
          |                | B5 koncowa   |
   +------+------+        | IN  | TR     |
   | S6 koncowa   |       +------+------+
   | IN  | TR    |               |
   +------+------+        +------+------+
          |                | B6 sub-branch|
         NOP               | IN  | TR     |
          |                +------+------+
   (ring do S1)
```

---

## 6. WARSTWY RENDERINGU

| Warstwa | Z-index | Zawartosc |
|---------|---------|-----------|
| L0 - Tlo | 0 | Siatka, ramka |
| L1 - Linie | 10 | Segmenty magistrali, odgalezien, ring |
| L2 - Szyny | 20 | Szyny GPZ, szyny stacji |
| L3 - Bloki stacji | 30 | Obrysy stacji, tla |
| L4 - Symbole | 40 | CB, DS, TR, CT, ES, RELAY, FUSE |
| L5 - Etykiety nazw | 50 | Nazwy stacji, nazwy elementów |
| L6 - Etykiety parametrów | 60 | Parametry linii, moce, prady |
| L7 - Overlay wyników | 70 | Wyniki obliczen (nakladka) |
| L8 - Selekcja | 80 | Zaznaczenie elementów |

---

## 7. STYLE KANONICZNE

| Element | Kolor | Grubosc | Styl |
|---------|-------|---------|------|
| Szyna GPZ | #1a1a2e | 8px | solid |
| Szyna stacji | #1a1a2e | 5px | solid |
| Segment magistrali | #1a1a2e | 2px | solid |
| Segment odgalezienia | #1a1a2e | 2px | solid |
| Segment ring/rezerwa | #666 | 1.5px | dashed (6 4) |
| NOP symbol | #c0392b | 2px | solid |
| Blok stacji | #f5f5f5 border #ccc | 1px | solid |
| Etykieta parametrów | #333 bg:#fff | 11px font | solid border |
| Overlay wynik OK | #27ae60 | - | - |
| Overlay wynik WARNING | #f39c12 | - | - |
| Overlay wynik ERROR | #e74c3c | - | - |

---

## 8. INVARIANTY GEOMETRII

```
INV01: Magistrala ma jedna dominujaca os X (pionowa)
INV02: GPZ jest na górze schematu (minY)
INV03: Siec rozwija sie w dól (rosace Y)
INV04: Stacja przelotowa jest NA osi magistrali (ten sam X)
INV05: Odgalezienie L-shape: bok + dól
INV06: Ring/NOP w osobnym kanale (inny X niz magistrala)
INV07: Brak kolizji symbol-symbol (CI gate)
INV08: Determinizm: ten sam model -> identyczny layout (hash)
INV09: Grid-snap: wszystkie pozycje na wielokrotnosci 20px
INV10: Y-only collision resolution (X zachowane)
```

---

## 9. ZAKAZY

- Geometrii zaleznej od przypadkowej kolejnosci wejscia
- Lokalnych wyjatków wpisanych recznie w renderer
- Ukrywania kolizji pod przesunieciem ad hoc
- Sztywnych Y_MAIN / Y_RING / Y_BRANCH (zastapionych dynamicznym pitchem)
- Mieszania geometrii trunk i branch
- Fizyki w silniku geometrii
- Pozycji niezgodnych z grid-snap
