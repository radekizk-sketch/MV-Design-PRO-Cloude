# Kontrakt estetyki przemysłowej SLD

Dokument definiuje reguły wizualne schematów jednokreskowych (SLD) zgodne ze standardami
DIgSILENT PowerFactory / ABB / ETAP. Celem jest **redukcja szumu poznawczego** i ujednolicenie
prezentacji topologii sieci SN.

---

## Stałe (BINDING)

| Stała | Wartość | Znaczenie |
|---|---|---|
| `GRID_BASE` | 20 px | Podstawa siatki rytmu — wszystkie współrzędne są wielokrotnościami |
| `Y_MAIN` | 400 px | Stały poziom Y magistrali głównej SN |
| `Y_RING` | 320 px | Stały poziom Y kanału ringowego (Y_MAIN − 4·GRID_BASE) |
| `Y_BRANCH` | 480 px | Stały poziom Y kanału odgałęzień (Y_MAIN + 4·GRID_BASE) |
| `X_START` | 40 px | Poziom X pierwszej stacji (2·GRID_BASE) |
| `GRID_SPACING_MAIN` | 280 px | Rozstaw centrum-centrum kolejnych stacji (14·GRID_BASE) |
| `OFFSET_POLE` | 60 px | Pionowy rozstaw pól w stacji (3·GRID_BASE) |
| `MIN_HORIZONTAL_GAP` | 280 px | Minimalny odstęp poziomy = GRID_SPACING_MAIN |
| `MIN_VERTICAL_GAP` | 80 px | Minimalny odstęp pionowy = 4·GRID_BASE |

---

## Grubości linii (§1.7)

| Element | Grubość | Styl |
|---|---|---|
| Magistrala (szyna zbiorcza) | **3 px** | Ciągła |
| Odgałęzienia / gałęzie | **2 px** | Ciągła |
| Ring (połączenie pętlowe) | **2 px** | Przerywana `6 4` |

Magistrala musi **wizualnie dominować** — zawsze grubsza od odgałęzień.

---

## Reguły wdrożone

### §1.1 Siatka rytmu (DONE)
- `GRID_BASE = 20 px`
- Każda współrzędna `x, y` jest wielokrotnością GRID_BASE: `x % 20 == 0`
- Zakaz wartości niecałkowitych i mikroprzesunięć
- Implementacja: `snapToAestheticGrid()` w `IndustrialAesthetics.ts`

### §1.2 Kanały Y stałe (DONE)
- `Y_RING = Y_MAIN − 4·GRID_BASE = 320`
- `Y_MAIN = 400` (magistrala ZAWSZE na Y_MAIN)
- `Y_BRANCH = Y_MAIN + 4·GRID_BASE = 480`
- Kąty wyłącznie 90°, brak łuków

### §1.3 Równe odległości stacji na magistrali (DONE)
- `GRID_SPACING_MAIN = 14·GRID_BASE = 280 px`
- Pozycja i-tej stacji: `X_i = X_START + i·GRID_SPACING_MAIN`
- Niezależnie od: długości nazwy, liczby pól, długości kabla, historii operacji
- Implementacja: `stationX(i)` w `IndustrialAesthetics.ts`

### §1.4 Symetryczne ringi (DONE)
- Ring = 4 punkty: `(X_i, Y_MAIN) → (X_i, Y_RING) → (X_j, Y_RING) → (X_j, Y_MAIN)`
- Długość pozioma ringu = `|j − i|·GRID_SPACING_MAIN`
- Pionowe wpięcia identyczne (X_i, X_j)
- Implementacja: `ringPath(i, j)` w `IndustrialAesthetics.ts`

### §1.5 Brak przypadkowych długości wizualnych (DONE)
- SLD **nie prezentuje** długości fizycznej kabla
- Każdy segment magistrali = 1 kratka GRID_SPACING_MAIN
- Metryka fizyczna: wyłącznie w inspektorze i białej księdze

### §1.6 Wyrównanie pionowe pól w stacji (DONE)
- Każde pole stacji: `X = X_STATION_CENTER = stationX(i)`
- Pola układane na `Y_MAIN ± n·OFFSET_POLE`
- Implementacja: `poleY(n, direction)` w `IndustrialAesthetics.ts`

