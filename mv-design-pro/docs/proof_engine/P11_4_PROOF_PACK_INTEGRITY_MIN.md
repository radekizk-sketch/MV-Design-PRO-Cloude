# P11.4-min — Proof Pack Integrity (signature.json, SHA-256)

## Cel

Minimalny poziom integralności Proof Pack (P11.4-min) polega na dołączeniu pliku `signature.json`
wyłącznie z hashami SHA-256 i metadanymi. Plik **nie jest podpisem kryptograficznym** i nie używa
kluczy prywatnych.

## Zasady

- `signature.json` jest generowany deterministycznie (sortowanie po `path`, stały JSON, LF).
- `pack_fingerprint` to SHA-256 z **konkatenacji** hashy plików w kolejności `path`.
- Brak hashowania całego ZIP (unika zależności od `signature.json`).
- Brak zmian solverów, Proof Engine ani matematyki.

## Struktura pliku

`proof_pack/signature.json` zawiera:

- `schema_version`: `"1.0"`
- `algorithm`: `"SHA-256"`
- `pack_fingerprint`: hash złączonych hashy plików
- `files`: lista plików z `path`, `sha256`, `bytes`, opcjonalnie `optional=true` dla PDF
- `toolchain`: `mv_design_pro_version`, `python_version`, `latex_engine`
- `notes_pl`: informacja o wyłącznie integralnościowej funkcji pliku
