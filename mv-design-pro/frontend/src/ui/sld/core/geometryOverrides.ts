/**
 * ProjectGeometryOverridesV1 — kontrakt nadpisan geometrii SLD (zamrozony v1).
 *
 * CANONICAL CONTRACT (BINDING — RUN #3H):
 * - Overrides sa OSOBNA warstwa — NIE sa czescia LayoutEngine.
 * - LayoutResultV1 pozostaje niezmieniony (hash-stabilny).
 * - Skladanie: applyOverrides(LayoutResultV1, OverridesV1) → EffectiveLayoutV1.
 * - Hashing: canonical SHA-256 (permutation invariant, bez timestampow).
 * - Walidacja: elementId musi istniec w LayoutResult; brak kolizji; port constraints.
 *
 * PIPELINE:
 *   LayoutResultV1 + ProjectGeometryOverridesV1 → applyOverrides → EffectiveLayoutV1
 */

// =============================================================================
// VERSION
// =============================================================================

export const OVERRIDES_VERSION = '1.0' as const;

// =============================================================================
// SCOPE — zakres nadpisania
// =============================================================================

export const OverrideScopeV1 = {
  /** Wezel (source, load, junction) */
  NODE: 'NODE',
  /** Blok stacji (SwitchgearBlockV1) */
  BLOCK: 'BLOCK',
  /** Pole w bloku stacji */
  FIELD: 'FIELD',
  /** Etykieta elementu */
  LABEL: 'LABEL',
  /** Kanal krawedzi (reserved — nie zaimplementowany w v1) */
  EDGE_CHANNEL: 'EDGE_CHANNEL',
} as const;

export type OverrideScopeV1 = (typeof OverrideScopeV1)[keyof typeof OverrideScopeV1];

// =============================================================================
// OPERATION — typ operacji geometrycznej
// =============================================================================

export const OverrideOperationV1 = {
  /** Przesuniecie wzgledem pozycji bazowej (delta x,y) */
  MOVE_DELTA: 'MOVE_DELTA',
  /** Wymuszenie kolejnosci pol w bloku stacji */
  REORDER_FIELD: 'REORDER_FIELD',
  /** Wymuszenie pozycji etykiety */
  MOVE_LABEL: 'MOVE_LABEL',
} as const;

export type OverrideOperationV1 = (typeof OverrideOperationV1)[keyof typeof OverrideOperationV1];

// =============================================================================
// PAYLOAD — dane per operacja (walidowane)
// =============================================================================

/** Payload dla MOVE_DELTA: przesuniecie wzgledem bazy. */
export interface MoveDeltaPayloadV1 {
  readonly dx: number;
  readonly dy: number;
}

/** Payload dla REORDER_FIELD: kolejnosc pol. */
export interface ReorderFieldPayloadV1 {
  readonly fieldOrder: readonly string[];
}

/** Payload dla MOVE_LABEL: pozycja etykiety. */
export interface MoveLabelPayloadV1 {
  readonly anchorX: number;
  readonly anchorY: number;
}

/** Unia payloadow — walidowana per operacja. */
export type GeometryOverridePayloadV1 =
  | MoveDeltaPayloadV1
  | ReorderFieldPayloadV1
  | MoveLabelPayloadV1;

// =============================================================================
// OVERRIDE ITEM — pojedynczy rekord nadpisania
// =============================================================================

export interface GeometryOverrideItemV1 {
  /** Globalny identyfikator elementu (= nodeId / blockId / fieldId). */
  readonly elementId: string;
  /** Zakres nadpisania. */
  readonly scope: OverrideScopeV1;
  /** Typ operacji. */
  readonly operation: OverrideOperationV1;
  /** Dane operacji (walidowane per operation). */
  readonly payload: GeometryOverridePayloadV1;
}

// =============================================================================
// TOP-LEVEL CONTRACT
// =============================================================================

/**
 * ProjectGeometryOverridesV1 — zamrozony kontrakt nadpisan geometrii.
 *
 * INVARIANTY:
 * 1. items sortowane deterministycznie po (elementId, scope, operation).
 * 2. Hash liczony WYLACZNIE z items (bez timestampow, bez identyfikatorow sesji).
 * 3. Permutation invariance — kolejnosc dostarczenia nie ma znaczenia.
 * 4. overridesVersion = '1.0' (zamrozony).
 */
export interface ProjectGeometryOverridesV1 {
  /** Wersja kontraktu nadpisan. */
  readonly overridesVersion: typeof OVERRIDES_VERSION;
  /** ID studium przypadku. */
  readonly studyCaseId: string;
  /** Hash snapshotu ENM (referencja do stanu modelu). */
  readonly snapshotHash: string;
  /** Lista nadpisan — sortowana deterministycznie. */
  readonly items: readonly GeometryOverrideItemV1[];
}

