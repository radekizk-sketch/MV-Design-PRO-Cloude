/**
 * FIX-06 — Protection Curves Editor Main Component
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Analysis layer (interpretation only)
 * - PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md: UI contract
 * - 100% Polish UI labels
 *
 * FEATURES:
 * - Time-current chart (I-t) with log-log scale
 * - Curve library browser (IEC/IEEE)
 * - Curve settings editor
 * - Coordination analysis
 * - Fault current markers
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  ProtectionCurve,
  FaultMarker,
  CoordinationResult,
  TimeCurrentChartConfig,
  CurvePoint,
} from './types';
import {
  PROTECTION_CURVES_LABELS,
  DEFAULT_CHART_CONFIG,
  CURVE_COLORS,
} from './types';
import { TimeCurrentChart } from './TimeCurrentChart';
import { CurveLibrary } from './CurveLibrary';
import { CurveSettings } from './CurveSettings';
import { CoordinationAnalysis } from './CoordinationAnalysis';

// =============================================================================
// Types
// =============================================================================

interface ProtectionCurvesEditorProps {
  /** Initial curves to display */
  initialCurves?: ProtectionCurve[];
  /** Initial fault markers */
  initialFaultMarkers?: FaultMarker[];
  /** Handler when curves change */
  onCurvesChange?: (curves: ProtectionCurve[]) => void;
  /** Close handler */
  onClose?: () => void;
}

type EditorTab = 'library' | 'settings' | 'coordination' | 'faults';

// =============================================================================
// Curve Point Generation (Client-side for demo)
// =============================================================================

/**
 * Generate curve points for IEC curves.
 * NOTE: In production, this should come from the backend.
 */
function generateIECCurvePoints(
  curveType: string,
  pickupCurrent: number,
  tms: number,
  definiteTime?: number
): CurvePoint[] {
  const IEC_PARAMS: Record<string, { a: number; b: number }> = {
    SI: { a: 0.14, b: 0.02 },
    VI: { a: 13.5, b: 1.0 },
    EI: { a: 80.0, b: 2.0 },
    LTI: { a: 120.0, b: 1.0 },
  };

  const points: CurvePoint[] = [];
  const params = IEC_PARAMS[curveType];

  // Generate points from 1.1x to 20x pickup
  for (let i = 0; i < 100; i++) {
    const logMult = Math.log10(1.1) + (Math.log10(20) - Math.log10(1.1)) * (i / 99);
    const mult = Math.pow(10, logMult);
    const current = pickupCurrent * mult;

    let time: number;
    if (curveType === 'DT') {
      time = definiteTime ?? 0.5;
    } else if (params) {
      const denominator = Math.pow(mult, params.b) - 1;
      if (denominator > 0.0001) {
        time = tms * (params.a / denominator);
        time = Math.max(0.01, Math.min(time, 100));
      } else {
        continue;
      }
    } else {
      continue;
    }

    points.push({
      current_a: current,
      current_multiple: mult,
      time_s: time,
    });
  }

  return points;
}

/**
 * Generate curve points for IEEE curves.
 */
function generateIEEECurvePoints(
  curveType: string,
  pickupCurrent: number,
  td: number,
  definiteTime?: number
): CurvePoint[] {
  const IEEE_PARAMS: Record<string, { a: number; b: number; p: number }> = {
    MI: { a: 0.0515, b: 0.114, p: 0.02 },
    VI: { a: 19.61, b: 0.491, p: 2.0 },
    EI: { a: 28.2, b: 0.1217, p: 2.0 },
    STI: { a: 0.00342, b: 0.00262, p: 0.02 },
  };

  const points: CurvePoint[] = [];
  const params = IEEE_PARAMS[curveType];

  for (let i = 0; i < 100; i++) {
    const logMult = Math.log10(1.1) + (Math.log10(20) - Math.log10(1.1)) * (i / 99);
    const mult = Math.pow(10, logMult);
    const current = pickupCurrent * mult;

    let time: number;
    if (curveType === 'DT') {
      time = definiteTime ?? 0.5;
    } else if (params) {
      const denominator = Math.pow(mult, params.p) - 1;
      if (denominator > 0.0001) {
        time = td * (params.a / denominator + params.b);
        time = Math.max(0.01, Math.min(time, 100));
      } else {
        continue;
      }
    } else {
      continue;
    }

    points.push({
      current_a: current,
      current_multiple: mult,
      time_s: time,
    });
  }

  return points;
}

/**
 * Generate points for a curve based on its parameters.
 */
