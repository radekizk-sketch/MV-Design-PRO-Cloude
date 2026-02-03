/**
 * useSldCompareSelection — Hook do zarządzania trybem porównania w inspektorze SLD
 *
 * PR-SLD-08: Tryb porównania elementów (multi-selection, read-only)
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: Porównanie właściwości (120% ETAP)
 * - sld_rules.md § G.1: Multi-selection w inspektorze
 *
 * FEATURES:
 * - Wykrywanie multi-selection (2 elementy)
 * - Deterministyczna kolejność A/B (sortowanie po elementId)
 * - Porównanie sekcji i pól
 * - Zliczanie różnic
 * - 100% READ-ONLY (brak mutacji)
 *
 * INVARIANT:
 * - Ten sam input (te same 2 elementy) → identyczny output
 * - Kolejność A/B niezależna od kolejności zaznaczania
 *
 * 100% POLISH UI
 */

import { useMemo, useCallback } from 'react';
import { useSelectionStore } from '../../../selection/store';
import { useSldEditorStore } from '../../../sld-editor/SldEditorStore';
import { useSldModeStore } from '../../sldModeStore';
import type {
  UseSldCompareSelectionResult,
  CompareSelection,
  ComparePropertySection,
  CompareElement,
  CompareSelectionType,
} from './types';
import type { InspectorPropertySection, InspectorPropertyField } from '../types';
import {
  ELEMENT_TYPE_LABELS_PL,
  SWITCH_TYPE_LABELS_PL,
  SWITCH_STATE_LABELS_PL,
  INSPECTOR_SECTION_LABELS_PL,
} from '../types';
import type {
  AnySldSymbol,
  NodeSymbol,
  BranchSymbol,
  SwitchSymbol,
  SourceSymbol,
  LoadSymbol,
} from '../../../sld-editor/types';
import {
  compareAllSections,
  sortElementsForCompare,
  countTotalDifferences,
  formatNumber,
} from './compareUtils';

// =============================================================================
// BUILDERY SEKCJI (REUŻYTE Z useSldInspectorSelection)
// =============================================================================

/**
 * Buduje sekcje dla elementu typu Bus (Szyna).
 */
function buildBusSections(symbol: NodeSymbol): InspectorPropertySection[] {
  const sections: InspectorPropertySection[] = [];

  sections.push({
    id: 'basic',
    label: INSPECTOR_SECTION_LABELS_PL.basic,
    fields: [
      { key: 'type', label: 'Typ elementu', value: ELEMENT_TYPE_LABELS_PL.Bus },
      { key: 'elementId', label: 'ID elementu', value: symbol.elementId },
      { key: 'elementName', label: 'Nazwa', value: symbol.elementName },
      { key: 'inService', label: 'Stan', value: symbol.inService ? 'W służbie' : 'Poza służbą' },
    ],
  });

  sections.push({
    id: 'technical',
    label: INSPECTOR_SECTION_LABELS_PL.technical,
    fields: [
      { key: 'width', label: 'Szerokość', value: formatNumber(symbol.width, 0), unit: 'px' },
      { key: 'height', label: 'Wysokość', value: formatNumber(symbol.height, 0), unit: 'px' },
    ],
  });

  return sections;
}

/**
 * Buduje sekcje dla elementu typu Branch (Linia/Transformator).
 */
function buildBranchSections(symbol: BranchSymbol): InspectorPropertySection[] {
  const sections: InspectorPropertySection[] = [];
  const isTrans = symbol.elementType === 'TransformerBranch';

  sections.push({
    id: 'basic',
    label: INSPECTOR_SECTION_LABELS_PL.basic,
    fields: [
      {
        key: 'type',
        label: 'Typ elementu',
        value: isTrans ? ELEMENT_TYPE_LABELS_PL.TransformerBranch : ELEMENT_TYPE_LABELS_PL.LineBranch,
      },
      { key: 'elementId', label: 'ID elementu', value: symbol.elementId },
      { key: 'elementName', label: 'Nazwa', value: symbol.elementName },
      { key: 'inService', label: 'Stan', value: symbol.inService ? 'W służbie' : 'Poza służbą' },
    ],
  });

  const technicalFields: InspectorPropertyField[] = [
    { key: 'fromNodeId', label: 'Od węzła', value: symbol.fromNodeId || '—' },
    { key: 'toNodeId', label: 'Do węzła', value: symbol.toNodeId || '—' },
  ];

  if (!isTrans && symbol.branchType) {
    technicalFields.push({
      key: 'branchType',
      label: 'Typ linii',
      value: symbol.branchType === 'LINE' ? 'Napowietrzna' : 'Kablowa',
    });
  }

  sections.push({
    id: 'technical',
    label: INSPECTOR_SECTION_LABELS_PL.technical,
    fields: technicalFields,
  });

  return sections;
}

