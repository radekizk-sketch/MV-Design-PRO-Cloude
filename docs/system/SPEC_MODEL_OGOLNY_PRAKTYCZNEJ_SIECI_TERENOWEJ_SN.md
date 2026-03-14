# SPECYFIKACJA MODELU OGOLNEGO PRAKTYCZNEJ SIECI TERENOWEJ SN

**Data:** 2026-03-14
**Wersja:** 2.0
**Status:** WIAZACY
**Priorytet:** Nadrzedny nad dokumentami opisowymi SLD
**Autorytet:** Ten dokument jest SOURCE OF TRUTH dla modelu sieci SN w MV-DESIGN-PRO

---

## 1. AKSJOMATY

1. Model obejmuje dowolna praktyczna prawdziwa siec terenowa SN mieszcsaca sie w domenie produktu.
2. Model nie jest zestawem scenariuszy referencyjnych "na sztywno".
3. Kazdy byt renderowany w SLD ma odpowiednik w modelu systemowym.
4. Kazdy byt potrzebny do obliczen ma odpowiednik w modelu systemowym.
5. Topologia i geometria nie moga byc mylone — topologia jest faktem systemowym, geometria jest pochodna.
6. Typologia stacji jest jawna i walidowalna.
7. Snapshot jest jedynym zródlem prawdy — SLD = f(Snapshot).
8. Model jest deterministyczny — ten sam Snapshot -> identyczny wynik (SLD, obliczenia, proof).

---

## 2. ONTOLOGIA BYTÓW

### 2.1 Zródlo zasilania (KLASA A — obiekty rozdzielcze)

| Byt | Opis | Model backend | Model frontend |
|-----|------|---------------|----------------|
| GPZ | Glówny Punkt Zasilajacy — stacja WN/SN | Station(type=GPZ) + Node(type=SLACK) | GpzVisual |
| Sekcja GPZ | Sekcja szyny zbiorczej SN w GPZ | Bus (Node) per sekcja | BusbarSnVisual |
| Pole zasilajace | Pole zasilajace z WN (transformator WN/SN) | Bay(role=SUPPLY) | PoleZasilajaceVisual |
| Pole magistralowe | Pole wyjsciowe na magistrale SN | Bay(role=LINE_OUT) | PoleMagistraloweVisual |
| Pole transformatorowe | Pole z transformatorem SN/nN | Bay(role=TRANSFORMER) | PoleTransformatoweVisual |
| Pole sekcyjne | Pole sprzegla sekcyjnego | Bay(role=COUPLER) | PoleSekcyjneVisual |
| Pole pomiarowe | Pole z przekladnikami CT/VT | Bay(role=MEASUREMENT) | PolePomiaroweVisual |

### 2.2 Siec terenowa (KLASA B — obiekty sieciowe)

| Byt | Opis | Model backend | Model frontend |
|-----|------|---------------|----------------|
| Magistrala glówna | Ciag odcinków od GPZ do konca toru | TrunkPath (ordered segment group) | SldTrunkV1 |
| Odcinek magistrali | Pojedynczy segment linii/kabla na torze glównym | Branch(type=LINE/CABLE) z trunk_id | TrunkSegmentVisual |
| Punkt odgalezienia | Wezel, z którego odchodzi odgalezienie | Node (z junction_flag=true) | BranchJunctionVisual |
| Odgalezienie | Ciag odcinków od punktu odgalezienia | BranchPath (ordered segment group) | BranchSegmentVisual |
| Podgalezienie | Odgalezienie z odgalezienia (rekurencja) | BranchPath z parent_branch_id | BranchSegmentVisual |
| Polaczenie wtórne | Galezie poza drzewem rozpinajacym (ring, rezerwa) | Branch(segment_class=SECONDARY) | SecondarySegmentVisual |
| Lacze pierscieniowe | Polaczenie zamykajace ring | Branch(is_ring_connector=true) | RingConnectorVisual |
| Punkt normalnie otwarty | NOP eksploatacyjny | Switch(is_normally_open=true) na Branch | NopVisual |

### 2.3 Stacje (KLASA C — obiekty stacyjne)

| Byt | Opis | Warunek topologiczny | Model frontend |
|-----|------|---------------------|----------------|
| Stacja przelotowa | Na torze glównym: IN -> szyna -> OUT | 2 trunk edges, 0 branch edges | StationVisual role='przelotowa' |
| Stacja odgalezna | Na odgalezieniu | 0 trunk + >=1 branch edge | StationVisual role='odgalezna' |
| Stacja sekcyjna | 2+ szyny, sprzeglo, potencjalny NOP | 2+ bus sections + coupler | StationVisual role='sekcyjna' |
| Stacja koncowa | Koniec toru: IN, brak OUT | 1 edge, 0 outgoing | StationVisual role='koncowa' |
| Stacja OZE | Z polami generatorowymi (PV, Wind) | + generator bays | StationVisual role='koncowa'+'oze' |
| Stacja BESS | Z magazynem energii | + BESS generator bays | StationVisual role='koncowa'+'bess' |
| Stacja mieszana | Odbiór + OZE/BESS na jednej stacji | transformer + generator bays | StationVisual role zalezy od topologii |

