/**
 * URL State Management — NAVIGATION_SELECTOR_UI
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md § A.3: URL reflects navigation state
 * - UI_CORE_ARCHITECTURE.md § 4.3: Deterministic URL encoding
 *
 * BINDING: URL is single source of truth for navigation state.
 * Refresh preserves: route + selection (happy-path).
 *
 * URL Format:
 * - Hash: route (e.g., #results, #proof)
 * - Search params: selection state (e.g., ?sel=bus_123&type=Bus)
 */

import type { ElementType, SelectedElement } from '../types';

/**
 * URL parameter keys for selection state.
 * DETERMINISTIC: Fixed keys for stable URLs.
 */
export const URL_PARAMS = {
  /** Selected element ID */
  SELECTION_ID: 'sel',
  /** Selected element type */
  SELECTION_TYPE: 'type',
  /** Selected element name (encoded) */
  SELECTION_NAME: 'name',
  /** Diagnostics overlay visibility (1|0) */
  DIAGNOSTICS_VISIBLE: 'diag',
  /** Diagnostics severity filter (all|err|errwarn) */
  DIAGNOSTICS_SEVERITY: 'diag_sev',
} as const;

/**
 * Diagnostics severity filter URL values.
 * Maps to DiagnosticsSeverityFilter type.
 */
export const DIAG_SEV_URL_VALUES = {
  ALL: 'all',
  ERRORS_ONLY: 'err',
  ERRORS_WARNS: 'errwarn',
} as const;

export type DiagSevUrlValue = typeof DIAG_SEV_URL_VALUES[keyof typeof DIAG_SEV_URL_VALUES];

/**
 * Valid element types for URL validation.
 */
const VALID_ELEMENT_TYPES: ElementType[] = [
  'Bus',
  'LineBranch',
  'TransformerBranch',
  'Switch',
  'Source',
  'Load',
];

/**
 * Check if string is valid ElementType.
 */
function isValidElementType(type: string): type is ElementType {
  return VALID_ELEMENT_TYPES.includes(type as ElementType);
}

/**
 * Encode selection state into URL search params.
 *
 * @param selection - Selected element (or null to clear)
 * @returns URLSearchParams with encoded selection
 *
 * @example
 * encodeSelectionToParams({ id: 'bus_1', type: 'Bus', name: 'Szyna główna' })
 * // Returns: URLSearchParams { sel: 'bus_1', type: 'Bus', name: 'Szyna główna' }
 */
export function encodeSelectionToParams(
  selection: SelectedElement | null
): URLSearchParams {
  const params = new URLSearchParams();

  if (selection) {
    params.set(URL_PARAMS.SELECTION_ID, selection.id);
    params.set(URL_PARAMS.SELECTION_TYPE, selection.type);
    params.set(URL_PARAMS.SELECTION_NAME, selection.name);
  }

  return params;
}

/**
 * Decode selection state from URL search params.
 *
 * @param params - URLSearchParams to decode
 * @returns SelectedElement or null if no valid selection
 *
 * DETERMINISTIC: Invalid/incomplete params return null (no exceptions).
 */
export function decodeSelectionFromParams(
  params: URLSearchParams
): SelectedElement | null {
  const id = params.get(URL_PARAMS.SELECTION_ID);
  const type = params.get(URL_PARAMS.SELECTION_TYPE);
  const name = params.get(URL_PARAMS.SELECTION_NAME);

  // All three params required for valid selection
  if (!id || !type || !name) {
    return null;
  }

  // Validate element type
  if (!isValidElementType(type)) {
    return null;
  }

  return { id, type, name };
}

/**
 * Get current URL search params (from window.location).
 * Works with hash-based routing.
 */
export function getCurrentSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  // Hash-based routing: search params come after the hash
  // e.g., #results?sel=bus_1&type=Bus
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');

  if (queryIndex === -1) {
    return new URLSearchParams();
  }

  return new URLSearchParams(hash.slice(queryIndex + 1));
}

/**
 * Get current hash route (without search params).
 */
export function getCurrentHashRoute(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');

  if (queryIndex === -1) {
    return hash;
  }

  return hash.slice(0, queryIndex);
}

/**
 * Update URL with selection state.
 * Uses replaceState to avoid cluttering browser history.
 *
 * @param selection - Selection to encode (or null to clear)
 *
 * BINDING: Does not trigger hashchange event (no navigation side-effects).
 */
