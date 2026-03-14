# KANONICZNE TYPY STACJI SN — SPECYFIKACJA

**Data:** 2026-03-14
**Wersja:** 1.0
**Status:** WIAZACY
**Autorytet:** Nadrzedny nad rozproszonymi opisami stacji w kodzie

---

## 1. CEL

Zdefiniowac kanoniczny zestaw typów stacji SN z odrębna semantyka, topologia, geometria, kontraktami danych i regułami walidacji. Kazdy typ stacji jest jawny i walidowalny — nie jest inferowany ad hoc w rendererze.

---

## 2. TYPY STACJI

### 2.1 STACJA PRZELOTOWA (INLINE / TRUNK_INLINE)

**Definicja fizyczna:**
Stacja SN, przez która przechodzi magistrala glówna. Zasilanie wchodzi polem LINE_IN z góry (od strony GPZ), przechodzi przez szyne stacji SN, i wychodzi polem LINE_OUT w dól (dalszy ciag magistrali). Transformatory SN/nN i odgalezienia to pola boczne.

**Definicja topologiczna:**
```
WARUNKI:
  - Lezy na spanning tree trunk path
  - incidentTrunkEdges == 2 (incoming + outgoing)
  - incidentBranchEdges == 0 (odgalezienia to pola boczne)
  - busSections == 1 (jedna szyna)
  - incomingSegmentId != outgoingSegmentId
```

**Definicja obliczeniowa:**
Stacja jest zbiorem wezlów (szyna SN, szyna nN) i galezi (transformator, linia). Typ stacji NIE wplywa na obliczenia — to informacja organizacyjna.

**Kontrakt danych:**
```typescript
interface InlineStationContract {
  id: string;
  name: string;
  stationKind: 'stacja_przelotowa';
  trunkId: string;
  incomingMainSegmentId: string;
  outgoingMainSegmentId: string;
  incomingBay: BayContract;       // OBOWIAZKOWE
  outgoingBay: BayContract;       // OBOWIAZKOWE
  transformerBays: BayContract[]; // 0+
  branchBays: BayContract[];      // 0+
  generatorBays: BayContract[];   // 0+
  busSection: BusSectionContract;
  topologyContract: 'main_path_mandatory';
}
```

**Kontrakt wejsc/wyjsc:**
```
WEJSCIA:
  - 1x LINE_IN (obowiazkowe) — z segmentu magistrali
WYJSCIA:
  - 1x LINE_OUT (obowiazkowe) — na nastepny segment magistrali
  - 0+ BRANCH (opcjonalne) — na odgalezienie
  - 0+ TRANSFORMER (opcjonalne) — na transformator SN/nN
  - 0+ GENERATOR (opcjonalne) — na OZE/BESS
```

**Kontrakt pól:**
```
POLA OBOWIAZKOWE:
  - LINE_IN: DS_IN -> CB_IN -> CT -> szyna stacji
  - LINE_OUT: szyna stacji -> CB_OUT -> DS_OUT
POLA OPCJONALNE:
  - TRANSFORMER: szyna -> CB_TR -> TR SN/nN -> szyna nN
  - BRANCH: szyna -> CB_BR -> linia odgalezienia
  - GENERATOR: szyna -> CB_GEN -> generator (PV/BESS/Wind)
```

**Geometria minimalna:**
```
          |
    [LINIA IN]
          |
    =SZYNA STACJI=
    |     |      |
    TR   OUT   (branch)
    |     |
    T     |
          |
   dalsza magistrala
```

**Geometria rozszerzona (z odgalezieniem i OZE):**
```
          |
    [LINIA IN]
          |
    ====SZYNA STACJI====
    |     |      |     |
    TR   OUT   BRANCH  PV
    |     |      |     |
    T     |      |    gen
          |   stacja
   dalsza magistrala
```

**Reguly etykietowania:**
- Nazwa stacji: nad szyna, centrycznie
- Parametry linii: obok segmentu magistrali
- Parametry transformatora: obok symbolu TR

**Reguly pozycji aparatów:**
- DS, CB, CT uporzadkowane pionowo od szyny w dól/góre
- Aparat najblizej szyny = CB
- Aparat najdalej od szyny = DS

**Przyklad poprawny:**
```
S1 (przelotowa): IN z seg_01, szyna, OUT na seg_02, TR boczne, branch na B1
```

**Przyklad bledny:**
```
S1 (przelotowa): stacja obok magistrali (magistrala idzie prosto, stacja doklejona z boku)
S1 (przelotowa): OUT nie kontynuuje magistrali (OUT zawisa w powietrzu)
S1 (przelotowa): IN i OUT na tym samym segmencie (petla)
```

---

### 2.2 STACJA ODGALEZNA (BRANCH / TRUNK_BRANCH)

**Definicja fizyczna:**
Stacja SN lezaca na odgalezieniu od magistrali glównej. Nie jest czescia toru glównego. Zasilanie przychodzi z odgalezienia.