### 2.4 Aparatura i pola (KLASA D — obiekty aparatowe)

| Byt | Rola | Typ urzadzenia | Symbol IEC |
|-----|------|-----------------|------------|
| Wylacznik (CB) | Laczenie/ochrona — przerywanie pradu zwarcia | DeviceType.CB | IEC 60617 |
| Rozlacznik (DS) | Izolacja — rozlaczanie bez obciazenia | DeviceType.DS | IEC 60617 |
| Rozlacznik obciazenia (LS) | Rozlaczanie pod obciazeniem | DeviceType.LS | IEC 60617 |
| Uziemnik (ES) | Bezpieczenstwo — uziemienie | DeviceType.ES | IEC 60617 |
| Przekladnik pradowy (CT) | Pomiar pradu | DeviceType.CT | IEC 60617 |
| Przekladnik napieciowy (VT) | Pomiar napiecia | DeviceType.VT | IEC 60617 |
| Przekaznik (RELAY) | Zabezpieczenie nadpradowe / ziemnozwarciowe | DeviceType.RELAY | IEC 60617 |
| Bezpiecznik (FUSE) | Ochrona | DeviceType.FUSE | IEC 60617 |
| Transformator SN/nN | Przeksztalcenie napiecia | DeviceType.TRANSFORMER | IEC 60617 |
| Generator PV | Zródlo fotowoltaiczne | DeviceType.GENERATOR_PV | IEC + PV |
| Generator BESS | Magazyn energii | DeviceType.GENERATOR_BESS | IEC + BESS |
| Generator Wind | Turbina wiatrowa | DeviceType.GENERATOR_WIND | IEC + WIND |

### 2.5 Polaczenia specjalne

| Byt | Opis | Model | Geometria |
|-----|------|-------|-----------|
| NOP (Normally Open Point) | Punkt normalnie otwarty — laczy dwa konce sieci | Switch(is_normally_open=true) | Na laczu pierscieniowym, jawny symbol |
| Polaczenie rezerwowe | Ring lub backup zasilanie z innego GPZ | Branch(segment_class=SECONDARY) | Kanal wtórny, linia przerywana |
| Sprzeglo sekcyjne | Lacznik miedzy sekcjami szyny w stacji | Switch(type=BUS_COUPLER) w Bay(role=COUPLER) | Wewnatrz stacji sekcyjnej |

---

## 3. RELACJE TOPOLOGICZNE

### 3.1 Hierarchia ogólna

```
GPZ (SLACK)
  +-- Sekcja szyny SN (Bus)
       +-- Pole magistralowe (Bay, role=LINE_OUT) -> Magistrala glówna
       |    +-- Odcinek 1 (Branch, LINE/CABLE)
       |    +-- Stacja przelotowa (Station, kind=INLINE)
       |    |    +-- Bay(LINE_IN) -> szyna stacji -> Bay(LINE_OUT)
       |    |    +-- Bay(TRANSFORMER) -> TR SN/nN -> szyna nN -> Odbiór
       |    |    +-- Bay(BRANCH) -> Odgalezienie
       |    |         +-- Odcinek (Branch) -> Stacja odgalezna
       |    |              +-- Bay(TRANSFORMER) -> TR -> Odbiór
       |    |              +-- Bay(PV) -> Generator PV
       |    +-- Odcinek 2 (Branch) -> Punkt odgalezienia (Node, junction)
       |    |    +-- Odgalezienie (BranchPath) -> Stacja OZE
       |    +-- Odcinek 3 (Branch) -> Stacja sekcyjna (2 szyny + sprzeglo)
       |    |    +-- NOP -> Ring do drugiej sekcji GPZ
       |    +-- Odcinek N -> Stacja koncowa (IN, brak OUT)
       +-- Pole magistralowe (Bay) -> Magistrala 2 ...
```

### 3.2 Relacja: Zródlo -> Pole -> Magistrala

```
GPZ.slack_node -> GPZ.bus_sn -> Bay(LINE_OUT, CB+DS+CT) -> Branch(trunk_segment_1) -> ...
```

Kazda magistrala zaczyna sie od pola liniowego na szynie GPZ. Pole ma CB, DS, CT. Galaz wychodzaca z pola jest pierwszym segmentem magistrali.

### 3.3 Relacja: Magistrala -> Stacja przelotowa

```
... -> Branch(seg_N) -> [Bay(LINE_IN, CB+DS)] -> Station.bus_sn -> [Bay(LINE_OUT, CB+DS)] -> Branch(seg_N+1) -> ...
```

Magistrala WCHODZI do stacji przez pole LINE_IN i WYCHODZI przez pole LINE_OUT. Stacja NIE jest "obok" magistrali — jest NA magistrali. Tor glówny przechodzi PRZEZ stacje.

