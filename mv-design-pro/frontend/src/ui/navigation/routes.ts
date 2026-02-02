/**
 * Navigation Routes — UI_INTEGRATION_E2E
 *
 * CANONICAL ALIGNMENT:
 * - UI_CORE_ARCHITECTURE.md § 4.1: Navigation structure
 * - PROOF_UI_ARCHITECTURE.md § 7.6: Polish terminology binding
 *
 * BINDING: All route labels in Polish, no project codes (e.g., P11) in UX.
 *
 * Routes:
 * - Schemat jednokreskowy (SLD)
 * - Przegląd wyników (Results Browser)
 * - Ślad obliczeń (Proof/White Box)
 */

/**
 * Route definition.
 */
export interface RouteDefinition {
  /** Hash route (e.g., '#sld', '#results') */
  hash: string;
  /** Polish label for display */
  label: string;
  /** Short description */
  description: string;
  /** Icon (emoji or icon class) */
  icon: string;
  /** Required mode (if any) */
  requiredMode?: 'MODEL_EDIT' | 'CASE_CONFIG' | 'RESULT_VIEW';
}

/**
 * Application routes with Polish labels.
 * CANONICAL: No project codes (P11, etc.) in UX — Polish only.
 */
export const ROUTES: Record<string, RouteDefinition> = {
  SLD: {
    hash: '',
    label: 'Schemat jednokreskowy',
    description: 'Edycja schematu sieci',
    icon: '⚡',
    requiredMode: undefined, // Available in all modes
  },
  SLD_VIEW: {
    hash: '#sld-view',
    label: 'Podglad schematu',
    description: 'Podglad schematu jednokreskowego (tylko odczyt)',
    icon: '👁️',
    requiredMode: undefined, // Available in all modes (read-only)
  },
  RESULTS: {
    hash: '#results',
    label: 'Przegląd wyników',
    description: 'Tabele wyników obliczeń',
    icon: '📊',
    requiredMode: 'RESULT_VIEW',
  },
  PROOF: {
    hash: '#proof',
    label: 'Ślad obliczeń',
    description: 'Szczegółowy ślad obliczeń dla wybranego elementu',
    icon: '🔍',
    requiredMode: 'RESULT_VIEW',
  },
  PROTECTION_RESULTS: {
    hash: '#protection-results',
    label: 'Wyniki zabezpieczeń',
    description: 'Koordynacja zabezpieczeń',
    icon: '🛡️',
    requiredMode: 'RESULT_VIEW',
  },
  POWER_FLOW_RESULTS: {
    hash: '#power-flow-results',
    label: 'Wyniki rozpływu',
    description: 'Rozpływ mocy',
    icon: '⚡',
    requiredMode: 'RESULT_VIEW',
  },
  COMPARE: {
    hash: '#compare',
    label: 'Porównanie przypadków',
    description: 'Porównanie wyników i diagnostyki między przypadkami',
    icon: '⚖️',
    requiredMode: 'RESULT_VIEW',
  },
  REFERENCE_PATTERNS: {
    hash: '#reference-patterns',
    label: 'Wzorce odniesienia',
    description: 'Walidacja wzorców referencyjnych dla metodyki zabezpieczeń',
    icon: '📐',
    requiredMode: 'RESULT_VIEW',
  },
};

/**
 * Get route by hash.
 * NAVIGATION_SELECTOR_UI: Strips query params before matching.
 */
export function getRouteByHash(hash: string): RouteDefinition | null {
  // Strip query params from hash for matching
  const queryIndex = hash.indexOf('?');
  const cleanHash = queryIndex !== -1 ? hash.slice(0, queryIndex) : hash;

  for (const route of Object.values(ROUTES)) {
    if (route.hash === cleanHash || route.hash === cleanHash.replace('#', '')) {
      return route;
    }
  }
  return null;
}

/**
 * Get current route from window.location.hash.
 * NAVIGATION_SELECTOR_UI: Uses getRouteByHash which handles query params.
 */
export function getCurrentRoute(): RouteDefinition {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  return getRouteByHash(hash) ?? ROUTES.SLD;
}

/**
 * Navigate to route.
 * NAVIGATION_SELECTOR_UI: Preserves selection query params during navigation.
 */
export function navigateTo(route: RouteDefinition | string): void {
  const targetRoute = typeof route === 'string' ? ROUTES[route] : route;
  if (targetRoute && typeof window !== 'undefined') {
    // Preserve query params (selection state) during navigation
    const currentHash = window.location.hash;
    const queryIndex = currentHash.indexOf('?');
    const queryPart = queryIndex !== -1 ? currentHash.slice(queryIndex) : '';

    window.location.hash = targetRoute.hash + queryPart;
  }
}

/**
 * Navigate to SLD (Schemat jednokreskowy).
 */
export function navigateToSld(): void {
  navigateTo(ROUTES.SLD);
}

/**
 * Navigate to Results (Przegląd wyników).
 */
export function navigateToResults(): void {
  navigateTo(ROUTES.RESULTS);
}

/**
 * Navigate to Proof (Ślad obliczeń).
 */
export function navigateToProof(): void {
  navigateTo(ROUTES.PROOF);
}

/**
 * Navigate to Compare (Porównanie przypadków).
 */
export function navigateToCompare(): void {
  navigateTo(ROUTES.COMPARE);
}
