/**
 * Power Flow SLD Overlay Component — PR-LF-04
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 * - sld_rules.md § C.2: RESULT_VIEW mode
 * - LOAD_FLOW_GUARDS.md: Token-only, deterministic, no hardcoded thresholds
 * - AGENTS.md: NOT-A-SOLVER, no physics in UI
 *
 * FEATURES:
 * - Explicit overlay modes: voltage / loading / flow direction
 * - Mode selector UI (not auto-switched)
 * - Deterministic rendering (sorted by element_id)
 * - Token-only coloring via OverlayVisualState
 * - Toggleable visibility
 * - Respects result_status (FRESH/OUTDATED)
 *
 * RULES (BINDING):
 * - READ-ONLY: No model mutations
 * - Overlay is a SEPARATE LAYER, not part of model symbols
 * - No physics calculations — mapping only
 * - No hardcoded thresholds — color tokens from OverlayVisualState
 * - No hex colors — semantic CSS classes only
 * - No geometry modification, no zoom dependence
 */

import { useMemo } from 'react';
import { usePowerFlowResultsStore } from './store';
import type { PowerFlowBusResult, PowerFlowBranchResult, LoadFlowOverlayMode } from './types';
import { LOAD_FLOW_OVERLAY_MODE_LABELS } from './types';
import type { OverlayVisualState } from '../sld-overlay/overlayTypes';
import { VISUAL_STATE_STYLE } from '../sld-overlay/overlayTypes';

// =============================================================================
// Helper Functions — formatting only, no physics, no thresholds
// =============================================================================

function formatVoltage(v_pu: number): string {
  return `${v_pu.toFixed(4)} pu`;
}

function formatAngle(angle_deg: number): string {
  return `${angle_deg.toFixed(1)}°`;
}

function formatPower(p_mw: number, q_mvar: number): string {
  return `${p_mw.toFixed(2)} MW / ${q_mvar.toFixed(2)} Mvar`;
}

function formatLosses(p_mw: number): string {
  return `Straty: ${(p_mw * 1000).toFixed(1)} kW`;
}

function formatLoading(loading_pct: number | null): string {
  if (loading_pct === null) return 'b.d.';
  return `${loading_pct.toFixed(1)}%`;
}

/**
 * Map OverlayVisualState → CSS class string for label badges.
 * Token-only — no hardcoded hex or threshold logic.
 */
function getStateCssClass(state: OverlayVisualState): string {
  const s = VISUAL_STATE_STYLE[state];
  return `${s.text} ${s.bg} ${s.border}`;
}

/**
 * Get outdated label CSS class.
 */
const OUTDATED_CLASS = 'border-slate-300 bg-slate-100 opacity-60';

// =============================================================================
// Bus Overlay Label — Voltage Mode
// =============================================================================

interface BusVoltageLabelProps {
  bus: PowerFlowBusResult;
  position: { x: number; y: number };
  isOutdated: boolean;
  visualState: OverlayVisualState;
}

function BusVoltageLabel({ bus, position, isOutdated, visualState }: BusVoltageLabelProps) {
  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
        isOutdated ? OUTDATED_CLASS : getStateCssClass(visualState)
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y - 24}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <span className="font-mono">{formatVoltage(bus.v_pu)}</span>
      <span className="ml-1 text-slate-500">{formatAngle(bus.angle_deg)}</span>
    </div>
  );
}

// =============================================================================
// Branch Overlay Label — Flow Mode
// =============================================================================

interface BranchFlowLabelProps {
  branch: PowerFlowBranchResult;
  position: { x: number; y: number };
  isOutdated: boolean;
}