**KONTRAKT NIENARUSZALNY:** Stacja przelotowa (INLINE) MUSI miec:
- pole LINE_IN z wylacznikiem
- szyne stacji SN
- pole LINE_OUT z wylacznikiem
- magistrala wchodzi góra, wychodzi dol

### 3.4 Relacja: Magistrala -> Punkt odgalezienia -> Odgalezienie

```
... -> Branch(seg_N) -> [Node(junction, degree>=3)] -> Branch(seg_N+1) ...
                                |
                                +-> Branch(branch_seg_1) -> Station(odgalezna) -> ...
```

Punkt odgalezienia to wezel, z którego oprócz kontynuacji magistrali, odchodzi dodatkowa galaz (branch). Junction node ma >=3 incydentne krawedzie.

### 3.5 Relacja: Stacja sekcyjna

```
Station {
  bus_section_A -> [Bay(LINE_IN)] <- magistrala_1
  bus_section_B -> [Bay(LINE_IN)] <- magistrala_2 / rezerwa
  [Bay(COUPLER)] -> Switch(coupler) laczy A<->B
  NOP = Switch(is_normally_open=true) na jednym z zasilan
}
```

### 3.6 Relacja: Ring / NOP

```
GPZ.pole_1 -> magistrala_1 -> ... -> st_koncowa_A
                                         |
                                        NOP (normalnie otwarty)
                                         |
GPZ.pole_2 -> magistrala_2 -> ... -> st_koncowa_B
```

Ring zamyka sie przez NOP. W normalnej pracy NOP jest otwarty, siec jest promieniowa. Zamkniecie NOP tworzy petle — wymaga nowego Snapshot.

---

## 4. KONTRAKTY DANYCH (TypeScript)

### 4.1 Kontrakt magistrali glównej

```typescript
/**
 * MainTrunkContract — kontrakt magistrali glównej SN.
 *
 * Magistrala to uporzadkowany ciag odcinków od pola GPZ do stacji koncowej.
 * Kazdy odcinek to Branch typu LINE lub CABLE.
 * Na magistrali leza stacje przelotowe (INLINE).
 * Z magistrali moga odchodzic odgalezienia (z punktów junction).
 */
export interface MainTrunkContract {
  /** Stabilne ID magistrali */
  readonly id: string;
  /** ID pola GPZ, z którego wychodzi magistrala */
  readonly sourceFieldId: string;
  /** ID wezla podlaczenia na szynie GPZ */
  readonly sourceConnectionNodeId: string;
  /** Uporzadkowana lista ID odcinków (segmentów) magistrali */
  readonly orderedSegmentIds: readonly string[];
  /** ID punktów odgalezienia na magistrali */
  readonly branchPointIds: readonly string[];
  /** ID stacji przelotowych na magistrali (w kolejnosci topologicznej) */
  readonly inlineStationIds: readonly string[];
  /** ID stacji odgaleznych podlaczonych do magistrali */
  readonly branchStationIds: readonly string[];
  /** ID wezla koncowego (null = magistrala otwarta / ring) */
  readonly terminalNodeId: string | null;
  /** ID polaczenia pierscieniowego (null = brak ring) */
  readonly ringConnectionId: string | null;
}
```

### 4.2 Kontrakt odgalezienia

```typescript
/**
 * BranchPathContract — kontrakt odgalezienia od magistrali.
 *
 * Odgalezienie zaczyna sie w punkcie junction na magistrali (lub na innym odgalezieniu).
 * Ciag odcinków prowadzi do stacji odgaleznych.
 */
export interface BranchPathContract {
  /** Stabilne ID odgalezienia */
  readonly id: string;
  /** ID magistrali nadrzednej (lub odgalezienia nadrzednego) */
  readonly parentPathId: string;
  /** ID wezla junction, z którego odchodzi odgalezienie */
  readonly junctionNodeId: string;
  /** Uporzadkowana lista ID odcinków odgalezienia */
  readonly orderedSegmentIds: readonly string[];
  /** ID stacji na odgalezieniu (w kolejnosci topologicznej) */
  readonly stationIds: readonly string[];
  /** ID podgalezien (branch z branch) */
  readonly subBranchIds: readonly string[];
  /** Glebokosc zagniezdzenia (0 = z magistrali, 1 = z odgalezienia, ...) */
  readonly nestingDepth: number;
}
```

### 4.3 Kontrakt stacji przelotowej

