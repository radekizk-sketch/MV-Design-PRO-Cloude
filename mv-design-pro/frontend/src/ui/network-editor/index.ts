/**
 * network-editor — Re-export canonical network editor page.
 *
 * `NetworkEditorPage` is the primary SLD-based model editing screen.
 * It delegates to `SldEditorPage` which owns the full PowerFactory-style
 * canvas with context menu, property grid, and domain operation dispatch.
 *
 * CANONICAL ALIGNMENT: POWERFACTORY_LAYOUT — edytor jest zawsze widoczny.
 */

export { SldEditorPage as NetworkEditorPage } from '../sld';
