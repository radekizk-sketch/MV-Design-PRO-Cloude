/**
 * ProjectModeToolbar — Pasek narzedzi trybu projektowego (CAD).
 *
 * RUN #3H §4: UI do zarzadzania trybem projektowym SLD.
 *
 * FEATURES:
 * - Przelacznik trybu projektowego (wlacz/wylacz)
 * - Wskaznik niezapisanych zmian (dirty)
 * - Przycisk zapisu / resetu / walidacji
 * - Wyswietlanie bledow walidacji (FixActions)
 * - Status ladowania / bledu
 * - 100% POLISH UI
 */

import React, { useCallback, useState } from 'react';
import {
  useSldProjectModeStore,
  useIsProjectMode,
  useOverridesDirty,
  useOverridesValidationErrors,
} from './sldProjectModeStore';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectModeToolbarProps {
  /** ID aktywnego studium przypadku (wymagany do API). */
  caseId: string | null;
  /** Dodatkowe klasy CSS. */
  className?: string;
}

// =============================================================================
// ETYKIETY POLSKIE
// =============================================================================

const LABELS = {
  projectMode: 'Tryb projektowy',
  activate: 'Wlacz',
  deactivate: 'Wylacz',
  save: 'Zapisz',
  load: 'Wczytaj',
  reset: 'Resetuj',
  validate: 'Waliduj',
  unsavedChanges: 'Niezapisane zmiany',
  noChanges: 'Brak zmian',
  loading: 'Ladowanie...',
  validationErrors: 'Bledy walidacji',
  noErrors: 'Brak bledow',
  lastSavedHash: 'Ostatni hash',
} as const;

// =============================================================================
// KOMPONENT
// =============================================================================

/**
 * Pasek narzedzi trybu projektowego (CAD).
 *
 * Wyswietla kontrolki do zarzadzania nadpisaniami geometrii:
 * - Przelacznik trybu
 * - Przycisk zapisu (zablokowany gdy brak zmian lub bledy walidacji)
 * - Przycisk resetu
 * - Status (dirty/clean/loading/error)
 * - Lista bledow walidacji (FixActions)
 */
export const ProjectModeToolbar: React.FC<ProjectModeToolbarProps> = ({
  caseId,
  className = '',
}) => {
  const isActive = useIsProjectMode();
  const isDirty = useOverridesDirty();
  const validationErrors = useOverridesValidationErrors();
  const loading = useSldProjectModeStore((s) => s.loading);
  const error = useSldProjectModeStore((s) => s.error);
  const overrides = useSldProjectModeStore((s) => s.overrides);

  const lastSavedHash = useSldProjectModeStore((s) => s.lastSavedHash);

  const setProjectMode = useSldProjectModeStore((s) => s.setProjectMode);
  const loadOverrides = useSldProjectModeStore((s) => s.loadOverrides);
  const saveOverrides = useSldProjectModeStore((s) => s.saveOverrides);
  const resetOverrides = useSldProjectModeStore((s) => s.resetOverrides);

  const [showErrors, setShowErrors] = useState(false);

  // --- Handlers ---

  const handleToggle = useCallback(() => {
    setProjectMode(!isActive);
  }, [isActive, setProjectMode]);

  const handleLoad = useCallback(async () => {
    if (!caseId) return;
    await loadOverrides(caseId);
  }, [caseId, loadOverrides]);

  const handleSave = useCallback(async () => {
    if (!caseId) return;
    await saveOverrides(caseId);
  }, [caseId, saveOverrides]);

  const handleReset = useCallback(async () => {
    if (!caseId) return;
    await resetOverrides(caseId);
  }, [caseId, resetOverrides]);

  const toggleErrors = useCallback(() => {
    setShowErrors((prev) => !prev);
  }, []);

  const canLoad = !loading && caseId !== null;
  const canSave = isDirty && validationErrors.length === 0 && !loading && caseId !== null;
  const canReset = !loading && caseId !== null && overrides !== null;
  const itemCount = overrides?.items.length ?? 0;

  return (
    <div
      className={`flex flex-col ${className}`}
      data-testid="project-mode-toolbar"
      data-active={isActive}
    >
      {/* Glowny pasek */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
        {/* Przelacznik trybu */}
        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
            isActive
              ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
          }`}
          data-testid="project-mode-toggle"
        >
          {isActive ? `${LABELS.projectMode}: ${LABELS.deactivate}` : `${LABELS.projectMode}: ${LABELS.activate}`}
        </button>

        {/* Pozostale kontrolki — widoczne tylko gdy tryb aktywny */}
        {isActive && (
          <>
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300" />

            {/* Status dirty/clean */}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                isDirty
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
              data-testid="project-mode-dirty-indicator"
            >
              {isDirty ? LABELS.unsavedChanges : LABELS.noChanges}
            </span>

            {/* Liczba nadpisan */}
            <span
              className="text-xs text-slate-500"
              data-testid="project-mode-override-count"
            >
              Nadpisania: {itemCount}
            </span>

            {/* Hash ostatniego zapisu */}
            {lastSavedHash && (
              <span
                className="text-xs text-slate-400 font-mono"
                data-testid="project-mode-last-hash"
                title={lastSavedHash}
              >
                {LABELS.lastSavedHash}: {lastSavedHash.slice(0, 8)}
              </span>
            )}

            {/* Separator */}
            <div className="w-px h-6 bg-slate-300" />

            {/* Przycisk wczytania */}
            <button
              type="button"
              onClick={handleLoad}
              disabled={!canLoad}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                canLoad
                  ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              data-testid="project-mode-load"
            >
              {LABELS.load}
            </button>

            {/* Przycisk zapisu */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                canSave
                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              data-testid="project-mode-save"
            >
              {loading ? LABELS.loading : LABELS.save}
            </button>

            {/* Przycisk resetu */}
            <button
              type="button"
              onClick={handleReset}
              disabled={!canReset}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                canReset
                  ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              data-testid="project-mode-reset"
            >
              {LABELS.reset}
            </button>

            {/* Bledy walidacji */}
            {validationErrors.length > 0 && (
              <button
                type="button"
                onClick={toggleErrors}
                className="px-3 py-1.5 text-xs font-medium rounded border bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 transition-colors"
                data-testid="project-mode-errors-toggle"
              >
                {LABELS.validationErrors}: {validationErrors.length}
              </button>
            )}
          </>
        )}

        {/* Blad operacji */}
        {error && (
          <span
            className="text-xs text-rose-600 font-medium ml-2"
            data-testid="project-mode-error"
          >
            {error}
          </span>
        )}
      </div>

      {/* Panel bledow walidacji (FixActions) */}
      {isActive && showErrors && validationErrors.length > 0 && (
        <div
          className="px-4 py-2 bg-rose-50 border-b border-rose-200"
          data-testid="project-mode-errors-panel"
        >
          <p className="text-xs font-semibold text-rose-700 mb-1">{LABELS.validationErrors}:</p>
          <ul className="space-y-1">
            {validationErrors.map((err, idx) => (
              <li
                key={`${err.elementId}-${err.code}-${idx}`}
                className="text-xs text-rose-600 flex items-start gap-2"
                data-testid={`project-mode-error-item-${idx}`}
              >
                <span className="font-mono text-rose-400 flex-shrink-0">[{err.code}]</span>
                <span>
                  <span className="font-medium">{err.elementId}</span>: {err.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProjectModeToolbar;