function generateCurvePoints(curve: Omit<ProtectionCurve, 'points'>): CurvePoint[] {
  if (curve.standard === 'IEC') {
    return generateIECCurvePoints(
      curve.curve_type,
      curve.pickup_current_a,
      curve.time_multiplier,
      curve.definite_time_s
    );
  } else {
    return generateIEEECurvePoints(
      curve.curve_type,
      curve.pickup_current_a,
      curve.time_multiplier,
      curve.definite_time_s
    );
  }
}

/**
 * Simple coordination check between two curves.
 */
function checkCoordination(
  downstream: ProtectionCurve,
  upstream: ProtectionCurve
): CoordinationResult {
  const analysisCurrent = Math.max(
    downstream.pickup_current_a,
    upstream.pickup_current_a
  ) * 10;

  // Find trip times at analysis current
  const findTripTime = (curve: ProtectionCurve, current: number): number => {
    for (let i = 0; i < curve.points.length - 1; i++) {
      const p1 = curve.points[i];
      const p2 = curve.points[i + 1];
      if (current >= p1.current_a && current <= p2.current_a) {
        const ratio = (current - p1.current_a) / (p2.current_a - p1.current_a);
        return p1.time_s + ratio * (p2.time_s - p1.time_s);
      }
    }
    return 999;
  };

  const downstreamTime = findTripTime(downstream, analysisCurrent);
  const upstreamTime = findTripTime(upstream, analysisCurrent);
  const margin = upstreamTime - downstreamTime;
  const minMargin = 0.2; // 200ms typical grading margin

  let status: CoordinationResult['status'];
  let recommendation: string;

  if (margin >= minMargin * 1.2) {
    status = 'COORDINATED';
    recommendation = 'Koordynacja prawidlowa. Margines czasowy wystarczajacy.';
  } else if (margin >= minMargin) {
    status = 'MARGIN_LOW';
    recommendation = `Margines czasowy niski (${(margin * 1000).toFixed(0)}ms). Zalecane zwiekszenie.`;
  } else if (margin > 0) {
    status = 'NOT_COORDINATED';
    recommendation = `Brak koordynacji! Margines ${(margin * 1000).toFixed(0)}ms ponizej wymaganego ${(minMargin * 1000).toFixed(0)}ms.`;
  } else {
    status = 'NOT_COORDINATED';
    recommendation = 'Brak koordynacji! Zabezpieczenie nadrzedne zadzial przed podrzednym.';
  }

  return {
    upstream_curve_id: upstream.id,
    downstream_curve_id: downstream.id,
    status,
    margin_s: Math.max(0, margin),
    margin_percent: downstreamTime > 0 ? (margin / downstreamTime) * 100 : 0,
    analysis_current_a: analysisCurrent,
    upstream_trip_time_s: upstreamTime,
    downstream_trip_time_s: downstreamTime,
    recommendation_pl: recommendation,
    min_required_margin_s: minMargin,
  };
}

// =============================================================================
// Curve List Component
// =============================================================================