```typescript
/**
 * InlineStationContract — stacja przelotowa.
 *
 * KONTRAKT NIENARUSZALNY:
 * - Lezy NA torze glównym (magistrali)
 * - Ma pole LINE_IN (wejscie magistrali)
 * - Ma pole LINE_OUT (wyjscie magistrali)
 * - Magistrala przechodzi PRZEZ stacje (nie obok)
 * - Transformator i odgalezienie to pola BOCZNE
 * - Brak obejscia równoleglego
 */
export interface InlineStationContract {
  /** ID stacji */
  readonly id: string;
  /** Nazwa stacji */
  readonly name: string;
  /** Jawny typ stacji */
  readonly stationKind: 'stacja_przelotowa';
  /** ID magistrali, na której lezy stacja */
  readonly trunkId: string;
  /** ID odcinka magistrali wchodzacego do stacji */
  readonly incomingMainSegmentId: string;
  /** ID odcinka magistrali wychodzacego ze stacji */
  readonly outgoingMainSegmentId: string;
  /** Pole liniowe wejsciowe (obowiazkowe) */
  readonly incomingBay: BayContract;
  /** Pole liniowe wyjsciowe (obowiazkowe) */
  readonly outgoingBay: BayContract;
  /** Pola transformatorowe (0+) */
  readonly transformerBays: readonly BayContract[];
  /** Pola odgalezieniowe (0+) */
  readonly branchBays: readonly BayContract[];
  /** Pola OZE/BESS (0+) */
  readonly generatorBays: readonly BayContract[];
  /** Kontrakt topologiczny: magistrala przechodzi PRZEZ stacje */
  readonly topologyContract: 'main_path_mandatory';
}
```

### 4.4 Kontrakt stacji odgaleznej

```typescript
/**
 * BranchStationContract — stacja odgalezna.
 *
 * KONTRAKT:
 * - Lezy na odgalezieniu (NIE na torze glównym)
 * - Ma pole LINE_IN (wejscie z odgalezienia)
 * - Moze miec pole LINE_OUT (dalsze odgalezienie) lub nie (stacja koncowa na galezieniu)
 * - NIE MA toru glównego przechodzacego przez stacje
 */
export interface BranchStationContract {
  readonly id: string;
  readonly name: string;
  readonly stationKind: 'stacja_odgalezna';
  /** ID odgalezienia, na którym lezy stacja */
  readonly branchPathId: string;
  /** Pole liniowe wejsciowe z odgalezienia */
  readonly incomingBay: BayContract;
  /** Pole liniowe wyjsciowe (opcjonalne — dalsze odgalezienie) */
  readonly outgoingBay: BayContract | null;
  readonly transformerBays: readonly BayContract[];
  readonly generatorBays: readonly BayContract[];
  /** Kontrakt topologiczny: BRAK toru glównego */
  readonly topologyContract: 'no_main_through';
}
```

### 4.5 Kontrakt stacji sekcyjnej

```typescript
/**
 * SectionalStationContract — stacja sekcyjna.
 *
 * KONTRAKT:
 * - Ma >=2 sekcje szyny
 * - Ma pole sprzegla (tie bay) laczace sekcje
 * - Moze miec NOP na jednym z zasilan
 * - Kazda sekcja moze miec wlasne pola liniowe, transformatorowe, OZE
 */
export interface SectionalStationContract {
  readonly id: string;
  readonly name: string;
  readonly stationKind: 'stacja_sekcyjna';
  /** Sekcja A szyny */
  readonly sectionA: BusSectionContract;
  /** Sekcja B szyny */
  readonly sectionB: BusSectionContract;
  /** Pole sprzegla (tie bay) */
  readonly tieBay: BayContract;
  /** ID punktu normalnie otwartego (null = brak NOP) */
  readonly normallyOpenPointId: string | null;
  /** Pola wejsciowe z rezerwy */
  readonly reserveIncomingBays: readonly BayContract[];
  /** Kontrakt topologiczny: dwie sekcje + sprzeglo */
  readonly topologyContract: 'two_sections_with_tie';
}

export interface BusSectionContract {
  /** ID sekcji */
  readonly id: string;
  /** ID wezla szyny (Bus) */
  readonly busNodeId: string;
  /** Pola liniowe na sekcji */
  readonly lineBays: readonly BayContract[];
  /** Pola transformatorowe na sekcji */
  readonly transformerBays: readonly BayContract[];
  /** Pola OZE na sekcji */
  readonly generatorBays: readonly BayContract[];
}
```

### 4.6 Kontrakt stacji koncowej

```typescript
/**
 * TerminalStationContract — stacja koncowa.
 *
 * KONTRAKT:
 * - Ma pole LINE_IN (wejscie)
 * - NIE MA pola LINE_OUT na tor glówny
 * - Koniec toru (magistrali lub odgalezienia)
 */
export interface TerminalStationContract {
  readonly id: string;
  readonly name: string;
  readonly stationKind: 'stacja_koncowa';
  /** Pole wejsciowe (obowiazkowe) */
  readonly incomingBay: BayContract;
  /** Brak wyjscia — koniec toru */
  readonly outgoingBay: null;
  readonly transformerBays: readonly BayContract[];
  readonly generatorBays: readonly BayContract[];
  /** Kontrakt topologiczny: brak wyjscia na tor glówny */
  readonly topologyContract: 'no_outgoing_main';
}
```

### 4.7 Kontrakt pola (Bay)

