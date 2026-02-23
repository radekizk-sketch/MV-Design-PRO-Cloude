# UI V3 — MAPA REPOZYTORIUM (RECON)

**Status**: BINDING
**Data**: 2026-02-23
**Cel**: Pełna mapa plików repozytorium istotnych dla architektury UI V3

---

## 1. FRONTEND — PIPELINE SLD

### 1.1 SLD Core (kontrakty i pipeline)
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/ui/sld/core/visualGraph.ts` | Kontrakt VisualGraphV1 (węzły, krawędzie, porty) |
| `frontend/src/ui/sld/core/topologyAdapterV1.ts` | Publiczne API adaptera (deleguje do V2) |
| `frontend/src/ui/sld/core/topologyAdapterV2.ts` | Adapter domenowy — budowa grafu wizualnego z ENM |
| `frontend/src/ui/sld/core/topologyInputReader.ts` | Odczyt typów domenowych (wejście ENM) |
| `frontend/src/ui/sld/core/layoutPipeline.ts` | Orkiestracja układu (5-fazowy pipeline) |
| `frontend/src/ui/sld/core/layoutResult.ts` | Kontrakt LayoutResultV1 |
| `frontend/src/ui/sld/core/stationBlockBuilder.ts` | Budowa bloku stacji |
| `frontend/src/ui/sld/core/switchgearConfig.ts` | Konfiguracja rozdzielnicy V1 |
| `frontend/src/ui/sld/core/switchgearRenderer.ts` | Renderowanie pól i aparatów |
| `frontend/src/ui/sld/core/fieldDeviceContracts.ts` | Taksonomia polska (Pola, Aparaty) |
| `frontend/src/ui/sld/core/geometryOverrides.ts` | Nadpisania geometrii trybu projektowego |
| `frontend/src/ui/sld/core/applyOverrides.ts` | Kompozycja efektywnego układu |
| `frontend/src/ui/sld/core/elementRef.ts` | Jednolita tożsamość elementu |
| `frontend/src/ui/sld/core/readinessProfile.ts` | Bramki gotowości per analiza |
| `frontend/src/ui/sld/core/resultJoin.ts` | Most: Snapshot + ResultSet → tokeny overlay |
| `frontend/src/ui/sld/core/exportManifest.ts` | Deterministyczna tożsamość eksportu |
| `frontend/src/ui/sld/core/pvBessValidation.ts` | Kontrakt transformatora PV/BESS |
| `frontend/src/ui/sld/core/tccChart.ts` | Wykres charakterystyki czasowo-prądowej |
| `frontend/src/ui/sld/core/exportTypes.ts` | Kontrakty formatów eksportu |
| `frontend/src/ui/sld/core/keyboardShortcuts.ts` | Skróty klawiszowe edytora |
| `frontend/src/ui/sld/core/index.ts` | Centralny hub eksportów |

### 1.2 Silnik układu (engine/sld-layout)
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/engine/sld-layout/pipeline.ts` | Główny orkiestrator |
| `frontend/src/engine/sld-layout/phase1-voltage-bands.ts` | Faza 1: Przypisanie pasm napięciowych |
| `frontend/src/engine/sld-layout/phase2-bay-detection.ts` | Faza 2: Wykrywanie pól |
| `frontend/src/engine/sld-layout/phase3-crossing-min.ts` | Faza 3: Minimalizacja skrzyżowań |
| `frontend/src/engine/sld-layout/phase4-coordinates.ts` | Faza 4: Przypisanie współrzędnych |
| `frontend/src/engine/sld-layout/phase5-routing.ts` | Faza 5: Trasowanie krawędzi i etykiet |
| `frontend/src/engine/sld-layout/station-geometry.ts` | Geometria stacji |
| `frontend/src/engine/sld-layout/types.ts` | Definicje typów pipeline |
| `frontend/src/engine/sld-layout/config/voltage-colors.ts` | Mapowanie kolorów napięć |