function BranchFlowLabel({ branch, position, isOutdated }: BranchFlowLabelProps) {
  const hasLosses = Math.abs(branch.losses_p_mw) > 0.0001;

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
        isOutdated ? OUTDATED_CLASS : getStateCssClass('OK')
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="font-mono">
        {formatPower(branch.p_from_mw, branch.q_from_mvar)}
      </div>
      {hasLosses && (
        <div className={getStateCssClass('WARNING')}>
          {formatLosses(branch.losses_p_mw)}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Branch Overlay Label — Loading Mode
// =============================================================================

interface BranchLoadingLabelProps {
  branch: PowerFlowBranchResult;
  position: { x: number; y: number };
  isOutdated: boolean;
  loadingPct: number | null;
  visualState: OverlayVisualState;
}

function BranchLoadingLabel({ branch, position, isOutdated, loadingPct, visualState }: BranchLoadingLabelProps) {
  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
        isOutdated ? OUTDATED_CLASS : getStateCssClass(visualState)
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="font-mono">
        {branch.branch_id}: {formatLoading(loadingPct)}
      </div>
    </div>
  );
}

// =============================================================================
// Overlay Mode Selector
// =============================================================================

interface OverlayModeSelectorProps {
  currentMode: LoadFlowOverlayMode;
  onModeChange: (mode: LoadFlowOverlayMode) => void;
  overlayVisible: boolean;
  onToggleVisible: () => void;
}

export function OverlayModeSelector({
  currentMode,
  onModeChange,
  overlayVisible,
  onToggleVisible,
}: OverlayModeSelectorProps) {
  const modes: LoadFlowOverlayMode[] = ['voltage', 'loading', 'flow'];

  return (
    <div
      className="pointer-events-auto absolute right-2 top-2 z-20 flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 shadow-sm"
      data-testid="lf-overlay-mode-selector"
    >
      <button
        data-testid="lf-overlay-toggle"
        onClick={onToggleVisible}
        className={`mr-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
          overlayVisible
            ? 'bg-blue-100 text-blue-700 border border-blue-300'
            : 'bg-slate-50 text-slate-500 border border-slate-200'
        }`}
      >
        {overlayVisible ? 'Nakładka wł.' : 'Nakładka wył.'}
      </button>
      {overlayVisible &&
        modes.map((mode) => (
          <button
            key={mode}
            data-testid={`lf-overlay-mode-${mode}`}
            onClick={() => onModeChange(mode)}
            className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
              currentMode === mode
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {LOAD_FLOW_OVERLAY_MODE_LABELS[mode]}
          </button>
        ))}
    </div>
  );
}

// =============================================================================
// Power Flow SLD Overlay Container
// =============================================================================

interface PowerFlowSldOverlayProps {
  /**
   * Map of bus_id to position on canvas.
   * Position should be in pixels relative to canvas.
   */
  busPositions: Map<string, { x: number; y: number }>;

  /**
   * Map of branch_id to position on canvas (typically midpoint).
   */
  branchPositions: Map<string, { x: number; y: number }>;

  /**
   * Optional: force visibility state.
   * If not provided, uses store state.
   */
  visible?: boolean;

  /**
   * Optional: map of bus_id → OverlayVisualState from backend analysis.
   * If not provided, all buses render as 'OK' (no UI-side threshold logic).
   */
  busVisualStates?: Map<string, OverlayVisualState>;

  /**
   * Optional: map of branch_id → { loading_pct, visual_state } from backend analysis.
   * If not provided, loading mode shows 'b.d.' (brak danych).
   */
  branchLoadingData?: Map<string, { loading_pct: number | null; visual_state: OverlayVisualState }>;
}

export function PowerFlowSldOverlay({
  busPositions,
  branchPositions,
  visible,
  busVisualStates,
  branchLoadingData,
}: PowerFlowSldOverlayProps) {
  const results = usePowerFlowResultsStore((s) => s.results);
  const runHeader = usePowerFlowResultsStore((s) => s.runHeader);
  const overlayVisible = usePowerFlowResultsStore((s) => s.overlayVisible);
  const overlayMode = usePowerFlowResultsStore((s) => s.overlayMode);
  const toggleOverlay = usePowerFlowResultsStore((s) => s.toggleOverlay);
  const setOverlayMode = usePowerFlowResultsStore((s) => s.setOverlayMode);

  // Determine visibility
  const isVisible = visible !== undefined ? visible : overlayVisible;

  // Check if results are outdated
  const isOutdated = useMemo(
    () => runHeader?.result_status === 'OUTDATED',
    [runHeader?.result_status]
  );

  // Build positioned bus labels — DETERMINISTIC sort by bus_id
  const busLabels = useMemo(() => {
    if (!results || !isVisible) return [];
    return [...results.bus_results]
      .sort((a, b) => a.bus_id.localeCompare(b.bus_id))
      .map((bus) => {
        const position = busPositions.get(bus.bus_id);
        if (!position) return null;
        const visualState: OverlayVisualState = busVisualStates?.get(bus.bus_id) ?? 'OK';
        return { bus, position, visualState };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [results, busPositions, isVisible, busVisualStates]);

  // Build positioned branch labels — DETERMINISTIC sort by branch_id
  const branchLabels = useMemo(() => {
    if (!results || !isVisible) return [];
    return [...results.branch_results]
      .sort((a, b) => a.branch_id.localeCompare(b.branch_id))
      .map((branch) => {
        const position = branchPositions.get(branch.branch_id);
        if (!position) return null;
        const loadingInfo = branchLoadingData?.get(branch.branch_id);
        return {
          branch,
          position,
          loadingPct: loadingInfo?.loading_pct ?? null,
          loadingVisualState: loadingInfo?.visual_state ?? ('OK' as OverlayVisualState),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [results, branchPositions, isVisible, branchLoadingData]);

  // Don't render if no data
  if (!results) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-testid="power-flow-sld-overlay"
    >
      {/* Mode selector — always visible for mode switching */}
      <OverlayModeSelector
        currentMode={overlayMode}
        onModeChange={setOverlayMode}
        overlayVisible={isVisible}
        onToggleVisible={() => toggleOverlay()}
      />

      {/* Overlay content — only when visible */}
      {isVisible && (
        <>
          {/* Outdated warning */}
          {isOutdated && (
            <div className="absolute left-2 top-2 z-20 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-xs text-amber-800">
              Wyniki nieaktualne
            </div>
          )}

          {/* Voltage mode — bus labels */}
          {overlayMode === 'voltage' &&
            busLabels.map(({ bus, position, visualState }) => (
              <BusVoltageLabel
                key={bus.bus_id}
                bus={bus}
                position={position}
                isOutdated={isOutdated ?? false}
                visualState={visualState}
              />
            ))}

          {/* Flow mode — branch flow labels */}
          {overlayMode === 'flow' &&
            branchLabels.map(({ branch, position }) => (
              <BranchFlowLabel
                key={branch.branch_id}
                branch={branch}
                position={position}
                isOutdated={isOutdated ?? false}
              />
            ))}

          {/* Loading mode — branch loading labels */}
          {overlayMode === 'loading' &&
            branchLabels.map(({ branch, position, loadingPct, loadingVisualState }) => (
              <BranchLoadingLabel
                key={branch.branch_id}
                branch={branch}
                position={position}
                isOutdated={isOutdated ?? false}
                loadingPct={loadingPct}
                visualState={loadingVisualState}
              />
            ))}
        </>
      )}
    </div>
  );
}
