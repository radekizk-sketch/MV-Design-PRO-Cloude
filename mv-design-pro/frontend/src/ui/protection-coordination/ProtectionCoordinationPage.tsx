/**
 * FIX-12 — Protection Coordination Page
 *
 * Main page for protection coordination analysis.
 *
 * Features:
 * - Device management
 * - Run coordination analysis
 * - View results (sensitivity, selectivity, overload)
 * - TCC chart visualization
 * - Export to PDF/DOCX
 *
 * CANONICAL ALIGNMENT:
 * - 100% Polish labels
 * - READ-ONLY relative to solver results
 * - No physics calculations in frontend
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ProtectionDevice,
  CoordinationResult,
  FaultCurrentData,
  OperatingCurrentData,
  CoordinationVerdict,
} from './types';
import {
  LABELS,
  VERDICT_STYLES,
  DEFAULT_STAGE_51,
  DEFAULT_CONFIG,
} from './types';
import { runCoordinationAnalysis, getCoordinationResult } from './api';
import { ProtectionSettingsEditor } from './ProtectionSettingsEditor';
import { TimeCurrentChart } from '../protection-curves/TimeCurrentChart';
import type { ProtectionCurve, FaultMarker as ChartFaultMarker } from '../protection-curves/types';

// =============================================================================
// Types
// =============================================================================

type TabId = 'summary' | 'sensitivity' | 'selectivity' | 'overload' | 'tcc' | 'trace';

interface PageState {
  devices: ProtectionDevice[];
  faultCurrents: FaultCurrentData[];
  operatingCurrents: OperatingCurrentData[];
  result: CoordinationResult | null;
  loading: boolean;
  error: string | null;
  activeTab: TabId;
  editingDeviceId: string | null;
}

// =============================================================================
// Verdict Badge Component
// =============================================================================

function VerdictBadge({ verdict }: { verdict: CoordinationVerdict }) {
  const style = VERDICT_STYLES[verdict];
  const label = LABELS.verdict[verdict];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      {label}
    </span>
  );
}

// =============================================================================
// Summary Tab
// =============================================================================

function SummaryTab({ result }: { result: CoordinationResult }) {
  const { summary } = result;

  return (
    <div className="space-y-6">
      {/* Overall Verdict */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Wynik analizy</h3>
          <VerdictBadge verdict={result.overall_verdict} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{summary.overall_verdict_pl}</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-medium text-slate-700">{LABELS.checks.sensitivity.title}</h4>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {summary.sensitivity.pass}
            </span>
            <span className="text-sm text-slate-500">prawidłowych</span>
            {summary.sensitivity.fail > 0 && (
              <>
                <span className="text-2xl font-bold text-rose-600">
                  {summary.sensitivity.fail}
                </span>
                <span className="text-sm text-slate-500">błędnych</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-medium text-slate-700">{LABELS.checks.selectivity.title}</h4>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {summary.selectivity.pass}
            </span>
            <span className="text-sm text-slate-500">prawidłowych</span>
            {summary.selectivity.fail > 0 && (
              <>
                <span className="text-2xl font-bold text-rose-600">
                  {summary.selectivity.fail}
                </span>
                <span className="text-sm text-slate-500">błędnych</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-medium text-slate-700">{LABELS.checks.overload.title}</h4>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {summary.overload.pass}
            </span>
            <span className="text-sm text-slate-500">prawidłowych</span>
            {summary.overload.fail > 0 && (
              <>
                <span className="text-2xl font-bold text-rose-600">
                  {summary.overload.fail}
                </span>
                <span className="text-sm text-slate-500">błędnych</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Checks Tables
// =============================================================================

function SensitivityTab({ result }: { result: CoordinationResult }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{LABELS.checks.sensitivity.title}</h3>
        <p className="text-sm text-slate-500">{LABELS.checks.sensitivity.subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                Urządzenie
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.sensitivity.iFaultMin}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.sensitivity.iPickup}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.sensitivity.margin}
              </th>
              <th className="px-4 py-2 text-center text-sm font-medium text-slate-700">
                Werdykt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.sensitivity_checks.map((check) => (
              <tr key={check.device_id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-sm text-slate-900">
                  {check.device_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-2 text-right font-mono text-sm">
                  {check.i_fault_min_a.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-sm">
                  {check.i_pickup_a.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-sm">
                  {check.margin_percent.toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-center">
                  <VerdictBadge verdict={check.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SelectivityTab({ result }: { result: CoordinationResult }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{LABELS.checks.selectivity.title}</h3>
        <p className="text-sm text-slate-500">{LABELS.checks.selectivity.subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                {LABELS.checks.selectivity.downstream}
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                {LABELS.checks.selectivity.upstream}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.selectivity.tDownstream}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.selectivity.tUpstream}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.selectivity.deltaT}
              </th>
              <th className="px-4 py-2 text-center text-sm font-medium text-slate-700">
                Werdykt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.selectivity_checks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  Wymaga minimum 2 urządzeń do sprawdzenia selektywności
                </td>
              </tr>
            ) : (
              result.selectivity_checks.map((check, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-900">
                    {check.downstream_device_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-900">
                    {check.upstream_device_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm">
                    {check.t_downstream_s.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm">
                    {check.t_upstream_s.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm">
                    {check.margin_s.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <VerdictBadge verdict={check.verdict} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverloadTab({ result }: { result: CoordinationResult }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{LABELS.checks.overload.title}</h3>
        <p className="text-sm text-slate-500">{LABELS.checks.overload.subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                Urządzenie
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.overload.iOperating}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.overload.iPickup}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                {LABELS.checks.overload.margin}
              </th>
              <th className="px-4 py-2 text-center text-sm font-medium text-slate-700">
                Werdykt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.overload_checks.map((check) => (
              <tr key={check.device_id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-sm text-slate-900">
                  {check.device_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-2 text-right font-mono text-sm">
                  {check.i_operating_a.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-sm">
                  {check.i_pickup_a.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-sm">
                  {check.margin_percent.toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-center">
                  <VerdictBadge verdict={check.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// TCC Tab
// =============================================================================

function TCCTab({ result }: { result: CoordinationResult }) {
  // Convert TCC curves to chart format
  const curves: ProtectionCurve[] = useMemo(() => {
    return result.tcc_curves.map((curve) => ({
      id: curve.device_id,
      name_pl: curve.device_name,
      standard: (curve.curve_type.startsWith('IEC') ? 'IEC' : 'IEEE') as 'IEC' | 'IEEE',
      curve_type: (curve.curve_type.split('_')[1] || 'SI') as ProtectionCurve['curve_type'],
      pickup_current_a: curve.pickup_current_a,
      time_multiplier: curve.time_multiplier,
      color: curve.color,
      enabled: true,
      points: curve.points.map((p) => ({
        current_a: p.current_a,
        current_multiple: p.current_multiple,
        time_s: p.time_s,
      })),
    }));
  }, [result.tcc_curves]);

  const faultMarkers: ChartFaultMarker[] = useMemo(() => {
    return result.fault_markers.map((m) => ({
      id: m.id,
      label_pl: m.label_pl,
      current_a: m.current_a,
      fault_type: m.fault_type,
      location: m.location,
    }));
  }, [result.fault_markers]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-4 font-semibold text-slate-900">{LABELS.tcc.title}</h3>
        <TimeCurrentChart
          curves={curves}
          faultMarkers={faultMarkers}
          config={{
            currentRange: [10, 10000],
            timeRange: [0.01, 100],
            showGrid: true,
            showFaultMarkers: true,
            height: 500,
          }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Trace Tab
// =============================================================================

function TraceTab({ result }: { result: CoordinationResult }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">Ślad obliczeń (WHITE BOX)</h3>
        <p className="text-sm text-slate-500">Wszystkie kroki obliczeń do audytu</p>
      </div>
      <div className="max-h-[600px] overflow-y-auto p-4">
        <div className="space-y-3">
          {result.trace_steps.map((step, idx) => (
            <div key={idx} className="rounded border border-slate-200 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-slate-500">{step.step}</span>
                  <p className="text-sm font-medium text-slate-900">
                    {step.description_pl}
                  </p>
                </div>
              </div>
              {Object.keys(step.inputs).length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-slate-500">Wejścia:</span>
                  <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-xs">
                    {JSON.stringify(step.inputs, null, 2)}
                  </pre>
                </div>
              )}
              {Object.keys(step.outputs).length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-slate-500">Wyjścia:</span>
                  <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-xs">
                    {JSON.stringify(step.outputs, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export function ProtectionCoordinationPage() {
  const [state, setState] = useState<PageState>({
    devices: [],
    faultCurrents: [],
    operatingCurrents: [],
    result: null,
    loading: false,
    error: null,
    activeTab: 'summary',
    editingDeviceId: null,
  });

  // Add demo device
  const handleAddDevice = useCallback(() => {
    const newDevice: ProtectionDevice = {
      id: crypto.randomUUID(),
      name: `Zabezpieczenie ${state.devices.length + 1}`,
      device_type: 'RELAY',
      location_element_id: `bus_${state.devices.length + 1}`,
      settings: {
        stage_51: { ...DEFAULT_STAGE_51 },
      },
    };

    // Also add demo fault/operating currents
    const newFault: FaultCurrentData = {
      location_id: newDevice.location_element_id,
      ik_max_3f_a: 5000 + Math.random() * 3000,
      ik_min_3f_a: 2000 + Math.random() * 1000,
    };

    const newOperating: OperatingCurrentData = {
      location_id: newDevice.location_element_id,
      i_operating_a: 200 + Math.random() * 200,
    };

    setState((prev) => ({
      ...prev,
      devices: [...prev.devices, newDevice],
      faultCurrents: [...prev.faultCurrents, newFault],
      operatingCurrents: [...prev.operatingCurrents, newOperating],
      editingDeviceId: newDevice.id,
    }));
  }, [state.devices.length]);

  const handleRemoveDevice = useCallback((deviceId: string) => {
    setState((prev) => {
      const device = prev.devices.find((d) => d.id === deviceId);
      if (!device) return prev;

      return {
        ...prev,
        devices: prev.devices.filter((d) => d.id !== deviceId),
        faultCurrents: prev.faultCurrents.filter(
          (f) => f.location_id !== device.location_element_id
        ),
        operatingCurrents: prev.operatingCurrents.filter(
          (o) => o.location_id !== device.location_element_id
        ),
        editingDeviceId: null,
      };
    });
  }, []);

  const handleDeviceChange = useCallback((device: ProtectionDevice) => {
    setState((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => (d.id === device.id ? device : d)),
      editingDeviceId: null,
    }));
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    if (state.devices.length === 0) {
      setState((prev) => ({ ...prev, error: 'Dodaj przynajmniej jedno urządzenie' }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const summary = await runCoordinationAnalysis('demo-project', {
        devices: state.devices,
        fault_currents: state.faultCurrents,
        operating_currents: state.operatingCurrents,
        config: DEFAULT_CONFIG,
      });

      const result = await getCoordinationResult(summary.run_id);

      setState((prev) => ({
        ...prev,
        result,
        loading: false,
        activeTab: 'summary',
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Błąd analizy',
      }));
    }
  }, [state.devices, state.faultCurrents, state.operatingCurrents]);

  const editingDevice = state.editingDeviceId
    ? state.devices.find((d) => d.id === state.editingDeviceId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{LABELS.title}</h1>
          <p className="text-slate-600">{LABELS.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Panel - Devices */}
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{LABELS.devices.title}</h2>
                <button
                  onClick={handleAddDevice}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {LABELS.devices.add}
                </button>
              </div>

              {state.devices.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Dodaj urządzenia zabezpieczeniowe
                </p>
              ) : (
                <div className="space-y-2">
                  {state.devices.map((device) => (
                    <div
                      key={device.id}
                      className={`flex items-center justify-between rounded border p-3 ${
                        state.editingDeviceId === device.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() =>
                          setState((prev) => ({ ...prev, editingDeviceId: device.id }))
                        }
                      >
                        <p className="font-medium text-slate-900">{device.name}</p>
                        <p className="text-xs text-slate-500">
                          {LABELS.deviceTypes[device.device_type]} |{' '}
                          {device.location_element_id}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveDevice(device.id)}
                        className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Analysis Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={state.loading || state.devices.length === 0}
              className="w-full rounded bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.loading ? LABELS.status.running : LABELS.actions.run}
            </button>

            {state.error && (
              <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {state.error}
              </div>
            )}
          </div>

          {/* Right Panel - Editor or Results */}
          <div className="lg:col-span-2">
            {editingDevice ? (
              <ProtectionSettingsEditor
                device={editingDevice}
                onChange={handleDeviceChange}
                onCancel={() => setState((prev) => ({ ...prev, editingDeviceId: null }))}
              />
            ) : state.result ? (
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  {(
                    [
                      'summary',
                      'sensitivity',
                      'selectivity',
                      'overload',
                      'tcc',
                      'trace',
                    ] as TabId[]
                  ).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setState((prev) => ({ ...prev, activeTab: tab }))}
                      className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                        state.activeTab === tab
                          ? 'bg-white text-slate-900 shadow'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {LABELS.tabs[tab]}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {state.activeTab === 'summary' && <SummaryTab result={state.result} />}
                {state.activeTab === 'sensitivity' && (
                  <SensitivityTab result={state.result} />
                )}
                {state.activeTab === 'selectivity' && (
                  <SelectivityTab result={state.result} />
                )}
                {state.activeTab === 'overload' && <OverloadTab result={state.result} />}
                {state.activeTab === 'tcc' && <TCCTab result={state.result} />}
                {state.activeTab === 'trace' && <TraceTab result={state.result} />}
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <div className="text-center">
                  <p className="text-slate-500">
                    Dodaj urządzenia i uruchom analizę
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProtectionCoordinationPage;
