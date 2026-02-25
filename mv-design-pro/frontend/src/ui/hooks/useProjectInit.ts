/**
 * useProjectInit — Project & Study Case lifecycle initialization hook.
 *
 * On mount:
 * 1. Loads existing projects (or creates a default one).
 * 2. Stores active project in useAppStateStore.
 * 3. Loads study cases for the project (or creates a default one).
 * 4. Activates the study case on the backend and stores it in useAppStateStore.
 * 5. Refreshes the ENM snapshot from the backend.
 *
 * Returns { isInitializing, error, retry }.
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md: Single model, one active case per project.
 * - wizard_screens.md § 1.2: MODEL_EDIT as default operating mode.
 * - Polish labels throughout (no codenames).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { listProjects, createProject } from '../projects/api';
import {
  listStudyCases,
  createStudyCase,
  setActiveStudyCase,
} from '../study-cases/api';
import { useAppStateStore } from '../app-state';
import { useSnapshotStore } from '../topology/snapshotStore';
import type { CaseKind } from '../app-state';

/**
 * Return type for useProjectInit.
 */
interface UseProjectInitResult {
  /** True while the initialization sequence is running. */
  isInitializing: boolean;
  /** Polish error message if initialization failed, null otherwise. */
  error: string | null;
  /** Re-run the entire initialization sequence. */
  retry: () => void;
}

/** Default case kind assigned on first initialization. */
const DEFAULT_CASE_KIND: CaseKind = 'ShortCircuitCase';

/**
 * Initializes the project and study case lifecycle on application startup.
 *
 * Ensures that at least one project and one study case exist, activates them,
 * and loads the ENM snapshot so the SLD and other UI components can render.
 */
export function useProjectInit(): UseProjectInitResult {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to prevent double-execution in React 18 StrictMode dev mounts.
  const initStarted = useRef(false);

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      // ------------------------------------------------------------------
      // Step 1: Ensure a project exists
      // ------------------------------------------------------------------
      const projects = await listProjects();

      let activeProject = projects[0] ?? null;

      if (!activeProject) {
        activeProject = await createProject({ name: 'Nowy projekt' });
      }

      // ------------------------------------------------------------------
      // Step 2: Store active project in global state
      // ------------------------------------------------------------------
      const appState = useAppStateStore.getState();
      appState.setActiveProject(activeProject.id, activeProject.name);

      // ------------------------------------------------------------------
      // Step 3: Ensure a study case exists for the project
      // ------------------------------------------------------------------
      const projectId = activeProject.id;
      const cases = await listStudyCases(projectId);

      let activeCase = cases[0] ?? null;

      if (!activeCase) {
        const created = await createStudyCase({
          project_id: projectId,
          name: 'Przypadek domyślny',
        });
        activeCase = {
          id: created.id,
          name: created.name,
          description: created.description,
          result_status: created.result_status,
          results_valid: created.results_valid,
          is_active: created.is_active,
          updated_at: created.updated_at,
        };
      }

      // ------------------------------------------------------------------
      // Step 4: Activate the case on the backend
      // ------------------------------------------------------------------
      const activatedCase = await setActiveStudyCase(projectId, activeCase.id);

      // ------------------------------------------------------------------
      // Step 5: Store active case in global state
      // ------------------------------------------------------------------
      useAppStateStore.getState().setActiveCase(
        activatedCase.id,
        activatedCase.name,
        DEFAULT_CASE_KIND,
        activatedCase.result_status,
      );

      // Ensure we start in MODEL_EDIT mode on fresh init.
      useAppStateStore.getState().setActiveMode('MODEL_EDIT');

      // ------------------------------------------------------------------
      // Step 6: Refresh ENM snapshot from backend
      // ------------------------------------------------------------------
      await useSnapshotStore.getState().refreshFromBackend(activatedCase.id);

      setIsInitializing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      setError(`Inicjalizacja projektu nie powiodła się: ${message}`);
      setIsInitializing(false);
    }
  }, []);

  const retry = useCallback(() => {
    initStarted.current = false;
    void initialize();
  }, [initialize]);

  useEffect(() => {
    // Guard against React 18 StrictMode double-mount in development.
    if (initStarted.current) return;
    initStarted.current = true;

    void initialize();
  }, [initialize]);

  return { isInitializing, error, retry };
}
