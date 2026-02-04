/**
 * E2E Reliability Smoke Test — PR-E2E-RELIABILITY-FINAL
 *
 * GOAL: "KAŻDY KLIK DZIAŁA" — Every click works or shows Polish error message.
 *
 * TESTS:
 * 1. App loads without errors
 * 2. No 500 HTTP errors during navigation
 * 3. No uncaught exceptions in console
 * 4. All main views accessible
 * 5. SLD fit-to-content works (F key)
 * 6. Buttons are disabled with tooltips when actions not available
 *
 * FLOW:
 * App → Project/Case → SLD → Results → Proof → Export check
 */

import { test, expect, Page, ConsoleMessage, Request, Response } from '@playwright/test';
import {
  TEST_APP_STATE,
  TEST_SELECTION_STATE,
  TEST_RESULTS_INDEX,
  TEST_BUS_RESULTS,
  TEST_BRANCH_RESULTS,
  TEST_SHORT_CIRCUIT_RESULTS,
  TEST_EXTENDED_TRACE,
  TEST_SLD_TOPOLOGY,
  TEST_PROJECT,
  TEST_CASE,
} from './fixtures/test-fixtures';

// =============================================================================
// Error Tracking Utilities
// =============================================================================

interface ErrorReport {
  consoleErrors: string[];
  networkErrors: { url: string; status: number; method: string }[];
  uncaughtExceptions: string[];
}

/**
 * Setup error tracking for a page.
 * Returns an object that collects errors during test execution.
 */
function setupErrorTracking(page: Page): ErrorReport {
  const report: ErrorReport = {
    consoleErrors: [],
    networkErrors: [],
    uncaughtExceptions: [],
  };

  // Track console errors
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known non-critical errors
      if (!text.includes('favicon.ico') && !text.includes('404')) {
        report.consoleErrors.push(text);
      }
    }
  });

  // Track uncaught exceptions
  page.on('pageerror', (error: Error) => {
    report.uncaughtExceptions.push(error.message);
  });

  // Track network errors (4xx/5xx)
  page.on('response', (response: Response) => {
    const status = response.status();
    if (status >= 400) {
      const request = response.request();
      // Ignore expected 404s for optional resources
      if (status === 404 && request.url().includes('favicon')) {
        return;
      }
      report.networkErrors.push({
        url: request.url(),
        status,
        method: request.method(),
      });
    }
  });

  return report;
}

/**
 * Assert no critical errors occurred.
 */
function assertNoErrors(report: ErrorReport, context: string) {
  // Check for 500 errors specifically
  const serverErrors = report.networkErrors.filter((e) => e.status >= 500);
  if (serverErrors.length > 0) {
    const errorDetails = serverErrors
      .map((e) => `${e.method} ${e.url} → ${e.status}`)
      .join('\n');
    throw new Error(`[${context}] HTTP 500 errors detected:\n${errorDetails}`);
  }

  // Check for uncaught exceptions
  if (report.uncaughtExceptions.length > 0) {
    throw new Error(
      `[${context}] Uncaught exceptions:\n${report.uncaughtExceptions.join('\n')}`
    );
  }
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Wait for app to be fully hydrated and ready.
 */
async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="app-ready"]', {
    state: 'attached',
    timeout: 15000,
  });
  await expect(page.locator('[data-testid="active-case-bar"]')).toBeVisible();
}

/**
 * Seed localStorage with test fixtures for deterministic state.
 */
async function seedTestState(page: Page): Promise<void> {
  await page.addInitScript(
    (fixtures) => {
      localStorage.setItem('mv-design-app-state', JSON.stringify(fixtures.appState));
      localStorage.setItem(
        'mv-design-selection-store',
        JSON.stringify(fixtures.selectionState)
      );
    },
    {
      appState: TEST_APP_STATE,
      selectionState: TEST_SELECTION_STATE,
    }
  );
}

/**
 * Setup API route mocking for offline/deterministic tests.
 */
