/**
 * FIX-12 — Protection Settings Editor Component
 *
 * Editor for protection device settings.
 *
 * CANONICAL ALIGNMENT:
 * - 100% Polish labels
 * - READ-ONLY relative to solver results
 * - No physics calculations
 */

import { useState, useCallback } from 'react';
import type {
  ProtectionDevice,
  StageSettings,
  DeviceType,
  CurveVariant,
} from './types';
import { LABELS, DEFAULT_CURVE_SETTINGS, DEFAULT_STAGE_51 } from './types';

// =============================================================================
// Types
// =============================================================================

interface ProtectionSettingsEditorProps {
  device: ProtectionDevice;
  onChange: (device: ProtectionDevice) => void;
  onCancel: () => void;
}

// =============================================================================
// Curve Options
// =============================================================================

const IEC_CURVE_OPTIONS: { value: CurveVariant; label: string }[] = [
  { value: 'SI', label: LABELS.curveTypes.SI },
  { value: 'VI', label: LABELS.curveTypes.VI },
  { value: 'EI', label: LABELS.curveTypes.EI },
  { value: 'LTI', label: LABELS.curveTypes.LTI },
  { value: 'DT', label: LABELS.curveTypes.DT },
];

const DEVICE_TYPE_OPTIONS: { value: DeviceType; label: string }[] = [
  { value: 'RELAY', label: LABELS.deviceTypes.RELAY },
  { value: 'FUSE', label: LABELS.deviceTypes.FUSE },
  { value: 'RECLOSER', label: LABELS.deviceTypes.RECLOSER },
  { value: 'CIRCUIT_BREAKER', label: LABELS.deviceTypes.CIRCUIT_BREAKER },
];

// =============================================================================
// Stage Settings Editor
// =============================================================================

interface StageEditorProps {
  label: string;
  stage: StageSettings | undefined;
  onChange: (stage: StageSettings | undefined) => void;
  showCurve?: boolean;
}

