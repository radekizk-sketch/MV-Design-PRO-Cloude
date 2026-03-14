# Model Ogólny SLD — Dowolna Realna Sieć Terenowa SN

## Wersja: V1.0 (BINDING)
## Data: 2026-03-13

---

## 1. Cel dokumentu

Niniejszy dokument definiuje formalny model ogólny SLD w MV-DESIGN-PRO, zdolny do odwzorowania
**dowolnej realnej sieci terenowej SN** w granicach domeny produktu. Model nie jest ograniczony
do kilku scenariuszy referencyjnych — jest ogólny, rozszerzalny i deterministyczny.

---

## 2. Aksjomat nadrzędny

> **Każda realna sieć terenowa SN, która mieści się w domenie MV-DESIGN-PRO,
> musi być możliwa do zbudowania, wyrenderowania w SLD i policzenia
> na tym samym modelu systemowym.**

---

## 3. Ontologia bytów

### KLASA A — Obiekty rozdzielcze

| Byt | Rola | Porty | Kontrakt danych | Związek z geometrią |
|-----|------|-------|-----------------|---------------------|
| GPZ | Źródło systemowe WN/SN | wyjście_sn (dół) | `GpzVisual` | Góra schematu, u źródła |
| Rozdzielnia SN | Rozdzielnia wejściowa GPZ | wejście_wn (góra), wyjście_sn (dół) | `RozdzielniaSnVisual` | Pod GPZ, nad szyną |
| Szyna SN | Szyna rozdzielcza SN | lewo, prawo | `BusbarSnVisual` | Pozioma, pod rozdzielnią |
| Pole zasilające | Zasilanie z WN | in (góra), out (dół) | `PoleZasilajaceVisual` | Pionowo z szyny |
| Pole magistralowe | Wyjście na magistralę | in (góra), out (dół) | `PoleMagistraloweVisual` | Pionowo z szyny |
| Pole transformatorowe | Pole TR SN/nN | in (góra), out (dół) | `PoleTransformatoweVisual` | Wewnątrz stacji |
| Pole sekcyjne | Sprzęgło sekcyjne | in (góra), out (dół) | `PoleSekcyjneVisual` | Wewnątrz stacji sekcyjnej |
| Pole pomiarowe | CT/VT | in (góra), out (dół) | `PolePomiaroweVisual` | Wewnątrz pola |

### KLASA B — Obiekty sieciowe

| Byt | Rola | Porty | Kontrakt danych | Związek z geometrią |
|-----|------|-------|-----------------|---------------------|
| Segment magistrali | Tok główny SN | in (góra), out (dół) | `TrunkSegmentVisual` | Pionowy odcinek na osi magistrali |
| Segment odgałęzienia | Odgałęzienie od magistrali | start (lewo), end (dół) | `BranchSegmentVisual` | L-kształt (bok + dół) |
| Segment wtórny | Odcinek poza drzewem | a (lewo), b (prawo) | `SecondarySegmentVisual` | Kanał wtórny |
| Punkt rozgałęzienia | Węzeł T na magistrali | in (góra), trunk_out (dół), branch_out (prawo) | `BranchJunctionVisual` | Na magistrali, trójnik |
| Węzeł liniowy | Węzeł bez stacji | in (góra), out (dół) | `WezelLiniowyVisual` | Na magistrali/odgałęzieniu |
| Łącze pierścieniowe | Połączenie ring | a (lewo), b (prawo) | `RingConnectorVisual` | Kanał wtórny, przerywana |
| Punkt normalnie otwarty | NOP eksploatacyjny | a (lewo), b (prawo) | `NopVisual` | Na łączu pierścieniowym |

### KLASA C — Obiekty stacyjne

