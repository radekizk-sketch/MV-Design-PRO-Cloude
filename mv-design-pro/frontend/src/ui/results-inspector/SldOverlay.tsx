/**
 * P11b — SLD Result Overlay Component
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 * - sld_rules.md § C.2: RESULT_VIEW mode
 * - powerfactory_ui_parity.md: Loading colors (green/yellow/red)
 * - AGENTS.md: NOT-A-SOLVER, no physics in UI
 *
 * FEATURES:
 * - Renders voltage labels on bus symbols
 * - Renders current/loading labels on branch symbols
 * - Color-codes by loading percentage
 * - Toggleable visibility
 * - Respects result_status (FRESH/OUTDATED)
 *
 * RULES:
 * - READ-ONLY: No model mutations
 * - Overlay is a SEPARATE LAYER, not part of model symbols
 * - No physics calculations
 */

import { useMemo } from 'react';
import { useResultsInspectorStore } from './store';
import type { SldOverlayBranch, SldOverlayNode } from './types';

// =============================================================================
// Helper Functions
// =============================================================================

function formatVoltage(value: number | undefined, unit: 'kV' | 'pu'): string {
  if (value === undefined) return '';
  if (unit === 'pu') {
    return `${value.toFixed(4)} pu`;
  }
  return `${value.toFixed(2)} kV`;
}

function formatCurrent(value: number | undefined): string {
  if (value === undefined) return '';
  return `${value.toFixed(1)} A`;
}

function formatLoading(value: number | undefined): string {
  if (value === undefined) return '';
  return `${value.toFixed(1)}%`;
}

function formatPower(p: number | undefined, q: number | undefined): string {
  if (p === undefined && q === undefined) return '';
  const pStr = p !== undefined ? `${p.toFixed(2)} MW` : '';
  const qStr = q !== undefined ? `${q.toFixed(2)} Mvar` : '';
  if (pStr && qStr) return `${pStr}, ${qStr}`;
  return pStr || qStr;
}

/**
 * Get loading color class based on percentage.
 * - 0-80%: Green (normal)
 * - 80-100%: Yellow (warning)
 * - >100%: Red (overloaded)
 */
function getLoadingColorClass(loading: number | undefined): string {
  if (loading === undefined) return 'text-slate-600';
  if (loading > 100) return 'text-rose-600 font-semibold';
  if (loading > 80) return 'text-amber-600';
  return 'text-emerald-600';
}

/**
 * Get loading background class for visual indication.
 */
function getLoadingBgClass(loading: number | undefined): string {
  if (loading === undefined) return 'bg-slate-100';
  if (loading > 100) return 'bg-rose-100 border-rose-300';
  if (loading > 80) return 'bg-amber-100 border-amber-300';
  return 'bg-emerald-100 border-emerald-300';
}

// =============================================================================
// Node Overlay Label
// =============================================================================

interface NodeOverlayLabelProps {
  node: SldOverlayNode;
  position: { x: number; y: number };
  isOutdated?: boolean;
}

