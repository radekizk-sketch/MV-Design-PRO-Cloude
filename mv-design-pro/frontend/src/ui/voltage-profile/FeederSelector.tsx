/**
 * FIX-04 — Feeder Selector Component
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: READ-ONLY UI component
 * - 100% Polish UI labels
 *
 * Dropdown component for selecting a feeder to display
 * in the voltage profile chart.
 */

import { useMemo } from 'react';
import type { Feeder } from './types';
import { VOLTAGE_PROFILE_LABELS } from './types';
import { formatDistance } from './utils';

// =============================================================================
// Types
// =============================================================================

interface FeederSelectorProps {
  /** Available feeders */
  feeders: Feeder[];
  /** Currently selected feeder ID */
  selected: string | null;
  /** Selection change handler */
  onSelect: (feederId: string | null) => void;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function FeederSelector({
  feeders,
  selected,
  onSelect,
  disabled = false,
}: FeederSelectorProps) {
  const labels = VOLTAGE_PROFILE_LABELS.feeder;

  // Find selected feeder details
  const selectedFeeder = useMemo(
    () => feeders.find((f) => f.id === selected),
    [feeders, selected]
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onSelect(value === '' ? null : value);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Select dropdown */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="feeder-select"
          className="text-sm font-medium text-slate-700"
        >
          {labels.selectLabel}
        </label>
        <select
          id="feeder-select"
          value={selected ?? ''}
          onChange={handleChange}
          disabled={disabled || feeders.length === 0}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="">{labels.selectPlaceholder}</option>
          {feeders.map((feeder) => (
            <option key={feeder.id} value={feeder.id}>
              {feeder.name}
            </option>
          ))}
        </select>
      </div>

      {/* Feeder details (when selected) */}
      {selectedFeeder && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>
            {labels.totalLength}:{' '}
            <span className="font-semibold text-slate-700">
              {formatDistance(selectedFeeder.totalLengthKm)} km
            </span>
          </span>
          <span>
            {labels.busCount}:{' '}
            <span className="font-semibold text-slate-700">
              {selectedFeeder.busIds.length}
            </span>
          </span>
        </div>
      )}

      {/* Empty state */}
      {feeders.length === 0 && (
        <p className="text-xs text-slate-400">{labels.noFeeders}</p>
      )}
    </div>
  );
}
