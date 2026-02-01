/**
 * SLD Export Presets — View Profiles
 *
 * CANONICAL ALIGNMENT:
 * - powerfactory_ui_parity.md: PF/ETAP-grade export profiles
 * - SLD_UI_ARCHITECTURE.md: Deterministic layer configuration
 *
 * FEATURES:
 * - Predefined view profiles for common export scenarios
 * - One-click export configuration
 * - URL/localStorage persistence
 *
 * 100% POLISH UI
 */

import type { ExportLayerOptions } from './types';

/**
 * Export preset identifiers.
 * DETERMINISTIC: Fixed IDs for stable persistence.
 */
export type ExportPresetId =
  | 'CLEAN_SLD'
  | 'RESULTS'
  | 'DIAGNOSTICS'
  | 'REPORT'
  | 'CUSTOM';

/**
 * Export preset definition.
 */
export interface ExportPreset {
  /** Unique identifier */
  id: ExportPresetId;
  /** Polish display name */
  label: string;
  /** Polish description */
  description: string;
  /** Layer configuration (null for CUSTOM) */
  layers: ExportLayerOptions | null;
}

/**
 * Preset layer configurations.
 * BINDING: Each preset = deterministic set of flags.
 */
export const PRESET_LAYER_CONFIGS: Record<Exclude<ExportPresetId, 'CUSTOM'>, ExportLayerOptions> = {
  /**
   * CLEAN_SLD: Czysty schemat bez nakładek
   * - legend off, results off, diagnostics off
   * - energized on, CT/VT labels on
   */
  CLEAN_SLD: {
    include_legend: false,
    include_results_overlay: false,
    include_diagnostics_overlay: false,
    include_energization_layer: true,
    include_measurement_labels: true,
  },

  /**
   * RESULTS: Schemat z wynikami obliczeń
   * - results on, legend on
   * - diagnostics off, energized on, CT/VT labels on
   */
  RESULTS: {
    include_legend: true,
    include_results_overlay: true,
    include_diagnostics_overlay: false,
    include_energization_layer: true,
    include_measurement_labels: true,
  },

  /**
   * DIAGNOSTICS: Schemat z nakładką diagnostyki
   * - diagnostics on, legend on
   * - results off, energized on, CT/VT labels off
   */
  DIAGNOSTICS: {
    include_legend: true,
    include_results_overlay: false,
    include_diagnostics_overlay: true,
    include_energization_layer: true,
    include_measurement_labels: false,
  },

  /**
   * REPORT: Pełny raport z wszystkimi warstwami
   * - legend on, results on, diagnostics on
   * - energized on, CT/VT labels on
   */
  REPORT: {
    include_legend: true,
    include_results_overlay: true,
    include_diagnostics_overlay: true,
    include_energization_layer: true,
    include_measurement_labels: true,
  },
};

/**
 * Ordered list of export presets.
 * CUSTOM is always last (user-modified state).
 */
export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'CLEAN_SLD',
    label: 'Czysty SLD',
    description: 'Schemat bez nakładek wyników i diagnostyki',
    layers: PRESET_LAYER_CONFIGS.CLEAN_SLD,
  },
  {
    id: 'RESULTS',
    label: 'Wyniki',
    description: 'Schemat z nakładką wyników obliczeń',
    layers: PRESET_LAYER_CONFIGS.RESULTS,
  },
  {
    id: 'DIAGNOSTICS',
    label: 'Diagnostyka',
    description: 'Schemat z nakładką diagnostyki błędów',
    layers: PRESET_LAYER_CONFIGS.DIAGNOSTICS,
  },
  {
    id: 'REPORT',
    label: 'Raport',
    description: 'Pełny schemat z wynikami, diagnostyką i legendą',
    layers: PRESET_LAYER_CONFIGS.REPORT,
  },
  {
    id: 'CUSTOM',
    label: 'Niestandardowy',
    description: 'Ręcznie skonfigurowane warstwy',
    layers: null,
  },
];

/**
 * Get preset by ID.
 */
export function getPresetById(id: ExportPresetId): ExportPreset | undefined {
  return EXPORT_PRESETS.find((p) => p.id === id);
}

/**
 * Get preset label by ID.
 */
export function getPresetLabel(id: ExportPresetId): string {
  return getPresetById(id)?.label ?? 'Niestandardowy';
}

/**
 * Check if layer configuration matches a preset.
 * Returns the matching preset ID, or 'CUSTOM' if no match.
 *
 * @param layers - Current layer configuration
 * @param hasResults - Whether results overlay is available
 * @param hasDiagnostics - Whether diagnostics overlay is available
 */
