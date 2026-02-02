/**
 * SLD VALIDATOR — Walidacja topologiczna i geometryczna SLD
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 8: Walidacja
 * - AUDYT_SLD_ETAP.md: Wymagania naprawcze
 *
 * REGUŁY WALIDACJI:
 *
 * TOPOLOGICZNE:
 * - V-01: Każdy symbol ma elementId (brak orphan symbols)
 * - V-02: Każdy element ma symbol (brak hidden elements)
 * - V-03: Połączenia port↔port są poprawne
 * - V-04: Brak izolowanych wysp bez źródła
 * - V-05: Minimum 1 źródło
 *
 * GEOMETRYCZNE:
 * - G-01: Symbole nie nakładają się
 * - G-02: Połączenia nie przechodzą przez symbole (opcjonalne)
 * - G-03: Pozycje na siatce
 */

import type { AnySldSymbol, BranchSymbol, SwitchSymbol, Position, BoundingBox } from '../types';
import { getSymbolBoundingBox, doBoundingBoxesIntersect } from './geometry';

// =============================================================================
// TYPY
// =============================================================================

/** Poziom ważności błędu */
export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

/** Wynik walidacji pojedynczej reguły */
export interface ValidationIssue {
  /** ID reguły (V-01, G-01, ...) */
  ruleId: string;
  /** Poziom ważności */
  severity: ValidationSeverity;
  /** Opis problemu */
  message: string;
  /** ID symboli, których dotyczy problem */
  symbolIds: string[];
  /** Sugestia naprawy */
  suggestion?: string;
}

/** Wynik pełnej walidacji */
export interface ValidationResult {
  /** Czy walidacja przeszła (brak ERROR) */
  valid: boolean;
  /** Lista problemów */
  issues: ValidationIssue[];
  /** Statystyki */
  stats: {
    totalSymbols: number;
    errors: number;
    warnings: number;
    infos: number;
  };
}

/** Opcje walidacji */
export interface ValidationOptions {
  /** Sprawdzaj orphan symbols (V-01) */
  checkOrphanSymbols?: boolean;
  /** Sprawdzaj hidden elements (V-02) */
  checkHiddenElements?: boolean;
  /** Sprawdzaj połączenia (V-03) */
  checkConnections?: boolean;
  /** Sprawdzaj wyspy (V-04) */
  checkIslands?: boolean;
  /** Sprawdzaj źródła (V-05) */
  checkSources?: boolean;
  /** Sprawdzaj kolizje (G-01) */
  checkCollisions?: boolean;
  /** Sprawdzaj pozycje na siatce (G-03) */
  checkGridAlignment?: boolean;
  /** Rozmiar siatki dla G-03 */
  gridSize?: number;
  /** Lista ID elementów modelu (dla V-02) */
  modelElementIds?: string[];
}

/** Domyślne opcje */
const DEFAULT_OPTIONS: ValidationOptions = {
  checkOrphanSymbols: true,
  checkHiddenElements: false, // Wymaga modelElementIds
  checkConnections: true,
  checkIslands: true,
  checkSources: true,
  checkCollisions: true,
  checkGridAlignment: true,
  gridSize: 20,
};

// =============================================================================
// GŁÓWNA FUNKCJA WALIDACJI
// =============================================================================

/**
 * Przeprowadź pełną walidację SLD.
 *
 * @param symbols - Symbole SLD do walidacji
 * @param options - Opcje walidacji
 * @returns Wynik walidacji
 */
export function validateSld(
  symbols: AnySldSymbol[],
  options: ValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: ValidationIssue[] = [];

  // V-01: Orphan symbols (symbol bez elementId)
  if (opts.checkOrphanSymbols) {
    issues.push(...checkOrphanSymbols(symbols));
  }

  // V-02: Hidden elements (element bez symbolu)
  if (opts.checkHiddenElements && opts.modelElementIds) {
    issues.push(...checkHiddenElements(symbols, opts.modelElementIds));
  }

  // V-03: Połączenia
  if (opts.checkConnections) {
    issues.push(...checkConnections(symbols));
  }

  // V-04: Izolowane wyspy
  if (opts.checkIslands) {
    issues.push(...checkIslands(symbols));
  }

  // V-05: Źródła
  if (opts.checkSources) {
    issues.push(...checkSources(symbols));
  }

  // G-01: Kolizje
  if (opts.checkCollisions) {
    issues.push(...checkCollisions(symbols));
  }

  // G-03: Grid alignment
  if (opts.checkGridAlignment && opts.gridSize) {
    issues.push(...checkGridAlignment(symbols, opts.gridSize));
  }

  // Oblicz statystyki
  const errors = issues.filter((i) => i.severity === 'ERROR').length;
  const warnings = issues.filter((i) => i.severity === 'WARNING').length;
  const infos = issues.filter((i) => i.severity === 'INFO').length;

  return {
    valid: errors === 0,
    issues,
    stats: {
      totalSymbols: symbols.length,
      errors,
      warnings,
      infos,
    },
  };
}

