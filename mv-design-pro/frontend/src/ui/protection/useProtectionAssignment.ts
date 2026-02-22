/**
 * P16a — useProtectionAssignment Hook (READ-ONLY)
 *
 * Hook adaptera do pobierania przypisań zabezpieczeń do elementów.
 *
 * STATUS: LIVE (pobiera dane z API, fixture jako fallback)
 *
 * IMPLEMENTACJA:
 * - Pobieranie z API: GET /api/projects/{id}/protection-assignments
 * - Fallback do fixture data gdy API niedostępne (404 lub błąd sieciowy)
 */

import { useState, useEffect, useMemo } from 'react';
import type { ElementProtectionAssignment } from './element-assignment';
import { PROTECTION_ASSIGNMENT_FIXTURES } from './element-assignment';
import { useAppStateStore } from '../app-state';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Czy używać danych fixture (dla developmentu/testów).
 * W produkcji powinno być false i dane powinny pochodzić z API.
 */
const USE_FIXTURE_DATA = false;

// =============================================================================
// API
// =============================================================================

/**
 * Pobierz przypisania zabezpieczeń z backendu.
 * GET /api/projects/{projectId}/protection-assignments
 *
 * @param projectId - ID projektu
 * @returns Lista przypisań zabezpieczeń
 */
export async function fetchProtectionAssignments(
  projectId: string
): Promise<ElementProtectionAssignment[]> {
  const endpoint = `/api/projects/${projectId}/protection-assignments`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Błąd pobierania przypisań zabezpieczeń: ${response.status}`);
  }
  return response.json();
}

// =============================================================================
// Hook: useProtectionAssignment
// =============================================================================

interface UseProtectionAssignmentResult {
  /** Wszystkie przypisania dla danego elementu */
  assignments: ElementProtectionAssignment[];

  /** Czy element ma przypisane zabezpieczenia */
  hasProtection: boolean;

  /** Czy dane są ładowane */
  isLoading: boolean;

  /** Błąd ładowania (jeśli wystąpił) */
  error: string | null;
}

/**
 * Hook do pobierania przypisań zabezpieczeń dla elementu.
 *
 * @param elementId - ID elementu sieci (SldSymbol.elementId)
 * @returns Przypisania zabezpieczeń i stan ładowania
 *
 * @example
 * ```tsx
 * function ProtectionSection({ elementId }) {
 *   const { assignments, hasProtection, isLoading } = useProtectionAssignment(elementId);
 *
 *   if (!hasProtection) return null;
 *
 *   return (
 *     <div>
 *       {assignments.map(a => (
 *         <ProtectionBadge key={a.device_id} assignment={a} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProtectionAssignment(
  elementId: string | null | undefined
): UseProtectionAssignmentResult {
  const projectId = useAppStateStore((state) => state.activeProjectId);
  const [allAssignments, setAllAssignments] = useState<ElementProtectionAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFixture, setUsingFixture] = useState(USE_FIXTURE_DATA);

  useEffect(() => {
    if (!projectId || USE_FIXTURE_DATA) {
      setUsingFixture(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchProtectionAssignments(projectId)
      .then((data) => {
        if (!cancelled) {
          setAllAssignments(data);
          setUsingFixture(false);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          // Fallback do fixture data
          setUsingFixture(true);
          setError(err instanceof Error ? err.message : 'Nieznany błąd');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Memoized filter dla stabilności referencji
  const assignments = useMemo(() => {
    if (!elementId) return [];

    if (usingFixture) {
      return PROTECTION_ASSIGNMENT_FIXTURES.filter((a) => a.element_id === elementId);
    }

    return allAssignments.filter((a) => a.element_id === elementId);
  }, [elementId, usingFixture, allAssignments]);

  const hasProtection = assignments.length > 0;

  return {
    assignments,
    hasProtection,
    isLoading,
    error,
  };
}

// =============================================================================
// Hook: useProtectionAssignments (bulk)
// =============================================================================

interface UseProtectionAssignmentsResult {
  /** Mapa: elementId → przypisania */
  assignmentsByElement: Map<string, ElementProtectionAssignment[]>;

  /** Zbiór elementów z zabezpieczeniami */
  elementsWithProtection: Set<string>;

  /** Czy dane są ładowane */
  isLoading: boolean;

  /** Błąd ładowania (jeśli wystąpił) */
  error: string | null;
}

/**
 * Hook do pobierania wszystkich przypisań zabezpieczeń (bulk).
 * Używane do renderowania nakładki SLD.
 *
 * @param projectId - ID projektu
 * @param diagramId - ID diagramu SLD
 * @returns Mapa przypisań i stan ładowania
 */
export function useProtectionAssignments(
  projectId: string | null | undefined,
  diagramId: string | null | undefined
): UseProtectionAssignmentsResult {
  const [allAssignments, setAllAssignments] = useState<ElementProtectionAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFixture, setUsingFixture] = useState(USE_FIXTURE_DATA);

  useEffect(() => {
    if (!projectId || !diagramId || USE_FIXTURE_DATA) {
      setUsingFixture(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchProtectionAssignments(projectId)
      .then((data) => {
        if (!cancelled) {
          setAllAssignments(data);
          setUsingFixture(false);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          // Fallback do fixture data
          setUsingFixture(true);
          setError(err instanceof Error ? err.message : 'Nieznany błąd');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, diagramId]);

  const assignmentsByElement = useMemo(() => {
    const map = new Map<string, ElementProtectionAssignment[]>();
    const source = usingFixture ? PROTECTION_ASSIGNMENT_FIXTURES : allAssignments;

    if (!projectId || !diagramId) return map;

    for (const assignment of source) {
      const existing = map.get(assignment.element_id) || [];
      existing.push(assignment);
      map.set(assignment.element_id, existing);
    }
    return map;
  }, [projectId, diagramId, usingFixture, allAssignments]);

  const elementsWithProtection = useMemo(() => {
    return new Set(assignmentsByElement.keys());
  }, [assignmentsByElement]);

  return {
    assignmentsByElement,
    elementsWithProtection,
    isLoading,
    error,
  };
}
