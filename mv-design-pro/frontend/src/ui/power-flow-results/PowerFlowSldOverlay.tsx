/**
 * P20b — Power Flow SLD Overlay Component
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 * - sld_rules.md § C.2: RESULT_VIEW mode
 * - powerfactory_ui_parity.md: Voltage colors, loading colors
 * - AGENTS.md: NOT-A-SOLVER, no physics in UI
 *
 * FEATURES:
 * - Renders voltage labels on bus symbols (V_pu)
 * - Renders power flow labels on branch symbols (P/Q, losses)
 * - Color-codes voltages (high/low violations)
 * - Toggleable visibility
 * - Respects result_status (FRESH/OUTDATED)
 *
 * RULES:
 * - READ-ONLY: No model mutations
 * - Overlay is a SEPARATE LAYER, not part of model symbols
 * - No physics calculations - mapping only
 */

import { useMemo } from 'react';
import { usePowerFlowResultsStore } from './store';
import type { PowerFlowBusResult, PowerFlowBranchResult } from './types';

// =============================================================================
// Helper Functions
// =============================================================================

function formatVoltage(v_pu: number): string {
  return `${v_pu.toFixed(4)} pu`;
}

function formatPower(p_mw: number, q_mvar: number): string {
  return `${p_mw.toFixed(2)} MW / ${q_mvar.toFixed(2)} Mvar`;
}

function formatLosses(p_mw: number, q_mvar: number): string {
  return `Straty: ${(p_mw * 1000).toFixed(1)} kW`;
}

/**
 * Get voltage color class based on pu value.
 * - Below 0.95 pu: Warning (amber)
 * - Above 1.05 pu: Warning (amber)
 * - Otherwise: Normal (blue)
 */
function getVoltageColorClass(v_pu: number): string {
  if (v_pu < 0.95) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (v_pu > 1.05) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-blue-700 bg-blue-50 border-blue-200';
}

/**
 * Get branch flow color class based on direction.
 */
function getBranchColorClass(): string {
  return 'text-slate-700 bg-slate-50 border-slate-200';
}

// =============================================================================
// Bus Overlay Label
// =============================================================================

interface BusOverlayLabelProps {
  bus: PowerFlowBusResult;
  position: { x: number; y: number };
  isOutdated?: boolean;
}

function BusOverlayLabel({ bus, position, isOutdated }: BusOverlayLabelProps) {
  const colorClass = getVoltageColorClass(bus.v_pu);

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
        isOutdated ? 'border-slate-300 bg-slate-100 opacity-60' : colorClass
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y - 24}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <span className="font-mono">{formatVoltage(bus.v_pu)}</span>
      <span className="ml-1 text-slate-500">{bus.angle_deg.toFixed(1)}°</span>
    </div>
  );
}

// =============================================================================
// Branch Overlay Label
// =============================================================================

interface BranchOverlayLabelProps {
  branch: PowerFlowBranchResult;
  position: { x: number; y: number };
  isOutdated?: boolean;
}

function BranchOverlayLabel({ branch, position, isOutdated }: BranchOverlayLabelProps) {
  const colorClass = getBranchColorClass();
  const hasLosses = Math.abs(branch.losses_p_mw) > 0.0001;

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
        isOutdated ? 'border-slate-300 bg-slate-100 opacity-60' : colorClass
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
        <div className="text-rose-600">{formatLosses(branch.losses_p_mw, branch.losses_q_mvar)}</div>
      )}
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
}

export function PowerFlowSldOverlay({
  busPositions,
  branchPositions,
  visible,
}: PowerFlowSldOverlayProps) {
  const { results, runHeader, overlayVisible } = usePowerFlowResultsStore();

  // Determine visibility
  const isVisible = visible !== undefined ? visible : overlayVisible;

  // Check if results are outdated
  const isOutdated = useMemo(
    () => runHeader?.result_status === 'OUTDATED',
    [runHeader?.result_status]
  );

  // Build positioned bus labels
  const busLabels = useMemo(() => {
    if (!results || !isVisible) return [];
    return results.bus_results
      .map((bus) => {
        const position = busPositions.get(bus.bus_id);
        if (!position) return null;
        return { bus, position };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [results, busPositions, isVisible]);

  // Build positioned branch labels
  const branchLabels = useMemo(() => {
    if (!results || !isVisible) return [];
    return results.branch_results
      .map((branch) => {
        const position = branchPositions.get(branch.branch_id);
        if (!position) return null;
        return { branch, position };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [results, branchPositions, isVisible]);

  // Don't render if not visible or no data
  if (!isVisible || !results) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-testid="power-flow-sld-overlay"
    >
      {/* Outdated warning */}
      {isOutdated && (
        <div className="absolute left-2 top-2 z-20 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-xs text-amber-800">
          Wyniki nieaktualne
        </div>
      )}

      {/* Bus labels */}
      {busLabels.map(({ bus, position }) => (
        <BusOverlayLabel
          key={bus.bus_id}
          bus={bus}
          position={position}
          isOutdated={isOutdated}
        />
      ))}

      {/* Branch labels */}
      {branchLabels.map(({ branch, position }) => (
        <BranchOverlayLabel
          key={branch.branch_id}
          branch={branch}
          position={position}
          isOutdated={isOutdated}
        />
      ))}
    </div>
  );
}
