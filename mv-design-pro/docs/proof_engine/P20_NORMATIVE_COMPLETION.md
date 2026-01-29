# P20 — Normative Completion Layer (PASS/FAIL)

**STATUS: CANONICAL (Analysis Layer)**
**Reference:** SYSTEM_SPEC.md, ARCHITECTURE.md, PLANS.md

---

## 1. Definicja P20

P20 to **warstwa interpretacji normatywnej** w Analysis layer. Konsumuje wyniki
Proof Packów (P11/P15/P17/P18/P19) i przekształca je w jawne statusy:
PASS / FAIL / WARNING / NOT COMPUTED / NOT EVALUATED.

P20 **nie wykonuje obliczeń fizycznych**, nie modyfikuje solverów i nie zmienia
Result API. To wyłącznie porównania wartości z ProofDocument względem limitów
z konfiguracji użytkownika.

---

## 2. Inwarianty (BINDING)

- Brak zmian w solverach i Result API.
- Brak nowych obliczeń fizycznych.
- Determinizm: te same wejścia generują identyczny raport.
- P20 nie jest Proof Packiem — to warstwa interpretacji.

---

## 3. Statusy

- PASS — spełniony warunek
- FAIL — warunek niespełniony
- WARNING — przekroczenie progu ostrzegawczego
- NOT COMPUTED — brak danych lub brak ProofDocument
- NOT EVALUATED — brak konfiguracji lub brak wymaganego porównania

---

## 4. Reguły (NR_*)

### P15 — Load Currents & Overload
- NR_P15_001: Obciążenie prądowe %In
- NR_P15_002: Obciążenie mocowe %Sn

### P18 — Protection Overcurrent
- NR_P18_001: Wyłączalność (breaking_ok)
- NR_P18_002: Dynamiczny (dynamic_ok)
- NR_P18_003: Cieplny (thermal_ok)
- NR_P18_004: Selektywność (selectivity_ok)

### P19 — Earthing / Ground Fault SN
- NR_P19_001: Napięcie dotykowe (u_touch_v)
- NR_P19_002: Prąd doziemny (i_earth_a)

### P11 / P17 — Coverage (INFO)
- NR_P11_001: SC3F availability (ikss_ka / ip_ka / ith_ka)
- NR_P17_001: Energy profile computed

---

## 5. Determinizm

Raport P20 ma deterministyczny identyfikator oparty o:
- kontekst (Project/Case/Run)
- listę ProofDocument
- konfigurację limitów

Sortowanie elementów raportu:
1. FAIL
2. WARNING
3. NOT COMPUTED
4. NOT EVALUATED
5. PASS

Następnie: rule_id, target_id.

---

## 6. Integracja z UI (koncept)

- Zakładka: **„Ocena normatywna”**
- Tryb read-only
- Widoki: lista reguł NR_*, statusy i krótkie uzasadnienia „WHY”
- Bez możliwości edycji wyników — tylko konfiguracja limitów

**PCC – punkt wspólnego przyłączenia** pozostaje wyłącznie w warstwie interpretacji.

---

**END OF P20**