function NodeOverlayLabel({ node, position, isOutdated }: NodeOverlayLabelProps) {
  const hasVoltage = node.u_kv !== undefined || node.u_pu !== undefined;
  const hasShortCircuit = node.ikss_ka !== undefined;

  if (!hasVoltage && !hasShortCircuit) return null;

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
        isOutdated ? 'border-slate-300 bg-slate-100 opacity-60' : 'border-blue-200 bg-blue-50'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y - 24}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {hasVoltage && (
        <span className="text-blue-800">
          {formatVoltage(node.u_kv, 'kV')}
          {node.u_pu !== undefined && (
            <span className="ml-1 text-blue-600">({formatVoltage(node.u_pu, 'pu')})</span>
          )}
        </span>
      )}
      {hasShortCircuit && (
        <span className="ml-2 font-semibold text-rose-700">
          Ik''={node.ikss_ka?.toFixed(2)} kA
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Branch Overlay Label
// =============================================================================

interface BranchOverlayLabelProps {
  branch: SldOverlayBranch;
  position: { x: number; y: number };
  isOutdated?: boolean;
}

function BranchOverlayLabel({ branch, position, isOutdated }: BranchOverlayLabelProps) {
  const hasCurrent = branch.i_a !== undefined;
  const hasLoading = branch.loading_pct !== undefined;
  const hasPower = branch.p_mw !== undefined || branch.q_mvar !== undefined;

  if (!hasCurrent && !hasLoading && !hasPower) return null;

  const loadingColorClass = getLoadingColorClass(branch.loading_pct);
  const loadingBgClass = getLoadingBgClass(branch.loading_pct);

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
        isOutdated ? 'border-slate-300 bg-slate-100 opacity-60' : loadingBgClass
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="flex items-center gap-2">
        {hasCurrent && <span className="text-slate-700">{formatCurrent(branch.i_a)}</span>}
        {hasLoading && (
          <span className={loadingColorClass}>{formatLoading(branch.loading_pct)}</span>
        )}
      </div>
      {hasPower && (
        <div className="text-slate-600">{formatPower(branch.p_mw, branch.q_mvar)}</div>
      )}
    </div>
  );
}

// =============================================================================
// SLD Overlay Container
// =============================================================================

interface SldOverlayProps {
  /**
   * Map of node_id to position on canvas.
   * Position should be in pixels relative to canvas.
   */
  nodePositions: Map<string, { x: number; y: number }>;

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

export function SldOverlay({ nodePositions, branchPositions, visible }: SldOverlayProps) {
  const { sldOverlay, overlayVisible } = useResultsInspectorStore();

  // Determine visibility
  const isVisible = visible !== undefined ? visible : overlayVisible;

  // Check if results are outdated
  const isOutdated = useMemo(
    () => sldOverlay?.result_status === 'OUTDATED',
    [sldOverlay?.result_status]
  );

  // Build positioned node labels
  const nodeLabels = useMemo(() => {
    if (!sldOverlay || !isVisible) return [];
    return sldOverlay.nodes
      .map((node) => {
        const position = nodePositions.get(node.node_id);
        if (!position) return null;
        return { node, position };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [sldOverlay, nodePositions, isVisible]);

  // Build positioned branch labels
  const branchLabels = useMemo(() => {
    if (!sldOverlay || !isVisible) return [];
    return sldOverlay.branches
      .map((branch) => {
        const position = branchPositions.get(branch.branch_id);
        if (!position) return null;
        return { branch, position };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [sldOverlay, branchPositions, isVisible]);

  // Don't render if not visible or no data
  if (!isVisible || !sldOverlay) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="sld-overlay">
      {/* Outdated warning */}
      {isOutdated && (
        <div className="absolute left-2 top-2 z-20 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-xs text-amber-800">
          Wyniki nieaktualne
        </div>
      )}

      {/* Node labels */}
      {nodeLabels.map(({ node, position }) => (
        <NodeOverlayLabel
          key={node.symbol_id}
          node={node}
          position={position}
          isOutdated={isOutdated}
        />
      ))}

      {/* Branch labels */}
      {branchLabels.map(({ branch, position }) => (
        <BranchOverlayLabel
          key={branch.symbol_id}
          branch={branch}
          position={position}
          isOutdated={isOutdated}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Simplified Overlay for Static Display
// =============================================================================

interface StaticOverlayData {
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    type: 'voltage' | 'short_circuit';
    value: string;
  }>;
  branches: Array<{
    id: string;
    x: number;
    y: number;
    current?: string;
    loading?: number;
    power?: string;
  }>;
}

interface StaticSldOverlayProps {
  data: StaticOverlayData;
  visible?: boolean;
  isOutdated?: boolean;
}

/**
 * Static SLD overlay for simple rendering without store connection.
 * Useful for testing or standalone display.
 */
export function StaticSldOverlay({ data, visible = true, isOutdated = false }: StaticSldOverlayProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="sld-overlay-static">
      {isOutdated && (
        <div className="absolute left-2 top-2 z-20 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-xs text-amber-800">
          Wyniki nieaktualne
        </div>
      )}

      {data.nodes.map((node) => (
        <div
          key={node.id}
          className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
            isOutdated
              ? 'border-slate-300 bg-slate-100 opacity-60'
              : node.type === 'short_circuit'
                ? 'border-rose-200 bg-rose-50'
                : 'border-blue-200 bg-blue-50'
          }`}
          style={{
            left: `${node.x}px`,
            top: `${node.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className={node.type === 'short_circuit' ? 'text-rose-700' : 'text-blue-800'}>
            {node.value}
          </span>
        </div>
      ))}

      {data.branches.map((branch) => (
        <div
          key={branch.id}
          className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${
            isOutdated ? 'border-slate-300 bg-slate-100 opacity-60' : getLoadingBgClass(branch.loading)
          }`}
          style={{
            left: `${branch.x}px`,
            top: `${branch.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex items-center gap-2">
            {branch.current && <span className="text-slate-700">{branch.current}</span>}
            {branch.loading !== undefined && (
              <span className={getLoadingColorClass(branch.loading)}>
                {formatLoading(branch.loading)}
              </span>
            )}
          </div>
          {branch.power && <div className="text-slate-600">{branch.power}</div>}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// P20b: Power Flow SLD Overlay
// =============================================================================

import type { PowerFlowBusResult, PowerFlowBranchResult } from './types';

interface PowerFlowOverlayBusLabelProps {
  bus: PowerFlowBusResult;
  position: { x: number; y: number };
}

/**
 * P20b: Bus voltage label for Power Flow overlay.
 */
function PowerFlowOverlayBusLabel({ bus, position }: PowerFlowOverlayBusLabelProps) {
  // Color based on voltage deviation from 1.0 pu
  const voltageClass =
    bus.v_pu < 0.95 || bus.v_pu > 1.05
      ? 'text-rose-700 font-semibold'
      : bus.v_pu < 0.97 || bus.v_pu > 1.03
        ? 'text-amber-700'
        : 'text-emerald-700';

  const bgClass =
    bus.v_pu < 0.95 || bus.v_pu > 1.05
      ? 'border-rose-200 bg-rose-50'
      : bus.v_pu < 0.97 || bus.v_pu > 1.03
        ? 'border-amber-200 bg-amber-50'
        : 'border-emerald-200 bg-emerald-50';

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${bgClass}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y - 24}px`,
        transform: 'translateX(-50%)',
      }}
      title={`Napięcie: ${bus.v_pu.toFixed(4)} pu, Kąt: ${bus.angle_deg.toFixed(2)}°`}
    >
      <span className={voltageClass}>{bus.v_pu.toFixed(4)} pu</span>
    </div>
  );
}

interface PowerFlowOverlayBranchLabelProps {
  branch: PowerFlowBranchResult;
  position: { x: number; y: number };
}

/**
 * P20b: Branch power flow label for Power Flow overlay.
 */
function PowerFlowOverlayBranchLabel({ branch, position }: PowerFlowOverlayBranchLabelProps) {
  const hasLoading = branch.loading_pct !== undefined;
  const loadingColorClass = getLoadingColorClass(branch.loading_pct);
  const loadingBgClass = getLoadingBgClass(branch.loading_pct);

  return (
    <div
      className={`pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm ${loadingBgClass}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      title={`P: ${branch.p_from_mw.toFixed(3)} MW, Q: ${branch.q_from_mvar.toFixed(3)} Mvar, Straty: ${branch.losses_p_mw.toFixed(4)} MW`}
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-700">{branch.p_from_mw.toFixed(2)} MW</span>
        {hasLoading && (
          <span className={loadingColorClass}>{formatLoading(branch.loading_pct)}</span>
        )}
      </div>
    </div>
  );
}

interface PowerFlowSldOverlayProps {
  /**
   * Map of bus_id to position on canvas.
   */
  busPositions: Map<string, { x: number; y: number }>;

  /**
   * Map of branch_id to position on canvas (typically midpoint).
   */
  branchPositions: Map<string, { x: number; y: number }>;

  /**
   * Power Flow bus results.
   */
  busResults?: PowerFlowBusResult[];

  /**
   * Power Flow branch results.
   */
  branchResults?: PowerFlowBranchResult[];

  /**
   * Visibility toggle.
   */
  visible?: boolean;

  /**
   * Whether the results are outdated.
   */
  isOutdated?: boolean;
}

/**
 * P20b: SLD Overlay for Power Flow results.
 *
 * Renders:
 * - Bus labels: voltage (V_pu) with color coding
 * - Branch labels: power flow (P_MW) and loading (%)
 *
 * READ-ONLY: No model mutations, mapping-only.
 */
export function PowerFlowSldOverlay({
  busPositions,
  branchPositions,
  busResults = [],
  branchResults = [],
  visible = true,
  isOutdated = false,
}: PowerFlowSldOverlayProps) {
  // Build positioned bus labels
  const busLabels = useMemo(() => {
    if (!visible) return [];
    return busResults
      .map((bus) => {
        const position = busPositions.get(bus.bus_id);
        if (!position) return null;
        return { bus, position };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [busResults, busPositions, visible]);

  // Build positioned branch labels
  const branchLabels = useMemo(() => {
    if (!visible) return [];
    return branchResults
      .map((branch) => {
        const position = branchPositions.get(branch.branch_id);
        if (!position) return null;
        return { branch, position };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [branchResults, branchPositions, visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="sld-overlay-power-flow">
      {/* Outdated warning */}
      {isOutdated && (
        <div className="absolute left-2 top-2 z-20 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-xs text-amber-800">
          Wyniki rozpływu mocy nieaktualne
        </div>
      )}

      {/* Power Flow label */}
      <div className="absolute right-2 top-2 z-20 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800">
        Nakładka: Rozpływ mocy
      </div>

      {/* Bus labels */}
      {busLabels.map(({ bus, position }) => (
        <PowerFlowOverlayBusLabel key={bus.bus_id} bus={bus} position={position} />
      ))}

      {/* Branch labels */}
      {branchLabels.map(({ branch, position }) => (
        <PowerFlowOverlayBranchLabel key={branch.branch_id} branch={branch} position={position} />
      ))}
    </div>
  );
}
