# AUDYT SLD — ZGODNOŚĆ ZE STANDARDEM ETAP/POWERFACTORY

**Wersja**: 1.0
**Data**: 2026-02-02
**Status**: BINDING
**Audytor**: Claude Code (Główny Architekt SLD)

---

## 1. CEL AUDYTU

Weryfikacja zgodności implementacji SLD (Single Line Diagram) w MV-DESIGN-PRO ze standardami profesjonalnych systemów klasy ETAP i DIgSILENT PowerFactory.

**Kluczowe pytania:**
1. Czy SLD jest deterministyczną wizualizacją topologii sieci?
2. Czy połączenia odzwierciedlają rzeczywiste relacje elektryczne?
3. Czy układ jest powtarzalny i nie zależy od ręcznego rysowania?

---

## 2. PYTANIA AUDYTOWE — ODPOWIEDZI

| # | Pytanie | Odpowiedź | Status |
|---|---------|-----------|--------|
| 1 | Czy każdy symbol SLD mapuje **1:1** na element modelu sieci? | **TAK** | PASS |
| 2 | Czy połączenia są **port ↔ port**, a nie „linia do symbolu"? | **NIE** | FAIL |
| 3 | Czy można odtworzyć SLD wyłącznie z modelu sieci? | **NIE** | FAIL |
| 4 | Czy układ jest deterministyczny (brak losowości)? | **CZĘŚCIOWO** | WARN |
| 5 | Czy istnieje auto-layout? | **NIE** | FAIL |
| 6 | Czy użytkownik „wstawia elementy sieci", czy „rysuje"? | **MIESZANE** | FAIL |

---

## 3. SZCZEGÓŁOWE WYNIKI

### 3.1 Mapowanie Symbol ↔ Element (PASS)

**Lokalizacja**: `frontend/src/ui/sld/SymbolResolver.ts`

Istnieje poprawna bijekcja:
- Każdy `SldSymbol` posiada `elementId` wskazujący na element `NetworkModel`
- `SymbolResolver.resolveSymbol()` mapuje `ElementType` → ETAP Symbol ID
- Mapping jest kanoniczny i udokumentowany

**Mapowanie:**
```
Bus                  → busbar
LineBranch (LINE)    → line_overhead
LineBranch (CABLE)   → line_cable
TransformerBranch    → transformer_2w
Switch (BREAKER)     → circuit_breaker
Switch (DISCONNECTOR)→ disconnector
Source               → utility_feeder
```

**Uwagi:**
- Brak rozróżnienia PV/FW/BESS/generator w Source (używa `utility_feeder`)
- Load nie ma symbolu ETAP (fallback: trójkąt)

---

### 3.2 Połączenia Port ↔ Port (FAIL)

**Problem**: Połączenia są reprezentowane jako **referencje ID** (`fromNodeId`, `toNodeId`), nie jako **geometryczne połączenia między portami**.

**Lokalizacja**: `frontend/src/ui/sld-editor/SldCanvas.tsx:132-160`

**Stan obecny:**
```typescript
// Branch renderowany jako linia od pozycji do pozycji+60px
<line
  x1={position.x}
  y1={position.y}
  x2={position.x + 60}
  y2={position.y}
/>
```

**Wymagany stan (ETAP-style):**
```typescript
// Branch renderowany jako łamana port→port
<polyline
  points={computeRoutePortToPort(fromSymbol.ports.bottom, toSymbol.ports.top)}
/>
```

**Konsekwencje:**
- Połączenia nie są wizualizowane jako linie między elementami
- Brak routingu (auto-routing orthogonal paths)
- Brak snapping do portów
- Użytkownik musi ręcznie ustawiać pozycje

---

### 3.3 Odtwarzalność z Modelu (FAIL)

**Problem**: Pozycje symboli (`position: {x, y}`) są przechowywane **osobno** od modelu sieci. Nie istnieje algorytm generujący layout z topologii.

**Lokalizacja**: `frontend/src/ui/sld-editor/types.ts:42-63`

**Wymagane:**
- Algorytm auto-layout generujący pozycje z topologii
- Deterministyczna funkcja: `NetworkModel → SLDLayout`
- Możliwość "regeneracji" układu

