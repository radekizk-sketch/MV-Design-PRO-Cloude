# P11.3 — Proof Pack Publication (ZIP, deterministyczny)

**STATUS: CANONICAL & BINDING**  
**Version:** 1.0  
**Reference:** P11_1d_PROOF_UI_EXPORT.md, PROOF_SCHEMAS.md

---

## 1. Cel i zakres

Proof Pack jest deterministycznym pakietem publikacyjnym do audytu offline.  
Zawiera **kanoniczne źródła dowodu** (proof.json/tex/pdf) oraz manifest i hashe.  
Pakiet jest **read-only** i nie modyfikuje ProofDocument/TraceArtifact/Result.

---

## 2. Struktura ZIP (stała)

```
/proof_pack/
  manifest.json
  proof.json
  proof.tex
  proof.pdf            (opcjonalnie; tylko jeśli pipeline istnieje)
/assets/
  (puste w tym PR)
```

**Determinism:**
- kolejność wpisów ZIP jest stała (sortowanie po ścieżce)
- timestamp wpisów ZIP = `1980-01-01 00:00:00`
- nowe linie = `LF`

---

## 3. Manifest (manifest.json)

Minimalny kontrakt (BINDING):

```json
{
  "pack_version": "1.0",
  "created_at_utc": "2026-01-27T10:30:00Z",
  "project_id": "…",
  "case_id": "…",
  "run_id": "…",
  "snapshot_id": "…",
  "proof_type": "SC3F_IEC60909 | VDROP | QU_REGULATION | SC1_ASYM",
  "proof_fingerprint": "sha256(proof.json)",
  "files": [
    { "path": "proof_pack/proof.json", "sha256": "…", "bytes": 1234 }
  ],
  "toolchain": {
    "mv_design_pro_version": "…",
    "python_version": "3.11.x",
    "latex_engine": "pdflatex | null"
  },
  "determinism": {
    "canonical_json": true,
    "sorted_zip_entries": true,
    "stable_newlines": "LF",
    "notes_pl": "Pakiet jest deterministyczny dla identycznych wejść i toolchain."
  }
}
```

**Uwaga:** `created_at_utc` pochodzi z `ProofDocument.created_at` (jeśli brak → `1970-01-01T00:00:00Z`).  
**proof.json** to dokładny eksport kanoniczny ProofDocument.  
**proof.tex** to eksport z istniejącego LaTeXRenderer (blokowy `$$...$$`).

---

## 4. Determinizm

Ten sam ProofDocument + ten sam toolchain ⇒ identyczny ZIP (bit-for-bit).  
Brak losowych timestampów, brak zmiennych nazw, brak filtrowania wejść.

