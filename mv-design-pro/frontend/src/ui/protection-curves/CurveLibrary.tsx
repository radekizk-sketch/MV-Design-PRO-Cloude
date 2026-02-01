/**
 * FIX-06 — Curve Library Component
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Catalog/Library pattern
 * - 100% Polish UI labels
 *
 * FEATURES:
 * - Browse IEC 60255 curves
 * - Browse IEEE C37.112 curves
 * - Add curves to chart
 * - Preview curve characteristics
 */

import { useState, useCallback } from 'react';

import type { CurveStandard, IECCurveType, IEEECurveType, ProtectionCurve } from './types';
import {
  PROTECTION_CURVES_LABELS,
  IEC_CURVE_OPTIONS,
  IEEE_CURVE_OPTIONS,
  CURVE_COLORS,
} from './types';

// =============================================================================
// Types
// =============================================================================

interface CurveLibraryProps {
  /** Handler when curve is added to chart */
  onAddCurve: (curve: Omit<ProtectionCurve, 'points'>) => void;
  /** Existing curve count (for color assignment) */
  existingCurveCount?: number;
}

interface CurvePreset {
  id: string;
  standard: CurveStandard;
  curveType: IECCurveType | IEEECurveType;
  name_pl: string;
  description_pl: string;
  defaultTms: number;
  formula: string;
}

// =============================================================================
// Preset Data
// =============================================================================

const IEC_PRESETS: CurvePreset[] = [
  {
    id: 'iec-si',
    standard: 'IEC',
    curveType: 'SI',
    name_pl: 'Normalna odwrotna (SI)',
    description_pl: 'Standardowa krzywa IEC dla wiekszosci zastosowan',
    defaultTms: 0.5,
    formula: 't = TMS × (0.14 / (M^0.02 - 1))',
  },
  {
    id: 'iec-vi',
    standard: 'IEC',
    curveType: 'VI',
    name_pl: 'Bardzo odwrotna (VI)',
    description_pl: 'Szybsza reakcja przy wysokich pradach zwarciowych',
    defaultTms: 0.3,
    formula: 't = TMS × (13.5 / (M - 1))',
  },
  {
    id: 'iec-ei',
    standard: 'IEC',
    curveType: 'EI',
    name_pl: 'Ekstremalnie odwrotna (EI)',
    description_pl: 'Najszybsza reakcja przy zwarciach, ochrona generatorow',
    defaultTms: 0.2,
    formula: 't = TMS × (80 / (M^2 - 1))',
  },
  {
    id: 'iec-lti',
    standard: 'IEC',
    curveType: 'LTI',
    name_pl: 'Dlugoczasowa odwrotna (LTI)',
    description_pl: 'Ochrona termiczna, rozruch silnikow',
    defaultTms: 1.0,
    formula: 't = TMS × (120 / (M - 1))',
  },
  {
    id: 'iec-dt',
    standard: 'IEC',
    curveType: 'DT',
    name_pl: 'Czas niezalezny (DT)',
    description_pl: 'Staly czas wylaczenia, niezalezny od pradu',
    defaultTms: 0.5,
    formula: 't = const',
  },
];

const IEEE_PRESETS: CurvePreset[] = [
  {
    id: 'ieee-mi',
    standard: 'IEEE',
    curveType: 'MI',
    name_pl: 'Umiarkowanie odwrotna (MI)',
    description_pl: 'Odpowiednik IEC SI dla norm amerykanskich',
    defaultTms: 0.5,
    formula: 't = TD × (0.0515 / (M^0.02 - 1) + 0.114)',
  },
  {
    id: 'ieee-vi',
    standard: 'IEEE',
    curveType: 'VI',
    name_pl: 'Bardzo odwrotna (VI)',
    description_pl: 'Szybsza reakcja, normy amerykanskie',
    defaultTms: 0.3,
    formula: 't = TD × (19.61 / (M^2 - 1) + 0.491)',
  },
  {
    id: 'ieee-ei',
    standard: 'IEEE',
    curveType: 'EI',
    name_pl: 'Ekstremalnie odwrotna (EI)',
    description_pl: 'Najszybsza reakcja IEEE',
    defaultTms: 0.2,
    formula: 't = TD × (28.2 / (M^2 - 1) + 0.1217)',
  },
  {
    id: 'ieee-sti',
    standard: 'IEEE',
    curveType: 'STI',
    name_pl: 'Krotkoczas. odwrotna (STI)',
    description_pl: 'Krotki czas reakcji, ochrona transformatorow',
    defaultTms: 0.3,
    formula: 't = TD × (0.00342 / (M^0.02 - 1) + 0.00262)',
  },
  {
    id: 'ieee-dt',
    standard: 'IEEE',
    curveType: 'DT',
    name_pl: 'Czas niezalezny (DT)',
    description_pl: 'Staly czas wylaczenia IEEE',
    defaultTms: 0.5,
    formula: 't = const',
  },
];

// =============================================================================
// Curve Preset Card Component
// =============================================================================

interface CurvePresetCardProps {
  preset: CurvePreset;
  onAdd: () => void;
}

function CurvePresetCard({ preset, onAdd }: CurvePresetCardProps) {
  const labels = PROTECTION_CURVES_LABELS.library;

  return (
    <div className="rounded border border-slate-200 bg-white p-3 transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h4 className="font-medium text-slate-900">{preset.name_pl}</h4>
          <span className="text-xs text-slate-500">
            {preset.standard === 'IEC' ? 'IEC 60255' : 'IEEE C37.112'}
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          {labels.addToChart}
        </button>
      </div>
      <p className="mb-2 text-sm text-slate-600">{preset.description_pl}</p>
      <div className="rounded bg-slate-50 px-2 py-1">
        <code className="text-xs text-slate-700">{preset.formula}</code>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CurveLibrary({ onAddCurve, existingCurveCount = 0 }: CurveLibraryProps) {
  const labels = PROTECTION_CURVES_LABELS.library;

  const [activeTab, setActiveTab] = useState<CurveStandard>('IEC');

  const handleAddPreset = useCallback(
    (preset: CurvePreset) => {
      const colorIndex = existingCurveCount % CURVE_COLORS.length;
      const newCurve: Omit<ProtectionCurve, 'points'> = {
        id: `${preset.id}-${Date.now()}`,
        name_pl: preset.name_pl,
        standard: preset.standard,
        curve_type: preset.curveType,
        pickup_current_a: 100, // Default pickup
        time_multiplier: preset.defaultTms,
        definite_time_s: preset.curveType === 'DT' ? 0.5 : undefined,
        color: CURVE_COLORS[colorIndex],
        enabled: true,
      };
      onAddCurve(newCurve);
    },
    [onAddCurve, existingCurveCount]
  );

  const presets = activeTab === 'IEC' ? IEC_PRESETS : IEEE_PRESETS;

  return (
    <div className="rounded border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{labels.title}</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('IEC')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'IEC'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {labels.iec}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('IEEE')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'IEEE'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {labels.ieee}
        </button>
      </div>

      {/* Preset list */}
      <div className="max-h-[400px] space-y-3 overflow-y-auto p-4">
        {presets.map((preset) => (
          <CurvePresetCard
            key={preset.id}
            preset={preset}
            onAdd={() => handleAddPreset(preset)}
          />
        ))}
      </div>
    </div>
  );
}
