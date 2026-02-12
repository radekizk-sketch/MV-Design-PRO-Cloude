# Uruchomienia zbiorcze, Porownania i Nakladka Delta na SLD

## Opis

PR-21 dostarcza warstwe UI do:
1. Uruchamiania zadan wsadowych (batch) z wieloma scenariuszami zwarciowymi
2. Tworzenia i przegladania porownan wynikow (SCComparison)
3. Wizualizacji roznic na schemacie SLD (Delta Overlay)

## Architektura

### Backend

- **Mapper**: `application/result_mapping/sc_comparison_to_overlay_v1.py`
  - Mapuje `ShortCircuitComparison` (PR-20) na `OverlayPayloadV1` (PR-16)
  - 100% deterministyczny: ten sam input -> identyczny output + hash
  - Zero fizyki, zero heurystyk, zero kolorow hex

- **Endpoint**: `GET /api/execution/comparisons/{id}/sld-delta-overlay`
  - Zwraca `OverlayPayloadV1` z tokenami delta
  - Wlaczony `content_hash` do weryfikacji determinizmu

- **Endpoint**: `GET /api/execution/study-cases/{id}/comparisons`
  - Lista porownan dla przypadku obliczeniowego

### Frontend

#### Modul: `ui/batch-execution/`
- `types.ts` -- typy BatchJob, BatchJobStatus, CreateBatchRequest
- `api.ts` -- klient API (CRUD batch)
- `store.ts` -- Zustand store z deterministycznym sortowaniem
- `BatchPanel.tsx` -- panel listy zadan wsadowych + szczegoly

#### Modul: `ui/comparisons/`
- `types.ts` -- typy SCComparison, NumericDelta, DeltaOverlayPayload
- `api.ts` -- klient API (porownania + overlay delta)
- `store.ts` -- Zustand store z deterministycznym sortowaniem
- `ComparisonPanel.tsx` -- panel porownan z tabelami delt

#### Modul: `ui/sld-overlay/` (rozszerzenie PR-16)
- `sldDeltaOverlayStore.ts` -- store integrujacy overlay delta z PR-16
- `DeltaOverlayToggle.tsx` -- przelacznik "Roznice" na SLD
- `DeltaOverlayLegend.tsx` -- legenda roznic (PL, z backendu)
- `overlayTypes.ts` -- rozszerzone o tokeny delta

## Tokeny semantyczne

| Token | Znaczenie | Klasa CSS |
|-------|-----------|-----------|
| `delta_none` | Bez zmian | `sld-overlay-ok` |
| `delta_change` | Zmiana wartosci | `sld-overlay-warning` |
| `delta_inactive` | Brak danych | `sld-overlay-inactive` |

## Legenda (PL)

Legenda jest generowana przez backend i zawsze zawiera:
- **Bez zmian** -- wartosci identyczne w obu przebiegach
- **Zmiana** -- wartosc rozni sie miedzy przebiegami
- **Brak danych** -- element obecny tylko w jednym przebiegu

## Determinizm

Potwierdzony testami:
- Backend: 21 testow (`test_sc_comparison_overlay.py`)
- Frontend: 29 testow (store, token mapping, no-hex)
- Hash SHA-256 identyczny dla identycznych danych wejsciowych
- Sortowanie elementow leksykograficzne po `element_ref`

## Ograniczenia (v1)

- Brak progow krytycznosci (zero heurystyk)
- Animacje wylaczone dla nakladki delta
- Typ `CRITICAL` zarezerwowany ale nieuywany