```typescript
/**
 * BayContract — kontrakt pola w stacji.
 *
 * Pole jest jednostka organizacyjna w stacji. Kazde pole:
 * - Jest podlaczone do sekcji szyny
 * - Ma role (LINE_IN, LINE_OUT, TRANSFORMER, BRANCH, COUPLER, OZE, ...)
 * - Zawiera urzadzenia (CB, DS, CT, RELAY, ES, FUSE)
 * - Moze byc podlaczone do galezi lub generatora
 */
export interface BayContract {
  /** ID pola */
  readonly id: string;
  /** ID stacji nadrzednej */
  readonly stationId: string;
  /** ID sekcji szyny, do której pole jest podlaczone */
  readonly busSectionId: string;
  /** Rola pola */
  readonly bayRole: BayRole;
  /** Urzadzenia w polu (uporzadkowane: DS -> CB -> CT -> RELAY) */
  readonly devices: readonly DeviceContract[];
  /** ID galezi podlaczonej do pola (null = brak) */
  readonly connectedBranchId: string | null;
  /** ID generatora podlaczonego (null = brak) */
  readonly connectedGeneratorId: string | null;
  /** ID transformatora podlaczonego (null = brak) */
  readonly connectedTransformerId: string | null;
  /** Etykieta pola */
  readonly label: string;
  /** Referencja katalogowa (null = brak) */
  readonly catalogRef: string | null;
}

export type BayRole =
  | 'LINE_IN'
  | 'LINE_OUT'
  | 'TRANSFORMER'
  | 'BRANCH'
  | 'COUPLER'
  | 'PV'
  | 'BESS'
  | 'WIND'
  | 'MEASUREMENT'
  | 'SUPPLY';

export interface DeviceContract {
  readonly id: string;
  readonly deviceType: DeviceType;
  readonly state: 'OPEN' | 'CLOSED' | null;
  readonly ratedCurrent_A: number | null;
  readonly label: string;
  readonly catalogRef: string | null;
}

export type DeviceType =
  | 'CB'    // Circuit Breaker
  | 'DS'    // Disconnector
  | 'LS'    // Load Switch
  | 'ES'    // Earthing Switch
  | 'CT'    // Current Transformer
  | 'VT'    // Voltage Transformer
  | 'RELAY' // Protection Relay
  | 'FUSE'; // Fuse
```

### 4.8 Kontrakt polaczenia rezerwowego

```typescript
/**
 * ReserveLinkContract — polaczenie rezerwowe / ring.
 */
export interface ReserveLinkContract {
  readonly id: string;
  /** ID galezi (Branch) stanowiacej polaczenie */
  readonly branchId: string;
  /** ID wezla A (koniec pierwszej magistrali/sekcji) */
  readonly nodeA_Id: string;
  /** ID wezla B (koniec drugiej magistrali/sekcji) */
  readonly nodeB_Id: string;
  /** Czy polaczenie jest normalnie otwarte (NOP) */
  readonly isNormallyOpen: boolean;
  /** ID przelacznika NOP (null = brak) */
  readonly nopSwitchId: string | null;
  /** Typ polaczenia */
  readonly linkType: 'RING' | 'RESERVE_FEED' | 'TIE';
}
```

---

## 5. KONTRAKTY WALIDACYJNE

### 5.1 Kiedy stacja jest przelotowa

```
WARUNKI:
  - incidentTrunkEdges == 2
  - incidentBranchEdges == 0 (odgalezienia sa polami bocznymi, nie krawedzami trunk)
  - pole LINE_IN istnieje (obowiazkowe)
  - pole LINE_OUT istnieje (obowiazkowe)
  - incomingMainSegmentId != outgoingMainSegmentId
  - magistrala przechodzi PRZEZ stacje (nie obok)

ZAKAZ:
  - Stacja przelotowa NIE MOZE miec obejscia równoleglego
  - Magistrala NIE MOZE istniec jednoczesnie "za stacja" i "przez stacje"
  - Pole OUT MUSI tworzyc dalszy ciag magistrali
```

### 5.2 Kiedy stacja jest odgalezna

```
WARUNKI:
  - incidentTrunkEdges == 0
  - incidentBranchEdges >= 1
  - pole LINE_IN istnieje
  - stacja NIE lezy na torze glównym

ZAKAZ:
  - Stacja odgalezna NIE MOZE udawac stacji przelotowej
  - Stacja odgalezna NIE MOZE miec pola LINE_OUT na magistrale
```

### 5.3 Kiedy stacja jest sekcyjna

```
WARUNKI:
  - busSections >= 2
  - pole COUPLER istnieje (sprzeglo)
  - LUB: jawny coupler device na BUS_LINK
  - Kazda sekcja ma wlasne pola

OPCJONALNE:
  - NOP na jednym z zasilan
  - Polaczenie rezerwowe z innej magistrali
```

### 5.4 Kiedy stacja jest koncowa

```
WARUNKI:
  - incidentActiveEdges == 1 (tylko wejscie)
  - pole LINE_IN istnieje
  - pole LINE_OUT nie istnieje
  - Brak kontynuacji toru

WARIANTY:
  - Koncowa na magistrali (terminator trunk)
  - Koncowa na odgalezieniu (terminator branch)
  - Koncowa z OZE (terminal + generator bays)
```

