# KANONICZNY STYL WIZUALNY SLD

**Data:** 2026-03-14
**Wersja:** 1.0
**Status:** WIAZACY

---

## 1. CEL

Jedna kanonniczna biblioteka stylów SLD. Brak duplikatów klas, brak nadpisywania selektorów, brak smieci po merge.

---

## 2. KOLORY

```typescript
export const SLD_COLORS = {
  // === ELEMENTY SIECIOWE ===
  BUS_GPZ: '#1a1a2e',           // Szyna zbiorcza GPZ
  BUS_STATION: '#1a1a2e',       // Szyna stacji SN
  BUS_LV: '#555555',            // Szyna nN
  LINE_TRUNK: '#1a1a2e',        // Segment magistrali
  LINE_BRANCH: '#1a1a2e',       // Segment odgalezienia
  LINE_SECONDARY: '#666666',    // Segment wtórny (ring/rezerwa)

  // === STANY PRZELACZNIKÓW ===
  SWITCH_CLOSED: '#1a1a2e',     // Zamkniety
  SWITCH_OPEN: '#c0392b',       // Otwarty
  NOP_NORMAL: '#c0392b',        // NOP normalnie otwarty (czerwony)
  NOP_CLOSED: '#27ae60',        // NOP zamkniety (awaryjne)

  // === GENERATORY ===
  GEN_PV: '#f39c12',            // Fotowoltaika (pomaranczowy)
  GEN_BESS: '#27ae60',          // Magazyn energii (zielony)
  GEN_WIND: '#3498db',          // Turbina wiatrowa (niebieski)

  // === OVERLAY WYNIKÓW ===
  RESULT_OK: '#27ae60',         // Wynik w normie
  RESULT_WARNING: '#f39c12',    // Ostrzezenie
  RESULT_ERROR: '#e74c3c',      // Blad / przekroczenie

  // === UI ===
  STATION_BG: '#f5f5f5',        // Tlo bloku stacji
  STATION_BORDER: '#cccccc',    // Ramka stacji
  LABEL_TEXT: '#333333',         // Tekst etykiet
  LABEL_BG: '#ffffff',          // Tlo etykiet
  SELECTION: '#2980b9',         // Zaznaczenie
  HOVER: '#e8f4fd',             // Hover
  GRID: '#e0e0e0',              // Siatka tla
} as const;
```

---

## 3. TYPOGRAFIA

```typescript
export const SLD_TYPOGRAPHY = {
  // Nazwa stacji (naglówek bloku)
  STATION_NAME: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    fill: SLD_COLORS.LABEL_TEXT,
  },
  // Etykieta elementu (nazwa pola, nazwa linii)
  ELEMENT_LABEL: {
    fontSize: 11,
    fontWeight: 400,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    fill: SLD_COLORS.LABEL_TEXT,
  },
  // Parametr techniczny (R, X, I, P, Q)
  PARAMETER: {
    fontSize: 10,
    fontWeight: 400,
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
    fill: SLD_COLORS.LABEL_TEXT,
  },
  // Napiecie (15 kV, 0.4 kV)
  VOLTAGE: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    fill: SLD_COLORS.LABEL_TEXT,
  },
  // Etykieta wyniku overlay
  RESULT_VALUE: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
  },
} as const;
```

---

## 4. GRUBOSCI LINII

| Element | Grubosc (px) | Styl |
|---------|-------------|------|
| Szyna GPZ | 8 | solid |
| Szyna stacji SN | 5 | solid |
| Szyna nN | 3 | solid |
| Segment magistrali | 2 | solid |
| Segment odgalezienia | 2 | solid |
| Segment ring/rezerwa | 1.5 | dashed (6 4) |
| Polaczenie urzadzenie-szyna | 1.5 | solid |
| Linia CT-RELAY (sygnalowa) | 1 | dashed (3 3) |
| Ramka stacji | 1 | solid |
| Ramka etykiety | 0.5 | solid |

---

## 5. WYMIARY ELEMENTÓW

| Element | Szerokosc (px) | Wysokosc (px) |
|---------|---------------|--------------|
| CB (wylacznik) | 20 | 30 |
| DS (rozlacznik) | 16 | 24 |
| ES (uziemnik) | 16 | 24 |
| CT (przekladnik pradowy) | 16 | 16 |
| VT (przekladnik napieciowy) | 16 | 16 |
| RELAY (przekaznik) | 20 | 20 |
| FUSE (bezpiecznik) | 12 | 24 |
| TR (transformator) | 40 | 60 |
| PV (generator PV) | 30 | 30 |
| BESS (magazyn energii) | 30 | 30 |
| WIND (turbina wiatrowa) | 30 | 30 |
| LOAD (odbiór) | 20 | 20 |
| NOP (punkt normalnie otwarty) | 24 | 24 |

---

## 6. ZAKAZY STYLOWE

- Brak `!important` w CSS SLD
- Brak kolorów hardcodowanych w JSX (uzyc SLD_COLORS)
- Brak fontów hardcodowanych w JSX (uzyc SLD_TYPOGRAPHY)
- Brak duplikatów klas CSS
- Brak nadpisywania selektorów (specificnosc = 1)
- Brak inline styles w SVG (uzyc CSS classes lub SLD_COLORS)
- Brak mieszania stylów eksperymentalnych z kanonicznymi
