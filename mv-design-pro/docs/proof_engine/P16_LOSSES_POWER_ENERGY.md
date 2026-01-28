# P16 — Straty mocy i energii (Lines & Transformers)

**STATUS: CANONICAL & BINDING**

## Cel

Pakiet P16 dostarcza pełny dowód strat mocy i energii dla linii, kabli i transformatorów.

Dowód ma format:
- Wzór
- Dane
- Podstawienie
- Wynik
- Weryfikacja jednostek

## Wejście — LossesInput

Pola wymagane wspólne:

- Identyfikacja projektu i przypadku:

$$
project\_name,\quad case\_name,\quad run\_timestamp
$$

- Rodzaj elementu:

$$
element\_kind \in \{\text{LINE},\text{CABLE},\text{TRANSFORMER}\}
$$

- Napięcie międzyfazowe:

$$
u\_ll\_kv
$$

### Linia / kabel

- Prąd obciążenia lub moc pozorna:

$$
i\_a\quad \text{lub}\quad s\_mva
$$

- Rezystancja fazy:

$$
r\_ohm
$$

### Transformator

- Straty jałowe:

$$
p0\_kw
$$

- Straty obciążeniowe przy prądzie znamionowym:

$$
pk\_kw
$$

- Stopień obciążenia:

$$
k\_load
$$

### Profil energii (opcjonalnie)

- Lista godzin profilu:

$$
profile\_hours
$$

- Lista współczynników obciążenia:

$$
profile\_factor
$$

## Rejestr równań (P16)

### EQ_LS_001 — prąd roboczy

$$
I = \frac{S}{\sqrt{3} \cdot U_{LL}}
$$

### EQ_LS_002 — straty linii/kabla

$$
P_{loss} = 3 I^{2} R
$$

### EQ_LS_003 — straty obciążeniowe transformatora

$$
P_{k,act} = P_k \cdot k_{load}^{2}
$$

### EQ_LS_004 — straty całkowite transformatora

$$
P_{loss} = P_0 + P_{k,act}
$$

### EQ_LS_005 — energia strat

$$
E_{loss} = \sum P_{loss,i} \cdot \Delta t
$$

## Kolejność kroków

### Linia / kabel

$$
EQ\_LS\_001 \rightarrow EQ\_LS\_002
$$

Jeżeli prąd jest dostarczony bezpośrednio:

$$
EQ\_LS\_002
$$

### Transformator

$$
EQ\_LS\_003 \rightarrow EQ\_LS\_004
$$

### Energia strat (opcjonalnie)

$$
EQ\_LS\_005
$$

## Klucze mapowania (mapping\_keys)

### Linia / kabel

$$
i\_a,\ s\_mva,\ u\_ll\_kv,\ r\_ohm,\ p\_loss\_kw
$$

### Transformator

$$
p0\_kw,\ pk\_kw,\ k\_load,\ p\_k\_act\_kw,\ p\_loss\_kw
$$

### Energia

$$
profile\_hours,\ profile\_factor,\ p\_loss\_profile\_kw,\ e\_loss\_kwh
$$

## Weryfikacja jednostek

Konwersje jawne:

$$
W \rightarrow kW
$$

$$
kW \cdot h \rightarrow kWh
$$
