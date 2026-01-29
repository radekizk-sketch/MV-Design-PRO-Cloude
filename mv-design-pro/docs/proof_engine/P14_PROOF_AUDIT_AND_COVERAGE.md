# P14 — Proof Audit & Coverage (warstwa audytu)

**STATUS: CANONICAL & BINDING**  
**Reference:** SYSTEM_SPEC.md, ARCHITECTURE.md, PLANS.md

---

## 1. Cel P14 (audit, nie obliczenia)

Warstwa P14 definiuje **kanoniczny audyt kompletności i pokrycia** Proof Packów.
P14 **nie wykonuje żadnych obliczeń**, **nie zmienia solverów** ani **Proof Engine**.
Jest to **warstwa meta**, stanowiąca źródło prawdy dla planowania pakietów P15–P19.

---

## 2. Definicje (BINDING)

### 2.1 Proof Coverage

**Proof Coverage** to formalny opis tego, **które obszary obliczeń posiadają dowód**,
które mają tylko solver, a które pozostają luką w dokumentacji dowodowej.
Coverage nie wprowadza nowych obliczeń ani kryteriów normatywnych.

### 2.2 Calculation Pack

**Calculation Pack** to kanoniczny, nazwany zakres obliczeń lub dowodu
przypisany do konkretnego pakietu P11–P19, z jednoznaczną referencją
do specyfikacji i dokumentów Proof Engine.

---

## 3. Zasady P14 (BINDING)

1. **registry-first** — rejestry i dokumenty kanoniczne są źródłem prawdy.
2. **doc-only** — P14 to wyłącznie dokumentacja (brak kodu).
3. **brak heurystyk** — żadnych domysłów ani uzupełnień poza źródłami kanonicznymi.
4. **brak interpretacji norm** — P14 nie interpretuje IEC ani PN-EN.

---

## 4. Kanoniczna tabela pokrycia (CORE)

| Calculation Pack | Status | Proof Exists | Solver Exists | Notes |
|------------------|--------|--------------|---------------|-------|
| SC3F (P11.1a) | DONE | TAK | TAK | Proof Pack P11.1a (SC3F) |
| VDROP (P11.1a) | DONE | TAK | TAK | Proof Pack P11.1a (VDROP) |
| Q(U) (P11.1b) | DONE | TAK | TAK | Proof Pack P11.1b |
| SC asym (1F, 2F, 2F-G) (P11.1c) | DONE | TAK | TAK | Proof Pack P11.1c (SKELETON) |
| Load Currents (P15) | TODO | NIE | NIEOKREŚLONE | Prerequisite: P14 coverage |
| Losses (P16) | TODO | NIE | NIEOKREŚLONE | Prerequisite: P14 coverage |
| Grounding / Earthing (P19) | TODO | NIE | NIEOKREŚLONE | Prerequisite: P14 coverage |
| PF Audit (local) | TODO | NIE | NIEOKREŚLONE | Audit lokalny wyników PF |

---

## 5. Checklist audytowy (BINDING)

1. **determinism** — identyczne wejścia dają identyczny ProofDocument.
2. **unit-check** — weryfikacja jednostek dla każdego kroku dowodu.
3. **anti-double-counting** — brak podwójnego zliczania współczynników i korekt.
4. **mapping keys present** — obecność kluczy mapowania w trace i wynikach.
5. **proof vs solver tolerance** — jawnie określona tolerancja porównania.

$$
\varepsilon
$$

---

## 6. Relacje i zależności (BINDING)

1. P14 jest **warstwą audytu** dla wszystkich Proof Packów.
2. P15–P19 **wymagają** obecności P14 jako kanonicznego źródła coverage.
3. P14 nie zmienia istniejących pakietów P11–P12.

---

**END OF P14**
