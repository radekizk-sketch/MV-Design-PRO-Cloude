# SLD Spec (PR4)

## Zakres
SLD (single-line diagram) jest artefaktem mapującym topologię sieci na geometrię
diagramu. Przechowuje wyłącznie informacje o geometrii i mapowaniu, bez parametrów
elektrycznych. PCC – punkt wspólnego przyłączenia jest elementem kotwiczącym layout.

## Modele domenowe
- `SldDiagram(id, project_id, name, version, layout_meta, created_at, updated_at)`
- `SldNodeSymbol(id, diagram_id, network_node_id, symbol_type, x, y, rotation, style)`
- `SldBranchSymbol(id, diagram_id, network_branch_id, from_symbol_id, to_symbol_id, routing, style)`
- `SldAnnotation(id, diagram_id, text, x, y, style)`

## Tabele DB
- `sld_diagrams`: `layout_meta_jsonb` przechowuje m.in. flagę `dirty` i metadane layoutu.
- `sld_node_symbols`: mapowanie `network_node_id` → symbol.
- `sld_branch_symbols`: mapowanie `network_branch_id` → symbol oraz routing.
- `sld_annotations`: opcjonalne adnotacje.

Indeksy:
- `sld_diagrams(project_id)`
- `sld_node_symbols(diagram_id, network_node_id)`
- `sld_branch_symbols(diagram_id, network_branch_id)`
- `sld_annotations(diagram_id)`

## Workflow
1. Kreator sieci (NetworkWizardService) tworzy/aktualizuje topologię.
2. Backend tworzy SLD (diagram + symbole) i wykonuje deterministyczny auto-layout.
3. Eksport SLD JSON jest deterministyczny (sortowanie po UUID).
4. Wyniki PF/SC są mapowane do overlay poprzez `ResultSldOverlayBuilder`.

## Granice UI vs backend
- Backend: persystencja SLD, deterministyczny layout, budowa overlay wyników.
- UI: wyłącznie renderowanie diagramu i overlay (bez logiki obliczeń).