// =============================================================================
// EMPTY OVERRIDES
// =============================================================================

/** Puste overrides (brak nadpisan). */
export function emptyOverrides(studyCaseId: string, snapshotHash: string): ProjectGeometryOverridesV1 {
  return {
    overridesVersion: OVERRIDES_VERSION,
    studyCaseId,
    snapshotHash,
    items: [],
  };
}

// =============================================================================
// CANONICAL SERIALIZATION
// =============================================================================

/**
 * Kanonizuje overrides — sortuje items deterministycznie.
 *
 * Sortowanie: elementId → scope → operation (leksykograficznie).
 */
export function canonicalizeOverrides(
  overrides: ProjectGeometryOverridesV1,
): ProjectGeometryOverridesV1 {
  const sorted = [...overrides.items].sort((a, b) => {
    const cmp1 = a.elementId.localeCompare(b.elementId);
    if (cmp1 !== 0) return cmp1;
    const cmp2 = a.scope.localeCompare(b.scope);
    if (cmp2 !== 0) return cmp2;
    return a.operation.localeCompare(b.operation);
  });

  return {
    overridesVersion: overrides.overridesVersion,
    studyCaseId: overrides.studyCaseId,
    snapshotHash: overrides.snapshotHash,
    items: sorted,
  };
}

/**
 * Oblicza deterministyczny hash nadpisan.
 *
 * Hash liczy sie WYLACZNIE z items (kanoniczny JSON):
 * - Klucze JSON w kolejnosci alfabetycznej.
 * - BEZ timestampow, identyfikatorow sesji, createdAt.
 * - Permutation invariant (sort po elementId/scope/operation).
 *
 * Algorytm: FNV-1a 32-bit (spojny z computeLayoutResultHash).
 */