/**
 * Buduje sekcje dla elementu typu Switch (Łącznik).
 */
function buildSwitchSections(symbol: SwitchSymbol): InspectorPropertySection[] {
  const sections: InspectorPropertySection[] = [];

  sections.push({
    id: 'basic',
    label: INSPECTOR_SECTION_LABELS_PL.basic,
    fields: [
      { key: 'type', label: 'Typ elementu', value: ELEMENT_TYPE_LABELS_PL.Switch },
      { key: 'elementId', label: 'ID elementu', value: symbol.elementId },
      { key: 'elementName', label: 'Nazwa', value: symbol.elementName },
      { key: 'inService', label: 'Stan', value: symbol.inService ? 'W służbie' : 'Poza służbą' },
    ],
  });

  sections.push({
    id: 'technical',
    label: INSPECTOR_SECTION_LABELS_PL.technical,
    fields: [
      { key: 'switchType', label: 'Typ łącznika', value: SWITCH_TYPE_LABELS_PL[symbol.switchType] || symbol.switchType },
      { key: 'switchState', label: 'Stan łącznika', value: SWITCH_STATE_LABELS_PL[symbol.switchState] || symbol.switchState },
      { key: 'fromNodeId', label: 'Od węzła', value: symbol.fromNodeId || '—' },
      { key: 'toNodeId', label: 'Do węzła', value: symbol.toNodeId || '—' },
    ],
  });

  return sections;
}

/**
 * Buduje sekcje dla elementu typu Source (Źródło).
 */
function buildSourceSections(symbol: SourceSymbol): InspectorPropertySection[] {
  const sections: InspectorPropertySection[] = [];

  sections.push({
    id: 'basic',
    label: INSPECTOR_SECTION_LABELS_PL.basic,
    fields: [
      { key: 'type', label: 'Typ elementu', value: ELEMENT_TYPE_LABELS_PL.Source },
      { key: 'elementId', label: 'ID elementu', value: symbol.elementId },
      { key: 'elementName', label: 'Nazwa', value: symbol.elementName },
      { key: 'inService', label: 'Stan', value: symbol.inService ? 'W służbie' : 'Poza służbą' },
    ],
  });

  sections.push({
    id: 'technical',
    label: INSPECTOR_SECTION_LABELS_PL.technical,
    fields: [
      { key: 'connectedToNodeId', label: 'Podłączony do', value: symbol.connectedToNodeId || '—' },
    ],
  });

  return sections;
}

/**
 * Buduje sekcje dla elementu typu Load (Odbiornik).
 */
function buildLoadSections(symbol: LoadSymbol): InspectorPropertySection[] {
  const sections: InspectorPropertySection[] = [];

  sections.push({
    id: 'basic',
    label: INSPECTOR_SECTION_LABELS_PL.basic,
    fields: [
      { key: 'type', label: 'Typ elementu', value: ELEMENT_TYPE_LABELS_PL.Load },
      { key: 'elementId', label: 'ID elementu', value: symbol.elementId },
      { key: 'elementName', label: 'Nazwa', value: symbol.elementName },
      { key: 'inService', label: 'Stan', value: symbol.inService ? 'W służbie' : 'Poza służbą' },
    ],
  });

  sections.push({
    id: 'technical',
    label: INSPECTOR_SECTION_LABELS_PL.technical,
    fields: [
      { key: 'connectedToNodeId', label: 'Podłączony do', value: symbol.connectedToNodeId || '—' },
    ],
  });

  return sections;
}

/**
 * Buduje sekcje dla elementu na podstawie jego typu.
 */
function buildElementSections(symbol: AnySldSymbol): InspectorPropertySection[] {
  switch (symbol.elementType) {
    case 'Bus':
      return buildBusSections(symbol as NodeSymbol);
    case 'LineBranch':
    case 'TransformerBranch':
      return buildBranchSections(symbol as BranchSymbol);
    case 'Switch':
      return buildSwitchSections(symbol as SwitchSymbol);
    case 'Source':
      return buildSourceSections(symbol as SourceSymbol);
    case 'Load':
      return buildLoadSections(symbol as LoadSymbol);
    default:
      return [];
  }
}

