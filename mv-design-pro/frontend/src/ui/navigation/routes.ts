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
};

/**
 * Get route by hash.
 */
export function getRouteByHash(hash: string): RouteDefinition | null {
  for (const route of Object.values(ROUTES)) {
    if (route.hash === hash || route.hash === hash.replace('#', '')) {
      return route;
    }
  }
  return null;
}

/**
 * Get current route from window.location.hash.
 */
export function getCurrentRoute(): RouteDefinition {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  return getRouteByHash(hash) ?? ROUTES.SLD;
}

/**
 * Navigate to route.
 */
export function navigateTo(route: RouteDefinition | string): void {
  const targetRoute = typeof route === 'string' ? ROUTES[route] : route;
  if (targetRoute && typeof window !== 'undefined') {
    window.location.hash = targetRoute.hash;
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