### 5.5 Kiedy NOP jest wymagany

```
WARUNKI:
  - Stacja sekcyjna z dwoma zasilaniami z róznych magistrali
  - Ring zamkniety wymagajacy punktu normalnie otwartego
  - NOP laczy dwa konce sieci (nie moze byc "w srodku" magistrali)

ZAKAZ:
  - NOP NIE MOZE byc w srodku magistrali (to bylby blad topologiczny)
  - NOP NIE MOZE laczyc dwóch punktów na tej samej magistrali (petla wewnetrzna)
```

### 5.6 Kiedy polaczenie rezerwowe jest logicznie poprawne

```
WARUNKI:
  - Laczy dwa punkty sieci nalezace do róznych magistrali LUB róznych sekcji GPZ
  - Ma stan normalnie otwarty
  - Nie tworzy petli wewnatrz jednej magistrali

TYPY:
  - RING — zamkniecie pierscienia miedzy koncami dwóch magistrali
  - RESERVE_FEED — zasilanie awaryjne z innego GPZ
  - TIE — polaczenie sekcyjne wewnatrz stacji
```

---

## 6. KONTRAKTY OBLICZENIOWE

### 6.1 Co z modelu jest wymagane do obliczen

```
WYMAGANE:
  - Wszystkie Node (Bus) z parametrami: type (SLACK/PQ/PV), voltage_level, P, Q, V, theta
  - Wszystkie Branch: LineBranch (R, X, B, length), TransformerBranch (Sn, uk%, pk)
  - Wszystkie Switch: state (OPEN/CLOSED) -> topologia
  - InverterSource: P, Q, connection node
  - Generator: P, Q, gen_type, connection variant
  - Load: P, Q, model (PQ/ZIP)
  - StationType -> NIE wymagane (obliczenia nie zaleza od typu stacji)

NIE WYMAGANE DO OBLICZEN (ale wymagane do SLD):
  - Bay (pole) — to informacja organizacyjna
  - TrunkSegment — to segmentacja wizualna
  - BranchPoint — to byt topologiczny dla segmentacji
  - StationKind — to klasyfikacja wizualna
```

### 6.2 Jak nie dopuscic do rozjazdu model SLD <-> model obliczeniowy

```
REGULA 1: Oba modele wynikaja z TEGO SAMEGO Snapshot.
  - SLD buduje VisualGraph z Snapshot via TopologyInputReader
  - Solver buduje Y-bus z Snapshot via solver_input
  - OBIE sciezki czytaja ten sam Snapshot (identyczny fingerprint)
  - ZAKAZ: SLD nie moze dodawac/usuwac elementów, których nie ma w Snapshot

REGULA 2: Stany przelaczników sa identyczne.
  - SLD czyta switch_normal_states z Snapshot
  - Solver czyta te same stany
  - Zmiana stanu = nowy Snapshot = invalidacja wyników

REGULA 3: Topologia do obliczen i topologia do renderu musza byc spójne.
  - Solver widzi galaz X jak aktywna -> SLD renderuje galaz X
  - Solver widzi przelacznik Y jak otwarty -> SLD renderuje Y jako otwarty
  - Brak rozbieznosci
```

---

## 7. KONTRAKTY RENDERUJACE

### 7.1 Co musi byc jawnie dostarczone do SLD

```
WYMAGANE (z adaptera, NIE z rendererow):
  - Typ stacji (przelotowa/odgalezna/sekcyjna/koncowa)
  - Lista pól per stacja z rolami
  - Segmentacja magistrali (trunk/branch/secondary)
  - Punkty odgalezienia (junction nodes)
  - Stan aparatury (OPEN/CLOSED)
  - Typy generatorów (PV/BESS/Wind) — z domeny, nie z nazwy
  - NOP (normally open points) — jawne byty
  - Lacza pierscieniowe — jawne polaczenia
```

### 7.2 Czego NIE WOLNO zgadywac w rendererach

```
ZAKAZ:
  - Typ stacji z nazwy (heurystyka stringowa)
  - Typ generatora z nazwy
  - Segmentacja magistrali (musi przyjsc z adaptera)
  - Rola pola (musi przyjsc z adaptera)
  - Pozycja aparatu w polu (musi wynikac z kontraktu)
  - Czy stacja jest na torze glównym (musi byc jawne z modelu)
  - Strona odgalezienia (musi wynikac z determinizmu, nie z przypadku)
```

---

## 8. ZWIAZEK Z SNAPSHOT

### 8.1 Co Snapshot MUSI zawierac

```
OBOWIAZKOWE:
  - nodes (z typami SLACK/PQ/PV i parametrami)
  - branches (LINE/CABLE/TRANSFORMER z parametrami)
  - switches (z typem i stanem)
  - inverter_sources (z moca i wezlem)
  - stations (z typem, bus_ids, bay_ids) <- NOWE
  - fingerprint (SHA-256)

OPCJONALNE (dostarczane przez ENM / segmentacje):
  - trunk_segmentation (trunk/branch/secondary groups)
  - logical_views (trunks/branches/rings z ordered stations)
  - station_topology_kinds (jawne typy topologiczne stacji)
```

