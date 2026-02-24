# SLD GOLDEN NETWORKS MANIFEST (KANON)

**Status**: BINDING
**Data**: 2026-02-24
**Wersja**: 1.0.0
**Zakres**: Katalog 12+ golden networks dla testów determinizmu SLD

---

## 1. CEL

Golden networks to zamrożone fixtures topologii sieci SN/nN używane do weryfikacji:
- **Hash stability**: 100× layout → identyczny hash
- **Permutation invariance**: 50 permutacji wejścia → identyczny hash
- **Grid alignment**: wszystkie pozycje % GRID_BASE === 0
- **Orthogonal routing**: 0° lub 90° only
- **Zero overlaps**: brak nakładania symboli

Każda golden network jest deterministyczna — ten sam fixture → identyczny VisualGraphV1 → identyczny LayoutResultV1.

---

## 2. KATALOG SIECI

### GN-HYB-01: GPZ + 3 stacje radial (typ A)
- **Topologia**: Radialna, GPZ → 3 stacje w linii
- **Elementy**: GPZ source, szyna SN, 3 × (linia, szyna SN, TR SN/nN, szyna nN, load)
- **Symboli**: 18
- **Weryfikuje**: Podstawowy trunk layout, monotoniczny Y

### GN-HYB-02: GPZ + 5 stacji trunk + ring NOP
- **Topologia**: Trunk 5 stacji + zamknięcie ringerowe (NOP OPEN)
- **Elementy**: GPZ, szyna SN, 5 × (linia, szyna SN), NOP switch
- **Symboli**: 13
- **Weryfikuje**: Secondary connector routing, NOP lane index

### GN-HYB-03: GPZ + stacja B + PV
- **Topologia**: Szyna SN + PV source + feeder do stacji B
- **Elementy**: GPZ, PV, szyna SN, linia, stacja B z TR/nN/load
- **Symboli**: 8
- **Weryfikuje**: OZE PV jako źródło (nie load), bay classification oze_pv

### GN-HYB-04: GPZ + stacja C + branch + BESS
- **Topologia**: GPZ → szyna SN + BESS → linia → bus pośredni → branch do stacji C
- **Elementy**: GPZ, BESS, 2 linie, 3 szyny, TR, szyna nN
- **Symboli**: 10
- **Weryfikuje**: L-shape branch, BESS classification, multi-level trunk

### GN-HYB-05: GPZ + stacja D sekcyjna
- **Topologia**: GPZ → 2 sekcje szyn SN + sprzęgło + 2 feedery
- **Elementy**: GPZ, 2 szyny SN sekcyjne, sprzęgło (CB), 2 feedery
- **Symboli**: 8
- **Weryfikuje**: Bus coupler routing, dual-section GPZ

### GN-HYB-06: Multi-feeder GPZ (3 pola liniowe)
- **Topologia**: GPZ → szyna SN szeroka (800px) → 3 niezależne feedery
- **Elementy**: GPZ, szyna SN, 3 × (linia, szyna SN, load)
- **Symboli**: 10
- **Weryfikuje**: Multi-feeder bay classification, crossing minimization

### GN-HYB-07: Trunk + 3 L-shape branches
- **Topologia**: GPZ → trunk 3 węzły → z każdego branch + bus + load
- **Elementy**: GPZ, szyna SN, 3 × (linia trunk, szyna, linia branch, bus branch, load)
- **Symboli**: 16
- **Weryfikuje**: L-shape branch routing, deterministicBranchSide

### GN-HYB-08: Ring 4 stacje + NOP
- **Topologia**: GPZ → 4 stacje w pierścieniu → NOP zamykający ring
- **Elementy**: GPZ, szyna SN, 4 × (linia, szyna SN, TR, szyna nN, load), NOP
- **Symboli**: 22
- **Weryfikuje**: Full ring topology, NOP routing, secondary channel

### GN-HYB-09: PV + BESS + Wind
- **Topologia**: GPZ → szyna SN + PV + BESS + Wind + 1 load
- **Elementy**: GPZ, szyna SN, 3 źródła OZE, 1 load
- **Symboli**: 6
- **Weryfikuje**: Multi-OZE bay classification, source ordering

### GN-HYB-10: 20 stacji radial (stress)
- **Topologia**: GPZ → trunk 20 stacji liniowo
- **Elementy**: GPZ, szyna SN, 20 × (linia, szyna SN, load)
- **Symboli**: 62
- **Weryfikuje**: Stress test, performance, grid alignment at scale

### GN-HYB-11: Dual ring
- **Topologia**: GPZ → 2 niezależne pierścienie (A: 3 stacje, B: 3 stacje)
- **Elementy**: GPZ, szyna SN, 2 × (3 linie, 3 szyny, NOP)
- **Symboli**: 16
- **Weryfikuje**: Multi-ring routing, NOP lane assignment

### GN-HYB-12: Stacja D + sprzęgło + 2 feedery
- **Topologia**: GPZ → 2 sekcje SN + sprzęgło → feeder z każdej sekcji
- **Elementy**: GPZ, 2 szyny SN, sprzęgło, 2 feedery (jeden z TR/nN/load)
- **Symboli**: 13
- **Weryfikuje**: Sectional station layout, bus coupler, asymmetric feeders

---

## 3. TESTY NA GOLDEN NETWORK

Każda sieć jest testowana w `goldenLayoutHybrid.test.ts`:

| Test | Opis | Powtórzenia |
|------|------|-------------|
| Hash stability | Identyczny hash po wielokrotnym uruchomieniu | 100× |
| Permutation invariance | Identyczny hash po permutacji wejścia | 50× |
| Grid alignment | Wszystkie x,y % GRID_BASE === 0 | 1× per sieć |
| Orthogonal routing | Każdy segment 0° lub 90° | 1× per sieć |
| Zero overlaps | Brak nakładania symboli | 1× per sieć |
| Bounds coverage | bounds ⊇ all placements | 1× per sieć |
| LayoutResultV1 contract | Version=V1, sorted arrays | 1× per sieć |
| Hash uniqueness | 12 sieci → 12 różnych hashes | 1× globalnie |

**Łączna liczba testów**: 77

---

## 4. RENDER ARTEFAKTY

Każda golden network produkuje:
- `hash: string` — 8-znakowy hex FNV-1a
- `nodePlacements` — pozycje wszystkich węzłów
- `edgeRoutes` — trasy wszystkich krawędzi
- `bounds` — bounding box schematu

Artefakty są weryfikowane w CI — zmiana hash wymaga aktualizacji manifestu.

---

*Dokument wiążący. Golden networks są zamrożone — zmiana wymaga przeglądu architektonicznego.*
