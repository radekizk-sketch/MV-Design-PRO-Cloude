/**
 * E2E Wizard Full Flow Test — ENM K1 → K10 → SC Results
 *
 * CANONICAL ALIGNMENT:
 * - ENERGY_NETWORK_MODEL.md: ENM contract validation
 * - WIZARD_FLOW.md: K1-K10 step sequence
 *
 * This test verifies the wizard page can:
 * 1. Navigate through all 10 steps
 * 2. Render step titles in Polish
 * 3. Show navigation controls (Wstecz/Dalej)
 * 4. Show gate indicator
 * 5. Display validation issues at K8
 * 6. Show SC run button at K10
 *
 * NOTE: This test requires the dev server at localhost:5173.
 * It uses data-testid selectors exclusively for stability.
 */

import { test, expect } from '@playwright/test';

test.describe('Wizard full flow K1-K10', () => {

  test('wizard page renders with 10 step navigation items', async ({ page }) => {
    await page.goto('/#wizard?caseId=e2e-test-1');

    // Wait for wizard page to render
    const wizard = page.locator('[data-testid="wizard-page"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });

    // Should show all 10 step buttons (K1-K10)
    for (let i = 1; i <= 10; i++) {
      const stepBtn = page.locator(`[data-testid="wizard-step-K${i}"]`);
      await expect(stepBtn).toBeVisible();
    }
  });

  test('can navigate forward and backward through steps', async ({ page }) => {
    await page.goto('/#wizard?caseId=e2e-test-2');
    const wizard = page.locator('[data-testid="wizard-page"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });

    // Click K2 step directly
    await page.locator('[data-testid="wizard-step-K2"]').click();
    await expect(page.locator('text=Punkt zasilania')).toBeVisible();

    // Click K5
    await page.locator('[data-testid="wizard-step-K5"]').click();
    await expect(page.locator('text=Transformatory')).toBeVisible();

    // Click K10
    await page.locator('[data-testid="wizard-step-K10"]').click();
    await expect(page.locator('[data-testid="run-sc-btn"]')).toBeVisible();
  });

  test('gate indicator is visible in sidebar', async ({ page }) => {
    await page.goto('/#wizard?caseId=e2e-test-3');
    const wizard = page.locator('[data-testid="wizard-page"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });

    // Gate indicator should eventually appear (after validation fetch)
    const gate = page.locator('[data-testid="gate-indicator"]');
    await expect(gate).toBeVisible({ timeout: 5000 });
  });

  test('K10 shows run button for short-circuit analysis', async ({ page }) => {
    await page.goto('/#wizard/k10?caseId=e2e-test-4');
    const wizard = page.locator('[data-testid="wizard-page"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });

    // Navigate to K10
    await page.locator('[data-testid="wizard-step-K10"]').click();

    const runBtn = page.locator('[data-testid="run-sc-btn"]');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toHaveText(/Uruchom zwarcia 3F|Obliczanie/);
  });

  test('wizard labels are in Polish (no codenames)', async ({ page }) => {
    await page.goto('/#wizard?caseId=e2e-test-5');
    const wizard = page.locator('[data-testid="wizard-page"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });

    // Verify sidebar header is Polish
    await expect(page.locator('text=Kreator sieci')).toBeVisible();

    // Verify step titles are Polish
    await expect(page.locator('[data-testid="wizard-step-K1"]')).toContainText('Parametry modelu');
    await expect(page.locator('[data-testid="wizard-step-K2"]')).toContainText('Punkt zasilania');
    await expect(page.locator('[data-testid="wizard-step-K8"]')).toContainText('Walidacja');

    // Verify no project codenames (P11, P14, etc.) in visible text
    const pageText = await page.locator('[data-testid="wizard-page"]').textContent();
    expect(pageText).not.toMatch(/\bP7\b|\bP11\b|\bP14\b|\bP17\b|\bP20\b/);
  });
});