| Byt | Rola topologiczna | Porty | Kontrakt danych |
|-----|-------------------|-------|-----------------|
| Stacja końcowa | TRUNK_LEAF — koniec magistrali | wejście_sn (góra) | `StationVisual` role='koncowa' |
| Stacja przelotowa | TRUNK_INLINE — w linii magistrali | wejście_sn (góra), wyjście_sn (dół) | `StationVisual` role='przelotowa' |
| Stacja odgałęźna | TRUNK_BRANCH — z odgałęzieniem | wejście_sn (góra), wyjście_sn (dół), port_odgalezienia (prawo) | `StationVisual` role='odgalezna' |
| Stacja sekcyjna | LOCAL_SECTIONAL — 2+ szyny + sprzęgło | wejście_sn (góra), wyjście_sn (dół) | `StationVisual` role='sekcyjna' |

### KLASA D — Obiekty aparatowe

| Byt | Rola | Typ urządzenia |
|-----|------|----------------|
| Wyłącznik (CB) | Łączenie/ochrona | `DeviceTypeV1.CB` |
| Rozłącznik (DS) | Izolacja | `DeviceTypeV1.DS` |
| Uziemnik (ES) | Bezpieczeństwo | `DeviceTypeV1.ES` |
| Przekładnik prądowy (CT) | Pomiar | `DeviceTypeV1.CT` |
| Przekładnik napięciowy (VT) | Pomiar | `DeviceTypeV1.VT` |
| Przekaźnik (RELAY) | Ochrona | `DeviceTypeV1.RELAY` |
| Bezpiecznik (FUSE) | Ochrona | `DeviceTypeV1.FUSE` |
| Transformator SN/nN | Przekształcenie | `DeviceTypeV1.TRANSFORMER_DEVICE` |
| Generator PV | Źródło OZE | `DeviceTypeV1.GENERATOR_PV` |
| Generator BESS | Magazyn energii | `DeviceTypeV1.GENERATOR_BESS` |

---

## 4. Hierarchia wizualna (kolejność odczytu)

```
1. GPZ / źródło systemowe                    ← góra schematu
2. Rozdzielnia wejściowa SN
3. Szyna SN GPZ (główna, pozioma)
4. Pola zasilające / magistralowe             ← pionowo w dół z szyny
5. Magistrala główna SN                       ← pionowy tok w dół
6. Segmenty magistrali i punkty rozgałęzienia
7. Stacje w osi głównej                       ← drop z magistrali (L-kształt)
8. Odgałęzienia i stacje odgałęźne            ← bok + dół
9. Podgałęzienia (branch z branch)            ← głębsze bok + dół
10. Ring / NOP / układy wtórne                ← kanał boczny, przerywana
11. Opisy techniczne główne
12. Parametry szczegółowe i aparatura wtórna
```

---

## 5. Model ogólny sieci terenowej SN

### 5.1 Źródło prawdy: Snapshot + logical_views

```
SLD = f(Snapshot)

Snapshot zawiera:
├── graph.nodes[]              — węzły (szyny, źródła, odbiorcy, generatory)
├── graph.edges[]              — gałęzie (linie, kable, TR, łączniki)
├── catalog_bindings[]         — materializacja katalogu
├── params_explicit[]          — parametry jawne
├── operating_state
│   └── switch_normal_states[] — stany normalne łączników
└── logical_views
    ├── trunks[]               — magistrale (segmentIds, orderedStations)
    ├── branches[]             — odgałęzienia (segmentIds, junctionNodeId, orderedStationIds)
    └── rings[]                — układy wtórne (segmentIds, normallyOpenSegmentId)
```

### 5.2 Segmentacja topologiczna

Algorytm segmentacji (deterministyczny BFS):

1. Buduj graf aktywnych gałęzi (ignoruj NOP / normalnie otwarte)
2. BFS spanning tree od GRID_SOURCE (tie-break: sort po id)
3. **TRUNK** = najdłuższa ścieżka w spanning tree od root
4. **BRANCH** = pozostałe gałęzie spanning tree (nie na trunk)
5. **SECONDARY** = gałęzie poza spanning tree (ring, rezerwa, NOP)

Jeżeli `logicalViews` zawiera jawne trunks/branches/rings — użyj ich zamiast BFS.

### 5.3 Embedding stacji

Rola stacji wynika deterministycznie z segmentacji:

