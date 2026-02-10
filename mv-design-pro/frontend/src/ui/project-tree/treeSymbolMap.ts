/**
 * treeSymbolMap — Mapowanie TreeNodeType → EtapSymbolId
 *
 * P9: PowerFactory-style Project Tree ETAP symbol mapping
 *
 * CANONICAL ALIGNMENT:
 * - EtapSymbolRenderer.tsx: Źródło symboli SVG
 * - SymbolResolver.ts: Definicje EtapSymbolId
 * - ProjectTree.tsx: Konsument mapowania
 *
 * DESIGN PRINCIPLES:
 * - Każdy TreeNodeType ma przypisany symbol ETAP
 * - Symbole są monochromatyczne i techniczne
 * - Aria labels po polsku dla dostępności
 */

import type { EtapSymbolId } from '../sld/SymbolResolver';
import type { TreeNodeType, ResultStatus } from '../types';

/**
 * Definicja symbolu dla węzła drzewa.
 */
export interface TreeSymbolDefinition {
  /** ID symbolu ETAP */
  symbolId: EtapSymbolId;
  /** Opis po polsku (aria-label) */
  ariaLabel: string;
}

/**
 * Mapowanie TreeNodeType → EtapSymbolId z polskimi opisami.
 *
 * BINDING:
 * - PROJECT → project (grid/struktura projektu)
 * - NETWORK → utility_feeder (sieć zasilająca)
 * - BUSES → busbar (szyna zbiorcza)
 * - LINES → line_overhead (linia napowietrzna)
 * - CABLES → line_cable (linia kablowa)
 * - TRANSFORMERS → transformer_2w (transformator)
 * - SWITCHES → circuit_breaker (wyłącznik)
 * - SOURCES → utility_feeder (źródło)
 * - LOADS → load (odbiornik)
 * - TYPE_CATALOG → catalog (katalog typów)
 * - CASES → study_case (przypadki obliczeniowe)
 * - RESULTS → results (wyniki)
 */
export const TREE_SYMBOL_MAP: Record<TreeNodeType, TreeSymbolDefinition> = {
  // Root level
  PROJECT: {
    symbolId: 'project',
    ariaLabel: 'Projekt',
  },

  // Network structure
  NETWORK: {
    symbolId: 'utility_feeder',
    ariaLabel: 'Sieć',
  },
  STATION: {
    symbolId: 'folder',
    ariaLabel: 'Stacja',
  },
  VOLTAGE_LEVEL: {
    symbolId: 'busbar',
    ariaLabel: 'Poziom napięcia',
  },

  // Network elements categories
  BUSES: {
    symbolId: 'busbar',
    ariaLabel: 'Szyny',
  },
  LINES: {
    symbolId: 'line_overhead',
    ariaLabel: 'Linie napowietrzne',
  },
  CABLES: {
    symbolId: 'line_cable',
    ariaLabel: 'Kable',
  },
  TRANSFORMERS: {
    symbolId: 'transformer_2w',
    ariaLabel: 'Transformatory',
  },
  SWITCHES: {
    symbolId: 'circuit_breaker',
    ariaLabel: 'Łączniki',
  },
  SOURCES: {
    symbolId: 'utility_feeder',
    ariaLabel: 'Źródła',
  },
  LOADS: {
    symbolId: 'load',
    ariaLabel: 'Odbiory',
  },

  // Type catalog
  TYPE_CATALOG: {
    symbolId: 'catalog',
    ariaLabel: 'Katalog typów',
  },
  LINE_TYPES: {
    symbolId: 'line_overhead',
    ariaLabel: 'Typy linii',
  },
  CABLE_TYPES: {
    symbolId: 'line_cable',
    ariaLabel: 'Typy kabli',
  },
  TRANSFORMER_TYPES: {
    symbolId: 'transformer_2w',
    ariaLabel: 'Typy transformatorów',
  },
  SWITCH_EQUIPMENT_TYPES: {
    symbolId: 'circuit_breaker',
    ariaLabel: 'Typy aparatury',
  },

  // Study cases
  CASES: {
    symbolId: 'folder',
    ariaLabel: 'Przypadki obliczeniowe',
  },
  STUDY_CASE: {
    symbolId: 'study_case',
    ariaLabel: 'Przypadek obliczeniowy',
  },

  // Results
  RESULTS: {
    symbolId: 'results',
    ariaLabel: 'Wyniki',
  },
  RUN_ITEM: {
    symbolId: 'results',
    ariaLabel: 'Wynik obliczeń',
  },
  PROTECTION_RESULTS: {
    symbolId: 'results',
    ariaLabel: 'Wyniki zabezpieczeń',
  },
  PROTECTION_RUNS: {
    symbolId: 'folder',
    ariaLabel: 'Runy zabezpieczeń',
  },
  PROTECTION_COMPARISONS: {
    symbolId: 'folder',
    ariaLabel: 'Porównania A/B',
  },
  POWER_FLOW_RESULTS: {
    symbolId: 'results',
    ariaLabel: 'Wyniki rozpływu mocy',
  },
  POWER_FLOW_RUNS: {
    symbolId: 'folder',
    ariaLabel: 'Runy rozpływu',
  },

  // PR-9: New network element categories
  GENERATORS: {
    symbolId: 'utility_feeder',
    ariaLabel: 'Generatory / OZE',
  },
  MEASUREMENTS: {
    symbolId: 'folder',
    ariaLabel: 'Przekładniki pomiarowe',
  },
  PROTECTION_ASSIGNMENTS: {
    symbolId: 'circuit_breaker',
    ariaLabel: 'Zabezpieczenia',
  },

  // Individual elements (fallback to folder)
  ELEMENT: {
    symbolId: 'folder',
    ariaLabel: 'Element',
  },
};

/**
 * Pobierz definicję symbolu dla węzła drzewa.
 *
 * @param nodeType - Typ węzła drzewa
 * @returns Definicja symbolu
 */
export function getTreeSymbol(nodeType: TreeNodeType): TreeSymbolDefinition {
  return TREE_SYMBOL_MAP[nodeType];
}

/**
 * Pobierz symbolId dla węzła drzewa.
 *
 * @param nodeType - Typ węzła drzewa
 * @returns ID symbolu ETAP
 */
export function getTreeSymbolId(nodeType: TreeNodeType): EtapSymbolId {
  return TREE_SYMBOL_MAP[nodeType].symbolId;
}

/**
 * Pobierz aria-label dla węzła drzewa.
 *
 * @param nodeType - Typ węzła drzewa
 * @returns Opis po polsku
 */
export function getTreeAriaLabel(nodeType: TreeNodeType): string {
  return TREE_SYMBOL_MAP[nodeType].ariaLabel;
}

/**
 * Pobierz tooltip dla statusu wyniku.
 *
 * @param status - Status wyniku (NONE, FRESH, OUTDATED)
 * @returns Opis statusu po polsku
 */
export function getResultStatusTooltip(status: ResultStatus | undefined): string {
  switch (status) {
    case 'FRESH':
      return 'Wyniki aktualne';
    case 'OUTDATED':
      return 'Wyniki nieaktualne — wymagane przeliczenie';
    case 'NONE':
    default:
      return 'Brak wyników';
  }
}
