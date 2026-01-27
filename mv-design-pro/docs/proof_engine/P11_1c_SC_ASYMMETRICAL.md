# P11.1c — Zwarcia asymetryczne (składowe symetryczne)

**STATUS: SKELETON / BINDING STRUCTURE**

## Cel i zakres P11.1c

P11.1c definiuje wyłącznie **strukturę dowodu (White Box)** dla zwarć
asymetrycznych w ujęciu składowych symetrycznych. Dokument jest
**SAFE-BY-CONSTRUCTION PROOF SKELETON** i nie zawiera żadnych obliczeń
ani interpretacji norm.

Zakres obejmuje:
- strukturę kroków dowodowych,
- terminologię PN-EN,
- typy zwarć 1F–Z, 2F, 2F–Z,
- inwarianty Proof Engine.

## Terminologia PN-EN (PL)

- składowa zgodna (dodatnia): **I₁, Z₁**
- składowa przeciwna (ujemna): **I₂, Z₂**
- składowa zerowa: **I₀, Z₀**

## Typy zwarć

- **1F–Z** — zwarcie jednofazowe doziemne
- **2F** — zwarcie dwufazowe
- **2F–Z** — zwarcie dwufazowe doziemne

## Inwarianty

- **determinism** — identyczne wejście → identyczny dowód
- **anti-double-counting** — brak podwójnego uwzględniania współczynników
- **Equation Registry** = jedyne źródło matematyki

## STATUS (jawnie)

**STATUS: SKELETON / BINDING STRUCTURE**

## OUT OF SCOPE

- brak solverów
- brak obliczeń
- brak oceny normowej