export function detectPresetFromLayers(
  layers: ExportLayerOptions,
  hasResults: boolean,
  hasDiagnostics: boolean
): ExportPresetId {
  // Check each predefined preset
  for (const preset of EXPORT_PRESETS) {
    if (preset.id === 'CUSTOM' || !preset.layers) continue;

    const presetLayers = preset.layers;
    let matches = true;

    // Compare each layer flag
    for (const key of Object.keys(presetLayers) as (keyof ExportLayerOptions)[]) {
      const presetValue = presetLayers[key];
      const currentValue = layers[key];

      // Special handling for unavailable layers
      if (key === 'include_results_overlay' && !hasResults) {
        // If results not available, treat as matching if preset expects off
        if (presetValue === true) {
          matches = false;
          break;
        }
        continue;
      }

      if (key === 'include_diagnostics_overlay' && !hasDiagnostics) {
        // If diagnostics not available, treat as matching if preset expects off
        if (presetValue === true) {
          matches = false;
          break;
        }
        continue;
      }

      if (presetValue !== currentValue) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return preset.id;
    }
  }

  return 'CUSTOM';
}

// =============================================================================
// Persistence — URL param + localStorage fallback
// =============================================================================

/**
 * URL parameter key for export preset.
 */
export const EXPORT_PRESET_URL_PARAM = 'export_preset';

/**
 * localStorage key for export preset.
 */
export const EXPORT_PRESET_STORAGE_KEY = 'mvdesign_export_preset';

/**
 * Valid preset IDs for persistence (excludes CUSTOM).
 */
const PERSISTABLE_PRESET_IDS: ExportPresetId[] = [
  'CLEAN_SLD',
  'RESULTS',
  'DIAGNOSTICS',
  'REPORT',
];

/**
 * Check if preset ID is valid for persistence.
 */
function isValidPresetId(id: string): id is ExportPresetId {
  return PERSISTABLE_PRESET_IDS.includes(id as ExportPresetId);
}

/**
 * Read export preset from URL params.
 * Falls back to localStorage if not in URL.
 *
 * @returns Preset ID or null if not set/invalid
 */
export function readExportPresetFromStorage(): ExportPresetId | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // 1. Try URL param first
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');

  if (queryIndex !== -1) {
    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    const urlPreset = params.get(EXPORT_PRESET_URL_PARAM);

    if (urlPreset && isValidPresetId(urlPreset)) {
      return urlPreset;
    }
  }

  // 2. Fallback to localStorage
  try {
    const storedPreset = localStorage.getItem(EXPORT_PRESET_STORAGE_KEY);
    if (storedPreset && isValidPresetId(storedPreset)) {
      return storedPreset;
    }
  } catch {
    // localStorage not available
  }

  return null;
}

/**
 * Save export preset to localStorage.
 * Does NOT modify URL (caller decides when to update URL).
 *
 * @param presetId - Preset ID to save (CUSTOM is not saved)
 */
export function saveExportPresetToStorage(presetId: ExportPresetId): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Don't persist CUSTOM
  if (presetId === 'CUSTOM') {
    return;
  }

  try {
    localStorage.setItem(EXPORT_PRESET_STORAGE_KEY, presetId);
  } catch {
    // localStorage not available
  }
}

/**
 * Update URL with export preset.
 * Preserves existing URL params.
 *
 * @param presetId - Preset ID to set (CUSTOM removes param)
 */
export function updateUrlWithExportPreset(presetId: ExportPresetId): void {
  if (typeof window === 'undefined') {
    return;
  }

  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  const hashRoute = queryIndex === -1 ? hash : hash.slice(0, queryIndex);
  const params = queryIndex === -1
    ? new URLSearchParams()
    : new URLSearchParams(hash.slice(queryIndex + 1));

  if (presetId === 'CUSTOM') {
    params.delete(EXPORT_PRESET_URL_PARAM);
  } else {
    params.set(EXPORT_PRESET_URL_PARAM, presetId);
  }

  const queryString = params.toString();
  const newHash = queryString ? `${hashRoute}?${queryString}` : hashRoute;
  const newUrl = `${window.location.pathname}${newHash}`;

  window.history.replaceState(null, '', newUrl);
}

/**
 * Clear export preset from URL.
 */
export function clearExportPresetFromUrl(): void {
  updateUrlWithExportPreset('CUSTOM');
}