interface CurveListProps {
  curves: ProtectionCurve[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function CurveList({ curves, selectedId, onSelect, onToggle }: CurveListProps) {
  const labels = PROTECTION_CURVES_LABELS.curves;

  if (curves.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        {labels.empty}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {curves.map((curve) => (
        <div
          key={curve.id}
          className={`flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors ${
            selectedId === curve.id
              ? 'bg-blue-50'
              : 'hover:bg-slate-50'
          }`}
          onClick={() => onSelect(curve.id)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(curve.id);
            }}
            className={`h-4 w-4 rounded border ${
              curve.enabled
                ? 'border-blue-600 bg-blue-600'
                : 'border-slate-300 bg-white'
            }`}
          >
            {curve.enabled && (
              <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: curve.color }}
          />
          <span className={`flex-1 text-sm ${curve.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
            {curve.name_pl}
          </span>
          <span className="text-xs text-slate-400">
            {curve.standard} {curve.curve_type}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ProtectionCurvesEditor({
  initialCurves = [],
  initialFaultMarkers = [],
  onCurvesChange,
  onClose,
}: ProtectionCurvesEditorProps) {
  const labels = PROTECTION_CURVES_LABELS;

  // State
  const [curves, setCurves] = useState<ProtectionCurve[]>(initialCurves);
  const [faultMarkers] = useState<FaultMarker[]>(initialFaultMarkers);
  const [selectedCurveId, setSelectedCurveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('library');
  const [chartConfig] = useState<TimeCurrentChartConfig>(DEFAULT_CHART_CONFIG);

  // Get selected curve
  const selectedCurve = useMemo(
    () => curves.find((c) => c.id === selectedCurveId) ?? null,
    [curves, selectedCurveId]
  );

  // Calculate coordination results
  const coordinationResults = useMemo(() => {
    const enabledCurves = curves.filter((c) => c.enabled);
    const results: CoordinationResult[] = [];

    for (let i = 0; i < enabledCurves.length - 1; i++) {
      const downstream = enabledCurves[i];
      const upstream = enabledCurves[i + 1];
      results.push(checkCoordination(downstream, upstream));
    }

    return results;
  }, [curves]);

  // Handlers
  const handleAddCurve = useCallback(
    (curveData: Omit<ProtectionCurve, 'points'>) => {
      const points = generateCurvePoints(curveData);
      const newCurve: ProtectionCurve = { ...curveData, points };

      setCurves((prev) => {
        const updated = [...prev, newCurve];
        onCurvesChange?.(updated);
        return updated;
      });
      setSelectedCurveId(newCurve.id);
      setActiveTab('settings');
    },
    [onCurvesChange]
  );

  const handleUpdateCurve = useCallback(
    (curveId: string, updates: Partial<ProtectionCurve>) => {
      setCurves((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== curveId) return c;

          const updatedCurve = { ...c, ...updates };
          // Regenerate points if parameters changed
          if (
            updates.standard !== undefined ||
            updates.curve_type !== undefined ||
            updates.pickup_current_a !== undefined ||
            updates.time_multiplier !== undefined ||
            updates.definite_time_s !== undefined
          ) {
            updatedCurve.points = generateCurvePoints(updatedCurve);
          }
          return updatedCurve;
        });
        onCurvesChange?.(updated);
        return updated;
      });
    },
    [onCurvesChange]
  );

  const handleRemoveCurve = useCallback(
    (curveId: string) => {
      setCurves((prev) => {
        const updated = prev.filter((c) => c.id !== curveId);
        onCurvesChange?.(updated);
        return updated;
      });
      if (selectedCurveId === curveId) {
        setSelectedCurveId(null);
      }
    },
    [selectedCurveId, onCurvesChange]
  );

  const handleToggleCurve = useCallback((curveId: string) => {
    setCurves((prev) =>
      prev.map((c) =>
        c.id === curveId ? { ...c, enabled: !c.enabled } : c
      )
    );
  }, []);

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'library':
        return (
          <CurveLibrary
            onAddCurve={handleAddCurve}
            existingCurveCount={curves.length}
          />
        );
      case 'settings':
        return (
          <CurveSettings
            curve={selectedCurve}
            onUpdate={handleUpdateCurve}
            onRemove={handleRemoveCurve}
          />
        );
      case 'coordination':
        return (
          <CoordinationAnalysis
            results={coordinationResults}
            curves={curves}
          />
        );
      case 'faults':
        return (
          <div className="rounded border border-slate-200 bg-white p-4">
            <h3 className="mb-4 font-semibold text-slate-900">
              {labels.faults.title}
            </h3>
            {faultMarkers.length === 0 ? (
              <p className="text-sm text-slate-500">
                Brak zdefiniowanych punktow zwarciowych
              </p>
            ) : (
              <div className="space-y-2">
                {faultMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    className="flex items-center justify-between rounded border border-slate-200 p-2"
                  >
                    <span className="font-medium text-slate-900">
                      {marker.label_pl}
                    </span>
                    <span className="font-mono text-sm text-slate-600">
                      {marker.current_a.toFixed(0)} A
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{labels.title}</h2>
          <p className="text-sm text-slate-500">{labels.subtitle}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {labels.actions.close}
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Left panel - Chart */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Chart */}
          <TimeCurrentChart
            curves={curves}
            faultMarkers={faultMarkers}
            config={chartConfig}
            selectedCurveId={selectedCurveId}
            onCurveClick={setSelectedCurveId}
          />

          {/* Curve list */}
          <div className="rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-2">
              <h3 className="text-sm font-semibold text-slate-700">
                {labels.curves.title}
              </h3>
            </div>
            <CurveList
              curves={curves}
              selectedId={selectedCurveId}
              onSelect={setSelectedCurveId}
              onToggle={handleToggleCurve}
            />
          </div>
        </div>

        {/* Right panel - Tabs */}
        <div className="w-80 flex-shrink-0">
          {/* Tab buttons */}
          <div className="mb-4 flex rounded border border-slate-200 bg-white">
            {(['library', 'settings', 'coordination', 'faults'] as EditorTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'library' && 'Biblioteka'}
                  {tab === 'settings' && 'Ustawienia'}
                  {tab === 'coordination' && 'Koordynacja'}
                  {tab === 'faults' && 'Zwarcia'}
                </button>
              )
            )}
          </div>

          {/* Tab content */}
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