function StageEditor({ label, stage, onChange, showCurve = true }: StageEditorProps) {
  const isEnabled = stage?.enabled ?? false;

  const handleToggle = () => {
    if (isEnabled) {
      onChange(undefined);
    } else {
      onChange({
        ...DEFAULT_STAGE_51,
        enabled: true,
      });
    }
  };

  const handlePickupChange = (value: number) => {
    if (!stage) return;
    onChange({
      ...stage,
      pickup_current_a: value,
      curve_settings: stage.curve_settings
        ? { ...stage.curve_settings, pickup_current_a: value }
        : undefined,
    });
  };

  const handleTmsChange = (value: number) => {
    if (!stage?.curve_settings) return;
    onChange({
      ...stage,
      curve_settings: { ...stage.curve_settings, time_multiplier: value },
    });
  };

  const handleCurveTypeChange = (variant: CurveVariant) => {
    if (!stage) return;
    onChange({
      ...stage,
      curve_settings: {
        ...(stage.curve_settings || DEFAULT_CURVE_SETTINGS),
        variant,
      },
    });
  };

  const handleTimeChange = (value: number | undefined) => {
    if (!stage) return;
    onChange({
      ...stage,
      time_s: value,
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-slate-700">{label}</span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggle}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span>{LABELS.settings.enabled}</span>
        </label>
      </div>

      {isEnabled && stage && (
        <div className="grid gap-3">
          {/* Pickup Current */}
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              {LABELS.settings.pickup}
            </label>
            <input
              type="number"
              value={stage.pickup_current_a}
              onChange={(e) => handlePickupChange(Number(e.target.value))}
              min={1}
              step={10}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Curve Settings */}
          {showCurve && stage.curve_settings && (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  {LABELS.settings.curve}
                </label>
                <select
                  value={stage.curve_settings.variant}
                  onChange={(e) => handleCurveTypeChange(e.target.value as CurveVariant)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  {IEC_CURVE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  {LABELS.settings.tms}
                </label>
                <input
                  type="number"
                  value={stage.curve_settings.time_multiplier}
                  onChange={(e) => handleTmsChange(Number(e.target.value))}
                  min={0.05}
                  max={10}
                  step={0.05}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {/* Definite Time (for DT or instantaneous stages) */}
          {(!showCurve || stage.curve_settings?.variant === 'DT') && (
            <div>
              <label className="mb-1 block text-sm text-slate-600">
                {LABELS.settings.time}
              </label>
              <input
                type="number"
                value={stage.time_s ?? 0}
                onChange={(e) =>
                  handleTimeChange(e.target.value ? Number(e.target.value) : undefined)
                }
                min={0}
                step={0.01}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Directional (placeholder) */}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={stage.directional}
              onChange={(e) => onChange({ ...stage, directional: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
              disabled
            />
            <span>{LABELS.settings.directional}</span>
            <span className="text-xs text-slate-400">(placeholder)</span>
          </label>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Editor Component
// =============================================================================

export function ProtectionSettingsEditor({
  device,
  onChange,
  onCancel,
}: ProtectionSettingsEditorProps) {
  const [localDevice, setLocalDevice] = useState<ProtectionDevice>({ ...device });

  const handleSave = useCallback(() => {
    onChange(localDevice);
  }, [localDevice, onChange]);

  const updateDevice = useCallback((updates: Partial<ProtectionDevice>) => {
    setLocalDevice((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateSettings = useCallback(
    (
      key: keyof ProtectionDevice['settings'],
      value: StageSettings | undefined
    ) => {
      setLocalDevice((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [key]: value,
        },
      }));
    },
    []
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        {LABELS.settings.title}
      </h3>

      {/* Device Info */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {LABELS.devices.name}
          </label>
          <input
            type="text"
            value={localDevice.name}
            onChange={(e) => updateDevice({ name: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {LABELS.devices.type}
          </label>
          <select
            value={localDevice.device_type}
            onChange={(e) => updateDevice({ device_type: e.target.value as DeviceType })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            {DEVICE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {LABELS.devices.location}
          </label>
          <input
            type="text"
            value={localDevice.location_element_id}
            onChange={(e) => updateDevice({ location_element_id: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Producent
          </label>
          <input
            type="text"
            value={localDevice.manufacturer ?? ''}
            onChange={(e) => updateDevice({ manufacturer: e.target.value || undefined })}
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="np. ABB, Siemens"
          />
        </div>
      </div>

      {/* Protection Stages */}
      <div className="mb-6 space-y-4">
        <h4 className="font-medium text-slate-800">Stopnie zabezpieczenia</h4>

        <StageEditor
          label={LABELS.settings.stage51}
          stage={localDevice.settings.stage_51}
          onChange={(stage) =>
            updateSettings('stage_51', stage || DEFAULT_STAGE_51)
          }
          showCurve={true}
        />

        <StageEditor
          label={LABELS.settings.stage50}
          stage={localDevice.settings.stage_50}
          onChange={(stage) => updateSettings('stage_50', stage)}
          showCurve={false}
        />

        <StageEditor
          label={LABELS.settings.stage50high}
          stage={localDevice.settings.stage_50_high}
          onChange={(stage) => updateSettings('stage_50_high', stage)}
          showCurve={false}
        />

        <StageEditor
          label={LABELS.settings.stage51n}
          stage={localDevice.settings.stage_51n}
          onChange={(stage) => updateSettings('stage_51n', stage)}
          showCurve={true}
        />

        <StageEditor
          label={LABELS.settings.stage50n}
          stage={localDevice.settings.stage_50n}
          onChange={(stage) => updateSettings('stage_50n', stage)}
          showCurve={false}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          {LABELS.actions.cancel}
        </button>
        <button
          onClick={handleSave}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {LABELS.actions.save}
        </button>
      </div>
    </div>
  );
}

export default ProtectionSettingsEditor;
