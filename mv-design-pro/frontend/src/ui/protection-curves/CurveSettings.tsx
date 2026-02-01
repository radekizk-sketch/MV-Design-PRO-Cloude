/**
 * FIX-06 — Curve Settings Component
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Analysis layer (interpretation only)
 * - 100% Polish UI labels
 *
 * FEATURES:
 * - Edit curve parameters (Is, TMS/TD)
 * - Change curve type and standard
 * - Color picker
 * - Enable/disable curve
 */

import { useState, useCallback, useEffect } from 'react';

import type { ProtectionCurve, CurveStandard, CurveType } from './types';
import {
  PROTECTION_CURVES_LABELS,
  IEC_CURVE_OPTIONS,
  IEEE_CURVE_OPTIONS,
  CURVE_COLORS,
} from './types';

// =============================================================================
// Types
// =============================================================================

interface CurveSettingsProps {
  /** Curve to edit */
  curve: ProtectionCurve | null;
  /** Handler for curve updates */
  onUpdate: (curveId: string, updates: Partial<ProtectionCurve>) => void;
  /** Handler for curve removal */
  onRemove: (curveId: string) => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function CurveSettings({ curve, onUpdate, onRemove }: CurveSettingsProps) {
  const labels = PROTECTION_CURVES_LABELS.settings;
  const curveLabels = PROTECTION_CURVES_LABELS.curves;

  // Local form state
  const [formState, setFormState] = useState({
    name_pl: '',
    standard: 'IEC' as CurveStandard,
    curve_type: 'SI' as CurveType,
    pickup_current_a: 100,
    time_multiplier: 0.5,
    definite_time_s: 0.5,
    color: CURVE_COLORS[0],
    enabled: true,
  });

  // Sync form state with selected curve
  useEffect(() => {
    if (curve) {
      setFormState({
        name_pl: curve.name_pl,
        standard: curve.standard,
        curve_type: curve.curve_type,
        pickup_current_a: curve.pickup_current_a,
        time_multiplier: curve.time_multiplier,
        definite_time_s: curve.definite_time_s ?? 0.5,
        color: curve.color,
        enabled: curve.enabled,
      });
    }
  }, [curve]);

  const handleInputChange = useCallback(
    (field: keyof typeof formState, value: string | number | boolean) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleStandardChange = useCallback((standard: CurveStandard) => {
    // Reset curve type when standard changes
    const defaultType = standard === 'IEC' ? 'SI' : 'MI';
    setFormState((prev) => ({
      ...prev,
      standard,
      curve_type: defaultType,
    }));
  }, []);

  const handleApply = useCallback(() => {
    if (!curve) return;

    const updates: Partial<ProtectionCurve> = {
      name_pl: formState.name_pl,
      standard: formState.standard,
      curve_type: formState.curve_type,
      pickup_current_a: formState.pickup_current_a,
      time_multiplier: formState.time_multiplier,
      definite_time_s:
        formState.curve_type === 'DT' ? formState.definite_time_s : undefined,
      color: formState.color,
      enabled: formState.enabled,
    };

    onUpdate(curve.id, updates);
  }, [curve, formState, onUpdate]);

  const handleReset = useCallback(() => {
    if (curve) {
      setFormState({
        name_pl: curve.name_pl,
        standard: curve.standard,
        curve_type: curve.curve_type,
        pickup_current_a: curve.pickup_current_a,
        time_multiplier: curve.time_multiplier,
        definite_time_s: curve.definite_time_s ?? 0.5,
        color: curve.color,
        enabled: curve.enabled,
      });
    }
  }, [curve]);

  const handleRemove = useCallback(() => {
    if (curve) {
      onRemove(curve.id);
    }
  }, [curve, onRemove]);

  // Empty state
  if (!curve) {
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-4 font-semibold text-slate-900">{labels.title}</h3>
        <p className="text-sm text-slate-500">{curveLabels.noSelection}</p>
      </div>
    );
  }

  const curveTypeOptions =
    formState.standard === 'IEC' ? IEC_CURVE_OPTIONS : IEEE_CURVE_OPTIONS;
  const isDefiniteTime = formState.curve_type === 'DT';

  return (
    <div className="rounded border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{labels.title}</h3>
      </div>

      {/* Form */}
      <div className="space-y-4 p-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {labels.name}
          </label>
          <input
            type="text"
            value={formState.name_pl}
            onChange={(e) => handleInputChange('name_pl', e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Standard */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {labels.standard}
          </label>
          <select
            value={formState.standard}
            onChange={(e) => handleStandardChange(e.target.value as CurveStandard)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="IEC">IEC 60255</option>
            <option value="IEEE">IEEE C37.112</option>
          </select>
        </div>

        {/* Curve Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {labels.curveType}
          </label>
          <select
            value={formState.curve_type}
            onChange={(e) => handleInputChange('curve_type', e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {curveTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pickup Current */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {labels.pickupCurrent}
          </label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={formState.pickup_current_a}
            onChange={(e) =>
              handleInputChange('pickup_current_a', parseFloat(e.target.value) || 0)
            }
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Time Multiplier (TMS/TD) */}
        {!isDefiniteTime && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {formState.standard === 'IEC' ? labels.timeMultiplier : labels.timeDial}
            </label>
            <input
              type="number"
              min={0.05}
              max={10}
              step={0.05}
              value={formState.time_multiplier}
              onChange={(e) =>
                handleInputChange('time_multiplier', parseFloat(e.target.value) || 0.1)
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Definite Time (only for DT curves) */}
        {isDefiniteTime && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {labels.definiteTime}
            </label>
            <input
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              value={formState.definite_time_s}
              onChange={(e) =>
                handleInputChange('definite_time_s', parseFloat(e.target.value) || 0.1)
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Color */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {labels.color}
          </label>
          <div className="flex gap-2">
            {CURVE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleInputChange('color', color)}
                className={`h-8 w-8 rounded border-2 transition-all ${
                  formState.color === color
                    ? 'border-slate-900 ring-2 ring-slate-400'
                    : 'border-transparent hover:border-slate-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="curve-enabled"
            checked={formState.enabled}
            onChange={(e) => handleInputChange('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="curve-enabled" className="text-sm text-slate-700">
            {formState.enabled ? curveLabels.enable : curveLabels.disable}
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {labels.apply}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {labels.reset}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          className="rounded border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          {curveLabels.remove}
        </button>
      </div>
    </div>
  );
}
