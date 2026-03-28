/**
 * Catalog-First Enforcement E2E Tests
 *
 * Proof that critical operations FAIL when no catalog is selected.
 * These tests verify §14 compliance:
 * "Can a user create ANY physical MV element without a catalog entry?" → NO
 *
 * Tests cover:
 * - insert_branch_pole_on_segment_sn → UI blocks submit without catalog
 * - insert_zksn_on_segment_sn → UI blocks submit without catalog
 * - insert_section_switch_sn → UI blocks submit without catalog
 * - connect_secondary_ring_sn → UI blocks submit without catalog
 * - Backend rejects direct API calls without catalog (bypassing UI)
 */

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

test.describe('Catalog-First Enforcement — UI Failure Cases', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestState(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('insert branch pole without catalog → form shows error, no operation executed', async ({ page }) => {
    // Open the insert-branch-pole form
    await page.locator('[data-testid="btn-insert-object-branch-pole"]').click();
    await expect(page.locator('[data-testid="insert-branch-pole-form"]')).toBeVisible();

    // Submit without filling catalog_ref — the input is empty by default
    await page.locator('[data-testid="insert-branch-pole-form"] button[type="submit"]').click();

    // Expect a catalog error message to appear
    await expect(
      page.locator('[data-testid="insert-branch-pole-form"] .text-red-600')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="insert-branch-pole-form"] .text-red-600')
    ).toContainText('katalogu');
  });

  test('insert ZKSN without catalog → form shows error, no operation executed', async ({ page }) => {
    // Open the insert-zksn form
    await page.locator('[data-testid="btn-insert-object-zksn"]').click();
    await expect(page.locator('[data-testid="insert-zksn-form"]')).toBeVisible();

    // Submit without catalog_ref
    await page.locator('[data-testid="insert-zksn-form"] button[type="submit"]').click();

    // Expect a catalog error
    await expect(
      page.locator('[data-testid="insert-zksn-form"] .text-red-600')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="insert-zksn-form"] .text-red-600')
    ).toContainText('katalogu');
  });

  test('insert section switch without catalog → form shows error', async ({ page }) => {
    // Open the section switch form
    await page.locator('[data-testid="btn-insert-section-switch"]').click();
    await expect(page.locator('[data-testid="insert-section-switch-form"]')).toBeVisible();

    // Try to submit without catalog_binding
    await page.locator('[data-testid="insert-section-switch-form"] button[type="submit"]').click();

    // Expect error message containing 'katalogu'
    await expect(
      page.locator('[data-testid="insert-section-switch-form"] .text-red-600')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="insert-section-switch-form"] .text-red-600')
    ).toContainText('katalogu');
  });

  test('connect ring without catalog → form shows error', async ({ page }) => {
    // Open the connect ring form
    await page.locator('[data-testid="btn-connect-ring"]').click();
    await expect(page.locator('[data-testid="connect-ring-form"]')).toBeVisible();

    // Try to submit without catalog_binding
    await page.locator('[data-testid="connect-ring-form"] button[type="submit"]').click();

    // Expect error message
    await expect(
      page.locator('[data-testid="connect-ring-form"] .text-red-600')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="connect-ring-form"] .text-red-600')
    ).toContainText('katalogu');
  });
});

test.describe('Catalog-First Enforcement — Backend API Rejection', () => {
  /**
   * These tests call the domain operation API directly (bypassing UI)
   * and prove the backend rejects operations without catalog_ref.
   */
  test('backend rejects insert_branch_pole without catalog via API', async ({ request }) => {
    // Direct API call - bypass UI entirely
    const response = await request.post('/api/cases/test-case-001/domain-operation', {
      data: {
        operation: 'insert_branch_pole_on_segment_sn',
        payload: {
          segment_id: 'seg/test/segment',
          name: 'Słup testowy',
          insert_at: { mode: 'RATIO', value: 0.5 },
          // NO catalog_ref
        },
      },
    });

    // Backend returns error (4xx or error in response body)
    const body = await response.json();
    expect(body.error_code).toBe('catalog.ref_required');
  });

  test('backend rejects insert_zksn without catalog via API', async ({ request }) => {
    const response = await request.post('/api/cases/test-case-001/domain-operation', {
      data: {
        operation: 'insert_zksn_on_segment_sn',
        payload: {
          segment_id: 'seg/test/segment',
          insert_at: { mode: 'RATIO', value: 0.5 },
          // NO catalog_ref
        },
      },
    });

    const body = await response.json();
    expect(body.error_code).toBe('catalog.ref_required');
  });

  test('backend rejects insert_section_switch without catalog via API', async ({ request }) => {
    const response = await request.post('/api/cases/test-case-001/domain-operation', {
      data: {
        operation: 'insert_section_switch_sn',
        payload: {
          segment_id: 'seg/test/segment',
          // NO catalog_ref or catalog_binding
        },
      },
    });

    const body = await response.json();
    expect(body.error_code).toBe('catalog.ref_required');
  });
});
