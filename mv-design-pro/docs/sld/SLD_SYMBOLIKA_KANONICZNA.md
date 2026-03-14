# KANONICZNA BIBLIOTEKA SYMBOLI SLD

**Data:** 2026-03-14
**Wersja:** 2.0
**Status:** WIAZACY

---

## 1. CEL

Jedna kanonniczna biblioteka symboli IEC 60617 dla SLD. Kazdy symbol ma jedno znaczenie, jeden renderer, jeden styl. Brak duplikatów, brak wariantów eksperymentalnych.

---

## 2. KATALOG SYMBOLI

### 2.1 Wylacznik (CB — Circuit Breaker)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie techniczne | Aparat zdolny do przerywania pradu zwarcia |
| Norma | IEC 60617 |
| Stany | CLOSED (zamkniety, linia ciagla), OPEN (otwarty, linia z przerwa) |
| Skala | 20x30 px (standard), 30x45 px (powiekszone) |
| Polozenie wzgledem toru | Na torze, centrycznie |
| Polozenie podpisu | Obok symbolu (prawo lub lewo, deterministycznie) |
| Orientacje | Pionowa (domyslna), pozioma (na szynie) |
| Kolor | Czarny (normalny), czerwony (trip/blad), zielony (poprawny) |
| Uzycie | Pole liniowe, pole transformatorowe, pole odgalezieniowe, pole OZE |

### 2.2 Rozlacznik (DS — Disconnector)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Aparat do izolacji obwodu (nie pod obciazeniem) |
| Norma | IEC 60617 |
| Stany | CLOSED, OPEN |
| Skala | 16x24 px |
| Polozenie | Na torze, miedzy szyna a CB |
| Podpis | Obok (prawo/lewo) |
| Orientacje | Pionowa, pozioma |
| Uzycie | Pole liniowe (przed CB, od strony linii), pole transformatorowe |

### 2.3 Rozlacznik obciazenia (LS — Load Switch)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Aparat do rozlaczania pod obciazeniem (bez zwarcia) |
| Norma | IEC 60617 |
| Stany | CLOSED, OPEN |
| Skala | 18x26 px |
| Polozenie | Na torze |
| Uzycie | Stacje bez pelnej ochrony (prostsza konfiguracja) |

### 2.4 Uziemnik (ES — Earthing Switch)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Aparat do uziemiania obwodu (bezpieczenstwo) |
| Norma | IEC 60617 |
| Stany | CLOSED (uziemiony), OPEN (nie uziemiony) |
| Skala | 16x24 px |
| Polozenie | Na torze, za DS (od strony linii) |
| Podpis | Obok |
| Uzycie | Pole liniowe (bezpieczenstwo serwisowe) |

### 2.5 Przekladnik pradowy (CT — Current Transformer)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Pomiar pradu (dla zabezpieczen i pomiarów) |
| Norma | IEC 60617 |
| Stany | Brak (pasywny) |
| Skala | 16x16 px (kólko) |
| Polozenie | Na torze, miedzy CB a szyna |
| Uzycie | Pole liniowe, pole transformatorowe (po stronie SN) |

### 2.6 Przekladnik napieciowy (VT — Voltage Transformer)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Pomiar napiecia |
| Norma | IEC 60617 |
| Stany | Brak (pasywny) |
| Skala | 16x16 px |
| Polozenie | Na szynie (galaz boczna) |
| Uzycie | Pole pomiarowe, szyna GPZ |

### 2.7 Przekaznik (RELAY — Protection Relay)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Przekaznik zabezpieczeniowy (nadpradowy, ziemnozwarciowy) |
| Norma | IEC 60617 |
| Stany | Brak (logiczny) |
| Skala | 20x20 px (prostokat z "R") |
| Polozenie | Obok CT, polaczony linia przerywanym |
| Uzycie | Pole liniowe z zabezpieczeniem, pole transformatorowe |

### 2.8 Bezpiecznik (FUSE)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Ochrona nadpradowa (jednorazowa) |
| Norma | IEC 60617 |
| Stany | OK, BLOWN (przepalony) |
| Skala | 12x24 px |
| Polozenie | Na torze (zamiast CB w prostszych konfiguracjach) |
| Uzycie | Stacje nn, proste zabezpieczenia SN |

### 2.9 Transformator SN/nN (TR)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Transformator dwuuzwojeniowy SN/nN |
| Norma | IEC 60617 (dwa kólka) |
| Stany | Brak (pasywny element) |
| Skala | 40x60 px |
| Polozenie | Pole transformatorowe, pionowo |
| Podpis | Pod symbolem: Sn [kVA], uk% [%], grupa polaczen |
| Uzycie | Kazda stacja z transformatorem |

### 2.10 NOP (Normally Open Point)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Punkt normalnie otwarty — byt eksploatacyjny |
| Stany | OPEN (normalny), CLOSED (awaryjny) |
| Skala | 24x24 px |
| Polozenie | Na laczu pierscieniowym (ring), w kanale rezerwowym |
| Podpis | "NOP" lub numer |
| Kolor | Czerwony (otwarty = normalny) |
| Uzycie | Ring, polaczenie rezerwowe |

### 2.11 Generator PV

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Zródlo fotowoltaiczne |
| Skala | 30x30 px |
| Polozenie | Pole generatora, na koncu galezi od szyny |
| Podpis | Pod symbolem: P [kW] |
| Kolor | Zólty / pomaranczowy |
| Uzycie | Stacja z PV (pole GENERATOR, bayRole=PV) |