### 8.2 Co Snapshot NIE MOZE zawierac

```
ZABRONIONE:
  - Geometria SLD (pozycje x/y)
  - Wyniki obliczen
  - Stany case'ów (study case)
  - BoundaryNode (interpretacja, nie model)
  - PCC (zabroniony termin w modelu)
```

---

## 9. PRZYKLAD — SIEC REFERENCJJNA 12-STACYJNA ("terrain")

```json
{
  "snapshotId": "snap_terrain_001",
  "trunks": [{
    "id": "trunk_01",
    "sourceFieldId": "gpz_field_L1",
    "sourceConnectionNodeId": "gpz_bus_sn_1",
    "orderedSegmentIds": ["seg_01", "seg_02", "seg_03", "seg_04", "seg_05", "seg_06"],
    "branchPointIds": ["bp_s2", "bp_s5"],
    "inlineStationIds": ["S1", "S2", "S3", "S4", "S5"],
    "branchStationIds": ["B1", "B2", "B3", "B4", "B5", "B6"],
    "terminalNodeId": "S6_bus",
    "ringConnectionId": "ring_01"
  }],
  "inlineStations": [
    {
      "id": "S1",
      "name": "Stacja S1",
      "stationKind": "stacja_przelotowa",
      "trunkId": "trunk_01",
      "incomingMainSegmentId": "seg_01",
      "outgoingMainSegmentId": "seg_02",
      "incomingBay": {"id": "bay_S1_in", "bayRole": "LINE_IN", "breakerId": "cb_S1_01"},
      "outgoingBay": {"id": "bay_S1_out", "bayRole": "LINE_OUT", "breakerId": "cb_S1_02"},
      "transformerBays": [
        {"id": "bay_S1_tr", "bayRole": "TRANSFORMER", "breakerId": "cb_S1_03"}
      ],
      "branchBays": [],
      "generatorBays": [],
      "topologyContract": "main_path_mandatory"
    }
  ],
  "branchStations": [
    {
      "id": "B1",
      "name": "Stacja B1",
      "stationKind": "stacja_odgalezna",
      "branchPathId": "branch_s2_01",
      "incomingBay": {"id": "bay_B1_in", "bayRole": "LINE_IN", "breakerId": "cb_B1_01"},
      "outgoingBay": {"id": "bay_B1_out", "bayRole": "LINE_OUT", "breakerId": "cb_B1_02"},
      "transformerBays": [{"id": "bay_B1_tr", "bayRole": "TRANSFORMER"}],
      "generatorBays": [],
      "topologyContract": "no_main_through"
    },
    {
      "id": "B3",
      "name": "Stacja B3 — PV",
      "stationKind": "stacja_odgalezna",
      "branchPathId": "branch_s2_02",
      "incomingBay": {"id": "bay_B3_in", "bayRole": "LINE_IN", "breakerId": "cb_B3_01"},
      "outgoingBay": null,
      "transformerBays": [{"id": "bay_B3_tr", "bayRole": "TRANSFORMER"}],
      "generatorBays": [{"id": "bay_B3_pv", "bayRole": "PV"}],
      "topologyContract": "no_main_through"
    }
  ],
  "sectionalStations": [
    {
      "id": "S4",
      "name": "Stacja S4 — sekcyjna",
      "stationKind": "stacja_sekcyjna",
      "sectionA": {
        "id": "sec_A",
        "busNodeId": "S4_bus_A",
        "lineBays": [{"id": "bay_S4_in_A", "bayRole": "LINE_IN"}],
        "transformerBays": [{"id": "bay_S4_tr_A", "bayRole": "TRANSFORMER"}],
        "generatorBays": []
      },
      "sectionB": {
        "id": "sec_B",
        "busNodeId": "S4_bus_B",
        "lineBays": [{"id": "bay_S4_in_B", "bayRole": "LINE_IN"}],
        "transformerBays": [{"id": "bay_S4_tr_B", "bayRole": "TRANSFORMER"}],
        "generatorBays": []
      },
      "tieBay": {"id": "bay_S4_tie", "bayRole": "COUPLER"},
      "normallyOpenPointId": "nop_S4",
      "reserveIncomingBays": [],
      "topologyContract": "two_sections_with_tie"
    }
  ],
  "terminalStations": [
    {
      "id": "S6",
      "name": "Stacja S6 — koncowa",
      "stationKind": "stacja_koncowa",
      "incomingBay": {"id": "bay_S6_in", "bayRole": "LINE_IN", "breakerId": "cb_S6_01"},
      "outgoingBay": null,
      "transformerBays": [{"id": "bay_S6_tr", "bayRole": "TRANSFORMER"}],
      "generatorBays": [],
      "topologyContract": "no_outgoing_main"
    }
  ],
  "reserveLinks": [
    {
      "id": "ring_01",
      "branchId": "branch_ring_01",
      "nodeA_Id": "S6_bus",
      "nodeB_Id": "S1_bus",
      "isNormallyOpen": true,
      "nopSwitchId": "nop_ring_01",
      "linkType": "RING"
    }
  ]
}
```

