/**
 * Testy ProjectModeToolbar — RUN #3H §4 + RUN #3I §I3.
 *
 * ZAKRES:
 * - Rendering przelacznika trybu (wlacz/wylacz)
 * - Wskaznik dirty (niezapisane zmiany)
 * - Przyciski zapisu/wczytania/resetu
 * - Wyswietlanie bledow walidacji
 * - Stan ladowania
 * - Hash ostatniego zapisu
 * - 100% POLISH UI
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProjectModeToolbar } from '../ProjectModeToolbar';
import { useSldProjectModeStore } from '../sldProjectModeStore';

// =============================================================================
// Helpers
// =============================================================================

function resetStore() {
  useSldProjectModeStore.setState({
    projectModeActive: false,
    overrides: null,
    dirty: false,
    validationErrors: [],
    loading: false,
    error: null,
    lastSavedHash: null,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('ProjectModeToolbar', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should render toggle button', () => {
    render(<ProjectModeToolbar caseId="case-001" />);
    const toggle = screen.getByTestId('project-mode-toggle');
    expect(toggle).toBeDefined();
    expect(toggle.textContent).toContain('Wlacz');
  });

  it('should show "Wylacz" when active', () => {
    useSldProjectModeStore.setState({ projectModeActive: true });
    render(<ProjectModeToolbar caseId="case-001" />);
    const toggle = screen.getByTestId('project-mode-toggle');
    expect(toggle.textContent).toContain('Wylacz');
  });

  it('should toggle project mode on click', () => {
    render(<ProjectModeToolbar caseId="case-001" />);
    const toggle = screen.getByTestId('project-mode-toggle');

    fireEvent.click(toggle);
    expect(useSldProjectModeStore.getState().projectModeActive).toBe(true);

    fireEvent.click(toggle);
    expect(useSldProjectModeStore.getState().projectModeActive).toBe(false);
  });

  it('should show dirty indicator when changes exist', () => {
    useSldProjectModeStore.setState({ projectModeActive: true, dirty: true });
    render(<ProjectModeToolbar caseId="case-001" />);
    const indicator = screen.getByTestId('project-mode-dirty-indicator');
    expect(indicator.textContent).toContain('Niezapisane zmiany');
  });

  it('should show clean indicator when no changes', () => {
    useSldProjectModeStore.setState({ projectModeActive: true, dirty: false });
    render(<ProjectModeToolbar caseId="case-001" />);
    const indicator = screen.getByTestId('project-mode-dirty-indicator');
    expect(indicator.textContent).toContain('Brak zmian');
  });

  it('should show override count', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      overrides: {
        overridesVersion: '1.0',
        studyCaseId: 'case-001',
        snapshotHash: 'abc',
        items: [
          {
            elementId: 'node-1',
            scope: 'NODE',
            operation: 'MOVE_DELTA',
            payload: { dx: 20, dy: 0 },
          },
        ],
      },
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    const count = screen.getByTestId('project-mode-override-count');
    expect(count.textContent).toContain('1');
  });

  it('should show save button disabled when not dirty', () => {
    useSldProjectModeStore.setState({ projectModeActive: true, dirty: false });
    render(<ProjectModeToolbar caseId="case-001" />);
    const saveBtn = screen.getByTestId('project-mode-save');
    expect(saveBtn).toBeDefined();
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('should show save button enabled when dirty and no errors', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      dirty: true,
      overrides: {
        overridesVersion: '1.0',
        studyCaseId: 'case-001',
        snapshotHash: 'abc',
        items: [],
      },
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    const saveBtn = screen.getByTestId('project-mode-save');
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('should show save button disabled when validation errors exist', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      dirty: true,
      validationErrors: [{ elementId: 'x', code: 'c', message: 'm' }],
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    const saveBtn = screen.getByTestId('project-mode-save');
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('should show validation errors button with count', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      validationErrors: [
        { elementId: 'node-1', code: 'geometry.override_invalid_element', message: 'Blad' },
        { elementId: 'node-2', code: 'geometry.override_invalid_element', message: 'Blad 2' },
      ],
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    const errBtn = screen.getByTestId('project-mode-errors-toggle');
    expect(errBtn.textContent).toContain('2');
  });

  it('should toggle error panel on click', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      validationErrors: [
        { elementId: 'node-1', code: 'geometry.override_invalid_element', message: 'Blad testowy' },
      ],
    });
    render(<ProjectModeToolbar caseId="case-001" />);

    // Panel not visible initially
    expect(screen.queryByTestId('project-mode-errors-panel')).toBeNull();

    // Click errors button
    fireEvent.click(screen.getByTestId('project-mode-errors-toggle'));
    expect(screen.getByTestId('project-mode-errors-panel')).toBeDefined();
    expect(screen.getByTestId('project-mode-error-item-0')).toBeDefined();
  });

  it('should show error message from API', () => {
    useSldProjectModeStore.setState({
      projectModeActive: false,
      error: 'Nie udalo sie zaladowac nadpisan: timeout',
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    const errMsg = screen.getByTestId('project-mode-error');
    expect(errMsg.textContent).toContain('timeout');
  });

  it('should hide controls when project mode inactive', () => {
    useSldProjectModeStore.setState({ projectModeActive: false });
    render(<ProjectModeToolbar caseId="case-001" />);
    expect(screen.queryByTestId('project-mode-dirty-indicator')).toBeNull();
    expect(screen.queryByTestId('project-mode-save')).toBeNull();
    expect(screen.queryByTestId('project-mode-reset')).toBeNull();
  });

  it('should disable save when no caseId', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      dirty: true,
    });
    render(<ProjectModeToolbar caseId={null} />);
    const saveBtn = screen.getByTestId('project-mode-save');
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('should show loading text on save button when loading', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      loading: true,
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    const saveBtn = screen.getByTestId('project-mode-save');
    expect(saveBtn.textContent).toContain('Ladowanie');
  });

  // =========================================================================
  // RUN #3I §I3: Load button + lastSavedHash
  // =========================================================================

  it('should show load button when active', () => {
    useSldProjectModeStore.setState({ projectModeActive: true });
    render(<ProjectModeToolbar caseId="case-001" />);
    const loadBtn = screen.getByTestId('project-mode-load');
    expect(loadBtn).toBeDefined();
    expect(loadBtn.textContent).toContain('Wczytaj');
  });

  it('should disable load button when no caseId', () => {
    useSldProjectModeStore.setState({ projectModeActive: true });
    render(<ProjectModeToolbar caseId={null} />);
    const loadBtn = screen.getByTestId('project-mode-load');
    expect((loadBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('should disable load button when loading', () => {
    useSldProjectModeStore.setState({ projectModeActive: true, loading: true });
    render(<ProjectModeToolbar caseId="case-001" />);
    const loadBtn = screen.getByTestId('project-mode-load');
    expect((loadBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('should enable load button when not loading and caseId present', () => {
    useSldProjectModeStore.setState({ projectModeActive: true, loading: false });
    render(<ProjectModeToolbar caseId="case-001" />);
    const loadBtn = screen.getByTestId('project-mode-load');
    expect((loadBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('should show lastSavedHash when available', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      lastSavedHash: 'abcdef0123456789',
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    const hashEl = screen.getByTestId('project-mode-last-hash');
    expect(hashEl).toBeDefined();
    expect(hashEl.textContent).toContain('abcdef01');
  });

  it('should not show lastSavedHash when null', () => {
    useSldProjectModeStore.setState({
      projectModeActive: true,
      lastSavedHash: null,
    });
    render(<ProjectModeToolbar caseId="case-001" />);
    expect(screen.queryByTestId('project-mode-last-hash')).toBeNull();
  });

  it('should hide load button when project mode inactive', () => {
    useSldProjectModeStore.setState({ projectModeActive: false });
    render(<ProjectModeToolbar caseId="case-001" />);
    expect(screen.queryByTestId('project-mode-load')).toBeNull();
  });
});