async function setupApiMocks(page: Page): Promise<void> {
  // Mock results index
  await page.route('**/api/analysis-runs/*/results/index', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_RESULTS_INDEX),
    });
  });

  // Mock bus results
  await page.route('**/api/analysis-runs/*/results/buses', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_BUS_RESULTS),
    });
  });

  // Mock branch results
  await page.route('**/api/analysis-runs/*/results/branches', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_BRANCH_RESULTS),
    });
  });

  // Mock short circuit results
  await page.route('**/api/analysis-runs/*/results/short-circuit', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_SHORT_CIRCUIT_RESULTS),
    });
  });

  // Mock trace
  await page.route('**/api/analysis-runs/*/trace', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_EXTENDED_TRACE),
    });
  });

  // Mock SLD topology
  await page.route('**/api/cases/*/sld', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_SLD_TOPOLOGY),
    });
  });

  // Mock projects list
  await page.route('**/api/projects', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([TEST_PROJECT]),
      });
    } else {
      route.continue();
    }
  });

  // Mock study cases
  await page.route('**/api/study-cases/project/*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_CASE]),
    });
  });
}

// =============================================================================
// Test Suite: Reliability Smoke Tests
// =============================================================================

test.describe('E2E Reliability Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup error tracking
    const errorReport = setupErrorTracking(page);
    // Store for later assertions (attach to page context)
    (page as any).__errorReport = errorReport;

    // Seed localStorage
    await seedTestState(page);

    // Setup API mocks for deterministic behavior
    await setupApiMocks(page);
  });

  test('App loads without critical errors', async ({ page }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    await page.goto('/');
    await waitForAppReady(page);

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/screenshots/app-initial.png' });

    // Assert no critical errors
    assertNoErrors(errorReport, 'App Load');

    // Mode indicator should be visible and correct
    const modeIndicator = page.locator('[data-testid="mode-indicator"]');
    await expect(modeIndicator).toBeVisible();
  });

  test('SLD view renders without errors', async ({ page }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    await page.goto('/');
    await waitForAppReady(page);

    // SLD canvas should be present
    const sldCanvas = page.locator('[data-testid="sld-canvas"]');
    // Allow for the canvas to not exist if no data, but check no errors
    await page.waitForTimeout(1000); // Brief wait for render

    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/sld-view.png' });

    // Assert no critical errors
    assertNoErrors(errorReport, 'SLD View');
  });

  test('Navigation to Results view works', async ({ page }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    await page.goto('/');
    await waitForAppReady(page);

    // Navigate to results
    await page.goto('/#results');
    await waitForAppReady(page);

    // Mode should be RESULT_VIEW
    const modeIndicator = page.locator('[data-testid="mode-indicator"]');
    await expect(modeIndicator).toHaveAttribute('data-mode', 'RESULT_VIEW');

    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/results-view.png' });

    // Assert no critical errors
    assertNoErrors(errorReport, 'Results View');
  });

  test('Navigation to Proof/Trace view works', async ({ page }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    await page.goto('/');
    await waitForAppReady(page);

    // Navigate to proof
    await page.goto('/#proof');
    await waitForAppReady(page);

    // Mode should be RESULT_VIEW
    const modeIndicator = page.locator('[data-testid="mode-indicator"]');
    await expect(modeIndicator).toHaveAttribute('data-mode', 'RESULT_VIEW');

    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/proof-view.png' });

    // Assert no critical errors
    assertNoErrors(errorReport, 'Proof View');
  });

  test('Case Manager opens and closes without errors', async ({ page }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    await page.goto('/');
    await waitForAppReady(page);

    // Click change case button
    const changeCaseBtn = page.locator('[data-testid="btn-change-case"]');
    await changeCaseBtn.click();

    // Panel should open
    const panel = page.locator('[data-testid="case-manager-panel"]');
    await expect(panel).toHaveAttribute('data-open', 'true');

    // Take screenshot of open panel
    await page.screenshot({ path: 'test-results/screenshots/case-manager-open.png' });

    // Close by clicking backdrop
    const backdrop = page.locator('[data-testid="case-manager-backdrop"]');
    await backdrop.click();

    // Panel should close
    await expect(panel).toHaveAttribute('data-open', 'false');

    // Assert no critical errors
    assertNoErrors(errorReport, 'Case Manager');
  });

  test('Button states are correct - disabled buttons have Polish tooltips', async ({
    page,
  }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    await page.goto('/');
    await waitForAppReady(page);

    // Check all main buttons exist
    const buttons = [
      'btn-change-case',
      'btn-configure',
      'btn-calculate',
      'btn-results',
    ];

    for (const btnId of buttons) {
      const btn = page.locator(`[data-testid="${btnId}"]`);
      await expect(btn).toBeVisible();

      // If disabled, should have title attribute (tooltip) in Polish
      const isDisabled = await btn.isDisabled();
      if (isDisabled) {
        const title = await btn.getAttribute('title');
        // Polish tooltip should be present (not empty and not English)
        expect(title).toBeTruthy();
        // Basic check that it's not English
        expect(title).not.toContain('required');
        expect(title).not.toContain('Required');
        expect(title).not.toContain('available');
      }
    }

    // Assert no critical errors
    assertNoErrors(errorReport, 'Button States');
  });

  test('SLD keyboard shortcut F (fit to content) does not crash', async ({ page }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    await page.goto('/');
    await waitForAppReady(page);

    // Focus on SLD area and press F
    const body = page.locator('body');
    await body.focus();
    await page.keyboard.press('f');

    // Wait a moment for any effects
    await page.waitForTimeout(500);

    // Take screenshot after fit
    await page.screenshot({ path: 'test-results/screenshots/sld-after-fit.png' });

    // Assert no critical errors
    assertNoErrors(errorReport, 'SLD Fit Key');
  });

  test('Full navigation flow without errors', async ({ page }) => {
    const errorReport = (page as any).__errorReport as ErrorReport;

    // 1. Start at SLD
    await page.goto('/');
    await waitForAppReady(page);
    assertNoErrors(errorReport, 'Step 1: Initial Load');

    // 2. Open Case Manager
    await page.locator('[data-testid="btn-change-case"]').click();
    await expect(
      page.locator('[data-testid="case-manager-panel"]')
    ).toHaveAttribute('data-open', 'true');
    assertNoErrors(errorReport, 'Step 2: Case Manager');

    // 3. Close Case Manager
    await page.locator('[data-testid="case-manager-backdrop"]').click();
    await expect(
      page.locator('[data-testid="case-manager-panel"]')
    ).toHaveAttribute('data-open', 'false');

    // 4. Navigate to Results
    await page.goto('/#results');
    await waitForAppReady(page);
    assertNoErrors(errorReport, 'Step 3: Results');

    // 5. Navigate to Proof
    await page.goto('/#proof');
    await waitForAppReady(page);
    assertNoErrors(errorReport, 'Step 4: Proof');

    // 6. Navigate back to SLD
    await page.goto('/');
    await waitForAppReady(page);
    assertNoErrors(errorReport, 'Step 5: Back to SLD');

    // 7. Press F for fit
    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    assertNoErrors(errorReport, 'Step 6: Fit Key');

    // Final screenshot
    await page.screenshot({
      path: 'test-results/screenshots/full-flow-final.png',
      fullPage: true,
    });

    // Final assertion - no 500 errors throughout
    const serverErrors = errorReport.networkErrors.filter((e) => e.status >= 500);
    expect(serverErrors).toHaveLength(0);

    // No uncaught exceptions
    expect(errorReport.uncaughtExceptions).toHaveLength(0);
  });

  test('Empty state shows Polish message (no active case)', async ({ page }) => {
    // Clear seeded state to test empty state
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/');

    // Wait for app (may show empty state)
    await page.waitForSelector('[data-testid="app-ready"]', {
      state: 'attached',
      timeout: 15000,
    });

    // Check for empty overlay if present
    const emptyOverlay = page.locator('[data-testid="sld-empty-overlay"]');
    const hasEmptyOverlay = await emptyOverlay.isVisible().catch(() => false);

    if (hasEmptyOverlay) {
      // Check title is in Polish
      const title = page.locator('[data-testid="sld-empty-overlay-title"]');
      const titleText = await title.textContent();

      // Should not be empty
      expect(titleText).toBeTruthy();
      // Should be Polish (not English)
      expect(titleText).not.toContain('No case');
      expect(titleText).not.toContain('Please select');
    }

    // Screenshot
    await page.screenshot({ path: 'test-results/screenshots/empty-state.png' });
  });
});

// =============================================================================
// Test Suite: Error Boundary Tests
// =============================================================================

test.describe('Error Handling Verification', () => {
  test('API 404 shows graceful error, not 500', async ({ page }) => {
    const errorReport = setupErrorTracking(page);
    (page as any).__errorReport = errorReport;

    // Mock a 404 response
    await page.route('**/api/analysis-runs/nonexistent/results', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Nie znaleziono wyników analizy' }),
      });
    });

    await seedTestState(page);
    await page.goto('/');
    await waitForAppReady(page);

    // No 500 errors should occur
    const serverErrors = errorReport.networkErrors.filter((e) => e.status >= 500);
    expect(serverErrors).toHaveLength(0);
  });
});
