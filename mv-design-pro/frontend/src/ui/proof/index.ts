/**
 * ui/proof — Moduł śladu obliczeń
 *
 * Widok "Ślad obliczeń" (read-only) dla dokumentacji audytowej.
 *
 * COMPONENTS:
 * - TraceViewer: Główny 3-panelowy widok
 * - TraceToc: Spis treści kroków (lewy panel)
 * - TraceStepView: Szczegóły kroku (środkowy panel)
 * - TraceMetadataPanel: Metadane (prawy panel)
 *
 * NOTE: Nazwy kodowe (P11, P14, P17) NIGDY nie są eksportowane ani używane w UI.
 */

export { TraceViewer, TraceViewerContainer } from './TraceViewer';
export { TraceToc } from './TraceToc';
export { TraceStepView, TraceStepViewEmpty } from './TraceStepView';
export { TraceMetadataPanel, TraceMetadataPanelEmpty } from './TraceMetadataPanel';