// =============================================================================
// V-01: ORPHAN SYMBOLS
// =============================================================================

/**
 * Sprawdź czy każdy symbol ma elementId.
 */
function checkOrphanSymbols(symbols: AnySldSymbol[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  symbols.forEach((symbol) => {
    if (!symbol.elementId || symbol.elementId.trim() === '') {
      issues.push({
        ruleId: 'V-01',
        severity: 'ERROR',
        message: `Symbol "${symbol.elementName}" (${symbol.id}) nie ma przypisanego elementu modelu (brak elementId)`,
        symbolIds: [symbol.id],
        suggestion: 'Usuń symbol lub przypisz go do elementu modelu',
      });
    }
  });

  return issues;
}

// =============================================================================
// V-02: HIDDEN ELEMENTS
// =============================================================================

/**
 * Sprawdź czy każdy element modelu ma symbol.
 */
function checkHiddenElements(
  symbols: AnySldSymbol[],
  modelElementIds: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const symbolElementIds = new Set(symbols.map((s) => s.elementId));

  modelElementIds.forEach((elementId) => {
    if (!symbolElementIds.has(elementId)) {
      issues.push({
        ruleId: 'V-02',
        severity: 'WARNING',
        message: `Element modelu (${elementId}) nie ma symbolu na schemacie SLD`,
        symbolIds: [],
        suggestion: 'Dodaj symbol dla tego elementu lub usuń element z modelu',
      });
    }
  });

  return issues;
}

// =============================================================================
// V-03: POŁĄCZENIA
// =============================================================================

/**
 * Sprawdź poprawność połączeń (fromNodeId/toNodeId wskazują na istniejące elementy).
 */
function checkConnections(symbols: AnySldSymbol[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elementIds = new Set(symbols.map((s) => s.elementId));

  symbols.forEach((symbol) => {
    // Branch
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;

      if (!branch.fromNodeId) {
        issues.push({
          ruleId: 'V-03',
          severity: 'ERROR',
          message: `Gałąź "${symbol.elementName}" nie ma zdefiniowanego fromNodeId`,
          symbolIds: [symbol.id],
          suggestion: 'Przypisz węzeł początkowy',
        });
      } else if (!elementIds.has(branch.fromNodeId)) {
        issues.push({
          ruleId: 'V-03',
          severity: 'ERROR',
          message: `Gałąź "${symbol.elementName}" wskazuje na nieistniejący fromNodeId: ${branch.fromNodeId}`,
          symbolIds: [symbol.id],
          suggestion: 'Popraw referencję lub dodaj brakujący węzeł',
        });
      }

      if (!branch.toNodeId) {
        issues.push({
          ruleId: 'V-03',
          severity: 'ERROR',
          message: `Gałąź "${symbol.elementName}" nie ma zdefiniowanego toNodeId`,
          symbolIds: [symbol.id],
          suggestion: 'Przypisz węzeł końcowy',
        });
      } else if (!elementIds.has(branch.toNodeId)) {
        issues.push({
          ruleId: 'V-03',
          severity: 'ERROR',
          message: `Gałąź "${symbol.elementName}" wskazuje na nieistniejący toNodeId: ${branch.toNodeId}`,
          symbolIds: [symbol.id],
          suggestion: 'Popraw referencję lub dodaj brakujący węzeł',
        });
      }
    }

    // Switch
    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;

      if (!sw.fromNodeId || !elementIds.has(sw.fromNodeId)) {
        issues.push({
          ruleId: 'V-03',
          severity: 'ERROR',
          message: `Łącznik "${symbol.elementName}" ma niepoprawny fromNodeId`,
          symbolIds: [symbol.id],
        });
      }

      if (!sw.toNodeId || !elementIds.has(sw.toNodeId)) {
        issues.push({
          ruleId: 'V-03',
          severity: 'ERROR',
          message: `Łącznik "${symbol.elementName}" ma niepoprawny toNodeId`,
          symbolIds: [symbol.id],
        });
      }
    }

    // Source/Load
    if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const connectedNodeId = (symbol as any).connectedToNodeId;
      if (connectedNodeId && !elementIds.has(connectedNodeId)) {
        issues.push({
          ruleId: 'V-03',
          severity: 'ERROR',
          message: `${symbol.elementType} "${symbol.elementName}" wskazuje na nieistniejący węzeł: ${connectedNodeId}`,
          symbolIds: [symbol.id],
        });
      }
    }
  });

  return issues;
}

// =============================================================================
// V-04: IZOLOWANE WYSPY
// =============================================================================

/**
 * Sprawdź czy istnieją izolowane wyspy (węzły bez połączenia ze źródłem).
 */