### §1.7 Jednolita grubość linii (DONE)
- Magistrala: 3 px (poprzednio 5 px)
- Odgałęzienia: 2 px (poprzednio 2.5 px)
- Ring: 2 px przerywana `6 4`
- Implementacja: stałe w `IndustrialAesthetics.ts` + `sldEtapStyle.ts` ETAP_STROKE

### §1.8 Minimalne marginesy (DONE)
- `MIN_HORIZONTAL_GAP = GRID_SPACING_MAIN = 280 px`
- `MIN_VERTICAL_GAP = 4·GRID_BASE = 80 px`
- Brak sytuacji „prawie dotyka"

---

## Deterministyczność (INVARIANT)

> **Ten sam Snapshot → identyczne współrzędne (piksel w piksel, tolerancja 0 px)**

Gwarancje:
1. Kanoniczny porządek stacji: deterministyczny po stabilnych identyfikatorach domenowych
2. Snap-to-grid: finał po wygenerowaniu wszystkich punktów
3. Ring path: funkcja czysta, bez zależności od stanu
4. Testy permutacyjne: 50 losowych permutacji danych wejściowych → identyczny hash geometrii

---

## Testy (CI)

Plik: `src/ui/sld/__tests__/industrialAesthetics.test.ts`

| Test | Reguła | Status |
|---|---|---|
| Weryfikacja niezmienników kontraktu | Wszystkie §§ | DONE |
| `snapToAestheticGrid` zaokrągla do GRID_BASE | §1.1 | DONE |
| Siatka rytmu — idempotentność | §1.1 | DONE |
| Kanały Y — kolejność i wartości | §1.2 | DONE |
| `stationX(i)` — równy rozstaw | §1.3 | DONE |
| `validateStationSpacing` — detekcja naruszeń | §1.3 | DONE |
| `ringPath` — 4 punkty, Y_RING, symetria | §1.4 | DONE |
| `validateRingGeometry` — detekcja błędów | §1.4 | DONE |
| `poleY` — OFFSET_POLE, siatka | §1.6 | DONE |
| Grubości linii — wartości i hierarchia | §1.7 | DONE |
| Marginesy — wartości | §1.8 | DONE |
| 50 permutacji stacji → identyczny hash | Deterministyczność | DONE |
| 50 permutacji ringów → identyczny hash | Deterministyczność | DONE |

---

## Pliki implementacji

| Plik | Rola |
|---|---|
| `src/ui/sld/IndustrialAesthetics.ts` | **Jedyne źródło prawdy** — stałe, funkcje, walidacja |
| `src/ui/sld/sldEtapStyle.ts` | Aktualizacja ETAP_STROKE (3px/2px) + ETAP_GEOMETRY.bay.spacing (280px) |
| `src/ui/sld/ConnectionRenderer.tsx` | Renderowanie ringu jako linia przerywana |
| `src/ui/sld-editor/types.ts` | Dodanie `connectionStyle?: 'ring' \| 'default'` do Connection |
| `src/ui/sld/__tests__/industrialAesthetics.test.ts` | Testy deterministyczne kontraktu |

---

## Uzasadnienie

**Redukcja szumu poznawczego:**
- Jednolita siatka 20 px eliminuje przypadkowe odstępy i mikroprzesunięcia
- Stałe kanały Y pozwalają inżynierowi natychmiastowo identyfikować typ elementu (ring vs. magistrala vs. odgałęzienie)
- Równy rozstaw stacji 280 px komunikuje **topologię**, nie metrykę — w sieciach SN metryka fizyczna jest nieistotna dla operatora w trakcie eksploatacji

**Spójność ze standardami przemysłowymi:**
- DIgSILENT PowerFactory: stała siatka, ortogonalne ścieżki, wyraźna hierarchia grubości
- ABB MicroSCADA: kanały Y dla ringów/magistral
- ETAP: przerywana linia dla ringów NOP

---

*Wszystkie reguły zaimplementowane. Brak naruszań w CI.*