// =============================================================================
// GŁÓWNY HOOK
// =============================================================================

/**
 * Hook do zarządzania trybem porównania w inspektorze SLD.
 *
 * Subskrybuje:
 * - Selection Store (globalny stan selekcji - multi-select)
 * - SldEditorStore (symbole SLD)
 * - SldModeStore (tryb SLD: EDYCJA/WYNIKI)
 *
 * Zwraca:
 * - Czy tryb porównania jest aktywny (dokładnie 2 elementy zaznaczone)
 * - Dane selekcji porównania (A/B deterministycznie)
 * - Sekcje porównawcze z oznaczonymi różnicami
 * - Liczbę różnic
 *
 * INVARIANT: Hook NIE mutuje żadnych danych - tylko odczyt.
 */
export function useSldCompareSelection(): UseSldCompareSelectionResult {
  // Subskrypcja na globalny Selection Store (multi-select)
  const selectedElements = useSelectionStore((state) => state.selectedElements);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  // Subskrypcja na SldEditorStore (symbole)
  const symbols = useSldEditorStore((state) => state.symbols);

  // Subskrypcja na SldModeStore (tryb SLD)
  const mode = useSldModeStore((state) => state.mode);
  const isResultsMode = mode === 'WYNIKI';

  // Oblicz typ selekcji i czy tryb porównania jest aktywny
  const selectionType = useMemo<CompareSelectionType>(() => {
    if (selectedElements.length === 0) {
      return 'none';
    }
    if (selectedElements.length === 1) {
      return 'single';
    }
    if (selectedElements.length === 2) {
      return 'elements';
    }
    // Więcej niż 2 - traktujemy jako single (wyświetlamy pierwszy)
    return 'single';
  }, [selectedElements.length]);

  const isCompareMode = selectionType === 'elements';

  // Oblicz selekcję porównania elementów
  const compareSelection = useMemo<CompareSelection | null>(() => {
    if (!isCompareMode || selectedElements.length !== 2) {
      return null;
    }

    // Znajdź symbole dla obu elementów
    const symbol1 = Array.from(symbols.values()).find(
      (s) => s.elementId === selectedElements[0].id || s.id === selectedElements[0].id
    );
    const symbol2 = Array.from(symbols.values()).find(
      (s) => s.elementId === selectedElements[1].id || s.id === selectedElements[1].id
    );

    if (!symbol1 || !symbol2) {
      return null;
    }

    // Utwórz CompareElements
    const element1: CompareElement = {
      elementId: symbol1.elementId,
      symbolId: symbol1.id,
      elementType: symbol1.elementType,
      elementName: symbol1.elementName,
      symbol: symbol1,
    };

    const element2: CompareElement = {
      elementId: symbol2.elementId,
      symbolId: symbol2.id,
      elementType: symbol2.elementType,
      elementName: symbol2.elementName,
      symbol: symbol2,
    };

    // Sortuj deterministycznie (po elementId)
    const [elementA, elementB] = sortElementsForCompare(element1, element2);

    return {
      elementA,
      elementB,
      sameType: elementA.elementType === elementB.elementType,
    };
  }, [isCompareMode, selectedElements, symbols]);

  // Oblicz sekcje porównawcze
  const compareSections = useMemo<ComparePropertySection[]>(() => {
    if (!compareSelection) {
      return [];
    }

    const sectionsA = buildElementSections(compareSelection.elementA.symbol);
    const sectionsB = buildElementSections(compareSelection.elementB.symbol);

    return compareAllSections(sectionsA, sectionsB);
  }, [compareSelection]);

  // Oblicz liczbę różnic
  const totalDifferences = useMemo(() => {
    return countTotalDifferences(compareSections);
  }, [compareSections]);

  // Funkcja zamykania porównania
  const closeCompare = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return {
    selectionType,
    isCompareMode,
    compareSelection,
    compareConnectionSelection: null, // TODO: Obsługa porównania połączeń w przyszłości
    compareSections,
    mode,
    isResultsMode,
    closeCompare,
    totalDifferences,
  };
}

export default useSldCompareSelection;
