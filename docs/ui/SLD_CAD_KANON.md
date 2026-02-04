# SLD — CAD Geometry Canon

## 1) Tryby geometrii

SLD wspiera trzy kanoniczne tryby geometrii:

- **AUTO** — renderuje wyłącznie wynik auto‑layoutu (deterministyczny).
- **CAD** — renderuje overrides CAD; gdy brak override dla elementu, następuje fallback do AUTO.
- **HYBRID** — auto‑layout jako baza, a overrides CAD selektywnie nadpisują elementy.

## 2) Zrodla geometrii i priorytet

Wizualizacja opiera się na dwóch źródłach danych:

- `autoLayoutGeometry` — bazowy, deterministyczny układ.
- `cadOverridesGeometry` — dokument overrides z pozycjami CAD.

Priorytet:

1. AUTO → tylko `autoLayoutGeometry`.
2. CAD → `cadOverridesGeometry` wygrywa per element, fallback do AUTO gdy brak override.
3. HYBRID → jak CAD, z jawną semantyką „selektywnych nadpisań”.

## 3) Fingerprint i status overrides

Overrides są powiązane z fingerprintem wejściowego modelu/topologii (`baseFingerprint`).
Status audytu:

- **VALID** — fingerprint zgodny i wszystkie referencje istnieją.
- **STALE** — fingerprint różny, ale referencje wciąż istnieją.
- **CONFLICT** — brakujące ID lub niepoprawne dane (NaN/Infinity).

## 4) Deterministyczna serializacja

`CadOverridesDocument` jest serializowany w sposób deterministyczny:

- Klucze map (`nodes`, `edges`, `labels`) są sortowane.
- Kolejność pól dokumentu jest stabilna.
- Ten sam dokument zawsze daje identyczny JSON.

## 5) Audyt i eksport

Deterministyczna serializacja jest podstawą do audytu, eksportu i testów regresji.
Status overrides musi być przechowywany w stanie UI (bez narzędzi edycji w tym zakresie).
