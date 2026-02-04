/**
 * SLD VALIDATOR — Walidacja topologiczna i geometryczna SLD
 *
 * CANONICAL ALIGNMENT:
 * - SLD_KANONICZNA_SPECYFIKACJA.md § 8: Walidacja
 * - AUDYT_SLD_ETAP.md: Wymagania naprawcze
 * - PR-SLD-ETAP-GEOMETRY-FULL: NO FLOATING SYMBOL validation
 *
 * REGUŁY WALIDACJI:
 *
 * TOPOLOGICZNE:
 * - V-01: Każdy symbol ma elementId (brak orphan symbols)
 * - V-01b: Brak zduplikowanych elementId (N-03 ETAP)
 * - V-02: Każdy element ma symbol (brak hidden elements)
 * - V-03: Połączenia port↔port są poprawne
 * - V-04: Brak izolowanych wysp bez źródła
 * - V-05: Minimum 1 źródło
 *
 * GEOMETRYCZNE:
 * - G-01: Symbole nie nakładają się
 * - G-02: Połączenia nie przechodzą przez symbole (opcjonalne)
 * - G-03: Pozycje na siatce
 * - G-04: NO FLOATING SYMBOL — żaden symbol nie może wisieć w powietrzu (ETAP rule)
 */

import type { AnySldSymbol, BranchSymbol, SwitchSymbol } from '../types';
import { getSymbolBoundingBox, doBoundingBoxesIntersect } from './geometry';
import { ETAP_GEOMETRY } from '../../sld/sldEtapStyle';

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
  /** Sprawdzaj duplikaty elementId (V-01b) — N-03 ETAP */
  checkDuplicateElementIds?: boolean;
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
  /** PR-SLD-ETAP-GEOMETRY-FULL: Sprawdzaj floating symbols (G-04) */
  checkFloatingSymbols?: boolean;
  /** PR-SLD-ETAP-GEOMETRY-FULL: Lista floating symbols z layout engine */
  floatingSymbolIds?: string[];
  /** Rozmiar siatki dla G-03 */
  gridSize?: number;
  /** Lista ID elementów modelu (dla V-02) */
  modelElementIds?: string[];
}

