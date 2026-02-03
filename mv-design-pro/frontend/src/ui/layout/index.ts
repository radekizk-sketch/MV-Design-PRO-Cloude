/**
 * Layout Module — P12a Data Manager Parity + PROJECT_TREE_PARITY_V1 + POWERFACTORY_LAYOUT
 *
 * Main application layout components:
 * - PowerFactoryLayout: PowerFactory/ETAP-style persistent layout (RECOMMENDED)
 * - MainLayout: Legacy top-level layout with ActiveCaseBar
 * - SidebarLayout: Layout with ProjectTree sidebar navigation
 */

export { PowerFactoryLayout, default as PowerFactoryLayoutDefault } from './PowerFactoryLayout';
export type { PowerFactoryLayoutProps } from './PowerFactoryLayout';
export { MainLayout, default as MainLayoutDefault } from './MainLayout';
export { SidebarLayout, default as SidebarLayoutDefault } from './SidebarLayout';