### 2.12 Generator BESS

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Magazyn energii (bateria) |
| Skala | 30x30 px |
| Polozenie | Pole generatora |
| Podpis | Pod symbolem: P [kW], E [kWh] |
| Kolor | Zielony |
| Uzycie | Stacja z BESS (pole GENERATOR, bayRole=BESS) |

### 2.13 Generator Wind

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Turbina wiatrowa |
| Skala | 30x30 px |
| Polozenie | Pole generatora |
| Podpis | Pod symbolem: P [kW] |
| Kolor | Niebieski |
| Uzycie | Stacja z Wind (pole GENERATOR, bayRole=WIND) |

### 2.14 Odbiór (LOAD)

| Cecha | Wartosc |
|-------|---------|
| Znaczenie | Odbiornik energii (strzalka w dól) |
| Skala | 20x20 px |
| Polozenie | Pod szyna nN, na koncu galezi transformatorowej |
| Podpis | P [kW], cos phi |
| Uzycie | Pod transformatorem SN/nN w stacji |

---

## 3. REGULY UZYCIA W TYPACH STACJI

| Symbol | Przelotowa | Odgalezna | Sekcyjna | Koncowa |
|--------|-----------|-----------|---------|---------|
| CB | Pole IN, OUT, TR, BR | Pole IN, TR | Pole IN, TIE, TR | Pole IN, TR |
| DS | Pole IN, OUT | Pole IN | Pole IN | Pole IN |
| ES | Pole IN (opcj.) | Pole IN (opcj.) | - | - |
| CT | Pole IN | Pole IN | Pole IN | Pole IN |
| VT | Szyna (opcj.) | - | Szyna A, B | - |
| RELAY | Pole IN | Pole IN | Pole IN | Pole IN |
| TR | Pole TR | Pole TR | Pole TR A/B | Pole TR |
| NOP | - | - | Polaczenie rez. | - |
| PV/BESS/Wind | Pole GEN (opcj.) | Pole GEN (opcj.) | Pole GEN (opcj.) | Pole GEN (opcj.) |
| LOAD | Pod TR | Pod TR | Pod TR A/B | Pod TR |

---

## 4. UPORZADKOWANIE URZADZEN W POLU

Kolejnosc od szyny do linii (od wewnatrz na zewnatrz):

```
SZYNA STACJI
    |
   [CT] — przekladnik pradowy
    |
   [CB] — wylacznik
    |
   [DS] — rozlacznik
    |
   [ES] — uziemnik (opcjonalnie)
    |
   LINIA / KABEL
```

Ta kolejnosc jest OBOWIAZKOWA i niezmienna. Renderer NIE moze zmieniac kolejnosci.

---

## 5. STYLE

### 5.1 Stale kolorów

```typescript
export const SLD_COLORS = {
  // Elementy sieciowe
  BUS_GPZ: '#1a1a2e',
  BUS_STATION: '#1a1a2e',
  LINE_TRUNK: '#1a1a2e',
  LINE_BRANCH: '#1a1a2e',
  LINE_SECONDARY: '#666666',
  NOP_OPEN: '#c0392b',
  NOP_CLOSED: '#27ae60',

  // Generatory
  GENERATOR_PV: '#f39c12',
  GENERATOR_BESS: '#27ae60',
  GENERATOR_WIND: '#3498db',

  // Overlay
  RESULT_OK: '#27ae60',
  RESULT_WARNING: '#f39c12',
  RESULT_ERROR: '#e74c3c',

  // UI
  STATION_BG: '#f5f5f5',
  STATION_BORDER: '#cccccc',
  LABEL_TEXT: '#333333',
  LABEL_BG: '#ffffff',
  SELECTION: '#2980b9',
  HOVER: '#e8f4fd',
} as const;
```

### 5.2 Stale typografii

```typescript
export const SLD_TYPOGRAPHY = {
  STATION_NAME: { fontSize: 13, fontWeight: 600, fontFamily: 'sans-serif' },
  ELEMENT_LABEL: { fontSize: 11, fontWeight: 400, fontFamily: 'sans-serif' },
  PARAMETER: { fontSize: 10, fontWeight: 400, fontFamily: 'monospace' },
  VOLTAGE: { fontSize: 12, fontWeight: 600, fontFamily: 'sans-serif' },
} as const;
```

---

## 6. TESTY

### 6.1 Spójnosc symboli

```
TEST: kazdy DeviceType ma dokladnie jeden renderer
TEST: kazdy renderer produkuje SVG zgodny z IEC 60617
TEST: kazdy symbol ma zdefiniowana skale i porty
```

### 6.2 Brak duplikatów

```
TEST: brak dwóch rendererów dla tego samego DeviceType
TEST: brak dwóch klas CSS dla tego samego elementu
TEST: brak dwóch zestawów kolorów (jeden SLD_COLORS)
```

### 6.3 Zgodnosc z typami stacji

```
TEST: stacja przelotowa ma CB w polu IN i OUT
TEST: stacja sekcyjna ma CB w polu TIE
TEST: kolejnosc urzadzen w polu: CT -> CB -> DS -> ES
```

---

## 7. ZAKAZY

- Duplikatów rendererów symboli
- Duplikatów klas CSS
- Nadpisywania selektorów (brak !important w SLD)
- Smieci po merge (stare warianty, eksperymentalne komponenty)
- Mieszania stylów eksperymentalnych z kanonicznymi
- Kolorów hardcodowanych w JSX (uzyc SLD_COLORS)
- Fontów hardcodowanych w JSX (uzyc SLD_TYPOGRAPHY)
