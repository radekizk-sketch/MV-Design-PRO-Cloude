/**
 * Catalog Tree Node Builder — buduje podwęzły TYPE_CATALOG z rejestru.
 *
 * REGUŁA: Nie zgaduje jakie podwęzły istnieją — czyta z elementCatalogRegistry.
 *
 * Źródło danych:
 * - getCatalogTreeEntries() → deterministyczna lista kategorii
 * - typeCounts props → liczba typów w każdej kategorii (z backendu)
 * - readiness blockers → liczba elementów bez katalogu (status)
 *
 * INVARIANTS:
 * - Deterministyczna kolejność (z rejestru)
 * - Klikalne podwęzły — otwierają TypeLibraryBrowser na odpowiedniej zakładce
 * - Status badge: ile elementów w modelu nie ma przypisanego katalogu
 */

import { useMemo } from 'react';
import type { TreeNode } from '../types';
import {
  getCatalogTreeEntries,
  type CatalogTreeEntry,
} from '../catalog/elementCatalogRegistry';

// =============================================================================
// Types
// =============================================================================

export interface CatalogTypeCounts {
  lineTypes?: number;
  cableTypes?: number;
  transformerTypes?: number;
  switchEquipmentTypes?: number;
}

export interface CatalogMissingCounts {
  /** Liczba linii bez catalog_ref */
  linesWithoutCatalog?: number;
  /** Liczba kabli bez catalog_ref */
  cablesWithoutCatalog?: number;
  /** Liczba transformatorów bez catalog_ref */
  transformersWithoutCatalog?: number;
  /** Liczba łączników bez catalog_ref */
  switchesWithoutCatalog?: number;
}

// =============================================================================
// Internal: namespace → count key mapping
// =============================================================================

const NAMESPACE_TO_COUNT_KEY: Record<string, keyof CatalogTypeCounts> = {
  LINIA_SN: 'lineTypes',
  KABEL_SN: 'cableTypes',
  TRAFO_SN_NN: 'transformerTypes',
  APARAT_SN: 'switchEquipmentTypes',
};

const NAMESPACE_TO_MISSING_KEY: Record<string, keyof CatalogMissingCounts> = {
  LINIA_SN: 'linesWithoutCatalog',
  KABEL_SN: 'cablesWithoutCatalog',
  TRAFO_SN_NN: 'transformersWithoutCatalog',
  APARAT_SN: 'switchesWithoutCatalog',
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Buduje podwęzły TYPE_CATALOG w drzewie projektu.
 *
 * @param typeCounts - Liczba typów dostępnych w katalogu (z backendu)
 * @param missingCounts - Liczba elementów modelu bez przypisanego katalogu
 * @returns Tablica TreeNode[] gotowa do wstawienia jako children TYPE_CATALOG
 */
export function useCatalogTreeNodes(
  typeCounts: CatalogTypeCounts | undefined,
  missingCounts?: CatalogMissingCounts
): TreeNode[] {
  return useMemo(() => {
    const entries: CatalogTreeEntry[] = getCatalogTreeEntries();

    return entries.map((entry): TreeNode => {
      const countKey = NAMESPACE_TO_COUNT_KEY[entry.namespace];
      const count = countKey && typeCounts ? (typeCounts[countKey] ?? 0) : 0;

      const missingKey = NAMESPACE_TO_MISSING_KEY[entry.namespace];
      const missing = missingKey && missingCounts ? (missingCounts[missingKey] ?? 0) : 0;

      // Label z informacją o brakach
      let label = entry.labelPl;
      if (missing > 0) {
        label += ` [${missing} bez typu]`;
      }

      return {
        id: `type-catalog-${entry.namespace}`,
        label,
        nodeType: entry.treeNodeType,
        count,
        // Metadata for handlers
        icon: missing > 0 ? 'warning' : undefined,
      };
    });
  }, [typeCounts, missingCounts]);
}

/**
 * Wyodrębnij liczbę brakujących katalogów z readiness blockers.
 *
 * Parsuje readiness.blockers z snapshotStore i liczy elementy
 * z kodem 'trunk.catalog_missing' lub 'E009' per typ.
 *
 * @param blockers - Lista blockerów z readiness
 * @returns CatalogMissingCounts
 */
export function extractMissingCounts(
  blockers: Array<{
    code: string;
    element_ref: string | null;
    message_pl: string;
  }>,
  elements?: {
    lines?: Array<{ ref_id: string; type?: string }>;
    cables?: Array<{ ref_id: string; type?: string }>;
    transformers?: Array<{ ref_id: string }>;
    switches?: Array<{ ref_id: string }>;
  }
): CatalogMissingCounts {
  // Zbierz ref_id elementów z blockerami katalogowymi
  const catalogBlockerRefs = new Set<string>();
  for (const blocker of blockers) {
    if (
      (blocker.code === 'trunk.catalog_missing' || blocker.code === 'E009') &&
      blocker.element_ref
    ) {
      catalogBlockerRefs.add(blocker.element_ref);
    }
  }

  if (!elements || catalogBlockerRefs.size === 0) {
    return {};
  }

  // Policz per kategoria
  let linesWithoutCatalog = 0;
  let cablesWithoutCatalog = 0;
  let transformersWithoutCatalog = 0;
  let switchesWithoutCatalog = 0;

  for (const line of elements.lines ?? []) {
    if (catalogBlockerRefs.has(line.ref_id)) {
      linesWithoutCatalog++;
    }
  }
  for (const cable of elements.cables ?? []) {
    if (catalogBlockerRefs.has(cable.ref_id)) {
      cablesWithoutCatalog++;
    }
  }
  for (const trafo of elements.transformers ?? []) {
    if (catalogBlockerRefs.has(trafo.ref_id)) {
      transformersWithoutCatalog++;
    }
  }
  for (const sw of elements.switches ?? []) {
    if (catalogBlockerRefs.has(sw.ref_id)) {
      switchesWithoutCatalog++;
    }
  }

  return {
    linesWithoutCatalog: linesWithoutCatalog || undefined,
    cablesWithoutCatalog: cablesWithoutCatalog || undefined,
    transformersWithoutCatalog: transformersWithoutCatalog || undefined,
    switchesWithoutCatalog: switchesWithoutCatalog || undefined,
  };
}