| Warunek | EmbeddingRole | Rola wizualna |
|---------|---------------|---------------|
| 2+ sekcje szyn lub coupler | LOCAL_SECTIONAL | sekcyjna |
| 2 trunk edges, 0 branch | TRUNK_INLINE | przelotowa |
| 1 trunk edge, 0 branch | TRUNK_LEAF | końcowa |
| trunk ≥ 1, branch ≥ 1 | TRUNK_BRANCH | odgałęźna |
| 0 trunk, branch ≥ 1 | TRUNK_BRANCH | na odgałęzieniu |

### 5.4 Extended Logical Views

```typescript
interface LogicalTrunkViewExtV1 extends LogicalTrunkViewV1 {
  orderedStations: LogicalTrunkStationV1[];  // stacje w kolejności na magistrali
}

interface LogicalBranchViewExtV1 extends LogicalBranchViewV1 {
  junctionNodeId: string | null;       // węzeł wpięcia do magistrali
  orderedStationIds: string[];          // stacje wzdłuż odgałęzienia
}
```

---

## 6. Model geometrii (elastyczny, nie sztywny)

### 6.1 Układ rozdzielczy (GPZ)
- GPZ u góry (Y_GPZ = 60px)
- Szyna SN pozioma, szerokość = f(liczba pól)
- Pola pionowo w dół z szyny, pitch = PITCH_FIELD_X (280px)

### 6.2 Układ magistralowy
- Z pola magistralowego → tok pionowy w dół
- Krok Y = TRUNK_STEP_Y (100px)
- Oś X stała per magistrala
- Liczba segmentów i stacji wynika z modelu, nie z szablonu

### 6.3 Układ odgałęźny
- Odgałęzienie wychodzi w bok (BRANCH_OFFSET_X = 140px)
- Deterministyczny wybór strony (hash elementId)
- Dalej schodzi w dół (kolejne stacje na gałęzi)
- **Podgałęzienie** (branch z branch): kolejny bok + dół z głębszego poziomu
- System obsługuje dowolną głębokość gałęzienia

### 6.4 Układ stacyjny
- Stacja = blok semantyczny (TYPE_A/B/C/D)
- Wymiary = f(typ stacji)
- Wewnętrzne pola, aparatura, szyna nN
- Rola topologiczna determinuje porty i geometrię

### 6.5 Układ wtórny (ring / NOP)
- Kanał boczny (SECONDARY_CHANNEL_OFFSET_X = 80px)
- Routing ortogonalny (pionowo → poziomo → pionowo)
- NOP = jawny byt eksploatacyjny na łączu pierścieniowym
- Linia przerywana (RING_DASH_ARRAY = '6 4')

---

## 7. Model ring / NOP

### 7.1 Ring (połączenie pierścieniowe)
- Gałąź SECONDARY_CONNECTOR w grafie wizualnym
- Łączy dwa węzły magistrali/odgałęzienia zamykając pętlę
- W stanie normalnym: punkt na ringu jest normalnie otwarty (NOP)
- Routing: kanał wtórny, linia przerywana

### 7.2 NOP (punkt normalnie otwarty)
- Gałąź z `isNormallyOpen = true`
- Byt eksploatacyjny, NIE brak połączenia
- Widoczny w SLD jako jawny symbol
- Zmiana stanu NOP = rekonfiguracja eksploatacyjna → nowy Snapshot

---

## 8. Kontrakt topologii wizualnej

```typescript
interface VisualTopologyContractV1 {
  gpz: GpzVisual[];
  rozdzielnieSn: RozdzielniaSnVisual[];
  busbarsSn: BusbarSnVisual[];
  fieldsSn: FieldSnVisual[];
  polaZasilajace: PoleZasilajaceVisual[];
  polaMagistralowe: PoleMagistraloweVisual[];
  polaTransformatorowe: PoleTransformatoweVisual[];
  polaSekcyjne: PoleSekcyjneVisual[];
  polaPomiarowe: PolePomiaroweVisual[];
  trunkSegments: TrunkSegmentVisual[];
  branchSegments: BranchSegmentVisual[];
  secondarySegments: SecondarySegmentVisual[];
  branchJunctions: BranchJunctionVisual[];
  wezlyLiniowe: WezelLiniowyVisual[];
  stations: StationVisual[];
  ringConnectors: RingConnectorVisual[];
  nops: NopVisual[];
}
```