---

## 10. PRZYKLAD GRAFICZNY — TOPOLOGIA WZORCOWA

```
                        GPZ (110/15 kV)
                        ================
                        SZYNA SN 15 kV
                        ================
                          |
                          | (seg_01, kabel XRUHAKXS 3x240)
                          |
                  ========+========
                  | S1 przelotowa |
                  | IN  | szyna | OUT|
                  | TR1 |       |   |
                  ========+========
                          |
                          | (seg_02)
                          |
            +-------------+----------+
            |                        |
    (branch_s2_01)                   |
            |                        |
     +------+------+                 |
     | B1 odgalezna |                |
     | IN  | TR    |                |
     +------+------+                 |
            |                        |
     +------+------+                 |
     | B2 koncowa   |                |
     | IN  | TR    |                |
     +------+------+      +---------+--------+
                           | S3 przelotowa    |
     +------+------+      | IN | szyna | OUT |
     | B3 PV       |      | TR |       |    |
     | IN  | TR | PV|      +---------+--------+
     +------+------+                 |
                                     | (seg_04)
                                     |
                           +---------+---------+
                           | S4 sekcyjna        |
                           | sec_A  | sprzeglo | sec_B |
                           | TR_A   |   TIE    | TR_B  |
                           +---------+---------+
                                     |
                                     | (seg_05)
                                     |
            +------------------------+
            |                        |
    (branch_s5_01)                   |
            |                        |
     +------+------+                 |
     | B4 odgalezna |                |
     | IN | OUT    |                |
     +------+------+                 |
            |                        |
     +------+------+      +---------+--------+
     | B5 koncowa   |      | S6 koncowa       |
     | IN  | TR    |      | IN  | TR         |
     +------+------+      +---------+--------+
            |                        |
     +------+------+                NOP
     | B6 sub-branch|               |
     | (koncowa)    |        (ring do S1)
     +------+------+
```

---

## 11. WALIDACJA MODELU OGOLNEGO

### 11.1 Walidacja spójnosci topologicznej

```
REGULY:
  R1: Kazda magistrala zaczyna sie od pola GPZ
  R2: Kazda stacja przelotowa na magistrali ma pole IN i pole OUT
  R3: Punkt odgalezienia ma >=3 incydentne krawedzie aktywne
  R4: NOP laczy dwa punkty z róznych magistrali (nie wewnatrz jednej)
  R5: Stacja sekcyjna ma >=2 sekcje szyny
  R6: Stacja koncowa ma pole IN, brak pola OUT na tor glówny
  R7: Kazda stacja ma >=1 pole
  R8: Kazde pole ma >=1 urzadzenie (minimum CB lub LS)
  R9: Odgalezienie zaczyna sie od junction node z degree >= 3
  R10: Brak cykli w drzewie rozpinajacym (trunk + branch = spanning tree)
```

### 11.2 Walidacja kontraktów obliczeniowych

```
REGULY:
  C1: Kazdy Node w grafie ma zdefiniowany typ (SLACK/PQ/PV)
  C2: Dokladnie 1 SLACK w sieci (lub 1 per island)
  C3: Kazdy Branch ma from_node_id != to_node_id
  C4: Kazdy Branch(LINE/CABLE) ma R+X > 0 lub impedance_override
  C5: Kazdy TransformerBranch ma Sn > 0, uk% > 0
  C6: Kazdy generator ma P >= 0 (lub P < 0 dla BESS rozladowanie)
  C7: Kazdy load ma P > 0
```

---

## 12. TYPY SIECI TERENOWYCH W DOMENIE

System MUSI obslugiwac nastepujace typy praktycznych sieci terenowych SN:

| Typ sieci | Opis | Przyklad |
|-----------|------|---------|
| Promieniowa prosta | GPZ -> N stacji liniowych -> koncowa | Siec wiejska jednoliniowa |
| Promieniowa z odgalezieniami | GPZ -> magistrala + odgalezienia T | Siec wiejska z bocznicami |
| Pierscieniowa (ring) | GPZ -> 2 magistrale zamkniete NOP | Siec miejska pierscien |
| Wielomagistralowa | GPZ -> N magistral niezaleznych | Duzy GPZ wiejski |
| Z podgalezieniami | Odgalezienie z odgalezienia (rekurencja) | Zlozony teren wiejski |
| Z OZE | PV/BESS/Wind na stacjach | Siec z energia odnawialna |
| Sekcyjna | Stacje z 2+ szynami i sprzeglem | Wezly sekcjonowania |
| Mieszana | Wszystkie powyzsze razem | Siec realna powiatu |
| Z zasilaniem rezerwowym | 2 GPZ lub 2 sekcje z rezerwa | Siec z redundancja |