**Definicja topologiczna:**
```
WARUNKI:
  - NIE lezy na trunk path
  - incidentTrunkEdges == 0
  - incidentBranchEdges >= 1
  - busSections == 1
```

**Kontrakt danych:**
```typescript
interface BranchStationContract {
  id: string;
  name: string;
  stationKind: 'stacja_odgalezna';
  branchPathId: string;
  incomingBay: BayContract;        // OBOWIAZKOWE
  outgoingBay: BayContract | null; // opcjonalne — dalsze odgalezienie
  transformerBays: BayContract[];
  generatorBays: BayContract[];
  busSection: BusSectionContract;
  topologyContract: 'no_main_through';
}
```

**Kontrakt wejsc/wyjsc:**
```
WEJSCIA:
  - 1x LINE_IN (obowiazkowe) — z segmentu odgalezienia
WYJSCIA:
  - 0-1x LINE_OUT (opcjonalne) — dalsze odgalezienie / podgalezienie
  - 0+ TRANSFORMER — na TR SN/nN
  - 0+ GENERATOR — na OZE/BESS
```

**Geometria:**
```
    --- (z magistrali, L-shape)
        |
    [LINIA IN]
        |
    =SZYNA=
    |    |
    TR  (OUT opcj.)
    |    |
    T   dalsze
```

**Przyklad poprawny:**
```
B1 (odgalezna): IN z branch_01, TR boczne, brak OUT (koncowa na odgalezieniu)
B4 (odgalezna): IN z branch_02, OUT na dalsze odgalezienie (przelotowa na galezieniu)
```

**Przyklad bledny:**
```
B1 (odgalezna): IN + OUT na trunk (to byloby INLINE, nie BRANCH)
```

---

### 2.3 STACJA SEKCYJNA (SECTIONAL / LOCAL_SECTIONAL)

**Definicja fizyczna:**
Stacja SN z dwoma lub wiecej sekcjami szyny, polaczonymi sprzeglem sekcyjnym. Punkt sekcjonowania sieci. Moze miec NOP (normalnie otwarty punkt) na jednym z zasilan.

**Definicja topologiczna:**
```
WARUNKI:
  - busSections >= 2
  - Istnieje pole COUPLER (sprzeglo sekcyjne)
  - Kazda sekcja ma wlasne pola liniowe
  - Opcjonalnie: NOP na jednym z zasilan
```

**Kontrakt danych:**
```typescript
interface SectionalStationContract {
  id: string;
  name: string;
  stationKind: 'stacja_sekcyjna';
  sectionA: BusSectionContract;
  sectionB: BusSectionContract;
  tieBay: BayContract;             // OBOWIAZKOWE — sprzeglo
  normallyOpenPointId: string | null;
  reserveIncomingBays: BayContract[];
  topologyContract: 'two_sections_with_tie';
}
```

**Kontrakt pól:**
```
SEKCJA A:
  - LINE_IN_A: zasilanie z magistrali 1
  - TRANSFORMER_A: TR SN/nN sekcji A
SPRZEGLO:
  - COUPLER: CB + DS laczace sekcje A i B
SEKCJA B:
  - LINE_IN_B: zasilanie z magistrali 2 / rezerwa
  - TRANSFORMER_B: TR SN/nN sekcji B
```

**Geometria:**
```
        |
    [LINIA IN A]
        |
    =SZYNA A=======
    |    |    |
    TR_A |  COUPLER
    |    |    |
    T    |  =SZYNA B=======
         |    |    |
         |   TR_B  [LINIA IN B]
         |    |         |
         |    T    (rezerwa)
         |
    [LINIA OUT]
         |
    dalsza magistrala
```

**Przyklad poprawny:**
```
S4 (sekcyjna): sec_A z magistrali 1, sec_B z magistrali 2, sprzeglo, NOP na rezerwie
```

**Przyklad bledny:**
```
S4 (sekcyjna): 1 szyna + brak sprzegla (to byloby INLINE lub TERMINAL)
```

---

### 2.4 STACJA KONCOWA (TERMINAL / TRUNK_LEAF)

**Definicja fizyczna:**
Stacja SN na koncu toru (magistrali lub odgalezienia). Ma wejscie (pole LINE_IN), ale nie ma wyjscia na dalszy tor. Koniec linii.

**Definicja topologiczna:**
```
WARUNKI:
  - incidentActiveEdges == 1 (tylko wejscie)
  - busSections == 1
  - Brak pola LINE_OUT na dalszy tor
```

**Kontrakt danych:**
```typescript
interface TerminalStationContract {
  id: string;
  name: string;
  stationKind: 'stacja_koncowa';
  incomingBay: BayContract;      // OBOWIAZKOWE
  outgoingBay: null;             // BRAK — koniec toru
  transformerBays: BayContract[];
  generatorBays: BayContract[];
  busSection: BusSectionContract;
  topologyContract: 'no_outgoing_main';
}
```

**Geometria:**
```
        |
    [LINIA IN]
        |
    =SZYNA=
    |     |
    TR   (OZE opcj.)
    |     |
    T    gen
```