Każdy byt ma:
- `id` — unikalny identyfikator
- `kind` — typ (polski)
- `role` — rola semantyczna
- `domainElementId` — bijekcja z Snapshot
- `topologyClass` — klasa topologiczna
- `ports[]` — porty z kierunkiem
- `selectionElementId` — do selekcji UI
- `inspectorElementId` — do inspektora

---

## 9. Referencje testowe

### 9.1 Scenariusze referencyjne

| ID | Opis | Cel testu |
|----|------|-----------|
| `leaf` | GPZ + 1 stacja końcowa | Minimalna sieć |
| `pass` | GPZ + 2 stacje przelotowe | Magistrala liniowa |
| `branch` | GPZ + 2 stacje + 1 odgałęzienie | Odgałęzienie |
| `ring` | GPZ + 3 stacje + ring + NOP | Pętla z NOP |
| `multi` | GPZ + 5 stacji magistrali + 4 stacje branch + sekcyjna + PV | Wieloodcinkowa |
| `terrain` | GPZ + 6 stacji magistrali + 6 stacji branch + sub-branch + ring + NOP + sekcyjna + PV | **Wzorzec główny** |
| `sectional` | GPZ + 3 stacje z sekcyjną + coupler | Stacja sekcyjna |

### 9.2 Wzorzec główny ('terrain')

```
GPZ
 │
 S1 (przelotowa)
 │
 S2 (odgałęźna)───B1 (przelotowa)───B2 (końcowa)
 │                └───B3 (końcowa z PV)
 │
 S3 (przelotowa)
 │
 S4 (sekcyjna, 2 szyny + sprzęgło)
 │
 S5 (odgałęźna)───B4 (przelotowa)───B5 (końcowa)
 │                      └───B6 (końcowa, sub-branch)
 │
 S6 (końcowa)
 └──NOP──S1 (ring)
```

Własności:
- 12 stacji o różnych rolach topologicznych
- 15+ segmentów linii/kabla
- 3 odgałęzienia główne + 1 podgałęzienie (branch z branch)
- 1 ring + 1 NOP
- 1 stacja sekcyjna z 2 szynami + sprzęgło
- 1 generator PV na stacji B3
- Różne typy linii (napowietrzna i kablowa)

---

## 10. Invarianty

1. **SLD = f(Snapshot)** — jedyne źródło prawdy
2. **Determinizm** — ten sam Snapshot → identyczne SLD (bit-for-bit)
3. **Brak self-edges** — fromNodeId ≠ toNodeId
4. **Brak PCC** — wyłącznie connection node
5. **Brak fizyki w SLD** — obliczenia w solverach
6. **Overlay nie mutuje geometrii** — wyniki jako nakładka
7. **PV/BESS = GENERATOR** — nigdy LOAD
8. **Magistrala = kabel/linia** — nie szyna zbiorcza
9. **Szyna SN w GPZ** — główna, strokeWidth=8
10. **Szyna SN w stacji** — lokalna rozdzielnica, strokeWidth=5
11. **Ring = łącze wtórne** — przerywana, kanał boczny
12. **NOP = byt eksploatacyjny** — nie brak połączenia
13. **Model ogólny** — nie zbiór szablonów

---

## 11. Zakazy

- Projektowanie SLD pod kilka sztywnych scenariuszy
- Sztywne Y_MAIN / Y_RING / Y_BRANCH (zastąpione dynamicznym TRUNK_STEP_Y)
- Narzucanie jednego typu stacji dla wszystkich przypadków
- Traktowanie NOP jako przerwy geometrycznej
- Mieszanie trunk i branch w logice wizualnej
- Fizyka w rendererze/adapterze/overlayach
- Anglicyzmy w etykietach produktu
