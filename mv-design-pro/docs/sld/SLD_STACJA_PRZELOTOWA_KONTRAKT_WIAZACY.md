# STACJA PRZELOTOWA — KONTRAKT WIAZACY

**Data:** 2026-03-14
**Wersja:** 1.0
**Status:** WIAZACY

---

## 1. DEFINICJA

Stacja przelotowa (inline station) to stacja SN, przez która przechodzi magistrala glówna. Jest elementem toru glównego — magistrala wchodzi polem LINE_IN i wychodzi polem LINE_OUT. Transformatory, odgalezienia i generatory to pola boczne.

---

## 2. KONTRAKT TOPOLOGICZNY

```
WARUNKI KONIECZNE:
  W1: Stacja lezy na spanning tree trunk path
  W2: incidentTrunkEdges(station) == 2
  W3: Istnieje pole LINE_IN z CB (circuit breaker)
  W4: Istnieje pole LINE_OUT z CB (circuit breaker)
  W5: incomingMainSegmentId != outgoingMainSegmentId
  W6: Magistrala przechodzi PRZEZ stacje (nie obok)

ZAKAZY:
  Z1: Stacja NIE MOZE miec obejscia równoleglego
  Z2: Magistrala NIE MOZE istniec jednoczesnie "za stacja" i "przez stacje"
  Z3: Pole OUT MUSI tworzyc dalszy ciag magistrali (nie moze wisiec w powietrzu)
  Z4: Pole IN i OUT NIE MOGA byc na tym samym segmencie (petla)
```

---

## 3. KONTRAKT GEOMETRYCZNY

### 3.1 Uklad poprawny

```
          zasilanie z GPZ / poprzedni segment
                    |
                    | (segment magistrali N)
                    |
             [DS_IN] rozlacznik
                    |
             [CB_IN] wylacznik
                    |
             [CT] przekladnik pradowy
                    |
        ============+============ SZYNA STACJI SN ============
        |           |           |           |
   [CB_TR]    [CB_OUT]    [CB_BR]     [CB_GEN]
        |           |           |           |
   [TR SN/nN]  [DS_OUT]    [linia br]  [generator]
        |           |           |           |
   =szyna nN=       |       stacja       PV/BESS
        |           |       odgalezna
   [odbiór]         |
                    | (segment magistrali N+1)
                    |
             dalsza magistrala
```

### 3.2 Uklad zakazany A — stacja obok magistrali

```
ZAKAZANE:
        magistrala glówna
              |
              |       [stacja obok]
              |------>[ IN ][ szyna ][ OUT ]
              |
        dalsza magistrala

DLACZEGO: Magistrala przechodzi PROSTO, stacja jest "doklejona" z boku.
          Kontrakt wymaga, aby magistrala przechodzila PRZEZ stacje.
```

### 3.3 Uklad zakazany B — powrót bokiem

```
ZAKAZANE:
        magistrala
              |
           [IN]
              |
           [szyna]----[OUT]
              |
        powrót bokiem
              |
        glówny pion

DLACZEGO: OUT nie kontynuuje magistrali w dól, tylko wraca bokiem.
```

### 3.4 Uklad zakazany C — magistrala omija stacje

```
ZAKAZANE:
        magistrala
              |
              +----->[IN]->[szyna]->[OUT]---+
              |                             |
              |<----------------------------+
              |
        dalsza magistrala

DLACZEGO: Obejscie równolegle — magistrala idzie prosto I przez stacje.
```

---

## 4. KONTRAKT PÓL

| Pole | Rola | Obowiazkowe | Urzadzenia minimalne | Polaczenie |
|------|------|-------------|---------------------|-----------|
| LINE_IN | Wejscie magistrali | TAK | CB + DS | segment magistrali N |
| LINE_OUT | Wyjscie magistrali | TAK | CB + DS | segment magistrali N+1 |
| TRANSFORMER | TR SN/nN | NIE (ale typowe) | CB | transformator |
| BRANCH | Odgalezienie | NIE | CB | segment odgalezienia |
| GENERATOR | OZE/BESS | NIE | CB | generator |

---

## 5. TESTY

### 5.1 Test: IN + OUT obowiazkowe

```typescript
test('inline station has IN and OUT bays', () => {
  const station = buildInlineStation(/* ... */);
  expect(station.incomingBay).toBeDefined();
  expect(station.incomingBay.bayRole).toBe('LINE_IN');
  expect(station.outgoingBay).toBeDefined();
  expect(station.outgoingBay.bayRole).toBe('LINE_OUT');
});
```

### 5.2 Test: segmenty sa rózne

```typescript
test('incoming and outgoing segments are different', () => {
  const station = buildInlineStation(/* ... */);
  expect(station.incomingMainSegmentId).not.toBe(station.outgoingMainSegmentId);
});
```

### 5.3 Test: OUT kontynuuje magistrale

```typescript
test('OUT bay connects to next trunk segment', () => {
  const model = buildSldSemanticModel(input);
  const station = model.inlineStations[0];
  const trunk = model.trunks.find(t => t.id === station.trunkId)!;
  const outSegIdx = trunk.orderedSegments.findIndex(
    s => s.segmentId === station.outgoingSegmentId
  );
  expect(outSegIdx).toBeGreaterThan(-1);
});
```

### 5.4 Test: brak obejscia

```typescript
test('no parallel bypass around inline station', () => {
  const model = buildSldSemanticModel(input);
  const station = model.inlineStations[0];
  // Verify: removing station disconnects incoming from outgoing segment
  // (no alternative path exists)
  const graph = buildGraphWithoutStation(model, station.id);
  expect(isConnected(graph, station.incomingSegmentId, station.outgoingSegmentId)).toBe(false);
});
```

---

## 6. ZWIAZEK Z INNYMI DOKUMENTAMI

| Dokument | Relacja |
|----------|---------|
| SPEC_MODEL_OGOLNY_PRAKTYCZNEJ_SIECI_TERENOWEJ_SN.md | Definicja ontologiczna stacji |
| SPEC_KONTRAKTY_SYSTEMOWE_SN.md | Kontrakty SldSemanticModel z InlineStation |
| SLD_GEOMETRIA_KANONICZNA.md | Algorytm rozmieszczania stacji inline |
| SLD_SYMBOLIKA_KANONICZNA.md | Symbole aparatury w polach |
| SLD_TEST_MATRIX.md | Macierz testów per typ stacji |