### 1.3 Renderer SLD i symbole
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/ui/sld/SldEditorPage.tsx` | Główna strona edytora (POWERFACTORY_LAYOUT) |
| `frontend/src/ui/sld/SLDViewPage.tsx` | Podgląd tylko do odczytu |
| `frontend/src/ui/sld/SLDViewCanvas.tsx` | Komponent canvas |
| `frontend/src/ui/sld/EtapSymbolRenderer.tsx` | Renderowanie symboli ETAP |
| `frontend/src/ui/sld/BranchRenderer.tsx` | Renderowanie odcinków |
| `frontend/src/ui/sld/ConnectionRenderer.tsx` | Renderowanie połączeń |
| `frontend/src/ui/sld/StationFieldRenderer.tsx` | Renderowanie pól stacji |
| `frontend/src/ui/sld/TrunkSpineRenderer.tsx` | Renderowanie magistrali |
| `frontend/src/ui/sld/SldTechLabelsLayer.tsx` | Warstwa etykiet technicznych |
| `frontend/src/ui/sld/PowerFlowOverlay.tsx` | Overlay wyników rozpływu mocy |
| `frontend/src/ui/sld/ProtectionOverlayLayer.tsx` | Overlay zabezpieczeń |
| `frontend/src/ui/sld/DiagnosticsOverlay.tsx` | Overlay diagnostyki |
| `frontend/src/ui/sld/ResultsOverlay.tsx` | Overlay wyników ogólnych |
| `frontend/src/ui/sld/SymbolResolver.ts` | Mapowanie symboli |
| `frontend/src/ui/sld/IndustrialAesthetics.ts` | Styl przemysłowy ETAP/PSSE |
| `frontend/src/ui/sld/energization.ts` | Stan zasilania szyn |
| `frontend/src/ui/sld/domainOpsClient.ts` | Klient operacji domenowych |

### 1.4 Edytor SLD (sld-editor)
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/ui/sld-editor/SldEditor.tsx` | Komponent edytora |
| `frontend/src/ui/sld-editor/SldCanvas.tsx` | Canvas renderujący |
| `frontend/src/ui/sld-editor/SldToolbar.tsx` | Pasek narzędzi edytora |
| `frontend/src/ui/sld-editor/SldEditorStore.ts` | Magazyn stanu edytora (Zustand) |
| `frontend/src/ui/sld-editor/types.ts` | Definicje typów edytora |
| `frontend/src/ui/sld-editor/hooks/useSldDrag.ts` | Interakcje przeciągania |
| `frontend/src/ui/sld-editor/hooks/useSldDragCad.ts` | Przeciąganie CAD (tryb projektowy) |
| `frontend/src/ui/sld-editor/hooks/useAutoLayout.ts` | Wyzwalacz auto-układu |
| `frontend/src/ui/sld-editor/hooks/useKeyboardShortcuts.ts` | Skróty klawiszowe |
| `frontend/src/ui/sld-editor/commands/CopyPasteCommand.ts` | Kopiuj/Wklej |
| `frontend/src/ui/sld-editor/commands/AlignDistributeCommand.ts` | Wyrównaj/Rozłóż |
| `frontend/src/ui/sld-editor/commands/MultiSymbolMoveCommand.ts` | Przesunięcie wielu symboli |
| `frontend/src/ui/sld-editor/cad/geometryContract.ts` | Kontrakt geometrii CAD |
| `frontend/src/ui/sld-editor/utils/deterministicId.ts` | Generowanie deterministycznych ID |
| `frontend/src/ui/sld-editor/utils/sldValidator.ts` | Walidacja SLD |
| `frontend/src/ui/sld-editor/utils/topological-layout/topologicalLayoutEngine.ts` | Silnik układu topologicznego |

