# BoundaryNode Occurrences — skan repo (SLD/UI)

| Plik | Linia (przed zmianą) | Rola | Działanie |
|---|---:|---|---|
| `frontend/src/ui/sld/SldEditorPage.tsx` | 41-44, 77, 86 | seed/demo render | Usunięto `bus_connection_node`, przepięto `Sieć zasilająca` na `bus_main`. |
| `frontend/src/ui/sld/SLDViewPage.tsx` | 31-34, 67, 76 | seed/demo render | Usunięto `bus_connection_node`, przepięto połączenia na realne szyny SN. |
| `frontend/src/ui/sld-editor/utils/topological-layout/roleAssigner.ts` | 132+ | filtr topo->SLD | Wzmocniono filtr obronny po `name/id/elementId/type` dla wzorców BoundaryNode. |
| `frontend/src/ui/sld/inspector/selectionResolver.ts` | 70+ | selection/inspector | Dodano guard selekcji BoundaryNode + fallback dla źródła, bez crash. |
| `frontend/src/ui/navigation/urlState.ts` | 60+ | selection↔URL | Dodano blokadę kodowania/dekodowania `?sel=` dla identyfikatorów BoundaryNode. |
| `frontend/src/ui/inspector/types.ts` | 106, 116 | copy UI | Usunięto etykiety sekcji/flagi BoundaryNode z warstwy UI. |
| `frontend/src/ui/__tests__/wizard-sld-unity.test.ts` | sekcja URL sync | test | Dodano asercje, że URL nie przenosi selekcji BoundaryNode. |
| `frontend/src/ui/sld/inspector/__tests__/selectionResolver.test.ts` | nowa sekcja | test | Dodano testy ochronne dla selekcji BoundaryNode i fallbacku źródła. |

> Zakres skanu obejmował: SLD UI, silnik topologii, selection↔URL, inspector, testy i fixture’y frontendowe.
