import { test, expect, Page } from '@playwright/test';
import { TEST_APP_STATE, TEST_SELECTION_STATE } from './fixtures/test-fixtures';

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="app-ready"]', { state: 'attached', timeout: 15000 });
  await expect(page.locator('[data-testid="active-case-bar"]')).toBeVisible();
}

async function seedTestState(page: Page): Promise<void> {
  await page.addInitScript((fixtures) => {
    localStorage.setItem('mv-design-app-state', JSON.stringify(fixtures.appState));
    localStorage.setItem('mv-design-selection-store', JSON.stringify(fixtures.selectionState));
  }, {
    appState: TEST_APP_STATE,
    selectionState: TEST_SELECTION_STATE,
  });
}

test.describe('Branch points workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestState(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('opens branch pole form from process panel action', async ({ page }) => {
    await expect(page.locator('[data-testid="process-panel"]')).toBeVisible();
    await page.locator('[data-testid="btn-insert-object-branch-pole"]').click();
    await expect(page.locator('[data-testid="insert-branch-pole-form"]')).toBeVisible();
  });

  test('opens ZKSN form from process panel action', async ({ page }) => {
    await expect(page.locator('[data-testid="process-panel"]')).toBeVisible();
    await page.locator('[data-testid="btn-insert-object-zksn"]').click();
    await expect(page.locator('[data-testid="insert-zksn-form"]')).toBeVisible();
  });
});