### 1.5 System overlay (sld-overlay)
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/ui/sld-overlay/overlayStore.ts` | Magazyn stanu overlay (Zustand) |
| `frontend/src/ui/sld-overlay/overlayTypes.ts` | Definicje typów |
| `frontend/src/ui/sld-overlay/OverlayEngine.ts` | Silnik obliczeń overlay |
| `frontend/src/ui/sld-overlay/LoadFlowOverlayAdapter.ts` | Adapter rozpływu mocy |
| `frontend/src/ui/sld-overlay/variantStore.ts` | Magazyn selekcji wariantów |
| `frontend/src/ui/sld-overlay/sldDeltaOverlayStore.ts` | Magazyn overlay delta |
| `frontend/src/ui/sld-overlay/useOverlayRuntime.ts` | Hook środowiska uruchomieniowego |

---

## 2. FRONTEND — KREATOR I NAWIGACJA

### 2.1 Kreator (designer)
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/designer/DesignerPage.tsx` | Główna strona projektanta |
| `frontend/src/designer/SnapshotView.tsx` | Widok migawki |
| `frontend/src/designer/api.ts` | Klient API |
| `frontend/src/designer/types.ts` | Definicje typów |

### 2.2 Kreator sieci (wizard)
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/ui/wizard/WizardPage.tsx` | Główna strona (K1-K10) |
| `frontend/src/ui/wizard/WizardSldPreview.tsx` | Podgląd SLD |
| `frontend/src/ui/wizard/useWizardStore.ts` | Hook magazynu kreatora |
| `frontend/src/ui/wizard/wizardStateMachine.ts` | Maszyna stanów (K1→K10) |
| `frontend/src/ui/wizard/switchgear/SwitchgearWizardPage.tsx` | Strona rozdzielnicy |
| `frontend/src/ui/wizard/switchgear/StationListScreen.tsx` | Lista stacji (K2) |
| `frontend/src/ui/wizard/switchgear/StationEditScreen.tsx` | Edycja stacji (K3) |
| `frontend/src/ui/wizard/switchgear/FieldEditScreen.tsx` | Edycja pola (K4) |
| `frontend/src/ui/wizard/switchgear/useSwitchgearOps.ts` | Hook operacji |

### 2.3 Nawigacja
| Plik | Odpowiedzialność |
|------|-----------------|
| `frontend/src/ui/navigation/routes.ts` | Definicje tras (polskie etykiety) |
| `frontend/src/ui/navigation/useUrlSelectionSync.ts` | Synchronizacja URL ↔ selekcja |
| `frontend/src/ui/navigation/urlState.ts` | Zarządzanie stanem URL |

---

## 3. FRONTEND — MAGAZYNY STANU (ZUSTAND)

| Magazyn | Ścieżka | Zakres |
|---------|---------|--------|
| AppState (globalny) | `ui/app-state/store.ts` | Projekt, przypadek, tryb, analiza |
| SldEditorStore | `ui/sld-editor/SldEditorStore.ts` | Symbole SLD, selekcja, drag, schowek |
| OverlayStore | `ui/sld-overlay/overlayStore.ts` | activeRunId, overlay, enabled |
| VariantStore | `ui/sld-overlay/variantStore.ts` | Selekcja wariantów |
| DeltaOverlayStore | `ui/sld-overlay/sldDeltaOverlayStore.ts` | Overlay porównawczy |
| SelectionStore | `ui/selection/store.ts` | Selekcja elementów |
| TopologyStore | `ui/topology/store.ts` | Drzewo topologii |
| SnapshotStore | `ui/topology/snapshotStore.ts` | Migawka bieżąca |
| DiagnosticsStore | `ui/sld/diagnosticsStore.ts` | Stan diagnostyki |
| EnmStore | `ui/sld/useEnmStore.ts` | Model energetyczny sieci |
| SldModeStore | `ui/sld/sldModeStore.ts` | Tryb SLD |
| SldProjectModeStore | `ui/sld/sldProjectModeStore.ts` | Tryb projektowy SLD |
| OperationalModeStore | `ui/sld/operationalModeStore.ts` | Tryb operacyjny |
| LabelModeStore | `ui/sld/labelModeStore.ts` | Tryb etykiet |
| WizardStore | `ui/wizard/useWizardStore.ts` | Stan kreatora |
| SwitchgearStore | `ui/wizard/switchgear/useSwitchgearStore.ts` | Konfiguracja rozdzielnicy |
| ResultsStore | `ui/results/resultsStore.ts` | Wyniki ogólne |
| ResultsWorkspaceStore | `ui/results-workspace/store.ts` | Przestrzeń wyników |
| ResultsBrowserStore | `ui/results-browser/store.ts` | Przeglądarka wyników |
| ResultsInspectorStore | `ui/results-inspector/store.ts` | Inspektor wyników |
| StudyCasesStore | `ui/study-cases/store.ts` | Przypadki obliczeniowe |
| RunStore | `ui/study-cases/runStore.ts` | Przebiegi obliczeń |
| BatchStore | `ui/batch-execution/store.ts` | Obliczenia wsadowe |
| FaultScenariosStore | `ui/fault-scenarios/store.ts` | Scenariusze zwarciowe |
| HistoryStore | `ui/history/HistoryStore.ts` | Cofnij/Powtórz |
| NotificationsStore | `ui/notifications/store.ts` | Powiadomienia |
| DataManagerStore | `ui/data-manager/store.ts` | Zarządzanie danymi |
| EngineeringReadinessStore | `ui/engineering-readiness/store.ts` | Gotowość inżynierska |
| ReadinessLiveStore | `ui/engineering-readiness/readinessLiveStore.ts` | Gotowość na żywo |
| ComparisonsStore | `ui/comparisons/store.ts` | Porównania |
| ProtectionEngineStore | `ui/protection-engine-v1/store.ts` | Silnik zabezpieczeń |
| ProtectionDiagnosticsStore | `ui/protection-diagnostics/store.ts` | Diagnostyka zabezpieczeń |
| ProtectionResultsStore | `ui/protection-results/store.ts` | Wyniki zabezpieczeń |
| AnalysisEligibilityStore | `ui/analysis-eligibility/store.ts` | Kwalifikacja analiz |
| EnmInspectorStore | `ui/enm-inspector/store.ts` | Inspektor ENM |
| ReferencePatterns | `ui/reference-patterns/store.ts` | Wzorce referencyjne |
| PowerFlowResults | `ui/power-flow-results/store.ts` | Wyniki rozpływu mocy |

**Łącznie**: ~37 magazynów Zustand

---

## 4. FRONTEND — KONTRAKTY API I POBIERANIE DANYCH

| Klient API | Ścieżka |
|-----------|---------|
| Kontrakty wyników | `ui/contracts/results.ts` (ResultSetV1 — ZAMROŻONE) |
| Kreator API | `designer/api.ts` |
| Topologia CRUD | `ui/topology/api.ts` |
| Operacje domenowe (topologia) | `ui/topology/domainApi.ts` |
| Klient operacji (SLD) | `ui/sld/domainOpsClient.ts` |
| Konfiguracja rozdzielnicy API | `ui/sld/core/switchgearConfigApi.ts` |
| Nadpisania geometrii API | `ui/sld/core/overridesApi.ts` |
| Katalog typów API | `ui/catalog/api.ts` |
| Zabezpieczenia API | `ui/protection/api.ts` |
| Inspektor wyników API | `ui/results-inspector/api.ts` |
| Wzorce referencyjne API | `ui/reference-patterns/api.ts` |
| Archiwum projektu API | `ui/project-archive/api.ts` |

---

## 5. FRONTEND — INSPEKTOR I SIATKA WŁAŚCIWOŚCI

| Plik | Odpowiedzialność |
|------|-----------------|
| `ui/property-grid/PropertyGrid.tsx` | Główna siatka właściwości |
| `ui/property-grid/PropertyGridContainer.tsx` | Kontener |
| `ui/property-grid/ElementInspector.tsx` | Szczegóły elementu |
| `ui/property-grid/EngineeringInspector.tsx` | Widok inżynierski |
| `ui/property-grid/PropertyGridMultiEdit.tsx` | Edycja wsadowa |
| `ui/property-grid/field-definitions.ts` | Kontrakty definicji pól |
| `ui/property-grid/validation.ts` | Walidacja pól |

---

## 6. FRONTEND — MODUŁ CDSE

| Plik | Odpowiedzialność |
|------|-----------------|
| `modules/sld/cdse/contextResolver.ts` | Rozwiązywanie kontekstu |
| `modules/sld/cdse/operationExecutor.ts` | Wykonywanie operacji |
| `modules/sld/cdse/sldEventRouter.ts` | Routing zdarzeń |
| `modules/sld/cdse/selectionSync.ts` | Synchronizacja selekcji |
| `modules/sld/cdse/readinessSync.ts` | Synchronizacja gotowości |
| `modules/sld/cdse/overlayUpdater.ts` | Aktualizacja overlay |
| `modules/sld/cdse/catalogPreviewEngine.ts` | Podgląd katalogu |
| `modules/sld/cdse/modalDispatcher.ts` | Dyspozycja modali |

---

## 7. BACKEND — OPERACJE DOMENOWE

### 7.1 Kanoniczne operacje (39 operacji)
| Plik | Odpowiedzialność |
|------|-----------------|
| `backend/src/domain/canonical_operations.py` | Rejestr 39 operacji kanonicznych |
| `backend/src/enm/domain_operations.py` | Implementacja operacji domenowych ENM |
| `backend/src/enm/domain_operations_v2.py` | Wersja V2 operacji |
| `backend/src/enm/domain_ops_models.py` | DomainOpEnvelope, DomainOpPayload, DomainOpResponse |
| `backend/src/api/domain_operations.py` | Endpoint API dyspozycji operacji |

### 7.2 Gotowość i FixActions
| Plik | Odpowiedzialność |
|------|-----------------|
| `backend/src/domain/readiness.py` | ReadinessProfileV1, ReadinessAreaV1, ReadinessPriority |
| `backend/src/domain/readiness_fix_actions.py` | Mapowanie kodów gotowości na FixAction |
| `backend/src/enm/fix_actions.py` | FixAction (OPEN_MODAL, NAVIGATE_TO_ELEMENT, SELECT_CATALOG, ADD_MISSING_DEVICE) |

### 7.3 Migawka (Snapshot)
| Plik | Odpowiedzialność |
|------|-----------------|
| `backend/src/network_model/core/snapshot.py` | NetworkSnapshot (niemutowalny, odcisk SHA-256) |
| `backend/src/application/snapshots/service.py` | Persystencja i pobieranie migawek |
| `backend/src/infrastructure/persistence/repositories/snapshot_repository.py` | Repozytorium migawek |

### 7.4 Model sieci (core)
| Plik | Odpowiedzialność |
|------|-----------------|
| `backend/src/network_model/core/node.py` | Węzeł (szyna elektryczna) |
| `backend/src/network_model/core/branch.py` | Gałąź (linia, kabel, transformator) |
| `backend/src/network_model/core/switch.py` | Łącznik/Wyłącznik |
| `backend/src/network_model/core/generator.py` | Źródło generatorowe |
| `backend/src/network_model/core/inverter.py` | Źródło falownikowe (PV, BESS) |
| `backend/src/network_model/core/graph.py` | NetworkGraph (sąsiedztwo, przechodzenie) |
| `backend/src/network_model/core/station.py` | Stacja (kontener logiczny) |
| `backend/src/network_model/core/ybus.py` | Macierz admitancyjna Y-bus |
| `backend/src/network_model/core/canonical_hash.py` | Kanoniczny odcisk palca elementu |
| `backend/src/network_model/core/action_envelope.py` | Koperta akcji mutacji modelu |
| `backend/src/network_model/core/action_apply.py` | Logika aplikacji akcji |

### 7.5 ENM (Energy Network Model)
| Plik | Odpowiedzialność |
|------|-----------------|
| `backend/src/enm/models.py` | EnergyNetworkModel (Pydantic frozen) |
| `backend/src/enm/topology.py` | Inspekcja topologii (find_path, get_upstream) |
| `backend/src/enm/topology_ops.py` | Niskopoziomowe operacje topologiczne |
| `backend/src/enm/mapping.py` | Mapowanie NetworkGraph ↔ ENM |
| `backend/src/enm/validator.py` | Reguły walidacji ENM |
| `backend/src/enm/hash.py` | Obliczenie hashy ENM |

### 7.6 Katalog typów
| Plik | Odpowiedzialność |
|------|-----------------|
| `backend/src/network_model/catalog/types.py` | CatalogRef, CatalogElement |
| `backend/src/network_model/catalog/resolver.py` | Rozwiązywanie typów katalogowych |
| `backend/src/network_model/catalog/governance.py` | Zarządzanie wersjami katalogu |
| `backend/src/network_model/catalog/materialization.py` | Materializacja typów |
| `backend/src/network_model/catalog/readiness_checker.py` | Sprawdzanie gotowości katalogu |

### 7.7 Solvery (wyłącznie fizyka, WHITE BOX)
| Plik | Odpowiedzialność |
|------|-----------------|
| `backend/src/network_model/solvers/short_circuit_iec60909.py` | Solver zwarciowy IEC 60909 |
| `backend/src/network_model/solvers/short_circuit_core.py` | Rdzeń obliczeń zwarciowych |
| `backend/src/network_model/solvers/power_flow_newton.py` | Solver Newton-Raphson |
| `backend/src/network_model/solvers/power_flow_gauss_seidel.py` | Solver Gauss-Seidel |
| `backend/src/network_model/solvers/power_flow_fast_decoupled.py` | Solver szybki rozprzężony |
| `backend/src/network_model/solvers/power_flow_result.py` | PowerFlowResult (ZAMROŻONE API) |

---

## 8. BACKEND — ENDPOINTY API (48 modułów)

| Moduł API | Ścieżka |
|-----------|---------|
| Główna aplikacja | `backend/src/api/main.py` |
| Operacje domenowe | `backend/src/api/domain_operations.py` |
| Projekty | `backend/src/api/projects.py` |
| Przypadki obliczeniowe | `backend/src/api/cases.py`, `study_cases.py` |
| Migawki | `backend/src/api/snapshots.py` |
| Przebiegi analiz | `backend/src/api/analysis_runs.py` |
| Scenariusze zwarciowe | `backend/src/api/fault_scenarios.py` |
| Rozpływ mocy | `backend/src/api/power_flow_runs.py` |
| Zabezpieczenia | `backend/src/api/protection_runs.py` |
| SLD | `backend/src/api/sld.py` |
| Nadpisania SLD | `backend/src/api/sld_overrides.py` |
| Katalog | `backend/src/api/catalog.py` |
| Paczka dowodowa | `backend/src/api/proof_pack.py` |
| Archiwum projektu | `backend/src/api/project_archive.py` |
| Diagnostyka | `backend/src/api/diagnostics.py` |
| Porównania | `backend/src/api/comparison.py` |
| Kontrakt wyników V1 | `backend/src/api/result_contract_v1.py` |

---

## 9. DOKUMENTACJA ISTNIEJĄCA

### 9.1 Kontrakty UI (35 plików)
Katalog: `mv-design-pro/docs/ui/`
- `SLD_UI_CONTRACT.md`, `SLD_SCADA_CAD_CONTRACT.md`
- `RESULTS_BROWSER_CONTRACT.md`, `ELEMENT_INSPECTOR_CONTRACT.md`
- `EXPERT_MODES_CONTRACT.md`, `PROTECTION_INSIGHT_CONTRACT.md`
- `KANON_KREATOR_SN_NN_NA_ZYWO.md`, `KONTRAKT_OPERACJI_ENM_OP.md`
- `BRAKI_DANYCH_FIXACTIONS.md`, `UX_FLOW_SN_V1_GPZ_LIVE_SLD.md`
- (oraz 24 dalsze — patrz katalog)

### 9.2 Specyfikacja (18 rozdziałów)
Katalog: `mv-design-pro/docs/spec/`
- Rozdziały SPEC_CHAPTER_01 do SPEC_CHAPTER_18
- `AUDIT_SPEC_VS_CODE.md` — analiza luk spec ↔ kod

### 9.3 Dokumentacja SLD (10 plików)
Katalog: `mv-design-pro/docs/sld/`
- `SLD_ALGORITHM_LAYOUT_SPEC.md`, `SLD_TOPOLOGICAL_ENGINE.md`
- `SLD_PROJECT_MODE_OVERRIDES_V1.md`, `SLD_TEST_MATRIX.md`
- `SLD_SINGLE_SOURCE_OF_TRUTH_MAP.md`

---

## 10. STRAŻNICY CI (33 skrypty)

| Strażnik | Ścieżka | Cel |
|----------|---------|-----|
| pcc_zero_guard | `scripts/pcc_zero_guard.py` | Zero PCC/BoundaryNode w NetworkModel |
| domain_no_guessing | `scripts/domain_no_guessing_guard.py` | Brak heurystyk domenowych |
| canonical_ops | `scripts/canonical_ops_guard.py` | Wymuszanie operacji kanonicznych |
| readiness_codes | `scripts/readiness_codes_guard.py` | Walidacja bramek gotowości |
| no_codenames | `scripts/no_codenames_guard.py` | Blokada nazw kodowych w UI |
| dialog_completeness | `scripts/dialog_completeness_guard.py` | Kompletność kontraktów dialogów |
| local_truth | `scripts/local_truth_guard.py` | Spójność lokalna/zdalna |
| sld_determinism | `scripts/sld_determinism_guards.py` | Determinizm renderowania SLD |
| arch_guard | `scripts/arch_guard.py` | Granice warstw architektonicznych |
| docs_guard | `scripts/docs_guard.py` | Integralność dokumentacji |
| solver_boundary | `scripts/solver_boundary_guard.py` | Izolacja warstwy solverów |
| trace_determinism | `scripts/trace_determinism_guard.py` | Determinizm wyjścia śladów |
| overlay_no_physics | `scripts/overlay_no_physics_guard.py` | Brak fizyki w overlay |
| fix_action_completeness | `scripts/fix_action_completeness_guard.py` | Kompletność FixAction |
| dead_click | `scripts/dead_click_guard.py` | Brak martwych kliknięć |
| resultset_v1_schema | `scripts/resultset_v1_schema_guard.py` | Zgodność schematu wyników |

---

## 11. TESTY

### 11.1 Backend (~224 pliki testowe)
- Rdzeń: `backend/tests/test_short_circuit_iec60909.py`, `test_power_flow_v2.py`
- Determinizm: 10 plików `test_*_determinism*.py`
- Golden networks: `backend/tests/golden/` (2 sieci + artefakty)
- Reference networks: `backend/tests/reference_networks/builders.py`
- E2E: `backend/tests/e2e/` (6 plików)
- API: `backend/tests/api/` (8 plików)
- CI: `backend/tests/ci/`

### 11.2 Frontend (~186 plików testowych)
- SLD Core: 24 testy kontraktowe w `ui/sld/core/__tests__/`
- SLD Editor: 15+ testów w `ui/sld-editor/__tests__/`
- Overlay: 5 testów w `ui/sld-overlay/__tests__/`
- Kreator: 10 testów w `ui/wizard/__tests__/`
- E2E Playwright: `frontend/e2e/` (3 scenariusze + fixtures)
- Silnik układu: 7 testów w `engine/sld-layout/__tests__/`

### 11.3 Przepływy pracy CI (4 workflow)
| Przepływ | Plik | Zakres |
|----------|------|--------|
| Python tests | `python-tests.yml` | pytest + 4 strażniki |
| Frontend checks | `frontend-checks.yml` | type-check + lint + vitest + 3 strażniki |
| SLD Determinism | `sld-determinism.yml` | Strażniki Python SLD + 18 testów Vitest + artefakty |
| Docs Guard | `docs-guard.yml` | Integralność dokumentacji |

---

## 12. PUNKTY WEJŚCIA

| Plik | Cel |
|------|-----|
| `frontend/src/App.tsx` | Komponent główny React (POWERFACTORY_LAYOUT, routing hashowy) |
| `frontend/src/main.tsx` | Punkt wejścia (React 18 root render) |
| `backend/src/api/main.py` | Definicja aplikacji FastAPI |
| `docker-compose.yml` | 6 usług: backend, frontend, postgres, mongodb, redis, celery |

---

*Wszystkie ścieżki zweryfikowane na stanie repozytorium z dnia 2026-02-23.*