---

### 2.5 STACJA OZE / BESS / KLASTER

**Definicja fizyczna:**
Stacja z polami generatorowymi (PV, BESS, Wind). Moze byc koncowa (tylko OZE) lub mieszana (odbiór + OZE). Typ topologiczny (inline/branch/terminal) jest niezalezny od obecnosci OZE.

**Definicja topologiczna:**
```
WARUNKI:
  - Jak inne typy (inline/branch/terminal) PLUS:
  - generatorBays.length >= 1
  - Kazde pole generatora ma bayRole = PV | BESS | WIND
```

**Kontrakt danych:**
```typescript
// OZE NIE jest osobnym typem stacji — to ATRYBUT dowolnego typu:
interface StationWithOze {
  generatorBays: BayContract[];  // >=1 dla stacji z OZE
}
// Np. stacja koncowa z PV:
interface TerminalOzeStation extends TerminalStationContract {
  generatorBays: [BayContract]; // >=1
}
```

**Geometria (stacja koncowa z PV i BESS):**
```
        |
    [LINIA IN]
        |
    =====SZYNA=====
    |     |    |
    TR    PV  BESS
    |     |    |
    T    gen  bat
```

---

## 3. MACIERZ TYPÓW

| Typ stacji | Trunk edges | Branch edges | Bus sections | Pole IN | Pole OUT | Pole COUPLER | Pole GEN |
|-----------|------------|-------------|-------------|---------|---------|-------------|---------|
| INLINE | 2 | 0 | 1 | TAK | TAK | NIE | 0+ |
| BRANCH | 0 | >=1 | 1 | TAK | 0-1 | NIE | 0+ |
| SECTIONAL | 0+ | 0+ | >=2 | TAK | 0+ | TAK | 0+ |
| TERMINAL | 1 | 0 | 1 | TAK | NIE | NIE | 0+ |

---

## 4. TESTY OBOWIAZKOWE

### 4.1 Stacja przelotowa — tor glówny

```
TEST inline_main_path:
  GIVEN: stacja S1 z stationKind='stacja_przelotowa'
  THEN: S1.incomingBay.bayRole == 'LINE_IN'
  AND: S1.outgoingBay.bayRole == 'LINE_OUT'
  AND: S1.incomingMainSegmentId na trunk
  AND: S1.outgoingMainSegmentId na trunk
  AND: S1.incomingMainSegmentId != S1.outgoingMainSegmentId
```

### 4.2 Stacja przelotowa — zakaz obejscia

```
TEST inline_no_bypass:
  GIVEN: stacja S1 przelotowa miedzy seg_N i seg_N+1
  THEN: nie istnieje sciezka od seg_N.from do seg_N+1.to
        omijajaca S1 (brak obejscia równoleglego)
```

### 4.3 Stacja odgalezna — brak toru glównego

```
TEST branch_no_main:
  GIVEN: stacja B1 z stationKind='stacja_odgalezna'
  THEN: B1 NIE lezy na zadnym trunk path
  AND: B1.topologyContract == 'no_main_through'
```

### 4.4 Stacja sekcyjna — dwie sekcje

```
TEST sectional_two_sections:
  GIVEN: stacja S4 z stationKind='stacja_sekcyjna'
  THEN: S4.sectionA istnieje
  AND: S4.sectionB istnieje
  AND: S4.tieBay istnieje
  AND: S4.tieBay.bayRole == 'COUPLER'
```

### 4.5 Stacja koncowa — brak wyjscia

```
TEST terminal_no_outgoing:
  GIVEN: stacja S6 z stationKind='stacja_koncowa'
  THEN: S6.incomingBay istnieje
  AND: S6.outgoingBay == null
  AND: S6.topologyContract == 'no_outgoing_main'
```

### 4.6 NOP na ring

```
TEST nop_on_ring:
  GIVEN: NOP miedzy S6 i S1
  THEN: NOP laczy dwa rózne trunki lub dwa konce tego samego trunk
  AND: NOP.isNormallyOpen == true
  AND: NOP NIE jest w srodku jednej magistrali
```

---

## 5. REGRESJE — PRZYPADKI ZAKAZANE

| ID | Opis | Dlaczego zakazany |
|----|------|------------------|
| REG01 | Stacja przelotowa doklejona OBOK magistrali | Magistrala MUSI przejsc PRZEZ stacje |
| REG02 | Pole OUT wisi w powietrzu | OUT MUSI kontynuowac magistrale |
| REG03 | Magistrala za stacja I przez stacje jednoczesnie | Jedno albo drugie |
| REG04 | Odgalezienie z losowego miejsca na magistrali | Odgalezienie MUSI wychodzic z junction node |
| REG05 | Stacja odgalezna udaje przelotowa | Typ MUSI byc jawny z kontraktu |
| REG06 | Ring przecina logike magistrali | Ring w osobnym kanale, nie na trunk |
| REG07 | Tekst przecinany przez linie | Etykiety na osobnej warstwie z buforem |