export function updateUrlWithSelection(selection: SelectedElement | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  const currentHash = getCurrentHashRoute();
  const params = encodeSelectionToParams(selection);
  const queryString = params.toString();

  // Build new URL: hash + optional query string
  const newHash = queryString ? `${currentHash}?${queryString}` : currentHash;

  // Use replaceState to avoid history pollution
  const newUrl = `${window.location.pathname}${newHash}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Read selection from current URL.
 *
 * @returns SelectedElement or null if no valid selection in URL
 */
export function readSelectionFromUrl(): SelectedElement | null {
  const params = getCurrentSearchParams();
  return decodeSelectionFromParams(params);
}

/**
 * Clear selection from URL.
 */
export function clearSelectionFromUrl(): void {
  updateUrlWithSelection(null);
}

// =============================================================================
// Diagnostics URL State
// =============================================================================

export interface DiagnosticsUrlState {
  /** Overlay visibility */
  visible: boolean;
  /** Severity filter */
  filter: 'ALL' | 'ERRORS_ONLY' | 'ERRORS_WARNS';
}

/**
 * Convert DiagnosticsSeverityFilter to URL value.
 */
export function filterToUrlValue(filter: 'ALL' | 'ERRORS_ONLY' | 'ERRORS_WARNS'): DiagSevUrlValue {
  switch (filter) {
    case 'ALL':
      return DIAG_SEV_URL_VALUES.ALL;
    case 'ERRORS_ONLY':
      return DIAG_SEV_URL_VALUES.ERRORS_ONLY;
    case 'ERRORS_WARNS':
      return DIAG_SEV_URL_VALUES.ERRORS_WARNS;
    default:
      return DIAG_SEV_URL_VALUES.ALL;
  }
}

/**
 * Convert URL value to DiagnosticsSeverityFilter.
 */
export function urlValueToFilter(value: string | null): 'ALL' | 'ERRORS_ONLY' | 'ERRORS_WARNS' {
  switch (value) {
    case DIAG_SEV_URL_VALUES.ALL:
      return 'ALL';
    case DIAG_SEV_URL_VALUES.ERRORS_ONLY:
      return 'ERRORS_ONLY';
    case DIAG_SEV_URL_VALUES.ERRORS_WARNS:
      return 'ERRORS_WARNS';
    default:
      return 'ALL';
  }
}

/**
 * Read diagnostics state from URL.
 *
 * @returns DiagnosticsUrlState with current values from URL
 */
export function readDiagnosticsFromUrl(): DiagnosticsUrlState {
  const params = getCurrentSearchParams();
  const diagVisible = params.get(URL_PARAMS.DIAGNOSTICS_VISIBLE);
  const diagSev = params.get(URL_PARAMS.DIAGNOSTICS_SEVERITY);

  return {
    visible: diagVisible === '1',
    filter: urlValueToFilter(diagSev),
  };
}

/**
 * Update URL with diagnostics state.
 * Preserves existing selection params.
 *
 * @param state - Diagnostics state to encode
 */
export function updateUrlWithDiagnostics(state: DiagnosticsUrlState): void {
  if (typeof window === 'undefined') {
    return;
  }

  const currentHash = getCurrentHashRoute();
  const params = getCurrentSearchParams();

  // Update diagnostics params
  if (state.visible) {
    params.set(URL_PARAMS.DIAGNOSTICS_VISIBLE, '1');
    params.set(URL_PARAMS.DIAGNOSTICS_SEVERITY, filterToUrlValue(state.filter));
  } else {
    params.delete(URL_PARAMS.DIAGNOSTICS_VISIBLE);
    params.delete(URL_PARAMS.DIAGNOSTICS_SEVERITY);
  }

  const queryString = params.toString();
  const newHash = queryString ? `${currentHash}?${queryString}` : currentHash;

  // Use replaceState to avoid history pollution
  const newUrl = `${window.location.pathname}${newHash}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Update URL with both selection and diagnostics state.
 * Combines both in a single URL update.
 *
 * @param selection - Selection state (or null to clear)
 * @param diagnostics - Diagnostics state
 */
export function updateUrlWithSelectionAndDiagnostics(
  selection: SelectedElement | null,
  diagnostics: DiagnosticsUrlState
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const currentHash = getCurrentHashRoute();
  const params = new URLSearchParams();

  // Add selection params
  if (selection) {
    params.set(URL_PARAMS.SELECTION_ID, selection.id);
    params.set(URL_PARAMS.SELECTION_TYPE, selection.type);
    params.set(URL_PARAMS.SELECTION_NAME, selection.name);
  }

  // Add diagnostics params
  if (diagnostics.visible) {
    params.set(URL_PARAMS.DIAGNOSTICS_VISIBLE, '1');
    params.set(URL_PARAMS.DIAGNOSTICS_SEVERITY, filterToUrlValue(diagnostics.filter));
  }

  const queryString = params.toString();
  const newHash = queryString ? `${currentHash}?${queryString}` : currentHash;

  // Use replaceState to avoid history pollution
  const newUrl = `${window.location.pathname}${newHash}`;
  window.history.replaceState(null, '', newUrl);
}
