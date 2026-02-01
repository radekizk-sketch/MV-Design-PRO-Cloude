/**
 * FIX-04 — Profile Options Component
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: READ-ONLY UI component
 * - 100% Polish UI labels
 *
 * Component for configuring voltage profile chart options:
 * - Voltage limits (Umin, Umax)
 * - Show/hide limit lines
 * - Show/hide allowed region
 */

import type { VoltageProfileConfig } from './types';
import { VOLTAGE_PROFILE_LABELS } from './types';

// =============================================================================
// Types
// =============================================================================

interface ProfileOptionsProps {
  /** Current configuration */
  config: VoltageProfileConfig;
  /** Configuration change handler */
  onChange: (config: VoltageProfileConfig) => void;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ProfileOptions({
  config,
  onChange,
  disabled = false,
}: ProfileOptionsProps) {
  const labels = VOLTAGE_PROFILE_LABELS.options;

  const handleCheckboxChange = (key: keyof VoltageProfileConfig) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...config,
        [key]: e.target.checked,
      });
    };
  };

  const handleNumberChange = (key: keyof VoltageProfileConfig) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        onChange({
          ...config,
          [key]: value,
        });
      }
    };
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded border border-slate-200 bg-slate-50 px-4 py-2">
      {/* Show limits checkbox */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={config.showLimits}
          onChange={handleCheckboxChange('showLimits')}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
        />
        {labels.showLimits}
      </label>

      {/* Show allowed region checkbox */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={config.showAllowedRegion}
          onChange={handleCheckboxChange('showAllowedRegion')}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
        />
        {labels.showAllowedRegion}
      </label>

      {/* Separator */}
      <div className="h-6 w-px bg-slate-300" />

      {/* Umin input */}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        {labels.umin}
        <input
          type="number"
          value={config.umin}
          onChange={handleNumberChange('umin')}
          disabled={disabled}
          step={0.01}
          min={0.8}
          max={1.0}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </label>

      {/* Umax input */}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        {labels.umax}
        <input
          type="number"
          value={config.umax}
          onChange={handleNumberChange('umax')}
          disabled={disabled}
          step={0.01}
          min={1.0}
          max={1.2}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </label>
    </div>
  );
}
