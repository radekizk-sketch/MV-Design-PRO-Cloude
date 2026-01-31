/**
 * Navigation module exports — UI_INTEGRATION_E2E
 */
export {
  ROUTES,
  getCurrentRoute,
  getRouteByHash,
  navigateTo,
  navigateToSld,
  navigateToResults,
  navigateToProof,
  type RouteDefinition,
} from './routes';

export {
  useCurrentRoute,
  useNavigation,
  useNavigationWithSelection,
} from './hooks';
