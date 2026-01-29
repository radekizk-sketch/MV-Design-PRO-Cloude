# Protection Insight (P22a) — UI Contract

## Widok
Results → **Zabezpieczenia → Analiza selektywności**

## Kolumny tabeli
- Aparat podstawowy
- Aparat rezerwowy
- Ik″ / Icu
- ip / Idyn
- I²t / Ith
- Margines [%]
- Status
- WHY

## Relacja do P18/P20
- Źródło wartości prądowych i energetycznych: **Proof P18** (Ik″, ip, I²t).
- Statusy selektywności i WHY: **P20 Normative Report** (rule_id = NR_P18_004).
- Marginesy [%] są normalizacją różnicy względem limitu (bez nowych obliczeń fizycznych).

## Zasady
- Widok jest **read-only** i deterministyczny.
- Krzywe I–t **nie są rysowane** — analiza deterministyczna.