function checkIslands(symbols: AnySldSymbol[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Buduj graf
  const adjacency = new Map<string, Set<string>>();
  const elementToSymbol = new Map<string, string>();

  symbols.forEach((s) => {
    elementToSymbol.set(s.elementId, s.id);
    adjacency.set(s.id, new Set());
  });

  // Dodaj krawędzie
  symbols.forEach((symbol) => {
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;
      const fromSymbolId = elementToSymbol.get(branch.fromNodeId);
      const toSymbolId = elementToSymbol.get(branch.toNodeId);
      if (fromSymbolId && toSymbolId) {
        adjacency.get(fromSymbolId)?.add(toSymbolId);
        adjacency.get(toSymbolId)?.add(fromSymbolId);
      }
    }
    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;
      const fromSymbolId = elementToSymbol.get(sw.fromNodeId);
      const toSymbolId = elementToSymbol.get(sw.toNodeId);
      if (fromSymbolId && toSymbolId) {
        adjacency.get(fromSymbolId)?.add(toSymbolId);
        adjacency.get(toSymbolId)?.add(fromSymbolId);
      }
    }
    if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const connectedNodeId = (symbol as any).connectedToNodeId;
      const connectedSymbolId = elementToSymbol.get(connectedNodeId);
      if (connectedSymbolId) {
        adjacency.get(symbol.id)?.add(connectedSymbolId);
        adjacency.get(connectedSymbolId)?.add(symbol.id);
      }
    }
  });

  // BFS od źródeł
  const sources = symbols.filter((s) => s.elementType === 'Source').map((s) => s.id);
  const visited = new Set<string>();

  const queue = [...sources];
  sources.forEach((s) => visited.add(s));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || new Set();
    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    });
  }

  // Znajdź nieodwiedzone węzły (wyspy)
  const islands = symbols
    .filter((s) => !visited.has(s.id) && s.elementType === 'Bus')
    .map((s) => s.id);

  if (islands.length > 0) {
    issues.push({
      ruleId: 'V-04',
      severity: 'WARNING',
      message: `Wykryto ${islands.length} izolowanych szyn bez połączenia ze źródłem`,
      symbolIds: islands,
      suggestion: 'Połącz szyny ze źródłem lub usuń je',
    });
  }

  return issues;
}

// =============================================================================
// V-05: ŹRÓDŁA
// =============================================================================

/**
 * Sprawdź czy istnieje co najmniej jedno źródło.
 */
function checkSources(symbols: AnySldSymbol[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sources = symbols.filter((s) => s.elementType === 'Source');

  if (sources.length === 0) {
    issues.push({
      ruleId: 'V-05',
      severity: 'ERROR',
      message: 'Schemat nie zawiera żadnego źródła zasilania',
      symbolIds: [],
      suggestion: 'Dodaj źródło (utility_feeder, generator, PV, itp.)',
    });
  }

  return issues;
}

// =============================================================================
// G-01: KOLIZJE
// =============================================================================

/**
 * Sprawdź czy symbole nie nakładają się.
 */
function checkCollisions(symbols: AnySldSymbol[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const box1 = getSymbolBoundingBox(symbols[i]);
      const box2 = getSymbolBoundingBox(symbols[j]);

      if (doBoundingBoxesIntersect(box1, box2)) {
        issues.push({
          ruleId: 'G-01',
          severity: 'WARNING',
          message: `Symbole "${symbols[i].elementName}" i "${symbols[j].elementName}" nakładają się`,
          symbolIds: [symbols[i].id, symbols[j].id],
          suggestion: 'Przesuń jeden z symboli',
        });
      }
    }
  }

  return issues;
}

// =============================================================================
// G-03: GRID ALIGNMENT
// =============================================================================

/**
 * Sprawdź czy pozycje są wyrównane do siatki.
 */
function checkGridAlignment(symbols: AnySldSymbol[], gridSize: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  symbols.forEach((symbol) => {
    const { x, y } = symbol.position;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;

    if (x !== snappedX || y !== snappedY) {
      issues.push({
        ruleId: 'G-03',
        severity: 'INFO',
        message: `Symbol "${symbol.elementName}" nie jest wyrównany do siatki (${x}, ${y})`,
        symbolIds: [symbol.id],
        suggestion: `Przesuń do (${snappedX}, ${snappedY})`,
      });
    }
  });

  return issues;
}

// =============================================================================
// FUNKCJE POMOCNICZE
// =============================================================================

/**
 * Sprawdź czy walidacja blokuje zapis.
 */
export function shouldBlockSave(result: ValidationResult): boolean {
  return result.stats.errors > 0;
}

/**
 * Pobierz podsumowanie walidacji w formie tekstowej.
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    if (result.stats.warnings > 0) {
      return `Walidacja OK z ${result.stats.warnings} ostrzeżeniami`;
    }
    return 'Walidacja OK';
  }
  return `Walidacja NIEUDANA: ${result.stats.errors} błędów, ${result.stats.warnings} ostrzeżeń`;
}

/**
 * Filtruj problemy po severity.
 */
export function filterIssuesBySeverity(
  issues: ValidationIssue[],
  severity: ValidationSeverity
): ValidationIssue[] {
  return issues.filter((i) => i.severity === severity);
}