export function computeOverridesHash(overrides: ProjectGeometryOverridesV1): string {
  const canonical = canonicalizeOverrides(overrides);

  const hashInput = canonical.items.map((item) => ({
    elementId: item.elementId,
    operation: item.operation,
    payload: item.payload,
    scope: item.scope,
  }));

  const json = JSON.stringify(hashInput);

  // FNV-1a 32-bit hash (ten sam algorytm co computeLayoutResultHash)
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

// =============================================================================
// GRID SNAP
// =============================================================================

/** Domyslny rozmiar siatki snap-to-grid (w px). */
export const GEOMETRY_GRID_SNAP = 20;

/**
 * Przyciaga wartosc do siatki (deterministyczne).
 */
export function snapToGrid(value: number, gridSize: number = GEOMETRY_GRID_SNAP): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Przyciaga payload MOVE_DELTA do siatki.
 */
export function snapDeltaToGrid(
  dx: number,
  dy: number,
  gridSize: number = GEOMETRY_GRID_SNAP,
): MoveDeltaPayloadV1 {
  return {
    dx: snapToGrid(dx, gridSize),
    dy: snapToGrid(dy, gridSize),
  };
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface OverrideValidationErrorV1 {
  readonly elementId: string;
  readonly code: string;
  readonly message: string;
}

export interface OverrideValidationResultV1 {
  readonly valid: boolean;
  readonly errors: readonly OverrideValidationErrorV1[];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Waliduje overrides przeciwko LayoutResultV1.
 *
 * Reguly:
 * 1. elementId musi istniec w LayoutResult (jako nodeId lub blockId).
 * 2. MOVE_DELTA: payload musi miec dx/dy jako liczby.
 * 3. REORDER_FIELD: fieldOrder musi byc tablica stringow.
 * 4. MOVE_LABEL: anchorX/anchorY musi byc liczbami.
 * 5. Scope musi byc poprawny dla danej operacji.
 *
 * Kolizje (overlap) i port constraints sprawdzane sa w applyOverrides()
 * (po nalozeniu — bo wymagaja pelnego kontekstu geometrii).
 */
export function validateOverridesAgainstLayout(
  overrides: ProjectGeometryOverridesV1,
  layoutNodeIds: ReadonlySet<string>,
  layoutBlockIds: ReadonlySet<string>,
): OverrideValidationResultV1 {
  const errors: OverrideValidationErrorV1[] = [];

  for (const item of overrides.items) {
    // Rule 1: elementId musi istniec
    const existsInNodes = layoutNodeIds.has(item.elementId);
    const existsInBlocks = layoutBlockIds.has(item.elementId);

    if (item.scope === OverrideScopeV1.NODE && !existsInNodes) {
      errors.push({
        elementId: item.elementId,
        code: 'geometry.override_invalid_element',
        message: `Element '${item.elementId}' nie istnieje w layoucie (NODE scope)`,
      });
      continue;
    }

    if (item.scope === OverrideScopeV1.BLOCK && !existsInBlocks) {
      errors.push({
        elementId: item.elementId,
        code: 'geometry.override_invalid_element',
        message: `Blok '${item.elementId}' nie istnieje w layoucie (BLOCK scope)`,
      });
      continue;
    }

    if (item.scope === OverrideScopeV1.LABEL && !existsInNodes && !existsInBlocks) {
      errors.push({
        elementId: item.elementId,
        code: 'geometry.override_invalid_element',
        message: `Element '${item.elementId}' nie istnieje w layoucie (LABEL scope)`,
      });
      continue;
    }

    // Rule 2: MOVE_DELTA payload
    if (item.operation === OverrideOperationV1.MOVE_DELTA) {
      const p = item.payload as MoveDeltaPayloadV1;
      if (typeof p.dx !== 'number' || typeof p.dy !== 'number') {
        errors.push({
          elementId: item.elementId,
          code: 'geometry.override_invalid_element',
          message: `MOVE_DELTA: payload musi miec dx/dy jako liczby`,
        });
      }
      if (!isFinite(p.dx) || !isFinite(p.dy)) {
        errors.push({
          elementId: item.elementId,
          code: 'geometry.override_invalid_element',
          message: `MOVE_DELTA: dx/dy musza byc skonczne`,
        });
      }
    }

    // Rule 3: REORDER_FIELD payload
    if (item.operation === OverrideOperationV1.REORDER_FIELD) {
      const p = item.payload as ReorderFieldPayloadV1;
      if (!Array.isArray(p.fieldOrder)) {
        errors.push({
          elementId: item.elementId,
          code: 'geometry.override_forbidden_for_station_type',
          message: `REORDER_FIELD: fieldOrder musi byc tablica`,
        });
      }
    }

    // Rule 4: MOVE_LABEL payload
    if (item.operation === OverrideOperationV1.MOVE_LABEL) {
      const p = item.payload as MoveLabelPayloadV1;
      if (typeof p.anchorX !== 'number' || typeof p.anchorY !== 'number') {
        errors.push({
          elementId: item.elementId,
          code: 'geometry.override_invalid_element',
          message: `MOVE_LABEL: anchorX/anchorY musza byc liczbami`,
        });
      }
    }

    // Rule 5: scope-operation compatibility
    if (
      item.scope === OverrideScopeV1.NODE &&
      item.operation !== OverrideOperationV1.MOVE_DELTA
    ) {
      errors.push({
        elementId: item.elementId,
        code: 'geometry.override_forbidden_for_station_type',
        message: `NODE scope dozwala tylko operacji MOVE_DELTA`,
      });
    }

    if (
      item.scope === OverrideScopeV1.FIELD &&
      item.operation !== OverrideOperationV1.REORDER_FIELD
    ) {
      errors.push({
        elementId: item.elementId,
        code: 'geometry.override_forbidden_for_station_type',
        message: `FIELD scope dozwala tylko operacji REORDER_FIELD`,
      });
    }

    if (
      item.scope === OverrideScopeV1.LABEL &&
      item.operation !== OverrideOperationV1.MOVE_LABEL
    ) {
      errors.push({
        elementId: item.elementId,
        code: 'geometry.override_forbidden_for_station_type',
        message: `LABEL scope dozwala tylko operacji MOVE_LABEL`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// FIXACTION CODES (CAD)
// =============================================================================

/**
 * Kody FixActions dla trybu projektowego (CAD).
 * Stabilne identyfikatory — nigdy nie zmieniac istniejacych.
 */
export const GeometryFixCodes = {
  OVERRIDE_INVALID_ELEMENT: 'geometry.override_invalid_element',
  OVERRIDE_CAUSES_COLLISION: 'geometry.override_causes_collision',
  OVERRIDE_BREAKS_PORT_CONSTRAINTS: 'geometry.override_breaks_port_constraints',
  OVERRIDE_FORBIDDEN_FOR_STATION_TYPE: 'geometry.override_forbidden_for_station_type',
  OVERRIDE_REQUIRES_UNLOCK: 'geometry.override_requires_unlock',
} as const;

export type GeometryFixCode = (typeof GeometryFixCodes)[keyof typeof GeometryFixCodes];
