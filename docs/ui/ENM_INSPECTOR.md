# Inspektor ENM — Kontrakt UI (v4.2)

## 1. Cel

Inspektor ENM daje pełną transparentność modelu sieci:
- Drzewo elementów ENM
- Panel diagnostyki (E-Dxx)
- Macierz analiz (pre-flight)
- Diff rewizji

## 2. Route

```
#enm-inspector → Inspektor modelu
```

Dostępny we wszystkich trybach (MODEL_EDIT, CASE_CONFIG, RESULT_VIEW).
Read-only — nie modyfikuje modelu.

## 3. Widoki (Tabs)

### 3.1 Drzewo ENM

Hierarchiczny widok elementów:
- Szyny (Bus)
- Linie (LineBranch)
- Kable (LineBranch/CABLE)
- Transformatory (TransformerBranch)
- Łączniki (Switch)
- Źródła (Source/InverterSource)
- Obciążenia (Load)

Funkcje:
- Wyszukiwarka elementów
- Rozwijanie/zwijanie kategorii
- Klik → highlight w SLD (ref_id)
- Zliczanie problemów per element

### 3.2 Diagnostyka

Lista problemów E-Dxx:
- Filtry severity: Wszystkie | Blokady | Ostrzeżenia | Informacje
- Klik na problem → zaznaczenie affected elements
- Komunikaty i wskazówki po polsku

### 3.3 Pre-flight (Macierz analiz)

Tabela przed RUN:
- SC 3F | SC 1F | LF | Protection
- Status: Dostępna / Zablokowana
- Powód + kody blokujące

### 3.4 Rewizje (Diff)

Porównanie dwóch snapshotów ENM:
- Dodano / Usunięto / Zmieniono
- Zmiany field-level
- Fingerprint rewizji

## 4. Zasady UX

- **Język**: Polski nazwy i komunikaty
- **Brak nazw kodowych**: Żadnych Pxx w UI
- **Read-only**: Nie modyfikuje modelu
- **Deep-link**: URL ↔ selekcja
- **Test IDs**: Deterministyczne data-testid

## 5. Integracja

- Klik w drzewie ENM → `selectElement()` w SLD
- Klik na problem → zaznaczenie affected_refs
- Dane z API: `/api/cases/{id}/diagnostics`
- Stan: Zustand store `useEnmInspectorStore`

## 6. Komponenty

| Komponent | Plik | Rola |
|-----------|------|------|
| EnmInspectorPage | EnmInspectorPage.tsx | Strona główna |
| EnmTree | EnmTree.tsx | Drzewo elementów |
| DiagnosticsPanel | DiagnosticsPanel.tsx | Lista problemów |
| PreflightMatrix | PreflightMatrix.tsx | Macierz analiz |
| EnmDiffView | EnmDiffView.tsx | Diff rewizji |