**Brak w kodzie:**
- `generateLayoutFromTopology(model: NetworkModel): Map<string, Position>`
- Algorytm hierarchiczny (top-down zasilanie)
- Algorytm layer-based (szyny na poziomach)

---

### 3.4 Deterministyczność Układu (WARN)

**Częściowo spełnione:**
- `selectedIds` zawsze sortowane (determinizm selekcji)
- `snapToGrid()` matematycznie deterministyczne
- Energizacja (BFS) jest pure function

**Niespełnione:**
- Pozycje symboli zależą od użytkownika
- Copy/paste generuje niedeterministyczne ID (`_copy_${Date.now()}_${Math.random()}`)
- Brak funkcji generującej ten sam układ dla tego samego modelu

**Lokalizacja**: `frontend/src/ui/sld-editor/SldEditorStore.ts:432`

---

### 3.5 Auto-Layout (FAIL)

**Problem**: Brak algorytmu auto-layout klasy ETAP/PowerFactory.

**Stan obecny** (dostępne funkcje):
| Funkcja | Opis | ETAP-style? |
|---------|------|-------------|
| `alignSymbols()` | Wyrównaj do pierwszego | NIE |
| `distributeSymbols()` | Równomierne rozłożenie | NIE |
| `snapToGrid()` | Zaokrąglij do siatki | NIE |
| `fitToContent()` | Dopasuj viewport | NIE |

**Wymagane** (standard ETAP):
| Funkcja | Opis | Status |
|---------|------|--------|
| `hierarchicalLayout()` | Układ hierarchiczny top→down | BRAK |
| `orthogonalRouting()` | Routing prostokątny | BRAK |
| `layerBasedPlacement()` | Szyny na poziomach | BRAK |
| `minimizeCrossings()` | Minimalizacja skrzyżowań | BRAK |

---

### 3.6 Wstawianie Elementów vs Rysowanie (FAIL)

**Problem**: Brak mechanizmu "wstaw element sieci na szynie" w stylu ETAP.

**Stan obecny:**
1. Użytkownik może **przesuwać** istniejące symbole (drag)
2. Może **kopiować** symbole (copy/paste) — ale kopie mają TEN SAM `elementId`!
3. Brak UI do "wstaw wyłącznik na szynie X"
4. Brak interakcji "kliknij port → połącz z innym portem"

**Lokalizacja**: `frontend/src/ui/sld-editor/SldEditorStore.ts:426-452`

**Krytyczny błąd:**
```typescript
// BŁĄD: Kopiowanie symbolu bez tworzenia nowego elementu w modelu
pasteFromClipboard: (offset: Position) => {
  // ...
  const newId = `${symbol.id}_copy_${Date.now()}_...`;
  return {
    ...symbol,
    id: newId,           // Nowe ID symbolu
    // elementId: ???    // BRAK! Pozostaje stary elementId
  };
};
```

**Konsekwencja**: Copy/paste tworzy symbole bez elementów modelu sieci!

---

## 4. NIEZGODNOŚCI — LISTA ZBIORCZA

| # | Obszar | Niezgodność | Priorytet | Wpływ |
|---|--------|-------------|-----------|-------|
| N-01 | Połączenia | Brak renderowania połączeń port↔port | KRYTYCZNY | Brak wizualizacji topologii |
| N-02 | Auto-layout | Brak hierarchicznego auto-layoutu | KRYTYCZNY | Ręczne układanie |
| N-03 | Wstawianie | Copy/paste nie tworzy elementów modelu | KRYTYCZNY | Niespójność model↔SLD |
| N-04 | Symbole | Edytor nie używa symboli ETAP | WYSOKI | Niespójność viewer↔editor |
| N-05 | Routing | Brak orthogonal routing | WYSOKI | Nieczytelne schematy |
| N-06 | Porty | Brak snapping do portów | ŚREDNI | Utrudnione łączenie |
| N-07 | Deterministyczność | ID kopiowanych symboli są losowe | NISKI | Nieprzewidywalność |

---