/** Domyślne opcje */
const DEFAULT_OPTIONS: ValidationOptions = {
  checkOrphanSymbols: true,
  checkDuplicateElementIds: true, // N-03: Wykryj zduplikowane elementId
  checkHiddenElements: false, // Wymaga modelElementIds
  checkConnections: true,
  checkIslands: true,
  checkSources: true,
  checkCollisions: true,
  checkGridAlignment: true,
  checkFloatingSymbols: ETAP_GEOMETRY.validation.noFloatingSymbol, // PR-SLD-ETAP-GEOMETRY-FULL
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

  // V-01b: Duplicate elementIds (N-03 ETAP)
  if (opts.checkDuplicateElementIds) {
    issues.push(...checkDuplicateElementIds(symbols));
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

  // G-04: Floating symbols (PR-SLD-ETAP-GEOMETRY-FULL)
  if (opts.checkFloatingSymbols) {
    issues.push(...checkFloatingSymbols(symbols, opts.floatingSymbolIds));
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
// V-01b: DUPLICATE ELEMENT IDS (N-03 ETAP)
// =============================================================================

/**
 * Sprawdź czy są zduplikowane elementId (bijection violation).
 *
 * N-03 ETAP: Kopiowanie/wklejanie musi tworzyć NOWE elementy modelu,
 * nie duplikować referencje do istniejących.
 */
function checkDuplicateElementIds(symbols: AnySldSymbol[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elementIdMap = new Map<string, string[]>(); // elementId -> symbolIds

  // Zbierz wszystkie elementId
  symbols.forEach((symbol) => {
    if (symbol.elementId && symbol.elementId.trim() !== '') {
      const existing = elementIdMap.get(symbol.elementId) || [];
      existing.push(symbol.id);
      elementIdMap.set(symbol.elementId, existing);
    }
  });

  // Znajdź duplikaty
  for (const [elementId, symbolIds] of elementIdMap.entries()) {
    if (symbolIds.length > 1) {
      const symbolNames = symbolIds
        .map((id) => symbols.find((s) => s.id === id)?.elementName || id)
        .join(', ');

      issues.push({
        ruleId: 'V-01b',
        severity: 'ERROR',
        message: `Zduplikowany elementId "${elementId}" — ${symbolIds.length} symboli (${symbolNames}) wskazuje na ten sam element modelu`,
        symbolIds: symbolIds,
        suggestion: 'Każdy symbol musi wskazywać na unikalny element modelu. Usuń duplikaty lub utwórz nowe elementy.',
      });
    }
  }

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
// G-04: FLOATING SYMBOLS (PR-SLD-ETAP-GEOMETRY-FULL)
// =============================================================================

/**
 * PR-SLD-ETAP-GEOMETRY-FULL: Sprawdź czy są symbole "wiszące w powietrzu".
 *
 * ETAP RULE: Żaden symbol nie może wisieć — każdy musi być połączony
 * do głównej topologii (szyny, transformatora, źródła).
 *
 * This function checks:
 * 1. Symbols reported as floating by the layout engine (floatingSymbolIds)
 * 2. Symbols with no connections to any other element
 *
 * @param symbols - All symbols in the SLD
 * @param floatingSymbolIds - Symbol IDs marked as floating by layout engine
 */
function checkFloatingSymbols(
  symbols: AnySldSymbol[],
  floatingSymbolIds?: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check symbols reported by layout engine
  if (floatingSymbolIds && floatingSymbolIds.length > 0) {
    const floatingNames = floatingSymbolIds
      .map((id) => {
        const symbol = symbols.find((s) => s.id === id);
        return symbol ? `"${symbol.elementName}"` : id;
      })
      .join(', ');

    issues.push({
      ruleId: 'G-04',
      severity: 'WARNING',
      message: `Wykryto ${floatingSymbolIds.length} symboli wiszących w powietrzu (ETAP violation): ${floatingNames}`,
      symbolIds: floatingSymbolIds,
      suggestion: 'Połącz symbole z główną topologią (szyną, transformatorem lub źródłem) lub usuń je',
    });

    // Add individual warnings for each floating symbol (for UI highlighting)
    floatingSymbolIds.forEach((symbolId) => {
      const symbol = symbols.find((s) => s.id === symbolId);
      if (symbol) {
        issues.push({
          ruleId: 'G-04a',
          severity: 'WARNING',
          message: `Symbol "${symbol.elementName}" wisi w powietrzu — brak połączenia z topologią`,
          symbolIds: [symbolId],
          suggestion: 'Połącz symbol z szyną, transformatorem lub źródłem',
        });
      }
    });
  }

  // Additional check: symbols with no connections at all (not connected to any element)
  const elementIds = new Set(symbols.map((s) => s.elementId));
  const connectedSymbolIds = new Set<string>();

  // Find all symbols that are connected to something
  symbols.forEach((symbol) => {
    // Branch has fromNodeId/toNodeId
    if (symbol.elementType === 'LineBranch' || symbol.elementType === 'TransformerBranch') {
      const branch = symbol as BranchSymbol;
      if (elementIds.has(branch.fromNodeId) || elementIds.has(branch.toNodeId)) {
        connectedSymbolIds.add(symbol.id);
        // Mark the connected nodes as well
        symbols.forEach((s) => {
          if (s.elementId === branch.fromNodeId || s.elementId === branch.toNodeId) {
            connectedSymbolIds.add(s.id);
          }
        });
      }
    }

    // Switch has fromNodeId/toNodeId
    if (symbol.elementType === 'Switch') {
      const sw = symbol as SwitchSymbol;
      if (elementIds.has(sw.fromNodeId) || elementIds.has(sw.toNodeId)) {
        connectedSymbolIds.add(symbol.id);
        symbols.forEach((s) => {
          if (s.elementId === sw.fromNodeId || s.elementId === sw.toNodeId) {
            connectedSymbolIds.add(s.id);
          }
        });
      }
    }

    // Source/Load has connectedToNodeId
    if (symbol.elementType === 'Source' || symbol.elementType === 'Load') {
      const connectedNodeId = (symbol as any).connectedToNodeId;
      if (connectedNodeId && elementIds.has(connectedNodeId)) {
        connectedSymbolIds.add(symbol.id);
        symbols.forEach((s) => {
          if (s.elementId === connectedNodeId) {
            connectedSymbolIds.add(s.id);
          }
        });
      }
    }
  });

  // Find unconnected symbols (excluding those already reported by layout engine)
  const reportedFloating = new Set(floatingSymbolIds || []);
  const unconnectedSymbols = symbols.filter(
    (s) => !connectedSymbolIds.has(s.id) && !reportedFloating.has(s.id)
  );

  if (unconnectedSymbols.length > 0) {
    unconnectedSymbols.forEach((symbol) => {
      // Bus without connections is a floating bus
      if (symbol.elementType === 'Bus') {
        issues.push({
          ruleId: 'G-04b',
          severity: 'WARNING',
          message: `Szyna "${symbol.elementName}" nie ma żadnych przyłączeń`,
          symbolIds: [symbol.id],
          suggestion: 'Dodaj przyłączenia do szyny lub usuń ją',
        });
      } else {
        issues.push({
          ruleId: 'G-04c',
          severity: 'WARNING',
          message: `Symbol "${symbol.elementName}" nie jest połączony z żadnym elementem`,
          symbolIds: [symbol.id],
          suggestion: 'Połącz symbol z topologią sieci',
        });
      }
    });
  }

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