## 5. ROZBIEŻNOŚĆ: VIEWER vs EDITOR

| Aspekt | SLDView (Viewer) | SldCanvas (Editor) |
|--------|------------------|-------------------|
| Symbole | EtapSymbolRenderer (SVG ETAP) | Uproszczone (rect, circle, polygon) |
| Połączenia | Nie renderuje | Nie renderuje |
| Porty | Zdefiniowane (ports.json) | Nieużywane |
| Energizacja | TAK (BFS algorithm) | NIE |
| Wyniki | Overlay z wynikami | NIE |

**Problem**: Viewer jest znacznie bardziej zaawansowany niż Editor. Edytor używa uproszczonych symboli, nie biblioteki ETAP.

---

## 6. ARCHITEKTURA — DIAGRAM STANU OBECNEGO

```
┌─────────────────────────────────────────────────────────────────┐
│                     NETWORK MODEL (Backend)                      │
│  Bus, Branch, Switch, Source, Load                               │
│  Topologia: fromNodeId, toNodeId                                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ (API fetch)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SLD SYMBOLS (Frontend)                      │
│  NodeSymbol, BranchSymbol, SwitchSymbol, ...                    │
│  position: {x, y} — OSOBNO OD MODELU (!)                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           │                                           │
           ▼                                           ▼
┌──────────────────────────┐            ┌──────────────────────────┐
│     SLDView (Viewer)     │            │   SldCanvas (Editor)     │
│  - Symbole ETAP SVG      │            │  - Uproszczone kształty  │
│  - Energizacja BFS       │            │  - Drag/select/copy      │
│  - Wyniki overlay        │            │  - Brak połączeń         │
│  - Porty zdefiniowane    │            │  - Porty nieużywane      │
└──────────────────────────┘            └──────────────────────────┘
```

---

## 7. WYMAGANIA NAPRAWCZE

### 7.1 Wymagania KRYTYCZNE (MUST)

1. **N-01/N-05**: Zaimplementować renderowanie połączeń port↔port z orthogonal routing
2. **N-02**: Zaimplementować algorytm auto-layout (hierarchical top→down)
3. **N-03**: Naprawić copy/paste — musi tworzyć nowy element w modelu
4. **N-04**: Zunifikować symbole — editor musi używać biblioteki ETAP

### 7.2 Wymagania WAŻNE (SHOULD)

1. **N-06**: Zaimplementować snapping do portów
2. Dodać mechanizm "wstaw element na szynie"
3. Zunifikować viewer i editor (wspólne komponenty)

### 7.3 Wymagania OPCJONALNE (COULD)

1. **N-07**: Deterministyczne ID przy copy/paste (UUID v5 based on content hash)
2. Minimalizacja skrzyżowań w auto-layout

---

## 8. WERDYKT

| Kryterium | Ocena | Komentarz |
|-----------|-------|-----------|
| Zgodność ETAP | **30%** | Podstawy są, brak kluczowych funkcji |
| Zgodność PowerFactory | **35%** | Bijection OK, layout/routing FAIL |
| Profesjonalność | **NIEDOSTATECZNA** | Nie spełnia standardów przemysłowych |
| Gotowość produkcyjna | **NIE** | Wymaga znaczących poprawek |

### Podsumowanie

SLD w MV-DESIGN-PRO posiada poprawne **fundamenty architektoniczne** (bijection symbol↔element, definicje portów, biblioteka symboli ETAP), ale **brakuje kluczowych funkcji** wymaganych przez profesjonalne narzędzia:
- Wizualizacji połączeń
- Auto-layoutu
- Spójności editor↔viewer

**Rekomendacja**: Wstrzymać dalszy rozwój funkcjonalny SLD do momentu naprawienia niezgodności N-01 do N-04.

---

## 9. POWIĄZANE DOKUMENTY

- `SLD_KANONICZNA_SPECYFIKACJA.md` — wymagania docelowe
- `SLD_UI_ARCHITECTURE.md` — architektura UI
- `sld_rules.md` — reguły fundamentalne
- `etap_symbols/README.md` — biblioteka symboli

---

**Koniec dokumentu audytu**
